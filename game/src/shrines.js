// NOVA EMBER — shrines: a side objective with its own tally. One shrine
// wakes each wave from wave 2: a glowing obelisk that takes 6 hits to
// light. Lighting it pays score and star shards, and lighting every shrine
// in a cleared run earns the SHRINEKEEPER medal. An unlit shrine fades
// after its lifetime; a lit one burns out after a short celebration.
// One file, one job: the shrine objective.
import { FIELD, SHRINE } from './config.js';
import { dist2 } from './util.js';
import { addFloater, burst } from './effects.js';
import { dropShards } from './pickups.js';

export function spawnShrine(s) {
  let x = s.rng.range(200, FIELD.width - 200);
  let y = s.rng.range(160, FIELD.height - 160);
  if (dist2(x, y, s.player.x, s.player.y) < 260 * 260) {
    x = FIELD.width - x;
    y = FIELD.height - y;
  }
  s.shrines.push({
    x, y, hp: SHRINE.hitsToLight, maxHp: SHRINE.hitsToLight,
    lit: false, life: SHRINE.life,
  });
  s.shrinesSpawned += 1;
  addFloater(s, x, y - 44, 'A SHRINE WAKES', '#ffd166', 16);
}

export function hitShrine(s, sh, dmg, audio) {
  if (sh.lit) return;
  sh.hp -= dmg;
  sh.flash = 0.08;
  burst(s, sh.x, sh.y, '#ffd166', 3, 120, 2);
  if (sh.hp > 0) return;
  sh.lit = true;
  sh.life = 3;
  s.shrinesLit += 1;
  s.score += SHRINE.score;
  dropShards(s, sh.x, sh.y, SHRINE.shardReward);
  addFloater(s, sh.x, sh.y - 30, `SHRINE LIT  +${SHRINE.score}`, '#ffd166', 20);
  burst(s, sh.x, sh.y, '#ffd166', 30, 260);
  s.flashGold = Math.max(s.flashGold, 0.2);
  if (audio) audio.riftBlast();
}

export function updateShrines(s, dt) {
  for (const sh of [...s.shrines]) {
    sh.flash = Math.max(0, (sh.flash || 0) - dt);
    sh.life -= dt;
    if (sh.life <= 0) {
      burst(s, sh.x, sh.y, sh.lit ? '#ffd166' : '#8fa8c8', 10, 140, 2);
      s.shrines.splice(s.shrines.indexOf(sh), 1);
    }
  }
}
