import { getUsage, resetSession } from './tokenBudget';
import { agents } from '../agents';
import { setVaultApiKey } from './vaultService';

export interface CommandResult {
  type: 'system' | 'action' | 'clear' | 'notes' | 'export' | 'vault' | 'none';
  content: string;
  targetAgent?: string;
  vaultAction?: 'search' | 'read' | 'write' | 'list' | 'save-notes';
  vaultPath?: string;
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
      return { type: 'clear', content: 'Conversation reset. All agents have forgotten everything.' };

    case '/notes':
      return { type: 'notes', content: rest || 'Compile notes from this conversation.', targetAgent: 'scribe' };

    case '/export':
      return { type: 'export', content: 'Exporting notes...' };

    case '/budget': {
      const lines = agents.map((agent) => {
        const usage = getUsage(agent.id);
        const sessionPct = Math.round((usage.sessionTokensUsed / usage.sessionTokenLimit) * 100);
        const dailyPct = Math.round((usage.dailyTokensUsed / usage.dailyTokenLimit) * 100);
        const cost = agent.modelId.includes(':free') ? 'FREE' : `${sessionPct}%`;
        return `${agent.name}: session ${usage.sessionTokensUsed.toLocaleString()}/${usage.sessionTokenLimit.toLocaleString()} (${cost}) | daily ${usage.dailyTokensUsed.toLocaleString()}/${usage.dailyTokenLimit.toLocaleString()} (${dailyPct}%)`;
      });
      return { type: 'system', content: `TOKEN BUDGET\n${lines.join('\n')}` };
    }

    case '/resetbudget': {
      agents.forEach((agent) => resetSession(agent.id));
      return { type: 'system', content: 'Session token budgets reset for all agents.' };
    }

    case '/vault': {
      const subParts = rest.split(/\s+/);
      const subCmd = subParts[0]?.toLowerCase();
      const subRest = subParts.slice(1).join(' ');

      if (!subCmd) {
        return {
          type: 'system',
          content: [
            'VAULT COMMANDS',
            '/vault key <key> ..... Set Obsidian REST API key',
            '/vault search <q> .... Search vault for notes',
            '/vault read <path> ... Read a note into chat',
            '/vault write <path> .. Write last Scribe notes to vault',
            '/vault list [folder] . List files in vault',
            '/vault save .......... Save last notes to vault (APOC folder)',
          ].join('\n'),
        };
      }

      switch (subCmd) {
        case 'key':
          if (!subRest) return { type: 'system', content: 'Usage: /vault key <your-api-key>' };
          setVaultApiKey(subRest);
          return { type: 'system', content: 'Vault API key saved.' };

        case 'search':
          if (!subRest) return { type: 'system', content: 'Usage: /vault search <query>' };
          return { type: 'vault', content: subRest, vaultAction: 'search' };

        case 'read':
          if (!subRest) return { type: 'system', content: 'Usage: /vault read <path/to/note.md>' };
          return { type: 'vault', content: subRest, vaultAction: 'read', vaultPath: subRest };

        case 'write':
          if (!subRest) return { type: 'system', content: 'Usage: /vault write <path/to/note.md>' };
          return { type: 'vault', content: subRest, vaultAction: 'write', vaultPath: subRest };

        case 'list':
          return { type: 'vault', content: subRest || '', vaultAction: 'list', vaultPath: subRest || undefined };

        case 'save':
          return { type: 'vault', content: 'save', vaultAction: 'save-notes' };

        default:
          return { type: 'system', content: `Unknown vault command: ${subCmd}. Type /vault for help.` };
      }
    }

    case '/help':
      return {
        type: 'system',
        content: [
          'AVAILABLE COMMANDS',
          '/me <action> ..... Perform an action',
          '/clear ........... Clear chat history',
          '/reset ........... Reset conversation (agents forget)',
          '/notes [topic] ... Ask Scribe to compile session notes',
          '/export .......... Download last notes as .md',
          '/budget .......... Show token usage',
          '/resetbudget ..... Reset session token budgets',
          '/vault ........... Obsidian vault commands (type /vault for list)',
          '/help ............ Show this message',
          '',
          'TALKING TO AGENTS',
          '@gemma <msg> ..... Direct message to Gemma',
          '@mistral <msg> ... Direct message to Mistral',
          '@scribe <msg> .... Direct message to Scribe',
          'hey all .......... All agents respond',
          '',
          'Unaddressed messages go to chat but',
          'do NOT auto-trigger any agent.',
        ].join('\n'),
      };

    default:
      return { type: 'system', content: `Unknown command: ${cmd}. Type /help for a list.` };
  }
}

export function parseTargetAgent(text: string): { agentId: string | null; cleanText: string; heyAll: boolean } {
  const heyAllPattern = /^hey\s+(all|everyone|everybody|team|crew|gang|y'all)\b/i;
  if (heyAllPattern.test(text.trim())) {
    return { agentId: null, cleanText: text, heyAll: true };
  }

  const match = text.match(/^@(\w+)\s+([\s\S]+)/);
  if (!match) return { agentId: null, cleanText: text, heyAll: false };

  const name = match[1].toLowerCase();
  const agent = agents.find((a) => a.id === name || a.name.toLowerCase() === name);
  if (!agent) return { agentId: null, cleanText: text, heyAll: false };

  return { agentId: agent.id, cleanText: match[2], heyAll: false };
}
