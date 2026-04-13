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
import RoomControlPanel from './RoomControlPanel';
import SessionBriefPanel from './SessionBriefPanel';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';
import { agentProfiles } from '../agents/profiles';
import { isSoundEnabled, toggleSound } from '../services/soundService';
import { DiscussionMode, HallSettings, Message } from '../types';

type SkyMood = 'dawn' | 'day' | 'dusk' | 'night';
type WeatherMood = 'clear' | 'mist' | 'rain' | 'storm';

function deriveSkyMood(date: Date): SkyMood {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

function deriveWeatherMood(date: Date): WeatherMood {
  const seed = date.getFullYear() * 1000 + date.getMonth() * 100 + date.getDate();
  const roll = Math.abs(Math.sin(seed) * 10000) % 1;
  if (roll < 0.18) return 'storm';
  if (roll < 0.42) return 'rain';
  if (roll < 0.64) return 'mist';
  return 'clear';
}

export default function ChatRoom() {
  function settingsStorageKey(roomId: string) {
    return `wyrd_settings_${roomId}`;
  }

  function loadHallSettings(roomId: string): HallSettings {
    try {
      const stored = localStorage.getItem(settingsStorageKey(roomId));
      if (stored) {
        return {
          alternateTranscript: false,
          reactiveInterplay: true,
          conversationCadence: 'measured',
          ...(JSON.parse(stored) as Partial<HallSettings>),
        };
      }
    } catch {
      // ignore
    }
    return {
      alternateTranscript: false,
      reactiveInterplay: true,
      conversationCadence: 'measured',
    };
  }

  const [hallSettingsByRoom, setHallSettingsByRoom] = useState<Record<string, HallSettings>>(() => ({
    main: loadHallSettings('main'),
    project: loadHallSettings('project'),
    makers: loadHallSettings('makers'),
    vision: loadHallSettings('vision'),
  }));

  const {
    messages,
    pinnedMessages,
    users,
    typingAgent,
    isConnected,
    activeRoomId,
    rooms,
    sessionBrief,
    activeDiscussion,
    switchRoom,
    sendMessage,
    startDiscussion,
    stopDiscussion,
    setSessionBrief,
    togglePinnedMessage,
    captureMessageToScribe,
  } = useChat(hallSettingsByRoom);

  const { getExpression, onMessage, onTyping, onStopTyping } = useExpressions();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const [showSearch, setShowSearch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [profileAgentId, setProfileAgentId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('round-robin');
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [discussionDuration, setDiscussionDuration] = useState(5);
  const [includeScribeSummary, setIncludeScribeSummary] = useState(true);
  const [skyMood, setSkyMood] = useState<SkyMood>(() => deriveSkyMood(new Date()));
  const [weatherMood, setWeatherMood] = useState<WeatherMood>(() => deriveWeatherMood(new Date()));
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem('wyrd_sidebar_width');
    return stored ? parseInt(stored, 10) : 220;
  });
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;
  const isDragging = useRef(false);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const activeHallSettings = hallSettingsByRoom[activeRoomId];
  const discussionAgents = (activeRoom?.agents || []).filter((agentId) => agentId !== 'scribe');
  const [selectedDiscussionAgents, setSelectedDiscussionAgents] = useState<string[]>(discussionAgents);
  const alternatingMap = useMemo(() => {
    let conversationalIndex = 0;
    return messages.map((message) => {
      if (message.type === 'system' || message.type === 'action') {
        return false;
      }
      const alternate = Boolean(activeHallSettings?.alternateTranscript) && conversationalIndex % 2 === 1;
      conversationalIndex += 1;
      return alternate;
    });
  }, [messages, activeHallSettings]);

  useEffect(() => {
    setSelectedDiscussionAgents(discussionAgents);
  }, [activeRoomId]);

  useEffect(() => {
    localStorage.setItem(settingsStorageKey(activeRoomId), JSON.stringify(activeHallSettings));
  }, [activeRoomId, activeHallSettings]);

  useEffect(() => {
    function refreshAtmosphere() {
      const now = new Date();
      setSkyMood(deriveSkyMood(now));
      setWeatherMood(deriveWeatherMood(now));
    }

    refreshAtmosphere();
    const interval = setInterval(refreshAtmosphere, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  function handleToggleAdvanced() {
    setShowAdvanced((current) => !current);
  }

  function handleClickAgent(agentId: string) {
    if (agentProfiles[agentId]) {
      setProfileAgentId(agentId);
    }
  }

  function handleQuoteMessage(message: Message) {
    setDraft(`> ${message.senderName}: ${message.content}\n\n`);
  }

  function handleAskAgent(message: Message, agentId: string) {
    const agent = users.find((user) => user.id === agentId);
    const label = agent?.name?.toLowerCase() || agentId;
    setDraft(`@${label} respond to this point from ${message.senderName}: "${message.content}"`);
  }

  function handleStartDiscussion() {
    if (!discussionTopic.trim()) return;
    startDiscussion({
      mode: discussionMode,
      topic: discussionTopic.trim(),
      durationMs: discussionDuration * 60_000,
      participantIds: selectedDiscussionAgents,
      includeScribe: includeScribeSummary,
    });
  }

  // Sidebar drag resize. Uses a ref to capture the *current* width on mouse-up
  // rather than the value captured when the drag started (which would be stale
  // by the time the user releases).
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;

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
      // Persist the width the user actually dragged to, not the stale value
      // captured when the drag started.
      localStorage.setItem('wyrd_sidebar_width', String(sidebarWidthRef.current));
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="wyrd-window" data-sky={skyMood} data-weather={weatherMood}>
      <div className="wyrd-titlebar">
        <div className="wyrd-titlebar-brand">
          <h1>
            <span className="wyrd-rune" aria-hidden="true">ᚹ</span>
            WYRDROOM
          </h1>
          <button
            className={`titlebar-tool-btn ${showAdvanced ? 'active' : ''}`}
            onClick={handleToggleAdvanced}
          >
            {showAdvanced ? 'CLOSE ADVANCED' : 'ADVANCED'}
          </button>
        </div>
        <div className="wyrd-titlebar-controls">
          <button
            className={`sound-toggle ${soundOn ? 'active' : ''}`}
            onClick={handleToggleSound}
          >
            SFX {soundOn ? 'ON' : 'OFF'}
          </button>
          <div className="wyrd-titlebar-buttons">
            <div className="wyrd-titlebar-btn">_</div>
            <div className="wyrd-titlebar-btn">x</div>
          </div>
        </div>
      </div>

      <RoomSelector
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={switchRoom}
      />

      <div className="wyrd-body">
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
            {messages.map((msg, index) => {
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
                  alternateLayout={alternatingMap[index]}
                  searchQuery={searchMatches.has(msg.id) ? searchQuery : undefined}
                  onClickAgent={handleClickAgent}
                  expression={msg.type === 'agent' ? getExpression(msg.senderId) : undefined}
                  onTogglePin={togglePinnedMessage}
                  onSendToScribe={captureMessageToScribe}
                  onQuote={handleQuoteMessage}
                  availableAgents={discussionAgents.map((agentId) => {
                    const agent = users.find((candidate) => candidate.id === agentId);
                    return { id: agentId, name: agent?.name || agentId };
                  })}
                  onAskAgent={handleAskAgent}
                />
              );
            })}
            {typingAgent && !messages.some((m) => m.isStreaming) && (
              <TypingIndicator agentName={typingAgent} />
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSend={sendMessage}
            disabled={!isConnected}
            draft={draft}
            onDraftChange={setDraft}
          />
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

      {showAdvanced && (
        <div className="modal-overlay" onClick={() => setShowAdvanced(false)}>
          <div
            className="modal-terminal advanced-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-titlebar">
              <div className="modal-title">HALL CONTROLS</div>
              <button className="modal-close" onClick={() => setShowAdvanced(false)}>
                CLOSE
              </button>
            </div>
            <div className="advanced-modal-body">
              <AdvancedSettingsPanel
                settings={activeHallSettings}
                onChange={(nextSettings) => {
                  setHallSettingsByRoom((prev) => ({
                    ...prev,
                    [activeRoomId]: nextSettings,
                  }));
                }}
              />

              <RoomControlPanel
                mode={discussionMode}
                topic={discussionTopic}
                durationMinutes={discussionDuration}
                includeScribe={includeScribeSummary}
                selectedAgents={selectedDiscussionAgents}
                agentOptions={discussionAgents.map((agentId) => {
                  const user = users.find((candidate) => candidate.id === agentId);
                  return {
                    id: agentId,
                    name: user?.name || agentId,
                    color: user?.nameColor || '#e8dcc8',
                  };
                })}
                activeDiscussion={activeDiscussion}
                onModeChange={setDiscussionMode}
                onTopicChange={setDiscussionTopic}
                onDurationChange={setDiscussionDuration}
                onIncludeScribeChange={setIncludeScribeSummary}
                onToggleAgent={(agentId) => {
                  setSelectedDiscussionAgents((prev) =>
                    prev.includes(agentId)
                      ? prev.filter((id) => id !== agentId)
                      : [...prev, agentId],
                  );
                }}
                onStart={handleStartDiscussion}
                onStop={() => stopDiscussion()}
              />

              <SessionBriefPanel
                brief={sessionBrief}
                onChange={setSessionBrief}
              />

              <PinnedMessagesPanel
                messages={pinnedMessages}
                onUnpin={togglePinnedMessage}
                onQuote={handleQuoteMessage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
