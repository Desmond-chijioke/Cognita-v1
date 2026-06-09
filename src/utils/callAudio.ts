// Generates call tones with Web Audio API — no external files needed.

let audioCtx: AudioContext | null = null;
let outgoingTimer: ReturnType<typeof setInterval> | null = null;
let incomingTimer: ReturnType<typeof setInterval> | null = null;
let ringAutoStop: ReturnType<typeof setTimeout> | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function scheduleTone(
  ctx:      AudioContext,
  freqs:    number[],
  start:    number,
  duration: number,
  volume = 0.28,
) {
  freqs.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.setValueAtTime(volume, start + duration - 0.012);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  });
}

// ── Outgoing "calling…" tone ──────────────────────────────────────────────────
// Ring-ring cadence: two beeps, 2-second cycle total so silence never feels like it stopped.

export function startOutgoingTone() {
  stopAll();
  const ctx = getCtx();
  if (!ctx) return;

  const play = () => {
    const t = ctx.currentTime;
    scheduleTone(ctx, [440, 480], t,       0.4);
    scheduleTone(ctx, [440, 480], t + 0.55, 0.4);
  };
  play();
  outgoingTimer = setInterval(play, 2000);
}

export function stopOutgoingTone() {
  if (outgoingTimer) { clearInterval(outgoingTimer); outgoingTimer = null; }
}

// ── Incoming ring ─────────────────────────────────────────────────────────────
// Higher pitch triple-beep — more urgent than the outgoing tone

export function startIncomingRing(autoStopMs = 30_000) {
  stopAll();
  const ctx = getCtx();
  if (!ctx) return;

  const play = () => {
    const t = ctx.currentTime;
    scheduleTone(ctx, [880, 988], t,        0.14);
    scheduleTone(ctx, [880, 988], t + 0.24, 0.14);
    scheduleTone(ctx, [880, 988], t + 0.48, 0.14);
  };
  play();
  incomingTimer = setInterval(play, 2000);

  // Auto-stop after `autoStopMs` so it doesn't ring forever
  if (ringAutoStop) clearTimeout(ringAutoStop);
  ringAutoStop = setTimeout(stopIncomingRing, autoStopMs);
}

export function stopIncomingRing() {
  if (incomingTimer) { clearInterval(incomingTimer); incomingTimer = null; }
  if (ringAutoStop)  { clearTimeout(ringAutoStop);   ringAutoStop  = null; }
}

export function stopAll() {
  stopOutgoingTone();
  stopIncomingRing();
}
