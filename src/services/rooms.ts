import { Room } from '../types';

// Room ids are internal and stay the same across the Wyrdroom rebrand so
// that persisted message history (keyed on roomId) keeps working.
// Only user-facing names and descriptions flip to the Norse hall naming.
export const rooms: Room[] = [
  {
    id: 'main',
    name: 'Main Hall',
    description: 'The great hall. Full crew. Speak your mind.',
    icon: '\u25C8',
    agents: ['gemma', 'mistral', 'scribe', 'cipher', 'oracle', 'jinx', 'sage', 'flux', 'drift', 'patch', 'echo'],
  },
  {
    id: 'project',
    name: 'War Room',
    description: 'Focused work. Strategy, architecture, code.',
    icon: '\u25A3',
    agents: ['gemma', 'cipher', 'oracle', 'patch', 'scribe'],
  },
  {
    id: 'makers',
    name: 'The Forge',
    description: 'Creative builds. Brainstorm, break things, make things.',
    icon: '\u2692',
    agents: ['mistral', 'jinx', 'sage', 'echo', 'scribe'],
  },
  {
    id: 'vision',
    name: 'The Loom',
    description: 'Forward-looking. Ideas, trends, what comes next.',
    icon: '\u2605',
    agents: ['jinx', 'drift', 'flux', 'oracle', 'echo', 'scribe'],
  },
];

export function getRoom(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}
