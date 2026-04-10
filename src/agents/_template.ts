import { AgentConfig } from '../types';

// Copy this file and fill in the config for a new agent.
// Then add the import to agents/index.ts.

export const _template: AgentConfig = {
  id: 'agent-id',
  name: 'Agent Name',
  modelId: 'provider/model-id',
  avatarUrl: '/avatars/agent.png',
  nameColor: '#ffffff',
  personality: 'One-line personality description',
  maxTokensPerResponse: 2048,
  temperature: 0.7,
  enableReasoning: false,
  systemPrompt: `You are [Agent Name], a participant in the Wyrdroom.

Write the full system prompt here. Define personality, knowledge, style rules.`,
};
