import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Phone,
  Video,
  PlusCircle,
  Smile,
  Send,
  Users,
  Copy,
  Check,
  Reply,
  Heart,
  Flame,
  ThumbsUp,
  Zap,
  Lock,
  Paperclip,
  Sparkles,
  Search,
  MessageSquare,
  Bell,
  MoreVertical
} from 'lucide-react';
import { User, DecryptedMessage, EncryptedEnvelope, ChannelItem } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { useWebRTC } from '../../context/WebRTCContext.tsx';
import { encryptMessage, decryptMessage, importPublicKey } from '../../crypto/e2ee.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { VibeSpaceLogo } from '../ui/VibeSpaceLogo.tsx';

interface ChatStageProps {
  channel?: ChannelItem | null;
  recipientUser?: User | null;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  onOpenDiscover?: (tab?: 'friends' | 'suggestions' | 'pending' | 'add' | 'watch') => void;
}

export const ChatStage: React.FC<ChatStageProps> = ({
  channel,
  recipientUser,
  onToggleRightPanel,
  isRightPanelOpen,
  onOpenDiscover
}) => {
  const { user: currentUser, token, keyPair } = useAuth();
  const { socket, presenceMap } = useSocket();
  const { startCall } = useWebRTC();

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [newlyCreatedIds, setNewlyCreatedIds] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [peerPublicKey, setPeerPublicKey] = useState<CryptoKey | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, number>>>({});
  const [isInputFocused, setIsInputFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDM = Boolean(recipientUser);
  const isPeerOnline = recipientUser ? presenceMap[recipientUser.id] === 'online' : false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Fetch recipient's public key quietly in background when in DM
  useEffect(() => {
    async function loadPeerKey() {
      if (!recipientUser || !token) return;
      try {
        let spki = recipientUser.publicKey;
        if (!spki) {
          const res = await fetch(`/api/users/${recipientUser.id}/key`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            spki = data.publicKey;
          }
        }
        if (spki) {
          const imported = await importPublicKey(spki);
          setPeerPublicKey(imported);
        }
      } catch (err) {
        console.error('Silent key agreement error:', err);
      }
    }

    if (isDM) {
      loadPeerKey();
    }
  }, [recipientUser, token, isDM]);

  // 2. Fetch messages (DM encrypted or channel history)
  useEffect(() => {
    if (!token) return;

    if (isDM && recipientUser && keyPair && peerPublicKey) {
      async function loadDMMessages() {
        try {
          const res = await fetch(`/api/messages/${recipientUser!.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const envelopes: EncryptedEnvelope[] = data.messages || [];

            if (!keyPair || !peerPublicKey) return;
            const myKeyPair = keyPair;
            const remoteKey = peerPublicKey;

            const decryptedList: DecryptedMessage[] = await Promise.all(
              envelopes.map(async (env) => {
                const isOutgoing = env.senderId === currentUser?.id;
                let plaintext = '';
                let isDecrypted = false;
                try {
                  plaintext = await decryptMessage(
                    env.ciphertext,
                    env.iv,
                    myKeyPair.privateKey,
                    remoteKey,
                    recipientUser!.id
                  );
                  isDecrypted = true;
                } catch {
                  plaintext = '[Encrypted payload]';
                }

                return {
                  id: env.id,
                  senderId: env.senderId,
                  recipientId: env.recipientId,
                  text: plaintext,
                  createdAt: env.createdAt,
                  isOutgoing,
                  status: 'delivered',
                  isDecrypted
                };
              })
            );
            setMessages(decryptedList);
          }
        } catch (err) {
          console.error('Failed to load DM messages:', err);
        }
      }
      loadDMMessages();
    } else if (channel) {
      // Channel message defaults
      setMessages([
        {
          id: 'welcome-1',
          senderId: 'system',
          recipientId: channel.id,
          text: `Welcome to the beginning of #${channel.name}! Hang out, share clips, and vibe together.`,
          createdAt: Date.now() - 3600000,
          isOutgoing: false,
          status: 'read',
          isDecrypted: true
        }
      ]);
    }
  }, [recipientUser, channel, token, keyPair, peerPublicKey, isDM, currentUser?.id]);

  // 3. Listen for incoming real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = async (envelope: EncryptedEnvelope) => {
      if (isDM && recipientUser && keyPair && peerPublicKey) {
        if (envelope.senderId === recipientUser.id && envelope.recipientId === currentUser?.id) {
          try {
            const plaintext = await decryptMessage(
              envelope.ciphertext,
              envelope.iv,
              keyPair.privateKey,
              peerPublicKey,
              recipientUser.id
            );
            const newMsg: DecryptedMessage = {
              id: envelope.id,
              senderId: envelope.senderId,
              recipientId: envelope.recipientId,
              text: plaintext,
              createdAt: envelope.createdAt,
              isOutgoing: false,
              status: 'read',
              isDecrypted: true
            };
            setNewlyCreatedIds((prev) => new Set(prev).add(newMsg.id));
            setMessages((prev) => [...prev, newMsg]);
          } catch (err) {
            console.error('Failed to decrypt incoming message:', err);
          }
        }
      }
    };

    socket.on('chat:incoming', handleIncoming);
    return () => {
      socket.off('chat:incoming', handleIncoming);
    };
  }, [socket, isDM, recipientUser, keyPair, peerPublicKey, currentUser?.id]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const newId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setNewlyCreatedIds((prev) => new Set(prev).add(newId));

    try {
      if (isDM && recipientUser && keyPair && peerPublicKey && socket) {
        // Genuine E2EE using AES-256-GCM + ECDH P-256
        const { ciphertext, iv } = await encryptMessage(
          textToSend,
          keyPair.privateKey,
          peerPublicKey,
          recipientUser.id
        );

        const optimisticMsg: DecryptedMessage = {
          id: newId,
          senderId: currentUser!.id,
          recipientId: recipientUser.id,
          text: textToSend,
          createdAt: Date.now(),
          isOutgoing: true,
          status: 'sent',
          isDecrypted: true
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        socket.emit('chat:send', {
          recipientId: recipientUser.id,
          senderPublicKey: currentUser!.publicKey,
          ciphertext,
          iv
        });
      } else {
        // Channel broadcast
        const channelMsg: DecryptedMessage = {
          id: newId,
          senderId: currentUser!.id,
          recipientId: channel?.id || 'general',
          text: textToSend,
          createdAt: Date.now(),
          isOutgoing: true,
          status: 'sent',
          isDecrypted: true
        };
        setMessages((prev) => [...prev, channelMsg]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setReactionsMap((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [messageId]: msgReactions };
    });
  };

  const quickEmojis = ['👍', '❤️', '🔥', '⚡', '🎉', '🚀', '😄', '🎮'];

  // EMPTY STATE WHEN NO CONVERSATION / CHANNEL SELECTED (Phase 9)
  if (!isDM && !channel) {
    return (
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          position: 'relative',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', maxWidth: '420px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            <VibeSpaceLogo size={38} glow={false} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome to Vibe Space
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Choose a conversation or community channel to get started. You can also hop into voice or launch a watch party!
          </p>
        </div>
      </div>
    );
  }

  // Alive Empty State (Requirement 24: "No conversation selected" on charcoal-black background with floating objects)
  if (!channel && !recipientUser) {
    return (
      <div
        className="channel-content-enter"
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          position: 'relative',
          padding: '24px',
          textAlign: 'center',
          zIndex: 2
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
            }}
          >
            <VibeSpaceLogo size={36} glow={false} />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No conversation selected
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Pick a friend from your direct messages, find new vibes in Suggestions, or jump into a community channel.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => onOpenDiscover && onOpenDiscover('friends')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={16} />
              <span>Friends</span>
            </button>

            <button
              onClick={() => onOpenDiscover && onOpenDiscover('suggestions')}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={16} color="var(--accent-secondary)" />
              <span>Suggestions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={isDM ? recipientUser?.id : channel?.id}
      className="channel-content-enter"
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. CHANNEL OR DM TOP HEADER BAR */}
      <header
        style={{
          height: '48px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {isDM && recipientUser ? (
            <>
              <Avatar
                name={recipientUser.displayName}
                src={recipientUser.avatarUrl}
                size="sm"
                status={isPeerOnline ? 'online' : 'offline'}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {recipientUser.displayName}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  @{recipientUser.username}
                </span>
              </div>
            </>
          ) : (
            <>
              <Hash size={22} color="var(--text-muted)" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {channel?.name || 'general'}
                </span>
                <span
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '400px'
                  }}
                  className="hide-on-mobile"
                >
                  {channel?.description || 'The central hangout for the Vibe Space community.'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right header action shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isDM && recipientUser && (
            <>
              <button
                id="btn-dm-start-voice"
                onClick={() => startCall(recipientUser, false)}
                className="btn-icon btn-icon-scale"
                title="Start Voice Call"
                aria-label="Start Voice Call"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Phone size={19} />
              </button>

              <button
                id="btn-dm-start-video"
                onClick={() => startCall(recipientUser, true)}
                className="btn-icon btn-icon-scale"
                title="Start Video Call"
                aria-label="Start Video Call"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Video size={19} />
              </button>

              <button
                id="btn-dm-options"
                onClick={onToggleRightPanel}
                className="btn-icon btn-icon-scale"
                title={isRightPanelOpen ? 'Hide Profile' : 'Show Profile & Options'}
                aria-label={isRightPanelOpen ? 'Hide Profile' : 'Show Profile & Options'}
                style={{ color: isRightPanelOpen ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <MoreVertical size={19} />
              </button>

              <div
                style={{
                  width: '1px',
                  height: '16px',
                  backgroundColor: 'var(--border-subtle)',
                  margin: '0 4px'
                }}
              />
            </>
          )}

          {/* Search messages shortcut */}
          <button
            className="btn-icon btn-icon-scale"
            title="Search conversation"
            style={{ color: 'var(--text-muted)' }}
          >
            <Search size={19} />
          </button>

          {/* Notification Alert */}
          <button
            className="btn-icon btn-icon-bounce"
            title="Notifications"
            style={{ color: 'var(--text-muted)' }}
          >
            <Bell size={19} />
          </button>

          <button
            onClick={onToggleRightPanel}
            className={`btn-icon ${isRightPanelOpen ? 'channel-item-active' : ''}`}
            title="Member List & Details"
            style={{ color: isRightPanelOpen ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            <Users size={19} />
          </button>
        </div>
      </header>

      {/* 2. NATURAL CHAT FEED / SCROLL AREA */}
      <div className="chat-scroll-area">
        {/* Welcome Banner at Top of Stream */}
        <div style={{ padding: '24px 16px 12px 16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}
          >
            {isDM && recipientUser ? (
              <Avatar name={recipientUser.displayName} size="lg" />
            ) : (
              <Hash size={38} color="#FFFFFF" />
            )}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {isDM && recipientUser
              ? recipientUser.displayName
              : `Welcome to #${channel?.name || 'general'}!`}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {isDM && recipientUser
              ? `This is the direct messaging history with @${recipientUser.username}. Send a message to start hanging out!`
              : `This is the start of the #${channel?.name || 'general'} channel. Send messages, clips, or hop in voice!`}
          </p>
          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: 'var(--border-subtle)',
              marginTop: '18px'
            }}
          />
        </div>

        {/* Messages List */}
        {messages.map((msg) => {
          const isSender = msg.senderId === currentUser?.id;
          const authorName = isSender
            ? currentUser?.displayName || 'You'
            : recipientUser?.displayName || 'Vibe Space';
          const authorAvatar = isSender ? currentUser?.avatarUrl : recipientUser?.avatarUrl;
          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
          const reactions = reactionsMap[msg.id] || {};
          const isNewlyCreated = newlyCreatedIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`message-group ${isNewlyCreated ? 'message-item-new' : ''}`}
            >
              {/* Avatar Column */}
              <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                <Avatar name={authorName} src={authorAvatar} size="md" />
              </div>

              {/* Message Content Column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Author & Timestamp */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '14.5px',
                      color: isSender ? 'var(--accent-secondary)' : 'var(--text-primary)'
                    }}
                  >
                    {authorName}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {timeStr}
                  </span>
                </div>

                {/* Message Body */}
                <div
                  style={{
                    fontSize: '14.5px',
                    color: '#DBDEE1',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>

                {/* Reactions list under message */}
                {Object.keys(reactions).length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-xs)',
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          transition: 'transform var(--anim-fast) var(--ease-spring)'
                        }}
                        className="hover-lift"
                      >
                        <span>{emoji}</span>
                        <span style={{ fontWeight: 600, fontSize: '11px' }}>{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Quick Actions Bar */}
              <div className="message-hover-actions">
                <button
                  onClick={() => addReaction(msg.id, '❤️')}
                  className="message-action-btn"
                  title="Add Heart reaction"
                >
                  <Heart size={15} />
                </button>
                <button
                  onClick={() => addReaction(msg.id, '🔥')}
                  className="message-action-btn"
                  title="Add Fire reaction"
                >
                  <Flame size={15} />
                </button>
                <button
                  onClick={() => addReaction(msg.id, '👍')}
                  className="message-action-btn"
                  title="Add Thumbs Up"
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  onClick={() => copyText(msg.id, msg.text)}
                  className="message-action-btn"
                  title="Copy Text"
                >
                  {copiedId === msg.id ? <Check size={15} color="var(--status-online)" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. MESSAGE COMPOSER BAR */}
      <div style={{ padding: '0 16px 18px 16px', position: 'relative' }}>
        {/* Emoji Quick Bar Popover */}
        {showEmojiPicker && (
          <div
            className="glass-popover"
            style={{
              position: 'absolute',
              bottom: '72px',
              right: '24px',
              padding: '10px 14px',
              display: 'flex',
              gap: '8px'
            }}
          >
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--radius-xs)',
                  transition: 'transform var(--anim-fast) var(--ease-spring)'
                }}
                className="hover-lift"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          style={{
            backgroundColor: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px 4px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isInputFocused ? '0 0 0 2px rgba(88, 101, 242, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'box-shadow var(--anim-fast) var(--ease-out)'
          }}
        >
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setInputText((prev) => prev + ` [File: ${e.target.files![0].name}] `);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon btn-icon-rotate"
            style={{ color: 'var(--text-muted)', padding: '6px' }}
            title="Attach a file"
          >
            <PlusCircle size={22} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isDM && recipientUser
                ? `Message @${recipientUser.displayName}...`
                : `Message #${channel?.name || 'general'}...`
            }
            value={inputText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14.5px',
              fontFamily: 'var(--font-sans)',
              padding: '10px 0'
            }}
          />

          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn-icon btn-icon-scale"
            style={{ color: showEmojiPicker ? 'var(--accent-secondary)' : 'var(--text-muted)', padding: '6px' }}
            title="Insert Emoji"
          >
            <Smile size={21} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="btn-primary btn-icon-forward"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              opacity: inputText.trim() ? 1 : 0.4,
              pointerEvents: inputText.trim() ? 'auto' : 'none'
            }}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
