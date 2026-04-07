import { Room } from '../types';

export const rooms: Room[] = [
  {
    id: 'main',
    name: 'Main Room',
    description: 'General comms. All agents active. Say what you need.',
    icon: '\u25C8',
    agents: ['gemma', 'mistral', 'scribe'],
  },
  {
    id: 'project',
    name: 'Project Room',
    description: 'Focused work. Specs, roadmaps, architecture, code reviews.',
    icon: '\u25A3',
    agents: ['gemma', 'mistral', 'scribe'],
  },
  {
    id: 'makers',
    name: 'Makers Space',
    description: 'Creative builds. Brainstorm, prototype, break things, ship.',
    icon: '\u2692',
    agents: ['gemma', 'mistral', 'scribe'],
  },
];

export function getRoom(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}
