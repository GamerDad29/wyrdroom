export type Expression =
  | 'idle'
  | 'blink'
  | 'talk'
  | 'laugh'
  | 'think'
  | 'surprised'
  | 'smirk'
  | 'focused'
  | 'look-left'
  | 'look-right'
  | 'nod'
  | 'eyebrow-raise';

// Detect expression from message content
export function detectExpression(content: string): Expression {
  const lower = content.toLowerCase();

  // Laughter
  if (/\b(lol|lmao|haha|heh|rofl|😂|🤣)\b/.test(lower)) return 'laugh';

  // Surprise
  if (/\b(whoa|wow|wait what|no way|holy|omg|wtf)\b/.test(lower)) return 'surprised';

  // Thinking / questions
  if (/\b(hmm|interesting|let me think|good question|wonder)\b/.test(lower)) return 'think';
  if (content.trim().endsWith('?') && content.length > 20) return 'think';

  // Smirk / sardonic
  if (/\b(honestly|actually|well|technically|to be fair)\b/.test(lower)) return 'smirk';

  // Focused / serious
  if (/\b(plan|architecture|deploy|build|ship|execute|strategy)\b/.test(lower)) return 'focused';

  // Eyebrow raise / skepticism
  if (/\b(really|sure about|you sure|bold move|risky)\b/.test(lower)) return 'eyebrow-raise';

  return 'idle';
}

// Idle animation sequence weights per agent personality
export interface IdlePattern {
  expression: Expression;
  duration: number; // ms to hold
  weight: number;   // relative probability
}

export const agentIdlePatterns: Record<string, IdlePattern[]> = {
  gemma: [
    { expression: 'blink', duration: 200, weight: 40 },
    { expression: 'look-left', duration: 1500, weight: 10 },
    { expression: 'look-right', duration: 1200, weight: 10 },
    { expression: 'nod', duration: 800, weight: 5 },
    { expression: 'focused', duration: 2000, weight: 15 },
    { expression: 'idle', duration: 3000, weight: 20 },
  ],
  mistral: [
    { expression: 'blink', duration: 150, weight: 30 },
    { expression: 'look-left', duration: 800, weight: 15 },
    { expression: 'look-right', duration: 900, weight: 15 },
    { expression: 'smirk', duration: 1500, weight: 15 },
    { expression: 'eyebrow-raise', duration: 1000, weight: 10 },
    { expression: 'idle', duration: 2000, weight: 15 },
  ],
  scribe: [
    { expression: 'blink', duration: 250, weight: 35 },
    { expression: 'look-left', duration: 2000, weight: 5 },
    { expression: 'focused', duration: 3000, weight: 30 },
    { expression: 'nod', duration: 600, weight: 10 },
    { expression: 'idle', duration: 4000, weight: 20 },
  ],
  christopher: [
    { expression: 'blink', duration: 200, weight: 40 },
    { expression: 'look-left', duration: 1000, weight: 10 },
    { expression: 'look-right', duration: 1000, weight: 10 },
    { expression: 'idle', duration: 3000, weight: 40 },
  ],
};

export function pickIdleAnimation(agentId: string): IdlePattern {
  const patterns = agentIdlePatterns[agentId] || agentIdlePatterns.christopher;
  const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const pattern of patterns) {
    roll -= pattern.weight;
    if (roll <= 0) return pattern;
  }
  return patterns[0];
}
