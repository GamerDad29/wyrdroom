/**
 * Shared agent manifest — the single source of truth for the minimal
 * public metadata of every agent in the hall.
 *
 * This file is intentionally lightweight: no system prompts, no personality
 * blurbs, just the fields that other layers need to stay in sync.
 *
 * Consumers:
 * - `src/agents/*.ts` — each agent file's `id`, `name`, `modelId`, and
 *   `nameColor` must match an entry here (enforced by a test).
 * - `worker/index.ts` — uses the manifest to derive the `/api/models`
 *   endpoint so that list can never drift from the real agent roster.
 *
 * Adding or removing an agent: update this file AND the matching
 * `src/agents/<id>.ts`, then update `src/agents/index.ts` to export it.
 * The consistency test will fail loudly if you miss a step.
 *
 * Roster as of Shipment 2.6 (Agent Overhaul v2): Echo, Flux, Drift, and
 * Patch were retired; Scout joined. Five agents got model upgrades.
 */

export interface AgentManifestEntry {
  id: string;
  name: string;
  modelId: string;
  nameColor: string;
  /** Human label used by /api/models. */
  displayName: string;
}

export const agentManifest: AgentManifestEntry[] = [
  {
    id: 'gemma',
    name: 'Gemma',
    modelId: 'google/gemma-4-31b-it',
    nameColor: '#ff6b9d',
    displayName: 'Gemma 4 31B (Gemma)',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    modelId: 'anthropic/claude-haiku-4-5',
    nameColor: '#7b8cde',
    displayName: 'Claude Haiku 4.5 (Mistral)',
  },
  {
    id: 'scribe',
    name: 'Scribe',
    modelId: 'openai/gpt-4o-mini',
    nameColor: '#F0C75E',
    displayName: 'GPT-4o Mini (Scribe)',
  },
  {
    id: 'cipher',
    name: 'Cipher',
    modelId: 'deepseek/deepseek-chat',
    nameColor: '#00ff41',
    displayName: 'DeepSeek V3.2 (Cipher)',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    modelId: 'google/gemini-3-flash-preview',
    nameColor: '#b388ff',
    displayName: 'Gemini 3 Flash Preview (Oracle)',
  },
  {
    id: 'jinx',
    name: 'Jinx',
    modelId: 'google/gemma-4-26b-a4b-it',
    nameColor: '#ff6347',
    displayName: 'Gemma 4 26B A4B (Jinx)',
  },
  {
    id: 'sage',
    name: 'Sage',
    modelId: 'anthropic/claude-haiku-4-5',
    nameColor: '#4dd0e1',
    displayName: 'Claude Haiku 4.5 (Sage)',
  },
  {
    id: 'scout',
    name: 'Scout',
    modelId: 'deepseek/deepseek-r1',
    nameColor: '#e07030',
    displayName: 'DeepSeek R1 (Scout)',
  },
];

export function getAgentManifestEntry(id: string): AgentManifestEntry | undefined {
  return agentManifest.find((a) => a.id === id);
}
