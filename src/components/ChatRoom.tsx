import { useRef, useEffect, useState, useMemo } from 'react';
import { useChat } from '../hooks/useChat';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import UserList from './UserList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import RoomSelector from './RoomSelector';
import RoomHeader from './RoomHeader';
import SearchBar from './SearchBar';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

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
        <UserList users={users} />
      </div>
    </div>
  );
}
