import { TokenBudget } from '../types';

const SESSION_LIMIT = 50000;   // 50k tokens per agent per session
const DAILY_LIMIT = 200000;    // 200k tokens per agent per day

const budgets: Map<string, TokenBudget> = new Map();

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getBudget(agentId: string): TokenBudget {
  const existing = budgets.get(agentId);
  if (existing) return existing;

  // Check localStorage for daily persistence
  const storageKey = `wyrd_budget_${agentId}_${getDayKey()}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const parsed: TokenBudget = JSON.parse(stored);
    budgets.set(agentId, parsed);
    return parsed;
  }

  const fresh: TokenBudget = {
    agentId,
    sessionTokensUsed: 0,
    sessionTokenLimit: SESSION_LIMIT,
    dailyTokensUsed: 0,
    dailyTokenLimit: DAILY_LIMIT,
  };
  budgets.set(agentId, fresh);
  return fresh;
}

function persist(budget: TokenBudget): void {
  const storageKey = `wyrd_budget_${budget.agentId}_${getDayKey()}`;
  localStorage.setItem(storageKey, JSON.stringify(budget));
}

export function canSpend(agentId: string, estimatedTokens: number): boolean {
  const budget = getBudget(agentId);
  return (
    budget.sessionTokensUsed + estimatedTokens <= budget.sessionTokenLimit &&
    budget.dailyTokensUsed + estimatedTokens <= budget.dailyTokenLimit
  );
}

export function recordUsage(agentId: string, tokensUsed: number): void {
  const budget = getBudget(agentId);
  budget.sessionTokensUsed += tokensUsed;
  budget.dailyTokensUsed += tokensUsed;
  persist(budget);
}

export function getUsage(agentId: string): TokenBudget {
  return getBudget(agentId);
}

export function resetSession(agentId: string): void {
  const budget = getBudget(agentId);
  budget.sessionTokensUsed = 0;
  persist(budget);
}
