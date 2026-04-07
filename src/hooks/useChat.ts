import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, UserInfo } from '../types';
import { agents } from '../agents';
import { rooms } from '../services/rooms';
import { sendMessageToAgent } from '../services/chatService';
import { checkHealth } from '../services/proxyService';
import { parseCommand } from '../services/commandService';
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
  const streamingRef = useRef(false);

  const messages = messagesByRoom[activeRoomId] || [];

  // Persist on change
  useEffect(() => {
    saveMessages(activeRoomId, messages);
  }, [activeRoomId, messages]);

  // Health check
  useEffect(() => {
    checkHealth().then(setIsConnected).catch(() => setIsConnected(true));
  }, []);

  // Play enter sound on mount
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

      // Regular message
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

      // Find agent for this room
      const room = rooms.find((r) => r.id === activeRoomId);
      const agentId = room?.agents[0];
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;

      streamingRef.current = true;
      setTypingAgent(agent.name);

      const agentMsgId = generateId();
      let accumulated = '';
      let streamStarted = false;

      const allMessages = [...messages, userMsg];

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
          setRoomMessages(activeRoomId, (prev) => {
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
                roomId: activeRoomId,
              },
            ];
          });
        },
        () => {
          streamingRef.current = false;
          setTypingAgent(null);
          setRoomMessages(activeRoomId, (prev) =>
            prev.map((m) =>
              m.id === agentMsgId ? { ...m, isStreaming: false } : m,
            ),
          );
        },
        (error) => {
          streamingRef.current = false;
          setTypingAgent(null);
          playError();
          setRoomMessages(activeRoomId, (prev) => [
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
              roomId: activeRoomId,
            },
          ]);
        },
      );
    },
    [messages, activeRoomId, setRoomMessages],
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
