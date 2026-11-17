// NOVA EMBER — wave flow: starting a wave, boss waves, and the clear
// bonus between waves.
// One file, one job: the wave director.
import { wavePlan } from './config.js';
import { spawnEnemy, edgeSpawn } from './enemies.js';

export function startWave(s, wave, audio) {
  s.wave = wave;
  s.waveState = 'active';
  s.spawnQueue = [];
  if (wave % 5 === 0) {
    const pos = edgeSpawn(s, 380);
    spawnEnemy(s, 'maw', pos.x, pos.y);
    s.banner = s.sector.bossName;
    if (audio) audio.bossWarn();
  } else {
    for (const { kind, n } of wavePlan(wave, s.sector)) {
      for (let i = 0; i < n; i += 1) s.spawnQueue.push(kind);
    }
    // Shuffle the queue so kinds arrive mixed.
    for (let i = s.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(s.rng.next() * (i + 1));
      [s.spawnQueue[i], s.spawnQueue[j]] = [s.spawnQueue[j], s.spawnQueue[i]];
    }
    s.banner = `WAVE ${wave}`;
  }
  s.waveTimer = 0;
}
