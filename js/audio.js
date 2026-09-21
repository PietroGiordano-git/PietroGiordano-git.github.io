/* ============================================================
   AUDIO — chiptune generato via Web Audio API, nessun file esterno.
   Un piccolo loop musicale in stile 8-bit, passi e un "blip" per
   i dialoghi. Si avvia al primo input dell'utente (i browser
   bloccano l'audio automatico prima di un gesto dell'utente).
   ============================================================ */

const Audio8bit = (() => {
  let ctx, masterGain, musicGain, sfxGain;
  let started = false;
  let muted = false;
  let musicTimer = null;
  let stepIndex = 0;

  // Melodia in pentatonica maggiore — leggera, adatta a un loop
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33];
  const BASS = 130.81; // C3

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      masterGain = ctx.createGain(); masterGain.gain.value = 0.4; masterGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.3; musicGain.connect(masterGain);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(masterGain);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function playTone(freq, duration, type, dest, startTime, peak) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peak, startTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  function scheduleMusicStep() {
    musicTimer = setTimeout(scheduleMusicStep, 320);
    if (muted || !ctx) return;
    const now = ctx.currentTime;
    const note = MELODY[stepIndex % MELODY.length];
    playTone(note, 0.26, 'triangle', musicGain, now, 0.16);
    if (stepIndex % 4 === 0) playTone(BASS, 0.5, 'square', musicGain, now, 0.09);
    stepIndex++;
  }

  function start() {
    if (!ensureContext()) return;
    if (started) return;
    started = true;
    scheduleMusicStep();
  }

  function footstep() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    playTone(150 + Math.random() * 18, 0.055, 'square', sfxGain, now, 0.09);
  }

  function blip() {
    if (!ensureContext() || muted) return;
    const now = ctx.currentTime;
    playTone(660, 0.05, 'square', sfxGain, now, 0.16);
    playTone(880, 0.06, 'square', sfxGain, now + 0.045, 0.14);
  }

  function doorChime() {
    if (!ensureContext() || muted) return;
    const now = ctx.currentTime;
    playTone(440, 0.09, 'triangle', sfxGain, now, 0.18);
    playTone(587.33, 0.12, 'triangle', sfxGain, now + 0.08, 0.16);
    playTone(880, 0.16, 'triangle', sfxGain, now + 0.17, 0.14);
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 0.4, ctx.currentTime, 0.05);
    return muted;
  }

  function isMuted() { return muted; }

  return { start, footstep, blip, doorChime, toggleMute, isMuted };
})();
