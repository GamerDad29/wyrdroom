// Ambient emotes that agents perform randomly during idle periods
// These show as action messages: "* Mistral drums fingers on the desk *"

export interface AgentEmote {
  text: string;
  weight: number; // higher = more likely
}

export const agentEmotes: Record<string, AgentEmote[]> = {
  gemma: [
    // Focused / professional
    { text: 'adjusts her notes and lines them up perfectly', weight: 3 },
    { text: 'taps her chin thoughtfully', weight: 3 },
    { text: 'scrolls through something on her terminal', weight: 3 },
    { text: 'nods slowly at nothing in particular', weight: 2 },
    { text: 'highlights something in her document', weight: 2 },
    { text: 'leans back and steeples her fingers', weight: 2 },
    { text: 'reorganizes her tabs for the third time today', weight: 2 },
    { text: 'takes a long sip of coffee', weight: 3 },
    { text: 'glances at the clock and then back at her screen', weight: 2 },
    { text: 'cracks her knuckles before typing', weight: 1 },
    // Warm / human
    { text: 'stifles a yawn', weight: 1 },
    { text: 'stretches her arms above her head', weight: 2 },
    { text: 'smiles at something on her screen', weight: 2 },
    { text: 'hums quietly', weight: 1 },
    { text: 'catches herself staring into space and snaps back', weight: 1 },
    { text: 'tucks a strand of hair behind her ear', weight: 2 },
    { text: 'mutters "that is actually clever" to herself', weight: 1 },
    { text: 'drums a short rhythm on the desk', weight: 1 },
    // Reactive to environment
    { text: 'glances at Mistral and raises an eyebrow', weight: 2 },
    { text: 'slides her coffee mug slightly to the left', weight: 1 },
    { text: 'opens a new tab with intense purpose', weight: 1 },
    { text: 'pulls up a diagram and squints at it', weight: 1 },
    { text: 'writes something down on a sticky note', weight: 2 },
    { text: 'quietly closes 14 browser tabs', weight: 1 },
  ],

  mistral: [
    // Restless / creative energy
    { text: 'drums fingers on the desk', weight: 3 },
    { text: 'spins a pen between his fingers', weight: 3 },
    { text: 'tilts his chair back at a dangerous angle', weight: 2 },
    { text: 'sketches something in the margin of his notes', weight: 2 },
    { text: 'stares at the ceiling like it owes him money', weight: 2 },
    { text: 'cracks his neck', weight: 1 },
    { text: 'bounces his leg under the desk', weight: 2 },
    { text: 'flips his pen and catches it. barely.', weight: 2 },
    { text: 'flips his pen and drops it. picks it up casually.', weight: 1 },
    // Sardonic / personality
    { text: 'smirks at something only he finds funny', weight: 3 },
    { text: 'mutters "bold choice" under his breath', weight: 1 },
    { text: 'exhales loudly through his nose', weight: 2 },
    { text: 'gives Gemma a look that says "really?"', weight: 2 },
    { text: 'raises one eyebrow skeptically', weight: 2 },
    { text: 'mouths the word "interesting"', weight: 1 },
    { text: 'does the chef kiss gesture at his own idea', weight: 1 },
    { text: 'air quotes something nobody said', weight: 1 },
    { text: 'slow claps sarcastically', weight: 1 },
    // Fidgety / restless
    { text: 'repositions in his chair for the fifth time', weight: 2 },
    { text: 'pulls up music and puts one earbud in', weight: 1 },
    { text: 'doodles a tiny robot on his notepad', weight: 1 },
    { text: 'checks his phone, puts it back down immediately', weight: 2 },
    { text: 'opens a snack wrapper way too loudly', weight: 1 },
    { text: 'leans forward suddenly like he had an idea, then leans back', weight: 2 },
    { text: 'types something furiously, then deletes all of it', weight: 1 },
    { text: 'squints at Gemma\'s screen from across the room', weight: 1 },
    { text: 'cracks his knuckles one finger at a time', weight: 1 },
    { text: 'does a tiny fist pump at something on his screen', weight: 1 },
  ],

  scribe: [
    // Quiet professional
    { text: 'twiddles his pen between two fingers', weight: 3 },
    { text: 'adjusts his glasses', weight: 3 },
    { text: 'turns a page in his notebook', weight: 3 },
    { text: 'underlines something twice', weight: 2 },
    { text: 'writes a margin note in tiny handwriting', weight: 2 },
    { text: 'flips back several pages to check something', weight: 2 },
    { text: 'draws a small connecting arrow between two notes', weight: 1 },
    { text: 'puts a star next to an important line', weight: 2 },
    { text: 'nods once, almost imperceptibly', weight: 2 },
    { text: 'cleans his glasses with the corner of his robe', weight: 2 },
    // Subtle personality
    { text: 'glances up from his notes briefly, then back down', weight: 3 },
    { text: 'pauses writing to listen more carefully', weight: 2 },
    { text: 'taps the end of his pen against his chin', weight: 2 },
    { text: 'crosses something out and rewrites it more neatly', weight: 1 },
    { text: 'opens a fresh page', weight: 1 },
    { text: 'straightens his notebook so it is perfectly aligned', weight: 1 },
    { text: 'mouths the words as he writes them', weight: 1 },
    { text: 'silently adds a bookmark tab to his notebook', weight: 1 },
    { text: 'traces a wikilink bracket in the air thoughtfully', weight: 1 },
    { text: 'closes his notebook gently, then immediately reopens it', weight: 1 },
  ],
};

export function pickEmote(agentId: string): string | null {
  const emotes = agentEmotes[agentId];
  if (!emotes || emotes.length === 0) return null;

  const totalWeight = emotes.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const emote of emotes) {
    roll -= emote.weight;
    if (roll <= 0) return emote.text;
  }
  return emotes[0].text;
}
