import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Message, UserInfo } from '../types';
import { agents, getAgent } from '../agents';
import { rooms } from '../services/rooms';
import { sendMessageToAgent } from '../services/chatService';
import { checkHealth } from '../services/proxyService';
import { parseCommand, parseTargetAgent } from '../services/commandService';
import { buildNotesPrompt, downloadAsMarkdown, generateExportFilename } from '../services/noteService';
import { isVaultAvailable, vaultSearch, vaultRead, vaultWrite, vaultList } from '../services/vaultService';
import { getAgentMood, getMoodEmoji } from '../services/moodService';
import {
  playEnterRoom, playMessageSend, playAgentTone,
  playRoomSwitch, playError, playHeyAll, playIdleChatter,
  playAgentEnter, playMentionAlert,
} from '../services/soundService';
import { pickEmote } from '../services/emoteService';

const USER_ID = 'christopher';
const USER_NAME = 'Christopher';
const USER_COLOR = '#44ff88';
const USER_AVATAR = '/avatars/user.svg';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(roomId: string): string {
  return `wyrd_messages_${roomId}`;
}

function loadMessages(roomId: string): Message[] {
  try {
    const stored = localStorage.getItem(storageKey(roomId));
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

function saveMessages(roomId: string, messages: Message[]): void {
  const toSave = messages.filter((m) => !m.isStreaming);
  localStorage.setItem(storageKey(roomId), JSON.stringify(toSave));
}

// Elder Futhark rune flanking the entry/exit notices for each agent.
// One rune per agent — see PART 2 of the Wyrdroom rebrand doc for the
// meaning assigned to each.
const AGENT_RUNES: Record<string, string> = {
  gemma: 'ᚷ',   // Gebo — gift, generosity
  mistral: 'ᛗ', // Mannaz — man, humanity
  scribe: 'ᛊ',  // Sowilo — sun, clarity
  cipher: 'ᚲ',  // Kenaz — torch, knowledge
  oracle: 'ᛟ',  // Othala — heritage, ancestral land
  jinx: 'ᛃ',    // Jera — harvest, year
  sage: 'ᛋ',    // Sigel — wisdom (variant of sun rune)
  flux: 'ᛚ',    // Laguz — water, flow
  drift: 'ᛞ',   // Dagaz — day, dawn
  patch: 'ᛈ',   // Pertho — mystery
  echo: 'ᛖ',    // Ehwaz — horse
};

// Pure: builds the entry-message list for a room. Callers are responsible
// for any side effects like sound playback (see playEntrySounds below) so
// this can safely run inside a React state initializer under StrictMode.
function createEntryMessages(roomId: string): Message[] {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [];
  return room.agents
    .map((agentId) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return null;
      const rune = AGENT_RUNES[agent.id] || '';
      const flank = rune ? `${rune} ` : '';
      const trail = rune ? ` ${rune}` : '';
      return {
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        senderColor: '#5a6a4a',
        avatarUrl: '',
        content: `${flank}${agent.name} has entered the hall${trail}`,
        timestamp: Date.now(),
        type: 'system' as const,
        roomId,
      };
    })
    .filter(Boolean) as Message[];
}

// Plays the "agent entered" tone for each agent in a room. Side-effectful,
// must only be called from an effect, never from a state initializer.
function playEntrySounds(roomId: string): void {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return;
  for (const agentId of room.agents) {
    playAgentEnter(agentId);
  }
}

export function useChat() {
  const [activeRoomId, setActiveRoomId] = useState('main');
  // Track which rooms were freshly seeded (no saved history) so we can play
  // their entry sounds from an effect rather than the state initializer.
  const freshlySeededRoomsRef = useRef<string[]>([]);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>(() => {
    const initial: Record<string, Message[]> = {};
    const seeded: string[] = [];
    for (const room of rooms) {
      const saved = loadMessages(room.id);
      if (saved.length > 0) {
        initial[room.id] = saved;
      } else {
        initial[room.id] = createEntryMessages(room.id);
        seeded.push(room.id);
      }
    }
    freshlySeededRoomsRef.current = seeded;
    return initial;
  });
  const [typingAgents, setTypingAgents] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastNotes, setLastNotes] = useState<string>('');
  // Active in-flight requests keyed by message id. Each entry owns an
  // AbortController so `/stop` can cancel every active stream at once, and
  // the size of this map is the single source of truth for "is anything
  // streaming right now?" — replacing the old global streamingRef boolean.
  const activeRequestsRef = useRef<Map<string, AbortController>>(new Map());
  const isStreaming = () => activeRequestsRef.current.size > 0;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserActivityRef = useRef(Date.now());
  const messagesByRoomRef = useRef(messagesByRoom);

  // Small helpers for per-agent typing indicator state.
  const addTypingAgent = useCallback((name: string) => {
    setTypingAgents((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);
  const removeTypingAgent = useCallback((name: string) => {
    setTypingAgents((prev) => prev.filter((n) => n !== name));
  }, []);

  // Back-compat single-value typing agent for components that expect a string.
  const typingAgent = typingAgents[0] || null;

  messagesByRoomRef.current = messagesByRoom;
  const messages = messagesByRoom[activeRoomId] || [];

  useEffect(() => {
    saveMessages(activeRoomId, messages);
  }, [activeRoomId, messages]);

  // Connectivity: run an initial health check and then re-check every 60s.
  // A failed check surfaces as disconnected (the previous fallback of
  // `true` lied to the UI when the worker was unreachable).
  useEffect(() => {
    let cancelled = false;

    const runCheck = () => {
      checkHealth()
        .then((ok) => {
          if (!cancelled) setIsConnected(ok);
        })
        .catch(() => {
          if (!cancelled) setIsConnected(false);
        });
    };

    runCheck();
    const interval = setInterval(runCheck, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    playEnterRoom();
    // Play per-agent entry tones for any rooms that were freshly seeded
    // during this mount. Safe here (effect, not initializer) so StrictMode
    // double-invocation of the initializer can't double-fire the audio.
    for (const roomId of freshlySeededRoomsRef.current) {
      playEntrySounds(roomId);
    }
    freshlySeededRoomsRef.current = [];
  }, []);

  const agentMessageCount = messages.filter((m) => m.type === 'agent' || m.type === 'user').length;

  const setRoomMessages = useCallback((roomId: string, updater: (prev: Message[]) => Message[]) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: updater(prev[roomId] || []),
    }));
  }, []);

  const switchRoom = useCallback((roomId: string) => {
    if (roomId === activeRoomId) return;
    setActiveRoomId(roomId);
    setTypingAgents([]);
    playRoomSwitch(roomId);
  }, [activeRoomId]);

  // Cancel every in-flight agent request. Used by /stop and by room switches
  // where we want to abandon background work cleanly.
  const cancelAllRequests = useCallback(() => {
    for (const controller of activeRequestsRef.current.values()) {
      try { controller.abort(); } catch { /* ignore */ }
    }
    activeRequestsRef.current.clear();
    setTypingAgents([]);
  }, []);

  const buildUsers = useCallback((): UserInfo[] => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return [];

    const agentUsers: UserInfo[] = room.agents
      .map((agentId) => {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) return null;

        const isTyping = typingAgents.includes(agent.name);
        if (agent.id === 'scribe') {
          return {
            id: agent.id,
            name: agent.name,
            nameColor: agent.nameColor,
            avatarUrl: agent.avatarUrl,
            status: isTyping ? ('typing' as const) : ('online' as const),
            mood: '\u270D recording',
          };
        }

        const mood = getAgentMood(agentMessageCount);
        return {
          id: agent.id,
          name: agent.name,
          nameColor: agent.nameColor,
          avatarUrl: agent.avatarUrl,
          status: isTyping ? ('typing' as const) : ('online' as const),
          mood: `${getMoodEmoji(mood.mood)} ${mood.label}`,
        };
      })
      .filter(Boolean) as UserInfo[];

    const christopherUser: UserInfo = {
      id: USER_ID,
      name: USER_NAME,
      nameColor: USER_COLOR,
      avatarUrl: USER_AVATAR,
      status: 'online',
    };

    return [...agentUsers, christopherUser];
  }, [typingAgents, activeRoomId, agentMessageCount]);

  // Send to a single agent and get streaming response.
  //
  // Each call registers an AbortController in activeRequestsRef so that
  // /stop can cancel every in-flight request at once. Typing state is
  // per-agent so multiple agents can stream concurrently (see "hey all",
  // iterate, and freeform flows) without stepping on each other.
  //
  // The `autoSaveToVault` option replaces the old "sniff the last user
  // message for the phrase 'push to obsidian'" hack — callers now pass
  // explicit structured intent.
  const sendToAgent = useCallback((
    agent: ReturnType<typeof getAgent>,
    allMessages: Message[],
    roomId: string,
    options?: {
      isIdleChat?: boolean;
      idleInstruction?: string;
      autoSaveToVault?: boolean;
    },
  ) => {
    if (!agent) return;

    const isIdleChat = options?.isIdleChat;
    const idleInstruction = options?.idleInstruction;
    const autoSaveToVault = options?.autoSaveToVault;

    const agentMsgId = generateId();
    const controller = new AbortController();
    activeRequestsRef.current.set(agentMsgId, controller);
    addTypingAgent(agent.name);

    let accumulated = '';
    let streamStarted = false;

    const finish = () => {
      activeRequestsRef.current.delete(agentMsgId);
      removeTypingAgent(agent.name);
    };

    sendMessageToAgent(
      agent,
      allMessages,
      (chunk) => {
        if (controller.signal.aborted) return;
        accumulated += chunk;
        if (!streamStarted) {
          streamStarted = true;
          removeTypingAgent(agent.name);
          if (isIdleChat) {
            playIdleChatter();
          } else {
            playAgentTone(agent.id);
          }
        }
        setRoomMessages(roomId, (prev) => {
          const existing = prev.find((m) => m.id === agentMsgId);
          if (existing) {
            return prev.map((m) =>
              m.id === agentMsgId ? { ...m, content: accumulated } : m,
            );
          }
          return [
            ...prev,
            {
              id: agentMsgId,
              senderId: agent.id,
              senderName: agent.name,
              senderColor: agent.nameColor,
              avatarUrl: agent.avatarUrl,
              content: accumulated,
              timestamp: Date.now(),
              type: 'agent' as const,
              isStreaming: true,
              roomId,
            },
          ];
        });
      },
      () => {
        if (controller.signal.aborted) { finish(); return; }
        finish();
        if (agent.id === 'scribe') {
          setLastNotes(accumulated);
          // Structured auto-save: only fires when the caller explicitly
          // asked for it (e.g. /save). No more content sniffing.
          if (autoSaveToVault && accumulated.length > 50) {
            const room = rooms.find((r) => r.id === roomId);
            const date = new Date().toISOString().slice(0, 10);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
            const slug = (room?.name || 'chat').toLowerCase().replace(/\s+/g, '-');
            const vaultPath = `Scribe Notes/${date}-${slug}-${time}.md`;
            isVaultAvailable().then(available => {
              if (available) {
                vaultWrite(vaultPath, accumulated).then(() => {
                  setRoomMessages(roomId, (prev) => [...prev, {
                    id: generateId(),
                    senderId: 'system',
                    senderName: 'System',
                    senderColor: '#5a6878',
                    avatarUrl: '',
                    content: `Auto-saved to vault: ${vaultPath}`,
                    timestamp: Date.now(),
                    type: 'system' as const,
                    roomId,
                  }]);
                }).catch(() => {
                  setRoomMessages(roomId, (prev) => [...prev, {
                    id: generateId(),
                    senderId: 'system',
                    senderName: 'System',
                    senderColor: '#5a6878',
                    avatarUrl: '',
                    content: 'Auto-save to vault failed. Try /vault save manually.',
                    timestamp: Date.now(),
                    type: 'system' as const,
                    roomId,
                  }]);
                });
              } else {
                setRoomMessages(roomId, (prev) => [...prev, {
                  id: generateId(),
                  senderId: 'system',
                  senderName: 'System',
                  senderColor: '#5a6878',
                  avatarUrl: '',
                  content: 'Vault not available — notes held in memory. Use /vault save once Obsidian is reachable.',
                  timestamp: Date.now(),
                  type: 'system' as const,
                  roomId,
                }]);
              }
            });
          }
        }
        // Check if agent @mentioned Christopher or asked for a decision
        const lower = accumulated.toLowerCase();
        if (/\bchristopher\b|\byour call\b|\bwhat do you think\b|\byour thoughts\b|\byour decision\b|\bwhat would you\b/.test(lower)) {
          playMentionAlert();
        }
        setRoomMessages(roomId, (prev) =>
          prev.map((m) =>
            m.id === agentMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
      },
      (error) => {
        if (controller.signal.aborted) { finish(); return; }
        finish();
        playError();
        setRoomMessages(roomId, (prev) => [
          ...prev,
          {
            id: generateId(),
            senderId: 'system',
            senderName: 'System',
            senderColor: '#5a6878',
            avatarUrl: '',
            content: `Error: ${error}`,
            timestamp: Date.now(),
            type: 'system',
            roomId,
          },
        ]);
      },
      idleInstruction,
      controller.signal,
    );
  }, [setRoomMessages, addTypingAgent, removeTypingAgent]);

  // Promise-based sendToAgent for chaining (hey all / iterate / freeform).
  // Same AbortController + per-agent typing treatment as sendToAgent.
  const sendToAgentPromise = useCallback((
    agent: NonNullable<ReturnType<typeof getAgent>>,
    allMessages: Message[],
    roomId: string,
    isIdleChat?: boolean,
    idleInstruction?: string,
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!agent) { resolve(); return; }

      const agentMsgId = generateId();
      const controller = new AbortController();
      activeRequestsRef.current.set(agentMsgId, controller);
      addTypingAgent(agent.name);

      let accumulated = '';
      let streamStarted = false;

      const finish = () => {
        activeRequestsRef.current.delete(agentMsgId);
        removeTypingAgent(agent.name);
      };

      sendMessageToAgent(
        agent,
        allMessages,
        (chunk) => {
          if (controller.signal.aborted) return;
          accumulated += chunk;
          if (!streamStarted) {
            streamStarted = true;
            removeTypingAgent(agent.name);
            if (isIdleChat) {
              playIdleChatter();
            } else {
              playAgentTone(agent.id);
            }
          }
          setRoomMessages(roomId, (prev) => {
            const existing = prev.find((m) => m.id === agentMsgId);
            if (existing) {
              return prev.map((m) =>
                m.id === agentMsgId ? { ...m, content: accumulated } : m,
              );
            }
            return [
              ...prev,
              {
                id: agentMsgId,
                senderId: agent.id,
                senderName: agent.name,
                senderColor: agent.nameColor,
                avatarUrl: agent.avatarUrl,
                content: accumulated,
                timestamp: Date.now(),
                type: 'agent' as const,
                isStreaming: true,
                roomId,
              },
            ];
          });
        },
        () => {
          if (controller.signal.aborted) { finish(); resolve(); return; }
          finish();
          if (agent.id === 'scribe') setLastNotes(accumulated);
          setRoomMessages(roomId, (prev) =>
            prev.map((m) =>
              m.id === agentMsgId ? { ...m, isStreaming: false } : m,
            ),
          );
          resolve();
        },
        (error) => {
          if (controller.signal.aborted) { finish(); resolve(); return; }
          finish();
          playError();
          setRoomMessages(roomId, (prev) => [
            ...prev,
            {
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              senderColor: '#5a6a4a',
              avatarUrl: '',
              content: `Error from ${agent.name}: ${error}`,
              timestamp: Date.now(),
              type: 'system',
              roomId,
            },
          ]);
          resolve();
        },
        idleInstruction,
        controller.signal,
      );
    });
  }, [setRoomMessages, addTypingAgent, removeTypingAgent]);

  // "Hey all" -- send to multiple agents sequentially
  const sendToAll = useCallback((
    _userMsg: Message,
    allMessages: Message[],
    roomId: string,
  ) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const respondingAgents = room.agents
      .filter((id) => id !== 'scribe')
      .map((id) => getAgent(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getAgent>>[];

    if (respondingAgents.length === 0) return;

    playHeyAll();

    sendToAgentPromise(respondingAgents[0], allMessages, roomId).then(() => {
      for (let i = 1; i < respondingAgents.length; i++) {
        setTimeout(() => {
          sendToAgentPromise(respondingAgents[i], allMessages, roomId);
        }, i * 800);
      }
    });
  }, [sendToAgentPromise]);

  // Idle chatter: agents occasionally talk when user is quiet
  // Capped at 1 idle message per 5 minutes, max 3 per session
  const idleCountRef = useRef(0);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedRef = useRef(false);
  const iterationRef = useRef<{ active: boolean; timer: ReturnType<typeof setTimeout> | null }>({ active: false, timer: null });
  const MAX_IDLE_PER_SESSION = 3;

  useEffect(() => {
    function scheduleIdleChat() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      // 4-7 minutes between idle chats
      const delay = 240000 + Math.random() * 180000;

      idleTimerRef.current = setTimeout(() => {
        if (isStreaming()) return;
        if (mutedRef.current) { scheduleIdleChat(); return; }
        if (Date.now() - lastUserActivityRef.current < 180000) return; // 3 min minimum idle
        if (idleCountRef.current >= MAX_IDLE_PER_SESSION) return; // cap reached

        const room = rooms.find((r) => r.id === activeRoomId);
        if (!room) return;
        const chatAgents = room.agents.filter((id) => id !== 'scribe');
        if (chatAgents.length < 2) return;

        // 40% chance to actually fire (adds unpredictability)
        if (Math.random() > 0.4) {
          scheduleIdleChat();
          return;
        }

        const initiatorId = chatAgents[Math.floor(Math.random() * chatAgents.length)];
        const initiator = getAgent(initiatorId);
        if (!initiator) return;

        const idleTopics = [
          'Say one casual, short sentence to the other agent in the room. Something lighthearted or funny. Max 15 words. Do NOT quote or repeat this instruction. Just say the sentence directly.',
          'Make a tiny observation or joke to the room. One sentence. Keep it light. Do NOT preface it or explain what you are doing.',
          'Ask the other agent a quick fun question. One short sentence only. Just say it naturally.',
        ];
        const topic = idleTopics[Math.floor(Math.random() * idleTopics.length)];

        const currentMessages = messagesByRoom[activeRoomId] || [];

        idleCountRef.current += 1;
        sendToAgentPromise(initiator, currentMessages, activeRoomId, true, topic);

        scheduleIdleChat();
      }, delay);
    }

    scheduleIdleChat();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [activeRoomId, messagesByRoom, sendToAgentPromise]);

  // Ambient emotes: agents do small actions periodically (no API cost)
  useEffect(() => {
    function scheduleEmote() {
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);

      // 30-90 seconds between emotes
      const delay = 30000 + Math.random() * 60000;

      emoteTimerRef.current = setTimeout(() => {
        if (isStreaming()) return;
        if (mutedRef.current) { scheduleEmote(); return; }

        const room = rooms.find((r) => r.id === activeRoomId);
        if (!room) return;

        // Pick a random agent from the room
        const agentId = room.agents[Math.floor(Math.random() * room.agents.length)];
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) return;

        const emoteText = pickEmote(agentId);
        if (!emoteText) return;

        setRoomMessages(activeRoomId, (prev) => [
          ...prev,
          {
            id: generateId(),
            senderId: agent.id,
            senderName: agent.name,
            senderColor: agent.nameColor,
            avatarUrl: agent.avatarUrl,
            content: `* ${agent.name} ${emoteText} *`,
            timestamp: Date.now(),
            type: 'action' as const,
            roomId: activeRoomId,
          },
        ]);

        scheduleEmote();
      }, delay);
    }

    scheduleEmote();

    return () => {
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    };
  }, [activeRoomId, setRoomMessages]);

  const addSystemMessage = useCallback((content: string) => {
    setRoomMessages(activeRoomId, (prev) => [
      ...prev,
      {
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        senderColor: '#5a6a4a',
        avatarUrl: '',
        content,
        timestamp: Date.now(),
        type: 'system',
        roomId: activeRoomId,
      },
    ]);
  }, [activeRoomId, setRoomMessages]);

  const handleVaultCommand = useCallback(async (
    action: string,
    path?: string,
    content?: string,
  ) => {
    const available = await isVaultAvailable();
    if (!available) {
      addSystemMessage('Obsidian vault not detected. Make sure Obsidian is running with the Local REST API plugin enabled.');
      return;
    }

    try {
      switch (action) {
        case 'search': {
          const results = await vaultSearch(content || '');
          if (results.length === 0) {
            addSystemMessage(`No results for "${content}"`);
          } else {
            const lines = results.map((r) => `  ${r.filename}`);
            addSystemMessage(`VAULT SEARCH: "${content}"\n${lines.join('\n')}`);
          }
          break;
        }
        case 'read': {
          if (!path) return;
          const text = await vaultRead(path);
          const preview = text.length > 2000 ? text.slice(0, 2000) + '\n... (truncated)' : text;
          addSystemMessage(`VAULT: ${path}\n${preview}`);
          break;
        }
        case 'write': {
          if (!path || !lastNotes) {
            addSystemMessage('No notes to write. Run /notes first.');
            return;
          }
          await vaultWrite(path, lastNotes);
          addSystemMessage(`Notes written to vault: ${path}`);
          break;
        }
        case 'list': {
          const result = await vaultList(path);
          const files = result.files || [];
          if (files.length === 0) {
            addSystemMessage(`Vault folder "${path || '/'}" is empty or not found.`);
          } else {
            const lines = files.slice(0, 30).map((f) => `  ${f}`);
            const more = files.length > 30 ? `\n  ... and ${files.length - 30} more` : '';
            addSystemMessage(`VAULT: ${path || '/'}\n${lines.join('\n')}${more}`);
          }
          break;
        }
        case 'save-notes': {
          if (!lastNotes) {
            addSystemMessage('No notes to save. Run /notes first.');
            return;
          }
          const room = rooms.find((r) => r.id === activeRoomId);
          const date = new Date().toISOString().slice(0, 10);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
          const slug = (room?.name || 'chat').toLowerCase().replace(/\s+/g, '-');
          const vaultPath = `Scribe Notes/${date}-${slug}-${time}.md`;
          await vaultWrite(vaultPath, lastNotes);
          addSystemMessage(`Notes saved to vault: ${vaultPath}`);
          break;
        }
      }
    } catch (err) {
      addSystemMessage(`Vault error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addSystemMessage, lastNotes, activeRoomId]);

  // Iteration mode: agents discuss a topic in round-robin for a set time
  const startIteration = useCallback((topic: string, durationMs: number) => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return;

    const chatAgents = room.agents
      .filter((id) => id !== 'scribe')
      .map((id) => getAgent(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getAgent>>[];

    if (chatAgents.length < 2) return;

    iterationRef.current.active = true;
    const startTime = Date.now();
    let agentIndex = 0;

    // End timer
    iterationRef.current.timer = setTimeout(() => {
      iterationRef.current.active = false;
      setRoomMessages(activeRoomId, (prev) => [
        ...prev,
        {
          id: generateId(),
          senderId: 'system',
          senderName: 'System',
          senderColor: '#5a6878',
          avatarUrl: '',
          content: `Iteration complete: "${topic}". Asking Scribe to summarize...`,
          timestamp: Date.now(),
          type: 'system',
          roomId: activeRoomId,
        },
      ]);
      // Trigger Scribe to summarize
      const scribeAgent = getAgent('scribe');
      if (scribeAgent) {
        const latestMsgs = messagesByRoomRef.current[activeRoomId] || [];
        sendToAgent(scribeAgent, latestMsgs, activeRoomId);
      }
    }, durationMs);

    // Round-robin loop
    async function nextTurn() {
      if (!iterationRef.current.active) return;
      if (Date.now() - startTime >= durationMs) return;

      const agent = chatAgents[agentIndex % chatAgents.length];
      agentIndex++;

      const latestMsgs = messagesByRoomRef.current[activeRoomId] || [];
      const remaining = Math.ceil((durationMs - (Date.now() - startTime)) / 60000);
      const prevSpeakers = latestMsgs.slice(-6).filter(m => m.type === 'agent').map(m => m.senderName);
      const lastSpeaker = prevSpeakers[prevSpeakers.length - 1] || 'nobody';
      const instruction = `GROUP DISCUSSION: "${topic}" (${remaining}min left). ${lastSpeaker} just spoke. RULES: You MUST reference or build on something a specific agent said. Do NOT repeat your previous points. Say something NEW. If you already talked about this, take a different angle. 2-3 sentences max.`;
      await sendToAgentPromise(agent, latestMsgs, activeRoomId, false, instruction);

      // Wait 2-3 seconds then next agent
      if (iterationRef.current.active) {
        setTimeout(nextTurn, 2000 + Math.random() * 1000);
      }
    }

    nextTurn();
  }, [activeRoomId, sendToAgentPromise, sendToAgent, setRoomMessages]);

  // Freeform mode: agents freely discuss until /stop
  const startFreeform = useCallback(() => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return;

    const chatAgents = room.agents
      .filter((id) => id !== 'scribe')
      .map((id) => getAgent(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof getAgent>>[];

    if (chatAgents.length < 2) return;

    iterationRef.current.active = true;
    let turnCount = 0;

    const freeformInstructions = [
      'Introduce yourself briefly. What are you good at? What excites you? 2 sentences max.',
      'Respond directly to what the last speaker said. Agree, disagree, or build on it. Name them. 2 sentences.',
      'Ask another specific agent in the room a question about their skills or perspective. 1-2 sentences.',
      'What is the most interesting thing said so far? Why? Reference the speaker by name. 2 sentences.',
      'Challenge something someone said (respectfully). Offer a counter-perspective. 2 sentences.',
      'Find a connection between two different things agents have said. Synthesize them. 2 sentences.',
      'What has NOT been said yet that should be? Fill the gap. 1-2 sentences.',
      'Compliment another agent on a specific point they made. Then add a twist. 2 sentences.',
    ];

    async function nextTurn() {
      if (!iterationRef.current.active) return;

      const agent = chatAgents[turnCount % chatAgents.length];
      turnCount++;

      const instruction = freeformInstructions[Math.min(turnCount - 1, freeformInstructions.length - 1)];
      const latestMsgs = messagesByRoomRef.current[activeRoomId] || [];
      await sendToAgentPromise(agent, latestMsgs, activeRoomId, false, instruction);

      if (iterationRef.current.active) {
        setTimeout(nextTurn, 2500 + Math.random() * 1500);
      }
    }

    nextTurn();
  }, [activeRoomId, sendToAgentPromise]);

  const sendMessage = useCallback(
    (text: string) => {
      // Allow /stop and /mute even during streaming
      const isStopCmd = text.trim().toLowerCase() === '/stop';
      const isMuteCmd = text.trim().toLowerCase() === '/mute';
      if (isStreaming() && !isStopCmd && !isMuteCmd) return;

      // Reset idle timer on user activity
      lastUserActivityRef.current = Date.now();

      // Check for slash commands
      const cmdResult = parseCommand(text, USER_ID, USER_NAME);
      if (cmdResult) {
        if (cmdResult.type === 'clear') {
          const freshMessages = createEntryMessages(activeRoomId);
          setRoomMessages(activeRoomId, () => [
            ...freshMessages,
            {
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              senderColor: '#5a6a4a',
              avatarUrl: '',
              content: cmdResult.content,
              timestamp: Date.now(),
              type: 'system',
              roomId: activeRoomId,
            },
          ]);
          return;
        }

        if (cmdResult.type === 'action') {
          setRoomMessages(activeRoomId, (prev) => [
            ...prev,
            {
              id: generateId(),
              senderId: USER_ID,
              senderName: USER_NAME,
              senderColor: USER_COLOR,
              avatarUrl: USER_AVATAR,
              content: cmdResult.content,
              timestamp: Date.now(),
              type: 'action',
              roomId: activeRoomId,
            },
          ]);
          playMessageSend();
          return;
        }

        if (cmdResult.type === 'notes') {
          const scribeAgent = getAgent('scribe');
          if (!scribeAgent) return;
          const room = rooms.find((r) => r.id === activeRoomId);
          const notesPrompt = buildNotesPrompt(messages, room?.name || 'chat');
          const notesMsg: Message = {
            id: generateId(),
            senderId: USER_ID,
            senderName: USER_NAME,
            senderColor: USER_COLOR,
            avatarUrl: USER_AVATAR,
            content: notesPrompt,
            timestamp: Date.now(),
            type: 'user',
            roomId: activeRoomId,
          };
          setRoomMessages(activeRoomId, (prev) => [
            ...prev,
            {
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              senderColor: '#5a6a4a',
              avatarUrl: '',
              content: 'Scribe is compiling notes...',
              timestamp: Date.now(),
              type: 'system',
              roomId: activeRoomId,
            },
          ]);
          sendToAgent(scribeAgent, [...messages, notesMsg], activeRoomId);
          return;
        }

        if (cmdResult.type === 'export') {
          if (!lastNotes) {
            setRoomMessages(activeRoomId, (prev) => [
              ...prev,
              {
                id: generateId(),
                senderId: 'system',
                senderName: 'System',
                senderColor: '#5a6a4a',
                avatarUrl: '',
                content: 'No notes to export. Run /notes first.',
                timestamp: Date.now(),
                type: 'system',
                roomId: activeRoomId,
              },
            ]);
            return;
          }
          const room = rooms.find((r) => r.id === activeRoomId);
          const filename = generateExportFilename(room?.name || 'chat');
          downloadAsMarkdown(lastNotes, filename);
          setRoomMessages(activeRoomId, (prev) => [
            ...prev,
            {
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              senderColor: '#5a6a4a',
              avatarUrl: '',
              content: `Notes exported: ${filename}`,
              timestamp: Date.now(),
              type: 'system',
              roomId: activeRoomId,
            },
          ]);
          return;
        }

        if (cmdResult.type === 'vault') {
          handleVaultCommand(cmdResult.vaultAction!, cmdResult.vaultPath, cmdResult.content);
          return;
        }

        if (cmdResult.type === 'mute') {
          mutedRef.current = true;
          addSystemMessage(cmdResult.content);
          return;
        }

        if (cmdResult.type === 'unmute') {
          mutedRef.current = false;
          addSystemMessage(cmdResult.content);
          return;
        }

        if (cmdResult.type === 'stop') {
          // Cancel active iteration / freeform loops
          if (iterationRef.current.active) {
            iterationRef.current.active = false;
            if (iterationRef.current.timer) clearTimeout(iterationRef.current.timer);
          }
          // Actually abort every in-flight fetch so the worker stops
          // burning tokens. Also clears typing indicators.
          cancelAllRequests();
          addSystemMessage(cmdResult.content);
          return;
        }

        if (cmdResult.type === 'iterate') {
          addSystemMessage(cmdResult.content);
          startIteration(cmdResult.iterateTopic!, cmdResult.iterateTime!);
          return;
        }

        if (cmdResult.type === 'freeform') {
          addSystemMessage(cmdResult.content);
          startFreeform();
          return;
        }

        if (cmdResult.type === 'save') {
          addSystemMessage(cmdResult.content);
          // Trigger Scribe to compile notes, then auto-push to vault via
          // explicit structured intent. No more injecting a fake user
          // message ("push to obsidian") into the transcript to trick the
          // Scribe onDone handler into running the auto-save branch.
          const scribeAgent = getAgent('scribe');
          if (!scribeAgent) return;
          const room = rooms.find((r) => r.id === activeRoomId);
          const notesPrompt = buildNotesPrompt(messages, room?.name || 'chat');
          const notesMsg: Message = {
            id: generateId(),
            senderId: USER_ID,
            senderName: USER_NAME,
            senderColor: USER_COLOR,
            avatarUrl: USER_AVATAR,
            content: notesPrompt,
            timestamp: Date.now(),
            type: 'user',
            roomId: activeRoomId,
          };
          sendToAgent(scribeAgent, [...messages, notesMsg], activeRoomId, {
            autoSaveToVault: true,
          });
          return;
        }

        if (cmdResult.type === 'system') {
          addSystemMessage(cmdResult.content);
          return;
        }

        return;
      }

      // Regular message
      const { agentId: targetId, cleanText, heyAll } = parseTargetAgent(text);

      const userMsg: Message = {
        id: generateId(),
        senderId: USER_ID,
        senderName: USER_NAME,
        senderColor: USER_COLOR,
        avatarUrl: USER_AVATAR,
        content: text,
        timestamp: Date.now(),
        type: 'user',
        roomId: activeRoomId,
      };

      setRoomMessages(activeRoomId, (prev) => [...prev, userMsg]);
      playMessageSend();

      // "Hey all" -- all agents respond
      if (heyAll) {
        sendToAll(userMsg, [...messages, userMsg], activeRoomId);
        return;
      }

      // Targeted @agent message
      if (targetId) {
        const agent = getAgent(targetId);
        if (!agent) return;
        const messagesForAgent = [...messages, { ...userMsg, content: cleanText }];
        sendToAgent(agent, messagesForAgent, activeRoomId);
        return;
      }

      // BUG FIX: Unaddressed messages just go to chat. No agent responds.
      // User must @mention an agent or say "hey all" to get a response.
    },
    [messages, activeRoomId, setRoomMessages, sendToAgent, sendToAll, lastNotes, startIteration, startFreeform, addSystemMessage],
  );

  const users = useMemo(() => buildUsers(), [buildUsers]);

  return {
    messages,
    users,
    typingAgent,
    isConnected,
    activeRoomId,
    rooms,
    switchRoom,
    sendMessage,
  };
}
