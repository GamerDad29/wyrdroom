import { AgentConfig, Message, ChatCompletionRequest } from '../types';
import { sendChatRequest } from './proxyService';
import { canSpend, recordUsage } from './tokenBudget';

function buildChatHistory(
  messages: Message[],
  agent: AgentConfig,
  idleInstruction?: string,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: agent.systemPrompt },
  ];

  // Include last 30 messages for context
  const recent = messages
    .filter((m) => m.type !== 'system')
    .slice(-30);

  for (const msg of recent) {
    if (msg.senderId === agent.id) {
      history.push({ role: 'assistant', content: msg.content });
    } else {
      history.push({ role: 'user', content: `${msg.senderName}: ${msg.content}` });
    }
  }

  // Inject idle instruction as a user message so it reaches the model
  if (idleInstruction) {
    history.push({ role: 'user', content: `[Room atmosphere] ${idleInstruction}` });
  }

  return history;
}

// Detect degenerate repetition loops in streamed output
function detectRepetition(text: string): boolean {
  if (text.length < 120) return false;
  // Check the last 60 chars against earlier in the text
  const tail = text.slice(-60);
  const earlier = text.slice(0, -60);
  // If the tail appears 2+ more times, it's looping
  const occurrences = earlier.split(tail).length - 1;
  if (occurrences >= 2) return true;
  // Also check for shorter repeated phrases (20+ chars repeated 4+ times)
  const shortTail = text.slice(-30);
  if (shortTail.length >= 20) {
    const shortCount = text.split(shortTail).length - 1;
    if (shortCount >= 4) return true;
  }
  return false;
}

// Strip prefixes where the model echoes the idle instruction instead of just chatting
const INSTRUCTION_ECHO_PATTERNS = [
  /^\s*\[Room atmosphere\]\s*/i,
  /^\s*(?:Sure|Okay|Here['s]*)[,.:!]\s*(?:here['s]*\s*)?(?:a\s*)?(?:casual|lighthearted|short|fun|quick)\s*(?:sentence|observation|question|remark|comment)[,.:!]?\s*/i,
  /^\s*\*?(?:clears throat|in a casual tone|casually)\*?\s*[,.:!]?\s*/i,
];

function sanitizeIdleResponse(text: string): string {
  let cleaned = text;
  for (const pattern of INSTRUCTION_ECHO_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned;
}

export async function sendMessageToAgent(
  agent: AgentConfig,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  idleInstruction?: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!canSpend(agent.id, agent.maxTokensPerResponse)) {
    onError(`Token budget exceeded for ${agent.name}. Try again later.`);
    return;
  }

  const chatHistory = buildChatHistory(messages, agent, idleInstruction);

  const request: ChatCompletionRequest = {
    model: agent.modelId,
    messages: chatHistory,
    max_tokens: agent.maxTokensPerResponse,
    temperature: agent.temperature,
    stream: true,
  };

  let totalChars = 0;
  let isFirstChunk = true;
  let earlyBuffer = '';
  let fullAccumulated = '';
  let aborted = false;

  await sendChatRequest(
    request,
    (text) => {
      if (aborted || signal?.aborted) return;
      totalChars += text.length;
      fullAccumulated += text;

      // Cut off degenerate repetition loops
      if (fullAccumulated.length > 200 && detectRepetition(fullAccumulated)) {
        aborted = true;
        onDone();
        return;
      }

      // For idle messages, buffer the first ~80 chars to sanitize instruction echoing
      if (idleInstruction && isFirstChunk) {
        earlyBuffer += text;
        if (earlyBuffer.length >= 80) {
          isFirstChunk = false;
          const cleaned = sanitizeIdleResponse(earlyBuffer);
          if (cleaned.length > 0) onChunk(cleaned);
        }
        return;
      }

      onChunk(text);
    },
    () => {
      if (aborted || signal?.aborted) return;
      // Flush any remaining early buffer
      if (isFirstChunk && earlyBuffer.length > 0) {
        const cleaned = sanitizeIdleResponse(earlyBuffer);
        if (cleaned.length > 0) onChunk(cleaned);
      }
      const estimatedTokens = Math.ceil(totalChars / 4);
      recordUsage(agent.id, estimatedTokens);
      onDone();
    },
    onError,
    signal,
  );
}

// Phase 1: Agent-to-agent exchange (scaffolded, not active)
export async function agentToAgentExchange(
  _agentA: AgentConfig,
  _agentB: AgentConfig,
  _topic: string,
  _maxTurns: number = 4,
  _maxTokensBudget: number = 4000,
): Promise<Message[]> {
  // Phase 1: implement this
  // For now, return empty array
  return [];
}
