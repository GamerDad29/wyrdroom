let audioCtx: AudioContext | null = null;
let enabled = localStorage.getItem('wyrd_sound') !== 'off';

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function toggleSound(): boolean {
  enabled = !enabled;
  localStorage.setItem('wyrd_sound', enabled ? 'on' : 'off');
  return enabled;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08): void {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // audio not available
  }
}

function playSequence(notes: { freq: number; dur: number; delay: number; type?: OscillatorType; vol?: number }[]): void {
  for (const note of notes) {
    setTimeout(() => playTone(note.freq, note.dur, note.type || 'sine', note.vol || 0.06), note.delay);
  }
}

// === ROOM AMBIENT TONES (play on room switch) ===

export function playRoomTone(roomId: string): void {
  switch (roomId) {
    case 'main':
      // Warm open chord: welcoming
      playSequence([
        { freq: 440, dur: 0.2, delay: 0 },
        { freq: 554, dur: 0.2, delay: 80 },
        { freq: 659, dur: 0.25, delay: 160 },
      ]);
      break;
    case 'project':
      // Focused two-note: serious, clean
      playSequence([
        { freq: 523, dur: 0.15, delay: 0, type: 'triangle' },
        { freq: 784, dur: 0.2, delay: 100, type: 'triangle' },
      ]);
      break;
    case 'makers':
      // Playful descending bounce: creative energy
      playSequence([
        { freq: 880, dur: 0.1, delay: 0, type: 'square', vol: 0.04 },
        { freq: 740, dur: 0.1, delay: 80, type: 'square', vol: 0.04 },
        { freq: 660, dur: 0.1, delay: 160, type: 'square', vol: 0.04 },
        { freq: 880, dur: 0.15, delay: 260, type: 'square', vol: 0.05 },
      ]);
      break;
    default:
      playTone(600, 0.1, 'triangle', 0.05);
  }
}

// === AGENT-SPECIFIC TONES (play when agent responds) ===

export function playAgentTone(agentId: string): void {
  switch (agentId) {
    case 'gemma':
      // Warm, confident double-ping
      playSequence([
        { freq: 660, dur: 0.08, delay: 0, vol: 0.05 },
        { freq: 880, dur: 0.1, delay: 70, vol: 0.05 },
      ]);
      break;
    case 'mistral':
      // Quick sharp triplet: edgy, lateral
      playSequence([
        { freq: 740, dur: 0.05, delay: 0, type: 'square', vol: 0.04 },
        { freq: 932, dur: 0.05, delay: 50, type: 'square', vol: 0.04 },
        { freq: 740, dur: 0.07, delay: 100, type: 'square', vol: 0.04 },
      ]);
      break;
    case 'scribe':
      // Soft pen-scratch: low, subtle
      playSequence([
        { freq: 1200, dur: 0.03, delay: 0, type: 'triangle', vol: 0.02 },
        { freq: 1400, dur: 0.03, delay: 40, type: 'triangle', vol: 0.02 },
      ]);
      break;
    case 'cipher':
      // Digital click-burst: sharp, terminal-like
      playSequence([
        { freq: 1100, dur: 0.03, delay: 0, type: 'square', vol: 0.03 },
        { freq: 1300, dur: 0.03, delay: 30, type: 'square', vol: 0.04 },
        { freq: 900, dur: 0.04, delay: 60, type: 'square', vol: 0.03 },
      ]);
      break;
    case 'oracle':
      // Low resonant hum: deep, thoughtful
      playSequence([
        { freq: 330, dur: 0.15, delay: 0, type: 'sine', vol: 0.05 },
        { freq: 440, dur: 0.12, delay: 120, type: 'sine', vol: 0.04 },
      ]);
      break;
    case 'jinx':
      // Chaotic bounce: playful, unpredictable
      playSequence([
        { freq: 988, dur: 0.04, delay: 0, type: 'square', vol: 0.04 },
        { freq: 1175, dur: 0.04, delay: 40, type: 'square', vol: 0.05 },
        { freq: 784, dur: 0.04, delay: 80, type: 'square', vol: 0.04 },
        { freq: 1320, dur: 0.06, delay: 120, type: 'square', vol: 0.05 },
      ]);
      break;
    case 'sage':
      // Warm bell tone: calm, grounding
      playSequence([
        { freq: 396, dur: 0.25, delay: 0, type: 'sine', vol: 0.05 },
        { freq: 528, dur: 0.3, delay: 200, type: 'sine', vol: 0.04 },
      ]);
      break;
    case 'flux':
      // Connecting chime: two notes merging
      playSequence([
        { freq: 440, dur: 0.1, delay: 0, type: 'sine', vol: 0.05 },
        { freq: 660, dur: 0.1, delay: 60, type: 'sine', vol: 0.05 },
        { freq: 550, dur: 0.15, delay: 130, type: 'sine', vol: 0.06 },
      ]);
      break;
    case 'drift':
      // Distant horizon: slow rising tone
      playSequence([
        { freq: 300, dur: 0.2, delay: 0, type: 'triangle', vol: 0.04 },
        { freq: 400, dur: 0.2, delay: 150, type: 'triangle', vol: 0.05 },
        { freq: 500, dur: 0.25, delay: 300, type: 'triangle', vol: 0.04 },
      ]);
      break;
    case 'patch':
      // Precise click: editorial, clean
      playSequence([
        { freq: 800, dur: 0.04, delay: 0, type: 'square', vol: 0.03 },
        { freq: 1000, dur: 0.06, delay: 60, type: 'square', vol: 0.04 },
      ]);
      break;
    case 'echo':
      // Soft pulse: empathetic, warm
      playSequence([
        { freq: 440, dur: 0.15, delay: 0, type: 'sine', vol: 0.04 },
        { freq: 440, dur: 0.15, delay: 200, type: 'sine', vol: 0.03 },
      ]);
      break;
    default:
      playTone(880, 0.06, 'square', 0.04);
  }
}

