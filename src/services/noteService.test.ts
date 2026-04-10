import { describe, expect, it } from 'vitest';
import { buildNotesPrompt } from './noteService';
import { Message } from '../types';

function makeMessage(index: number, type: Message['type']): Message {
  return {
    id: `msg-${index}`,
    senderId: type === 'user' ? 'christopher' : type === 'agent' ? 'echo' : 'system',
    senderName: type === 'user' ? 'Christopher' : type === 'agent' ? 'Echo' : 'System',
    senderColor: '#fff',
    avatarUrl: '',
    content: `${type}-${index}`,
    timestamp: index,
    type,
    roomId: 'main',
  };
}

describe('noteService', () => {
  it('builds a transcript from the last 50 non-system messages only', () => {
    const messages: Message[] = [
      makeMessage(0, 'system'),
      ...Array.from({ length: 52 }, (_, offset) =>
        makeMessage(offset + 1, offset % 2 === 0 ? 'user' : 'agent'),
      ),
    ];

    const prompt = buildNotesPrompt(messages, 'Main Room');

    expect(prompt).toContain('Compile notes from this Main Room conversation.');
    expect(prompt).not.toContain('system-0');
    expect(prompt).not.toContain('Christopher: user-1\n');
    expect(prompt).toContain('Christopher: user-3');
    expect(prompt).toContain('Echo: agent-52');
  });
});
