import { AgentMood } from '../types';

interface MoodState {
  mood: AgentMood;
  label: string;
}

export function getAgentMood(messageCount: number): MoodState {
  const hour = new Date().getHours();

  // Time-of-day base mood
  if (hour >= 5 && hour < 9) {
    return { mood: 'caffeinated', label: 'caffeinated' };
  }
  if (hour >= 9 && hour < 17) {
    // During work hours, mood shifts with conversation depth
    if (messageCount > 30) {
      return { mood: 'reflective', label: 'reflective' };
    }
    if (messageCount > 15) {
      return { mood: 'focused', label: 'deep focus' };
    }
    return { mood: 'focused', label: 'focused' };
  }
  if (hour >= 17 && hour < 21) {
    if (messageCount > 20) {
      return { mood: 'reflective', label: 'reflective' };
    }
    return { mood: 'curious', label: 'curious' };
  }
  // Late night
  if (messageCount > 10) {
    return { mood: 'winding down', label: 'winding down' };
  }
  return { mood: 'reflective', label: 'night owl mode' };
}

export function getMoodEmoji(mood: AgentMood): string {
  switch (mood) {
    case 'focused': return '\u25C9';
    case 'caffeinated': return '\u2607';
    case 'curious': return '\u2609';
    case 'reflective': return '\u263E';
    case 'winding down': return '\u2600';
  }
}
