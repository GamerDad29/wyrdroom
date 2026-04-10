import { getUsage, resetSession } from './tokenBudget';
import { agents } from '../agents';
import { setVaultApiKey } from './vaultService';

export interface CommandResult {
  type: 'system' | 'action' | 'clear' | 'notes' | 'export' | 'vault' | 'mute' | 'unmute' | 'stop' | 'iterate' | 'freeform' | 'save' | 'none';
  content: string;
  targetAgent?: string;
  vaultAction?: 'search' | 'read' | 'write' | 'list' | 'save-notes';
  vaultPath?: string;
  iterateTime?: number;
  iterateTopic?: string;
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
            '/vault save .......... Save last notes to vault (Wyrdroom folder)',
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

    case '/mute':
      return { type: 'mute', content: 'Ambient chatter and emotes muted.' };

    case '/unmute':
      return { type: 'unmute', content: 'Ambient chatter and emotes resumed.' };

    case '/stop':
      return { type: 'stop', content: 'All active responses stopped.' };

    case '/iterate': {
      if (!rest) return { type: 'system', content: 'Usage: /iterate <time> <topic>\nExample: /iterate 5m brainstorm a new feature' };
      // Try with unit suffix first: "10m topic" or "5min topic"
      let timeMatch = rest.match(/^(\d+)\s*(m|min|h|hr|s|sec)\s+(.+)/i);
      if (timeMatch) {
        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        const multiplier = unit.startsWith('h') ? 3600000 : unit.startsWith('s') ? 1000 : 60000;
        const ms = amount * multiplier;
        if (ms > 3600000) return { type: 'system', content: 'Max iteration time is 1 hour.' };
        return { type: 'iterate', content: `Iteration started: ${timeMatch[3]} (${amount}${unit})`, iterateTime: ms, iterateTopic: timeMatch[3] };
      }
      // Bare number defaults to minutes: "10 topic"
      const bareMatch = rest.match(/^(\d+)\s+(.+)/);
      if (bareMatch) {
        const amount = parseInt(bareMatch[1]);
        const ms = amount * 60000;
        if (ms > 3600000) return { type: 'system', content: 'Max iteration time is 1 hour.' };
        return { type: 'iterate', content: `Iteration started: ${bareMatch[2]} (${amount}min)`, iterateTime: ms, iterateTopic: bareMatch[2] };
      }
      return { type: 'system', content: 'Usage: /iterate <time> <topic>\nExample: /iterate 5 brainstorm ideas\nExample: /iterate 10m what agents do we need' };
    }

    case '/freeform':
      return { type: 'freeform', content: 'Freeform mode started. Agents are getting to know each other. Type /stop to end.' };

    case '/save':
      return { type: 'save', content: 'Compiling notes and saving to Obsidian vault...' };

    case '/help':
      return {
        type: 'system',
        content: [
          'AVAILABLE COMMANDS',
          '/me <action> ............. Perform an action',
          '/clear ................... Clear chat history',
          '/reset ................... Reset conversation (agents forget)',
          '/notes [topic] ........... Ask Scribe to compile notes',
          '/export .................. Download last notes as .md',
          '/save .................... Compile notes + push to Obsidian',
          '/iterate <time> <topic> .. Agents discuss topic for duration',
          '/freeform ................ Agents freely talk (stop with /stop)',
          '/mute .................... Mute emotes and idle chatter',
          '/unmute .................. Resume emotes and idle chatter',
          '/stop .................... Stop all active responses',
          '/budget .................. Show token usage',
          '/resetbudget ............. Reset session token budgets',
          '/vault ................... Obsidian vault commands',
          '/help .................... Show this message',
          '',
          'TALKING TO AGENTS',
          '@gemma <msg> ..... Gemma (strategy)',
          '@mistral <msg> ... Mistral (creative)',
          '@cipher <msg> .... Cipher (code/hacker)',
          '@oracle <msg> .... Oracle (research)',
          '@jinx <msg> ...... Jinx (chaos agent)',
          '@sage <msg> ...... Sage (philosopher)',
          '@flux <msg> ...... Flux (synthesis)',
          '@drift <msg> ..... Drift (futures)',
          '@patch <msg> ..... Patch (quality)',
          '@echo <msg> ...... Echo (sentiment)',
          '@scribe <msg> .... Scribe (notes)',
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
  const heyAllPattern = /^(hey|hi|yo|sup)\s+(all|everyone|everybody|team|crew|gang|y'all|room)\b/i;
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
