import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { useExpressions } from '../hooks/useExpressions';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import UserList from './UserList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import RoomSelector from './RoomSelector';
import RoomHeader from './RoomHeader';
import SearchBar from './SearchBar';
import AgentProfileModal from './AgentProfileModal';
import { agentProfiles } from '../agents/profiles';
import { isSoundEnabled, toggleSound } from '../services/soundService';

export default function ChatRoom() {
  const {
    messages,
    users,
    typingAgent,
    isConnected,
    activeRoomId,
    rooms,
    switchRoom,
    sendMessage,
  } = useChat();

  const { getExpression, onMessage, onTyping, onStopTyping } = useExpressions();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [profileAgentId, setProfileAgentId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem('apoc_sidebar_width');
    return stored ? parseInt(stored, 10) : 220;
  });
  const isDragging = useRef(false);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Search filtering
  const searchMatches = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const msg of messages) {
      if (msg.content.toLowerCase().includes(q) || msg.senderName.toLowerCase().includes(q)) {
        ids.add(msg.id);
      }
    }
    return ids;
  }, [messages, searchQuery]);

  // Detect expressions from new messages
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMessages = messages.slice(prevMsgCountRef.current);
      for (const msg of newMessages) {
        onMessage(msg);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, onMessage]);

  // Typing state drives expression
  useEffect(() => {
    if (typingAgent) {
      const agent = users.find((u) => u.name === typingAgent);
      if (agent) onTyping(agent.id);
    } else {
      users.forEach((u) => {
        if (u.status !== 'typing') onStopTyping(u.id);
      });
    }
  }, [typingAgent, users, onTyping, onStopTyping]);

  useEffect(() => {
    if (autoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingAgent]);

  function handleScroll() {
    const el = chatRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    autoScrollRef.current = atBottom;
  }

  function handleToggleSound() {
    const newState = toggleSound();
    setSoundOn(newState);
  }

  function handleCloseSearch() {
    setShowSearch(false);
    setSearchQuery('');
  }

  function handleClickAgent(agentId: string) {
    if (agentProfiles[agentId]) {
      setProfileAgentId(agentId);
    }
  }

  // Sidebar drag resize
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(400, Math.max(150, startWidth + delta));
      setSidebarWidth(newWidth);
    }

    function onUp() {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      localStorage.setItem('apoc_sidebar_width', String(sidebarWidth));
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  return (
    <div className="apoc-window">
      <div className="apoc-titlebar">
        <h1>APOC</h1>
        <div className="apoc-titlebar-controls">
          <button
            className={`sound-toggle ${soundOn ? 'active' : ''}`}
            onClick={handleToggleSound}
          >
            SFX {soundOn ? 'ON' : 'OFF'}
          </button>
          <div className="apoc-titlebar-buttons">
            <div className="apoc-titlebar-btn">_</div>
            <div className="apoc-titlebar-btn">x</div>
          </div>
        </div>
      </div>

      <RoomSelector
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={switchRoom}
      />

      <div className="apoc-body">
        <div className="chat-area">
          <RoomHeader
            description={activeRoom?.description || ''}
            showSearch={showSearch}
            onToggleSearch={() => {
              if (showSearch) handleCloseSearch();
              else setShowSearch(true);
            }}
          />

          {showSearch && (
            <SearchBar
              query={searchQuery}
              matchCount={searchMatches.size}
              onQueryChange={setSearchQuery}
              onClose={handleCloseSearch}
            />
          )}

          <div
            className="chat-messages"
            ref={chatRef}
            onScroll={handleScroll}
          >
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return <SystemMessage key={msg.id} text={msg.content} />;
              }
              if (msg.type === 'action') {
                return (
                  <div key={msg.id} className="action-message">
                    {msg.content}
                  </div>
                );
              }
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  searchQuery={searchMatches.has(msg.id) ? searchQuery : undefined}
                  onClickAgent={handleClickAgent}
                  expression={msg.isStreaming ? getExpression(msg.senderId) : undefined}
                />
              );
            })}
            {typingAgent && !messages.some((m) => m.isStreaming) && (
              <TypingIndicator agentName={typingAgent} />
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSend={sendMessage} disabled={!isConnected} />
        </div>

        <div className="sidebar-container" style={{ width: sidebarWidth }}>
          <div
            className={`sidebar-drag-handle ${isDragging.current ? 'dragging' : ''}`}
            onMouseDown={handleDragStart}
          />
          <UserList users={users} onClickAgent={handleClickAgent} getExpression={getExpression} />
        </div>
      </div>

      {/* Agent Profile Modal */}
      {profileAgentId && agentProfiles[profileAgentId] && (
        <AgentProfileModal
          profile={agentProfiles[profileAgentId]}
          onClose={() => setProfileAgentId(null)}
        />
      )}
    </div>
  );
}
