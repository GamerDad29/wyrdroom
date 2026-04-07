import { useState, useEffect, useCallback, useRef } from 'react';
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
  playAgentEnter,
} from '../services/soundService';

const USER_ID = 'christopher';
const USER_NAME = 'Christopher';
const USER_COLOR = '#44ff88';
const USER_AVATAR = '/avatars/user.svg';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(roomId: string): string {
  return `apoc_messages_${roomId}`;
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

function createEntryMessages(roomId: string): Message[] {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return [];
  return room.agents
    .map((agentId) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return null;
      playAgentEnter(agentId);
      return {
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        senderColor: '#5a6a4a',
        avatarUrl: '',
        content: `${agent.name} has entered the room`,
        timestamp: Date.now(),
        type: 'system' as const,
        roomId,
      };
    })
    .filter(Boolean) as Message[];
}

export function useChat() {
  const [activeRoomId, setActiveRoomId] = useState('main');
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>(() => {
    const initial: Record<string, Message[]> = {};
    for (const room of rooms) {
      const saved = loadMessages(room.id);
      initial[room.id] = saved.length > 0 ? saved : createEntryMessages(room.id);
    }
    return initial;
  });
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastNotes, setLastNotes] = useState<string>('');
  const streamingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserActivityRef = useRef(Date.now());

  const messages = messagesByRoom[activeRoomId] || [];

  useEffect(() => {
    saveMessages(activeRoomId, messages);
  }, [activeRoomId, messages]);

  useEffect(() => {
    checkHealth().then(setIsConnected).catch(() => setIsConnected(true));
  }, []);

  useEffect(() => {
    playEnterRoom();
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
    setTypingAgent(null);
    playRoomSwitch(roomId);
  }, [activeRoomId]);

  const buildUsers = useCallback((): UserInfo[] => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return [];

    const agentUsers: UserInfo[] = room.agents
      .map((agentId) => {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) return null;

        if (agent.id === 'scribe') {
          return {
            id: agent.id,
            name: agent.name,
            nameColor: agent.nameColor,
            avatarUrl: agent.avatarUrl,
            status: typingAgent === agent.name ? ('typing' as const) : ('online' as const),
            mood: '\u270D recording',
          };
        }

        const mood = getAgentMood(agentMessageCount);
        return {
          id: agent.id,
          name: agent.name,
          nameColor: agent.nameColor,
          avatarUrl: agent.avatarUrl,
          status: typingAgent === agent.name ? ('typing' as const) : ('online' as const),
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
  }, [typingAgent, activeRoomId, agentMessageCount]);

  // Send to a single agent and get streaming response
  const sendToAgent = useCallback((
    agent: ReturnType<typeof getAgent>,
    allMessages: Message[],
    roomId: string,
    isIdleChat?: boolean,
  ) => {
    if (!agent) return;

    streamingRef.current = true;
    setTypingAgent(agent.name);

    const agentMsgId = generateId();
    let accumulated = '';
    let streamStarted = false;

    sendMessageToAgent(
      agent,
      allMessages,
      (chunk) => {
        accumulated += chunk;
        if (!streamStarted) {
          streamStarted = true;
          setTypingAgent(null);
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
        streamingRef.current = false;
        setTypingAgent(null);
        if (agent.id === 'scribe') {
          setLastNotes(accumulated);
        }
        setRoomMessages(roomId, (prev) =>
          prev.map((m) =>
            m.id === agentMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
      },
      (error) => {
        streamingRef.current = false;
        setTypingAgent(null);
        playError();
        setRoomMessages(roomId, (prev) => [
          ...prev,
          {
            id: generateId(),
            senderId: 'system',
            senderName: 'System',
            senderColor: '#5a6a4a',
            avatarUrl: '',
            content: `Error: ${error}`,
            timestamp: Date.now(),
            type: 'system',
            roomId,
          },
        ]);
      },
    );
  }, [setRoomMessages]);

  // Promise-based sendToAgent for chaining
  const sendToAgentPromise = useCallback((
    agent: NonNullable<ReturnType<typeof getAgent>>,
    allMessages: Message[],
    roomId: string,
    isIdleChat?: boolean,
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!agent) { resolve(); return; }

      streamingRef.current = true;
      setTypingAgent(agent.name);

      const agentMsgId = generateId();
      let accumulated = '';
      let streamStarted = false;

      sendMessageToAgent(
        agent,
        allMessages,
        (chunk) => {
          accumulated += chunk;
          if (!streamStarted) {
            streamStarted = true;
            setTypingAgent(null);
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
          streamingRef.current = false;
          setTypingAgent(null);
          if (agent.id === 'scribe') setLastNotes(accumulated);
          setRoomMessages(roomId, (prev) =>
            prev.map((m) =>
              m.id === agentMsgId ? { ...m, isStreaming: false } : m,
            ),
          );
          resolve();
        },
        (error) => {
          streamingRef.current = false;
          setTypingAgent(null);
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
      );
    });
  }, [setRoomMessages]);

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

  // Idle chatter: agents talk to each other when user is quiet
  useEffect(() => {
    function scheduleIdleChat() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      // Random delay between 90-180 seconds of idle
      const delay = 90000 + Math.random() * 90000;

      idleTimerRef.current = setTimeout(() => {
        if (streamingRef.current) return;
        if (Date.now() - lastUserActivityRef.current < 80000) return;

        // Only in active room, only if there are 2+ non-scribe agents
        const room = rooms.find((r) => r.id === activeRoomId);
        if (!room) return;
        const chatAgents = room.agents.filter((id) => id !== 'scribe');
        if (chatAgents.length < 2) return;

        // Pick a random agent to initiate
        const initiatorId = chatAgents[Math.floor(Math.random() * chatAgents.length)];
        const initiator = getAgent(initiatorId);
        if (!initiator) return;

        // Create a prompt that encourages organic chatter
        const idleTopics = [
          'Make a brief, casual observation about something interesting you have been thinking about. Keep it to 1-2 sentences. Address it to the room.',
          'Ask the other agent in the room a casual question about their approach to problem-solving. Keep it short and conversational.',
          'Share a quick thought or opinion about the last topic discussed in this room. Be brief.',
          'Say something that shows your personality. Maybe a dry observation, a hot take, or just thinking out loud. 1-2 sentences max.',
        ];
        const topic = idleTopics[Math.floor(Math.random() * idleTopics.length)];

        const currentMessages = messagesByRoom[activeRoomId] || [];
        const idlePromptMsg: Message = {
          id: generateId(),
          senderId: 'system',
          senderName: 'System',
          senderColor: '#5a6a4a',
          avatarUrl: '',
          content: topic,
          timestamp: Date.now(),
          type: 'system',
          roomId: activeRoomId,
        };

        sendToAgentPromise(initiator, [...currentMessages, idlePromptMsg], activeRoomId, true);

        // Schedule next idle chat
        scheduleIdleChat();
      }, delay);
    }

    scheduleIdleChat();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [activeRoomId, messagesByRoom, sendToAgentPromise]);

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
          const slug = (room?.name || 'chat').toLowerCase().replace(/\s+/g, '-');
          const vaultPath = `APOC/apoc-${slug}-${date}.md`;
          await vaultWrite(vaultPath, lastNotes);
          addSystemMessage(`Notes saved to vault: ${vaultPath}`);
          break;
        }
      }
    } catch (err) {
      addSystemMessage(`Vault error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addSystemMessage, lastNotes, activeRoomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (streamingRef.current) return;

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
    [messages, activeRoomId, setRoomMessages, sendToAgent, sendToAll, lastNotes],
  );

  return {
    messages,
    users: buildUsers(),
    typingAgent,
    isConnected,
    activeRoomId,
    rooms,
    switchRoom,
    sendMessage,
  };
}
