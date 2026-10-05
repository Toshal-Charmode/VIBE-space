import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Video,
  ChevronRight,
  Shield,
  Sparkles,
  Volume2,
  Tv,
  MessageSquare
} from 'lucide-react';
import { User, ActiveCall, Connection } from '../../types/index.ts';
import { Avatar } from '../ui/Avatar.tsx';

interface RightMemberPanelProps {
  selectedChatUser: User | null;
  connections: Connection[];
  presenceMap: Record<string, string>;
  activeCall: ActiveCall | null;
  onStartCall: (user: User, isVideo: boolean) => void;
  onSelectUserForChat: (user: User) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeRoomMembers?: any[];
}

export const RightMemberPanel: React.FC<RightMemberPanelProps> = ({
  selectedChatUser,
  connections,
  presenceMap,
  activeCall,
  onStartCall,
  onSelectUserForChat,
  isCollapsed,
  onToggleCollapse,
  activeRoomMembers = []
}) => {
  const [memberSearch, setMemberSearch] = useState('');

  if (isCollapsed) return null;

  // Build online & offline user lists from connections + mock space members
  const acceptedUsers = connections
    .filter((c) => c.status === 'ACCEPTED')
    .map((c) => c.user);

  // Group online vs offline
  const onlineMembers = acceptedUsers.filter((u) => presenceMap[u.id] === 'online');
  const offlineMembers = acceptedUsers.filter((u) => presenceMap[u.id] !== 'online');

  const filteredOnline = onlineMembers.filter((u) =>
    u.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredOffline = offlineMembers.filter((u) =>
    u.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <aside
      className="panel-secondary hide-on-tablet"
      style={{
        width: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        userSelect: 'none'
      }}
      aria-label="Members and space details"
    >
      {selectedChatUser ? (
        /* ==================== DM RECIPIENT PROFILE VIEW ==================== */
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', margin: '0 auto 12px auto' }}>
              <Avatar
                name={selectedChatUser.displayName}
                src={selectedChatUser.avatarUrl}
                size="lg"
                status={presenceMap[selectedChatUser.id] === 'online' ? 'online' : 'offline'}
              />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {selectedChatUser.displayName}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              @{selectedChatUser.username}
            </p>
          </div>

          {/* Quick Call Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onStartCall(selectedChatUser, false)}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12.5px' }}
            >
              <Phone size={15} color="var(--accent-secondary)" />
              <span>Voice</span>
            </button>
            <button
              id="btn-profile-start-video"
              onClick={() => onStartCall(selectedChatUser, true)}
              className="btn-primary"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title="Start Video Call"
            >
              <Video size={15} />
              <span>Video Call</span>
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* User Bio & Activity */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}
            >
              About
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-xs)',
                padding: '12px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.45'
              }}
            >
              Active member of Vibe Space. Hanging out in voice, gaming, and watching videos together.
            </div>
          </div>

          {/* Status info */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}
            >
              Presence
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor:
                    presenceMap[selectedChatUser.id] === 'online'
                      ? 'var(--status-online)'
                      : 'var(--status-offline)'
                }}
              />
              <span>
                {presenceMap[selectedChatUser.id] === 'online' ? 'Online in Vibe Space' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== COMMUNITY MEMBERS LIST VIEW ==================== */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Members Search Filter */}
          <div style={{ padding: '12px 12px 8px 12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="app-input"
                style={{
                  height: '30px',
                  fontSize: '12.5px',
                  paddingLeft: '30px',
                  backgroundColor: 'var(--bg-tertiary)'
                }}
              />
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '9px', top: '8px' }}
              />
            </div>
          </div>

          {/* Scrollable Members Groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {/* WATCH ROOM PARTICIPANTS (If in watch room) */}
            {activeRoomMembers.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '4px 8px'
                  }}
                >
                  Watchers — {activeRoomMembers.length}
                </div>
                {activeRoomMembers.map((member: any) => (
                  <div
                    key={member.userId}
                    className="channel-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px' }}
                  >
                    <Avatar name={member.displayName} src={member.avatarUrl} size="sm" status="online" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {member.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-vibe)' }}>Watching YouTube</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ONLINE MEMBERS */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '4px 8px'
                }}
              >
                Online — {filteredOnline.length}
              </div>

              {filteredOnline.length === 0 ? (
                <div style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No members online
                </div>
              ) : (
                filteredOnline.map((user) => (
                  <div
                    key={user.id}
                    className="channel-item"
                    onClick={() => onSelectUserForChat(user)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px' }}
                  >
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" status="online" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {user.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Active in Space
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* OFFLINE MEMBERS */}
            {filteredOffline.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '4px 8px'
                  }}
                >
                  Offline — {filteredOffline.length}
                </div>

                {filteredOffline.map((user) => (
                  <div
                    key={user.id}
                    className="channel-item"
                    onClick={() => onSelectUserForChat(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      opacity: 0.65
                    }}
                  >
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" status="offline" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {user.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Offline</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
