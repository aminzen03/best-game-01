// NOVA EMBER — the boss's attacks: the radial bullet ring and spawning
// drifter minions. Timing lives in the enemy loop; the attacks themselves
// live here, so the boss has its own file.
// One file, one job: what the Maw does.
import { TAU } from './util.js';

export function mawBurst(s, e, audio) {
  const n = 12;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU + e.phase;
    s.bullets.push({
      x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
      vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
      r: 8, dmg: 1, friendly: false, life: 5,
    });
  }
  if (audio) audio.bossWarn();
}

export function mawSpawn(s, e, spawnEnemy) {
  for (let i = 0; i < 3; i += 1) {
    spawnEnemy(s, 'drifter', e.x + s.rng.range(-70, 70), e.y + s.rng.range(-70, 70));
  }
}
