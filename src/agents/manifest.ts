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
    modelId: 'z-ai/glm-4.7-flash',
    nameColor: '#7b8cde',
    displayName: 'GLM 4.7 Flash (Mistral)',
  },
  {
    id: 'scribe',
    name: 'Scribe',
    modelId: 'nvidia/nemotron-3-nano-30b-a3b:free',
    nameColor: '#F0C75E',
    displayName: 'Nemotron 3 Nano (Scribe)',
  },
  {
    id: 'cipher',
    name: 'Cipher',
    modelId: 'qwen/qwen3-coder-next',
    nameColor: '#00ff41',
    displayName: 'Qwen3 Coder Next (Cipher)',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    modelId: 'google/gemma-4-26b-a4b-it',
    nameColor: '#b388ff',
    displayName: 'Gemma 4 26B (Oracle)',
  },
  {
    id: 'jinx',
    name: 'Jinx',
    modelId: 'stepfun/step-3.5-flash',
    nameColor: '#ff6347',
    displayName: 'Step 3.5 Flash (Jinx)',
  },
  {
    id: 'sage',
    name: 'Sage',
    modelId: 'google/gemma-4-26b-a4b-it',
    nameColor: '#4dd0e1',
    displayName: 'Gemma 4 26B (Sage)',
  },
  {
    id: 'flux',
    name: 'Flux',
    modelId: 'xiaomi/mimo-v2-flash',
    nameColor: '#e6a830',
    displayName: 'MiMo v2 Flash (Flux)',
  },
  {
    id: 'drift',
    name: 'Drift',
    modelId: 'z-ai/glm-4.7-flash',
    nameColor: '#7eb8da',
    displayName: 'GLM 4.7 Flash (Drift)',
  },
  {
    id: 'patch',
    name: 'Patch',
    modelId: 'google/gemma-4-26b-a4b-it',
    nameColor: '#c0a0d0',
    displayName: 'Gemma 4 26B (Patch)',
  },
  {
    id: 'echo',
    name: 'Echo',
    modelId: 'stepfun/step-3.5-flash',
    nameColor: '#e08080',
    displayName: 'Step 3.5 Flash (Echo)',
  },
];

export function getAgentManifestEntry(id: string): AgentManifestEntry | undefined {
  return agentManifest.find((a) => a.id === id);
}