// === AGENT ENTER/LEAVE SOUNDS ===

export function playAgentEnter(agentId: string): void {
  // Ascending vault-door chime, colored by agent
  const baseFreqs: Record<string, number> = {
    gemma: 440,
    mistral: 494,
    scribe: 392,
    cipher: 523,
    oracle: 370,
    jinx: 587,
    sage: 349,
    flux: 466,
    drift: 415,
    patch: 554,
    echo: 440,
  };
  const base = baseFreqs[agentId] || 440;
  playSequence([
    { freq: base, dur: 0.12, delay: 0, vol: 0.05 },
    { freq: base * 1.25, dur: 0.12, delay: 100, vol: 0.05 },
    { freq: base * 1.5, dur: 0.18, delay: 200, vol: 0.06 },
  ]);
}

export function playAgentLeave(agentId: string): void {
  // Descending tone: departure
  const baseFreqs: Record<string, number> = {
    gemma: 660,
    mistral: 740,
    scribe: 588,
    cipher: 784,
    oracle: 554,
    jinx: 880,
    sage: 523,
    flux: 698,
    drift: 622,
    patch: 830,
    echo: 660,
  };
  const base = baseFreqs[agentId] || 660;
  playSequence([
    { freq: base, dur: 0.12, delay: 0, vol: 0.04 },
    { freq: base * 0.75, dur: 0.15, delay: 100, vol: 0.04 },
    { freq: base * 0.5, dur: 0.2, delay: 200, vol: 0.03 },
  ]);
}

// === GENERAL SOUNDS ===

export function playEnterRoom(): void {
  playRoomTone('main');
}

export function playMessageSend(): void {
  playTone(520, 0.04, 'square', 0.03);
}

export function playMessageReceive(): void {
  playTone(880, 0.06, 'square', 0.04);
}

export function playError(): void {
  playSequence([
    { freq: 220, dur: 0.15, delay: 0, type: 'sawtooth', vol: 0.05 },
    { freq: 180, dur: 0.2, delay: 120, type: 'sawtooth', vol: 0.04 },
  ]);
}

export function playRoomSwitch(roomId: string): void {
  playRoomTone(roomId);
}

export function playHeyAll(): void {
  // Broadcast chime: attention everyone
  playSequence([
    { freq: 660, dur: 0.08, delay: 0, type: 'triangle', vol: 0.06 },
    { freq: 660, dur: 0.08, delay: 100, type: 'triangle', vol: 0.06 },
    { freq: 880, dur: 0.15, delay: 200, type: 'triangle', vol: 0.07 },
  ]);
}

export function playIdleChatter(): void {
  // Soft murmur: agents talking amongst themselves
  playSequence([
    { freq: 500, dur: 0.06, delay: 0, type: 'sine', vol: 0.02 },
    { freq: 600, dur: 0.06, delay: 80, type: 'sine', vol: 0.02 },
  ]);
}

export function playMentionAlert(): void {
  // Vault-Tec attention chime: ascending triangle, clear and distinct
  playSequence([
    { freq: 784, dur: 0.12, delay: 0, type: 'triangle', vol: 0.08 },
    { freq: 988, dur: 0.12, delay: 120, type: 'triangle', vol: 0.08 },
    { freq: 1175, dur: 0.18, delay: 240, type: 'triangle', vol: 0.09 },
  ]);
}
