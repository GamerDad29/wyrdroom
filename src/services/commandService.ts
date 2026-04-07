import { getUsage, resetSession } from './tokenBudget';
import { agents } from '../agents';

export interface CommandResult {
  type: 'system' | 'action' | 'clear' | 'none';
  content: string;
}

export function parseCommand(input: string, _userId: string, userName: string): CommandResult | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');

  switch (cmd) {
    case '/me':
      if (!rest) return { type: 'system', content: 'Usage: /me <action>' };
      return { type: 'action', content: `* ${userName} ${rest} *` };

    case '/clear':
      return { type: 'clear', content: 'Chat cleared.' };

    case '/reset':
      return { type: 'clear', content: 'Conversation reset. Gemma has forgotten everything.' };

    case '/budget': {
      const lines = agents.map((agent) => {
        const usage = getUsage(agent.id);
        const sessionPct = Math.round((usage.sessionTokensUsed / usage.sessionTokenLimit) * 100);
        const dailyPct = Math.round((usage.dailyTokensUsed / usage.dailyTokenLimit) * 100);
        return `${agent.name}: session ${usage.sessionTokensUsed.toLocaleString()}/${usage.sessionTokenLimit.toLocaleString()} (${sessionPct}%) | daily ${usage.dailyTokensUsed.toLocaleString()}/${usage.dailyTokenLimit.toLocaleString()} (${dailyPct}%)`;
      });
      return { type: 'system', content: `TOKEN BUDGET\n${lines.join('\n')}` };
    }

    case '/resetbudget': {
      agents.forEach((agent) => resetSession(agent.id));
      return { type: 'system', content: 'Session token budgets reset for all agents.' };
    }

    case '/help':
      return {
        type: 'system',
        content: [
          'AVAILABLE COMMANDS',
          '/me <action> .... Perform an action',
          '/clear .......... Clear chat history',
          '/reset .......... Reset conversation (Gemma forgets)',
          '/budget ......... Show token usage',
          '/resetbudget .... Reset session token budgets',
          '/help ........... Show this message',
        ].join('\n'),
      };

    default:
      return { type: 'system', content: `Unknown command: ${cmd}. Type /help for a list.` };
  }
}
