import { AgentConfig } from '../types';
import { gemma } from './gemma';
import { mistral } from './mistral';
import { scribe } from './scribe';

export const agents: AgentConfig[] = [
  gemma,
  mistral,
  scribe,
];

export function getAgent(id: string): AgentConfig | undefined {
  return agents.find((a) => a.id === id);
}
