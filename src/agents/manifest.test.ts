import { describe, expect, it } from 'vitest';
import { agents } from './index';
import { agentManifest, getAgentManifestEntry } from './manifest';

/**
 * These tests pin the shared agent manifest to the real agent roster.
 * Any drift between `src/agents/<id>.ts` and `src/agents/manifest.ts`
 * fails loudly here instead of silently shipping to the worker's
 * /api/models endpoint (the original BUG-05).
 */
describe('agents/manifest', () => {
  it('has exactly one manifest entry per exported agent', () => {
    const agentIds = agents.map((a) => a.id).sort();
    const manifestIds = agentManifest.map((a) => a.id).sort();
    expect(manifestIds).toEqual(agentIds);
  });

  it('has no duplicate ids in the manifest', () => {
    const ids = agentManifest.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches id, name, modelId, and nameColor across manifest and agent files', () => {
    for (const agent of agents) {
      const entry = getAgentManifestEntry(agent.id);
      expect(entry, `manifest missing entry for ${agent.id}`).toBeDefined();
      if (!entry) continue;
      expect(entry.name, `name drift for ${agent.id}`).toBe(agent.name);
      expect(entry.modelId, `modelId drift for ${agent.id}`).toBe(agent.modelId);
      expect(entry.nameColor, `nameColor drift for ${agent.id}`).toBe(agent.nameColor);
    }
  });

  it('every entry has a non-empty displayName for /api/models', () => {
    for (const entry of agentManifest) {
      expect(entry.displayName.length, `empty displayName for ${entry.id}`).toBeGreaterThan(0);
    }
  });
});
