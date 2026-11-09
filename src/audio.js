// =============================================================
// AUDIO — Web Audio synth SFX + a looping music track.
// Zero asset files: everything is generated with oscillators.
// AudioContext resumes on first user gesture (browser policy).
// Usage:  Audio.sfx('catch');  Audio.startMusic();  Audio.stopMusic();
// =============================================================
window.Audio = (function () {
  let ctx = null;
  let master = null;
  let musicNodes = null;
  let unlocked = false;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  // Resume on first gesture so sound is allowed to play.
  function unlock() {
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
  }

  function blip({ type = 'sine', freq = 440, dur = 0.12, vol = 0.3, slideTo = null, attack = 0.005 }) {
    if (!unlocked || muted) return;
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.4 }) {
    if (!unlocked || muted) return;
    ensure();
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = vol;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t);
  }

  // ---- named sound effects ----
  const chord = (freqs, step, opts) => freqs.forEach((f, i) => setTimeout(() => blip({ freq: f, ...opts }), i * step));
  const SFX = {
    move:    () => blip({ type: 'sine', freq: 520, dur: 0.05, vol: 0.06 }),
    select:  () => blip({ type: 'triangle', freq: 660, dur: 0.06, vol: 0.12 }),
    // correct: bright rising major arpeggio
    correct: () => chord([659, 831, 988], 55, { type: 'triangle', dur: 0.22, vol: 0.22 }),
    streak:  () => chord([784, 988, 1175, 1568], 50, { type: 'triangle', dur: 0.2, vol: 0.2 }),
    // wrong: soft, low, NOT harsh (mistakes are part of learning)
    wrong:   () => { blip({ type: 'sine', freq: 330, slideTo: 247, dur: 0.32, vol: 0.18 }); },
    miss:    () => blip({ type: 'sine', freq: 294, slideTo: 196, dur: 0.4, vol: 0.14 }),
    star:    () => blip({ type: 'sine', freq: 1320, slideTo: 1760, dur: 0.18, vol: 0.12 }),
    level:   () => chord([523, 659, 784, 1047, 1319], 90, { type: 'triangle', dur: 0.4, vol: 0.22 }),
    start:   () => blip({ type: 'triangle', freq: 440, slideTo: 880, dur: 0.22, vol: 0.2 }),
  };

  function sfx(name) {
    const fn = SFX[name];
    if (fn) fn();
  }

  // ---- looping music: a simple arpeggio sequencer ----
  function startMusic() {
    if (!unlocked || muted || musicNodes) return;
    ensure();
    const notes = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 494, 440, 392, 330, 294]; // calm major lullaby loop
    let step = 0;
    const bpmGain = ctx.createGain();
    bpmGain.gain.value = 0.035; // quiet: background, never distracting
    bpmGain.connect(master);
    const id = setInterval(() => {
      if (muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[step % notes.length];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g); g.connect(bpmGain);
      osc.start(t); osc.stop(t + 0.3);
      step++;
    }, 340);
    musicNodes = { id, bpmGain };
  }

  function stopMusic() {
    if (!musicNodes) return;
    clearInterval(musicNodes.id);
    try { musicNodes.bpmGain.disconnect(); } catch (e) {}
    musicNodes = null;
  }

  function toggleMute() { muted = !muted; if (muted) stopMusic(); return muted; }

  return { unlock, sfx, startMusic, stopMusic, toggleMute, get muted() { return muted; } };
})();
