// NOVA EMBER — synthesised sound: every effect and the music loop,
// made with the Web Audio API. No audio files, no network.
// One file, one job: all sound.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  // Created only after a user gesture (autoplay policy). Silent until then.
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.2, delay = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.25, from = 1200, to = 100, delay = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
  }

  // A slow minor-key pulse: bass root notes with a soft pad fifth above.
  // 8 steps a bar, 132 BPM eighth notes.
  const BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 0, 73.42, 0];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(() => {
      if (!ctx || muted) return;
      const step = BASS[musicStep % BASS.length];
      musicStep += 1;
      if (step > 0) {
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(step, t0);
        g.gain.setValueAtTime(0.5, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
        osc.connect(g).connect(musicGain);
        osc.start(t0);
        osc.stop(t0 + 0.45);
        if (musicStep % 8 === 1) {
          const pad = ctx.createOscillator();
          const pg = ctx.createGain();
          pad.type = 'sine';
          pad.frequency.setValueAtTime(step * 4, t0);
          pg.gain.setValueAtTime(0.12, t0);
          pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
          pad.connect(pg).connect(musicGain);
          pad.start(t0);
          pad.stop(t0 + 1.7);
        }
      }
    }, 227);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    shoot() { tone({ type: 'square', from: 920, to: 420, dur: 0.07, vol: 0.07 }); },
    enemyDie() { noise({ dur: 0.22, vol: 0.22, from: 1400, to: 120 }); tone({ type: 'sine', from: 320, to: 55, dur: 0.22, vol: 0.18 }); },
    playerHit() { tone({ type: 'sawtooth', from: 220, to: 40, dur: 0.32, vol: 0.25 }); noise({ dur: 0.3, vol: 0.2, from: 900, to: 80 }); },
    pickup() { tone({ type: 'sine', from: 660, to: 990, dur: 0.09, vol: 0.14 }); tone({ type: 'sine', from: 990, to: 1320, dur: 0.09, vol: 0.1, delay: 0.07 }); },
    powerup() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.12, vol: 0.14, delay: i * 0.07 })); },
    nova() { noise({ dur: 0.7, vol: 0.3, from: 2400, to: 60 }); tone({ type: 'sine', from: 160, to: 30, dur: 0.65, vol: 0.3 }); },
    waveClear() { tone({ type: 'triangle', from: 523, dur: 0.14, vol: 0.16 }); tone({ type: 'triangle', from: 784, dur: 0.2, vol: 0.16, delay: 0.12 }); },
    bossWarn() { tone({ type: 'sawtooth', from: 110, to: 55, dur: 0.5, vol: 0.2 }); tone({ type: 'sawtooth', from: 116, to: 58, dur: 0.5, vol: 0.16, delay: 0.05 }); },
    dash() { noise({ dur: 0.14, vol: 0.1, from: 3000, to: 500 }); },
    gameOver() { [392, 311, 233, 175].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.16, delay: i * 0.22 })); },
    riftBlast() { tone({ type: 'sine', from: 90, to: 24, dur: 0.5, vol: 0.3 }); noise({ dur: 0.45, vol: 0.2, from: 1800, to: 90 }); },
  };
}
