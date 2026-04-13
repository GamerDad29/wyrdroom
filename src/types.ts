export interface AgentConfig {
  id: string;
  name: string;
  modelId: string;
  avatarUrl: string;
  nameColor: string;
  systemPrompt: string;
  personality: string;
  maxTokensPerResponse: number;
  temperature: number;
  enableReasoning: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  avatarUrl: string;
  content: string;
  timestamp: number;
  type: 'user' | 'agent' | 'system' | 'action';
  isStreaming?: boolean;
  pinned?: boolean;
  roomId: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  agents: string[];
}

export interface TokenBudget {
  agentId: string;
  sessionTokensUsed: number;
  sessionTokenLimit: number;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  nameColor: string;
  avatarUrl: string;
  status: 'online' | 'typing' | 'away';
  mood?: string;
}

export type AgentMood = 'focused' | 'caffeinated' | 'curious' | 'reflective' | 'winding down';

export type DiscussionMode = 'round-robin' | 'brainstorm' | 'critique' | 'synthesis' | 'freeform';

export interface SessionBrief {
  goal: string;
  topic: string;
  constraints: string;
  output: string;
}

export type ConversationCadence = 'measured' | 'lively';

export interface HallSettings {
  alternateTranscript: boolean;
  reactiveInterplay: boolean;
  conversationCadence: ConversationCadence;
}

export interface DiscussionConfig {
  mode: DiscussionMode;
  topic: string;
  durationMs: number;
  participantIds: string[];
  includeScribe: boolean;
}

export interface ActiveDiscussion extends DiscussionConfig {
  startedAt: number;
}
