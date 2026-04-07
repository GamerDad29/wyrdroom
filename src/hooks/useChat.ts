import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, UserInfo } from '../types';
import { agents, getAgent } from '../agents';
import { rooms } from '../services/rooms';
import { sendMessageToAgent } from '../services/chatService';
import { checkHealth } from '../services/proxyService';
import { parseCommand, parseTargetAgent } from '../services/commandService';
import { buildNotesPrompt, downloadAsMarkdown, generateExportFilename } from '../services/noteService';
import { getAgentMood, getMoodEmoji } from '../services/moodService';
import { playEnterRoom, playMessageSend, playMessageReceive, playRoomSwitch, playError } from '../services/soundService';

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

  const switchRoom = useCallback((roomId: string) => {
    if (roomId === activeRoomId) return;
    setActiveRoomId(roomId);
    setTypingAgent(null);
    playRoomSwitch();
  }, [activeRoomId]);

  const setRoomMessages = useCallback((roomId: string, updater: (prev: Message[]) => Message[]) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: updater(prev[roomId] || []),
    }));
  }, []);

  const buildUsers = useCallback((): UserInfo[] => {
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return [];

    const agentUsers: UserInfo[] = room.agents
      .map((agentId) => {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) return null;

        // Scribe doesn't have mood, just status
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

  const sendToAgent = useCallback((
    agent: ReturnType<typeof getAgent>,
    allMessages: Message[],
    roomId: string,
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
          playMessageReceive();
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
        // If this was Scribe, save the notes
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

  const sendMessage = useCallback(
    (text: string) => {
      if (streamingRef.current) return;

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
          // Ask Scribe to compile notes
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

        if (cmdResult.type === 'system') {
          setRoomMessages(activeRoomId, (prev) => [
            ...prev,
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

        return;
      }

      // Regular message -- check for @agent targeting
      const { agentId: targetId, cleanText } = parseTargetAgent(text);

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

      // Determine which agent to route to
      const room = rooms.find((r) => r.id === activeRoomId);
      let agent;

      if (targetId) {
        // Explicit @mention
        agent = getAgent(targetId);
      } else {
        // Default: first non-scribe agent in the room
        const defaultAgentId = room?.agents.find((id) => id !== 'scribe');
        agent = defaultAgentId ? getAgent(defaultAgentId) : undefined;
      }

      if (!agent) return;

      // Build message list with clean text if targeted
      const messagesForAgent = targetId
        ? [...messages, { ...userMsg, content: cleanText }]
        : [...messages, userMsg];

      sendToAgent(agent, messagesForAgent, activeRoomId);
    },
    [messages, activeRoomId, setRoomMessages, sendToAgent, lastNotes],
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
