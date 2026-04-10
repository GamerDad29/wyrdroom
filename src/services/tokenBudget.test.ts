import { describe, expect, it } from 'vitest';
import { canSpend, getUsage, recordUsage, resetSession } from './tokenBudget';

describe('tokenBudget', () => {
  it('tracks usage and blocks spending once the session limit is reached', () => {
    expect(canSpend('echo', 50000)).toBe(true);

    recordUsage('echo', 49999);
    expect(canSpend('echo', 1)).toBe(true);
    expect(canSpend('echo', 2)).toBe(false);

    const usage = getUsage('echo');
    expect(usage.sessionTokensUsed).toBe(49999);
    expect(usage.dailyTokensUsed).toBe(49999);
  });

  it('resets only the session counter', () => {
    recordUsage('drift', 1500);
    resetSession('drift');

    const usage = getUsage('drift');
    expect(usage.sessionTokensUsed).toBe(0);
    expect(usage.dailyTokensUsed).toBe(1500);
  });
});
