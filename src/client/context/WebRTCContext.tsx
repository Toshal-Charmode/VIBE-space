import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext.tsx';
import { useAuth } from './AuthContext.tsx';
import { User, ActiveCall, CallStatus } from '../types/index.ts';

interface WebRTCContextType {
  activeCall: ActiveCall | null;
  incomingCall: { callId: string; fromUser: User; isVideo: boolean } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isLocalSpeaking: boolean;
  isRemoteSpeaking: boolean;
  cameraDeniedMessage: string | null;
  micDeniedMessage: string | null;
  dismissPermissionWarning: () => void;
  startCall: (targetUser: User, isVideo: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  switchCamera: () => Promise<void>;
  availableVideoDevices: MediaDeviceInfo[];
  ensureAudioStream: () => Promise<MediaStreamTrack | null>;
  stopAudioStream: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Standard reasonable constraints for smooth, stable video calling (Requirement 23)
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: 'user'
};

// Web Audio API Ringtone Synth (Zero external asset dependency)
class RingtoneSynth {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  startRinging(isOutgoing: boolean) {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return;
    }

    const playBeep = () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isOutgoing ? 440 : 523.25, this.ctx.currentTime); // A4 or C5
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isOutgoing ? 1.2 : 0.8));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (isOutgoing ? 1.2 : 0.8));
    };

    playBeep();
    this.intervalId = setInterval(playBeep, isOutgoing ? 3000 : 2000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

const ringtone = new RingtoneSynth();

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; fromUser: User; isVideo: boolean } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState<boolean>(false);
  const [cameraDeniedMessage, setCameraDeniedMessage] = useState<string | null>(null);
  const [micDeniedMessage, setMicDeniedMessage] = useState<string | null>(null);

  const currentCameraFacing = useRef<'user' | 'environment'>('user');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalCamTrackRef = useRef<MediaStreamTrack | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // Web Audio speaking detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const dismissPermissionWarning = useCallback(() => {
    setCameraDeniedMessage(null);
    setMicDeniedMessage(null);
  }, []);

  // Update available camera devices
  useEffect(() => {
    async function getDevices() {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAvailableVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        }
      } catch (e) {
        console.warn('enumerateDevices error:', e);
      }
    }
    getDevices();
  }, []);

  // Broadcast media status changes (camera ON/OFF, mic ON/OFF, screen share) to the remote peer
  const broadcastMediaState = useCallback((state: { isVideoMuted?: boolean; isAudioMuted?: boolean; isScreenSharing?: boolean }) => {
    if (activeCall && socket) {
      socket.emit('call:media_state', {
        targetUserId: activeCall.peerUserId,
        callId: activeCall.callId,
        ...state
      });
    }
  }, [activeCall, socket]);

  // Speaking detection loop using AudioContext and AnalyserNode (Requirement 14)
  useEffect(() => {
    const hasAudio = Boolean(localStream || remoteStream);
    if (!hasAudio) {
      setIsLocalSpeaking(false);
      setIsRemoteSpeaking(false);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Connect local audio analyser
      if (localStream && localStream.getAudioTracks().length > 0) {
        try {
          const source = ctx.createMediaStreamSource(localStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          localAnalyserRef.current = analyser;
        } catch (e) {
          console.warn('Local audio analyser error:', e);
        }
      } else {
        localAnalyserRef.current = null;
      }

      // Connect remote audio analyser
      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        try {
          const source = ctx.createMediaStreamSource(remoteStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          remoteAnalyserRef.current = analyser;
        } catch (e) {
          console.warn('Remote audio analyser error:', e);
        }
      } else {
        remoteAnalyserRef.current = null;
      }

      const localDataArray = new Uint8Array(128);
      const remoteDataArray = new Uint8Array(128);

      const checkAudioLevels = () => {
        // Local audio check
        if (localAnalyserRef.current && !isAudioMuted) {
          localAnalyserRef.current.getByteFrequencyData(localDataArray);
          let sum = 0;
          for (let i = 0; i < localDataArray.length; i++) sum += localDataArray[i];
          const avg = sum / localDataArray.length;
          setIsLocalSpeaking(avg > 18);
        } else {
          setIsLocalSpeaking(false);
        }

        // Remote audio check
        if (remoteAnalyserRef.current && !activeCall?.remoteIsAudioMuted) {
          remoteAnalyserRef.current.getByteFrequencyData(remoteDataArray);
          let sum = 0;
          for (let i = 0; i < remoteDataArray.length; i++) sum += remoteDataArray[i];
          const avg = sum / remoteDataArray.length;
          setIsRemoteSpeaking(avg > 18);
        } else {
          setIsRemoteSpeaking(false);
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevels);
      };

      animationFrameRef.current = requestAnimationFrame(checkAudioLevels);
    } catch (err) {
      console.warn('Speaking detection setup error:', err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [localStream, remoteStream, isAudioMuted, activeCall?.remoteIsAudioMuted]);

  // Clean media streams and peer connection (Requirements 19, 20, 25)
  const cleanupMedia = useCallback(() => {
    ringtone.stop();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (originalCamTrackRef.current) {
      originalCamTrackRef.current.stop();
      originalCamTrackRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsScreenSharing(false);
    setIsLocalSpeaking(false);
    setIsRemoteSpeaking(false);
    pendingCandidates.current = [];
  }, []);

  // Socket signaling listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming call notification
    const handleIncoming = (data: { callId: string; fromUserId: string; callerInfo: User; isVideo: boolean }) => {
      // If already in a call, reject automatically
      if (activeCall && activeCall.status !== 'idle') {
        socket.emit('call:reject', { callId: data.callId, targetUserId: data.fromUserId, reason: 'busy' });
        return;
      }

      setIncomingCall({
        callId: data.callId,
        fromUser: data.callerInfo,
        isVideo: data.isVideo
      });
      ringtone.startRinging(false);
    };

    // Call accepted by recipient
    const handleAccepted = async (data: { callId: string; fromUserId: string }) => {
      ringtone.stop();
      if (!peerConnectionRef.current) return;

      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              status: 'connected',
              startTime: Date.now()
            }
          : null
      );

      // Create and send SDP Offer
      try {
        const offer = await peerConnectionRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('call:offer', {
          targetUserId: data.fromUserId,
          sdp: offer,
          callId: data.callId
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    };

    // Call rejected or recipient busy/offline
    const handleRejected = (data: { callId: string; reason: string }) => {
      ringtone.stop();
      cleanupMedia();
      setActiveCall(null);
      alert(`Call was declined (${data.reason})`);
    };

    const handleUnavailable = () => {
      ringtone.stop();
      cleanupMedia();
      setActiveCall(null);
      alert('User is currently offline or unavailable.');
    };

    // Received SDP Offer (as receiver)
    const handleOffer = async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit; callId: string }) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Flush any queued candidates
        while (pendingCandidates.current.length > 0) {
          const cand = pendingCandidates.current.shift();
          if (cand) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit('call:answer', {
          targetUserId: data.fromUserId,
          sdp: answer,
          callId: data.callId
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    // Received SDP Answer (as caller)
    const handleAnswer = async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

        while (pendingCandidates.current.length > 0) {
          const cand = pendingCandidates.current.shift();
          if (cand) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    };

    // ICE Candidate exchange
    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        pendingCandidates.current.push(data.candidate);
      }
    };

    // Real-time camera & mic status sync from remote peer (Requirements 7, 9)
    const handleMediaState = (data: {
      fromUserId: string;
      callId: string;
      isVideoMuted?: boolean;
      isAudioMuted?: boolean;
      isScreenSharing?: boolean;
    }) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev;
        return {
          ...prev,
          remoteIsVideoMuted: data.isVideoMuted !== undefined ? data.isVideoMuted : prev.remoteIsVideoMuted,
          remoteIsAudioMuted: data.isAudioMuted !== undefined ? data.isAudioMuted : prev.remoteIsAudioMuted,
          remoteIsScreenSharing: data.isScreenSharing !== undefined ? data.isScreenSharing : prev.remoteIsScreenSharing
        };
      });
    };

    // Remote peer ended call
    const handleEnded = () => {
      ringtone.stop();
      cleanupMedia();
      setActiveCall(null);
      setIncomingCall(null);
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:unavailable', handleUnavailable);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice_candidate', handleIceCandidate);
    socket.on('call:media_state', handleMediaState);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:unavailable', handleUnavailable);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice_candidate', handleIceCandidate);
      socket.off('call:media_state', handleMediaState);
      socket.off('call:ended', handleEnded);
    };
  }, [socket, activeCall, cleanupMedia]);

  // Create and configure RTCPeerConnection with connection monitoring (Requirements 10, 17, 24)
  const createPeerConnection = (targetUserId: string, callId: string) => {
    // If a previous connection exists, close it cleanly first
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice_candidate', {
          targetUserId,
          candidate: event.candidate,
          callId
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else if (event.track) {
        setRemoteStream((prev) => {
          const stream = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
          stream.addTrack(event.track);
          return stream;
        });
      }

      // Track live state change events for remote tracks
      if (event.track.kind === 'video') {
        event.track.onmute = () => {
          setActiveCall((prev) => (prev ? { ...prev, remoteIsVideoMuted: true } : null));
        };
        event.track.onunmute = () => {
          setActiveCall((prev) => (prev ? { ...prev, remoteIsVideoMuted: false } : null));
        };
      }
      if (event.track.kind === 'audio') {
        event.track.onmute = () => {
          setActiveCall((prev) => (prev ? { ...prev, remoteIsAudioMuted: true } : null));
        };
        event.track.onunmute = () => {
          setActiveCall((prev) => (prev ? { ...prev, remoteIsAudioMuted: false } : null));
        };
      }
    };

    // Connection state monitoring & recovery (Requirements 17 & 24)
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      } else if (state === 'connecting') {
        setActiveCall((prev) => (prev ? { ...prev, status: prev.status === 'connected' ? 'reconnecting' : 'calling' } : null));
      } else if (state === 'disconnected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'reconnecting' } : null));
      } else if (state === 'failed') {
        endCall();
      } else if (state === 'closed') {
        cleanupMedia();
        setActiveCall(null);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'reconnecting' } : null));
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Acquire media with graceful camera and microphone fallback (Requirements 3 & 18)
  const acquireMediaWithFallback = async (isVideo: boolean) => {
    let stream: MediaStream;
    let cameraDenied = false;
    let micDenied = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MediaDevices API is not supported in this browser environment');
    }

    try {
      // 1. Primary request: full video & audio
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? VIDEO_CONSTRAINTS : false
      });
    } catch (err: any) {
      console.warn('[WebRTC] Primary getUserMedia failed:', err.name, err.message);

      if (isVideo) {
        // Fallback 1: Camera denied or unavailable -> fallback to audio only
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          cameraDenied = true;
          setCameraDeniedMessage('Camera access was denied. You can continue with audio only.');
        } catch (audioErr: any) {
          // Fallback 2: Mic denied -> try video only
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
            micDenied = true;
            setMicDeniedMessage('Microphone access was denied. You can continue with video only.');
          } catch {
            // Both denied: throw original or descriptive error
            throw new Error(`Permission error: ${err.name} - ${err.message}`);
          }
        }
      } else {
        throw err;
      }
    }

    return { stream, cameraDenied, micDenied };
  };

  // Start outgoing call
  const startCall = async (targetUser: User, isVideo: boolean) => {
    try {
      setCameraDeniedMessage(null);
      setMicDeniedMessage(null);

      const { stream, cameraDenied, micDenied } = await acquireMediaWithFallback(isVideo);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioMuted && !micDenied;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoMuted && !cameraDenied;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const callId = Math.random().toString(36).substring(2, 9);
      const pc = createPeerConnection(targetUser.id, callId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const initialVideoMuted = isVideo ? (cameraDenied || isVideoMuted) : true;
      const initialAudioMuted = micDenied || isAudioMuted;

      setIsVideoMuted(initialVideoMuted);
      setIsAudioMuted(initialAudioMuted);

      setActiveCall({
        callId,
        peerUserId: targetUser.id,
        peerUser: targetUser,
        isVideo,
        isAudioMuted: initialAudioMuted,
        isVideoMuted: initialVideoMuted,
        cameraDenied,
        micDenied,
        status: 'calling'
      });

      ringtone.startRinging(true);

      socket?.emit('call:initiate', {
        targetUserId: targetUser.id,
        isVideo,
        callerInfo: user,
        callId
      });
    } catch (err: any) {
      console.error('Cannot access media device:', err);
      alert(`Could not start call: ${err.message || 'Device access failed'}`);
    }
  };

  // Accept incoming call (Requirements 3 & 11)
  const acceptCall = async () => {
    if (!incomingCall) return;
    ringtone.stop();

    try {
      setCameraDeniedMessage(null);
      setMicDeniedMessage(null);

      const isVideo = incomingCall.isVideo;
      const { stream, cameraDenied, micDenied } = await acquireMediaWithFallback(isVideo);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioMuted && !micDenied;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoMuted && !cameraDenied;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(incomingCall.fromUser.id, incomingCall.callId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const initialVideoMuted = isVideo ? (cameraDenied || isVideoMuted) : true;
      const initialAudioMuted = micDenied || isAudioMuted;

      setIsVideoMuted(initialVideoMuted);
      setIsAudioMuted(initialAudioMuted);

      setActiveCall({
        callId: incomingCall.callId,
        peerUserId: incomingCall.fromUser.id,
        peerUser: incomingCall.fromUser,
        isVideo,
        isAudioMuted: initialAudioMuted,
        isVideoMuted: initialVideoMuted,
        cameraDenied,
        micDenied,
        status: 'connected',
        startTime: Date.now()
      });

      socket?.emit('call:accept', {
        callId: incomingCall.callId,
        targetUserId: incomingCall.fromUser.id
      });

      setIncomingCall(null);
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      alert(`Failed to access camera/mic: ${err.message}`);
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    ringtone.stop();
    if (incomingCall && socket) {
      socket.emit('call:reject', {
        callId: incomingCall.callId,
        targetUserId: incomingCall.fromUser.id,
        reason: 'declined'
      });
    }
    setIncomingCall(null);
  };

  // End active call (Requirement 19)
  const endCall = () => {
    ringtone.stop();
    if (activeCall && socket) {
      socket.emit('call:end', {
        targetUserId: activeCall.peerUserId,
        callId: activeCall.callId
      });
    }
    cleanupMedia();
    setActiveCall(null);
  };

  // Stop local audio tracks when leaving voice channel (only if not in a 1:1 active call)
  const stopAudioStream = () => {
    if (activeCall && activeCall.status !== 'idle') return;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => track.stop());
      const remainingTracks = localStreamRef.current.getTracks().filter((t) => t.readyState === 'live');
      if (remainingTracks.length === 0) {
        localStreamRef.current = null;
        setLocalStream(null);
      } else {
        setLocalStream(new MediaStream(remainingTracks));
      }
    }
  };

  // Ensure local audio stream exists without unnecessary recreation (Requirement 4)
  const ensureAudioStream = async (): Promise<MediaStreamTrack | null> => {
    let existingTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === 'live');
    if (existingTrack) {
      return existingTrack;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newTrack = stream.getAudioTracks()[0];
      if (!newTrack) {
        throw new Error('No audio track returned from microphone');
      }

      newTrack.enabled = !isAudioMuted;

      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream([newTrack]);
      } else {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          if (t !== newTrack) {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          }
        });
        localStreamRef.current.addTrack(newTrack);
      }

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(newTrack);
        } else {
          peerConnectionRef.current.addTrack(newTrack, localStreamRef.current);
        }
      }

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      return newTrack;
    } catch (err: any) {
      console.error('[Microphone] getUserMedia error:', err);
      setIsAudioMuted(true);
      setActiveCall((prev) => (prev ? { ...prev, isAudioMuted: true } : null));
      return null;
    }
  };

  // Toggle microphone ON / OFF (Requirement 4)
  const toggleAudio = async () => {
    let audioTrack: MediaStreamTrack | null | undefined = localStreamRef.current
      ?.getAudioTracks()
      .find((t) => t.readyState === 'live');

    if (audioTrack) {
      const nextEnabled = !audioTrack.enabled;
      audioTrack.enabled = nextEnabled;
      const nextMuted = !nextEnabled;

      setIsAudioMuted(nextMuted);
      setActiveCall((prev) => (prev ? { ...prev, isAudioMuted: nextMuted } : null));
      broadcastMediaState({ isAudioMuted: nextMuted });
      return;
    }

    if (!isAudioMuted) {
      setIsAudioMuted(true);
      setActiveCall((prev) => (prev ? { ...prev, isAudioMuted: true } : null));
      broadcastMediaState({ isAudioMuted: true });
      return;
    }

    audioTrack = await ensureAudioStream();
    if (audioTrack) {
      audioTrack.enabled = true;
      setIsAudioMuted(false);
      setActiveCall((prev) => (prev ? { ...prev, isAudioMuted: false } : null));
      broadcastMediaState({ isAudioMuted: false });
    }
  };

  // Toggle camera ON / OFF (Requirement 5)
  // CRITICAL: Does NOT destroy video track on toggle, does NOT recreate stream every click
  const toggleVideo = async () => {
    // If a live video track already exists in localStream, simply toggle its enabled state
    const videoTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');

    if (videoTrack) {
      const nextEnabled = !videoTrack.enabled;
      videoTrack.enabled = nextEnabled;
      const nextMuted = !nextEnabled;

      setIsVideoMuted(nextMuted);
      setActiveCall((prev) =>
        prev
          ? { ...prev, isVideoMuted: nextMuted }
          : {
              callId: 'vc-' + Date.now(),
              peerUserId: 'voice-channel',
              peerUser: {
                id: 'voice-channel',
                username: 'voice_lounge',
                displayName: 'General Voice',
                publicKey: ''
              },
              isVideo: true,
              isAudioMuted,
              isVideoMuted: nextMuted,
              status: 'connected',
              startTime: Date.now()
            }
      );
      broadcastMediaState({ isVideoMuted: nextMuted });
      return;
    }

    // If no live video track exists (e.g. call was started as audio-only, or camera was previously unavailable)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream([newTrack]);
      } else {
        localStreamRef.current.addTrack(newTrack);
      }

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        } else {
          peerConnectionRef.current.addTrack(newTrack, localStreamRef.current);
          // If connection is active, renegotiate offer
          if (activeCall && socket) {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit('call:offer', {
              targetUserId: activeCall.peerUserId,
              sdp: offer,
              callId: activeCall.callId
            });
          }
        }
      }

      newTrack.enabled = true;
      setIsVideoMuted(false);
      setActiveCall((prev) =>
        prev
          ? { ...prev, isVideo: true, isVideoMuted: false }
          : {
              callId: 'vc-' + Date.now(),
              peerUserId: 'voice-channel',
              peerUser: {
                id: 'voice-channel',
                username: 'voice_lounge',
                displayName: 'General Voice',
                publicKey: ''
              },
              isVideo: true,
              isAudioMuted,
              isVideoMuted: false,
              status: 'connected',
              startTime: Date.now()
            }
      );
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      broadcastMediaState({ isVideoMuted: false });
    } catch (err: any) {
      console.warn('Could not activate camera on toggle:', err);
      alert('Could not start camera. Please verify camera permissions in your browser.');
    }
  };

  // Toggle Screen Share using getDisplayMedia (Requirement 16)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert back from screen share to camera video
      await stopScreenSharing();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen sharing is not supported in this browser.');
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;

      // Remember original camera track
      const existingCamTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
      if (existingCamTrack) {
        originalCamTrackRef.current = existingCamTrack;
        localStreamRef.current?.removeTrack(existingCamTrack);
      }

      if (localStreamRef.current) {
        localStreamRef.current.addTrack(screenTrack);
      } else {
        localStreamRef.current = new MediaStream([screenTrack]);
      }

      // Replace track on RTCPeerConnection sender
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          peerConnectionRef.current.addTrack(screenTrack, localStreamRef.current);
        }
      }

      setIsScreenSharing(true);
      setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: true } : null));
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      broadcastMediaState({ isScreenSharing: true });

      // Handle user stopping screen share via browser native toolbar
      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen sharing error:', err);
      }
    }
  };

  const stopScreenSharing = async () => {
    if (!isScreenSharing && !screenStreamRef.current) return;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Remove screen track from local stream
    if (localStreamRef.current) {
      const screenTracks = localStreamRef.current.getVideoTracks().filter((t) => t.readyState !== 'live' || t.label.includes('screen'));
      screenTracks.forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
    }

    // Restore original camera track
    let camTrack = originalCamTrackRef.current;
    if (!camTrack || camTrack.readyState !== 'live') {
      try {
        const newCam = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        camTrack = newCam.getVideoTracks()[0];
      } catch {
        camTrack = null;
      }
    }

    if (camTrack && localStreamRef.current) {
      camTrack.enabled = !isVideoMuted;
      localStreamRef.current.addTrack(camTrack);

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(camTrack);
        }
      }
    }

    originalCamTrackRef.current = null;
    setIsScreenSharing(false);
    setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: false } : null));

    if (localStreamRef.current) {
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
    broadcastMediaState({ isScreenSharing: false });
  };

  // Switch camera (front / back)
  const switchCamera = async () => {
    if (!localStreamRef.current || !activeCall?.isVideo || isScreenSharing) return;

    try {
      const nextFacing = currentCameraFacing.current === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { ...VIDEO_CONSTRAINTS, facingMode: nextFacing },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }

      localStreamRef.current.addTrack(newVideoTrack);
      currentCameraFacing.current = nextFacing;
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.warn('Could not switch camera:', err);
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        isLocalSpeaking,
        isRemoteSpeaking,
        cameraDeniedMessage,
        micDeniedMessage,
        dismissPermissionWarning,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        switchCamera,
        availableVideoDevices,
        ensureAudioStream,
        stopAudioStream
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error('useWebRTC must be used within a WebRTCProvider');
  return context;
};
