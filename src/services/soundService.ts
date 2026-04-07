let audioCtx: AudioContext | null = null;
let enabled = localStorage.getItem('apoc_sound') !== 'off';

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
  localStorage.setItem('apoc_sound', enabled ? 'on' : 'off');
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

export function playEnterRoom(): void {
  // Ascending two-note chime: vault door opening
  playTone(440, 0.15, 'sine', 0.06);
  setTimeout(() => playTone(660, 0.2, 'sine', 0.06), 120);
}

export function playMessageReceive(): void {
  // Short terminal blip
  playTone(880, 0.06, 'square', 0.04);
}

export function playMessageSend(): void {
  // Lower click
  playTone(520, 0.04, 'square', 0.03);
}

export function playTyping(): void {
  // Subtle keypress
  playTone(1200, 0.02, 'square', 0.02);
}

export function playError(): void {
  // Descending buzz
  playTone(220, 0.2, 'sawtooth', 0.05);
}

export function playRoomSwitch(): void {
  // Quick sweep
  playTone(600, 0.08, 'triangle', 0.05);
  setTimeout(() => playTone(800, 0.1, 'triangle', 0.05), 60);
}
