// NOVA EMBER — pickups: embers (light), power-ups, and their motion.
// Embers are the light economy: killing Void creatures drops them, gathering
// them refills the light meter and counts toward the sector's harvest tally.
// One file, one job: things the player collects.
import { FIELD, PLAYER, POWERUP_TYPES, POWERUP_DROP_CHANCE, POWERUP_DURATION } from './config.js';
import { dist2 } from './util.js';
import { addFloater } from './effects.js';

export function dropEmbers(s, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    const a = s.rng.angle();
    s.embers.push({
      x, y, vx: Math.cos(a) * s.rng.range(40, 140), vy: Math.sin(a) * s.rng.range(40, 140),
      value: PLAYER.lightPerEmber, life: 9,
    });
  }
}

export function dropPowerup(s, x, y) {
  if (!s.rng.chance(POWERUP_DROP_CHANCE)) return;
  s.powerups.push({ kind: s.rng.pick(POWERUP_TYPES), x, y, vx: 0, vy: -14, life: 10 });
}

export function collectEmber(s, em, audio) {
  const idx = s.embers.indexOf(em);
  if (idx === -1) return;
  s.embers.splice(idx, 1);
  const p = s.player;
  p.light = Math.min(PLAYER.lightMax, p.light + em.value);
  p.embersGathered += 1;
  s.score += 10;
  if (p.embersGathered % 40 === 0 && p.novaCharges < PLAYER.novaMax) {
    p.novaCharges += 1;
    addFloater(s, p.x, p.y - 34, 'NOVA +1', '#c77dff', 18);
  }
  if (audio) audio.pickup();
}

export function applyPowerup(s, kind, audio) {
  const p = s.player;
  if (kind === 'shield') { p.shield = 6; addFloater(s, p.x, p.y - 30, 'SHIELD', '#37e6ff', 18); }
  if (kind === 'rapid') { p.rapid = POWERUP_DURATION; addFloater(s, p.x, p.y - 30, 'RAPID FIRE', '#7dff6a', 18); }
  if (kind === 'spread') { p.spread = POWERUP_DURATION; addFloater(s, p.x, p.y - 30, 'SPREAD SHOT', '#ffd166', 18); }
  if (kind === 'nova') {
    p.novaCharges = Math.min(PLAYER.novaMax, p.novaCharges + 1);
    addFloater(s, p.x, p.y - 30, 'NOVA +1', '#c77dff', 18);
  }
  if (audio) audio.powerup();
}

export function updateEmbers(s, dt, audio) {
  const p = s.player;
  for (const em of [...s.embers]) {
    em.life -= dt;
    em.vx *= Math.exp(-2 * dt);
    em.vy *= Math.exp(-2 * dt);
    const d = Math.hypot(p.x - em.x, p.y - em.y) || 1;
    if (d < PLAYER.emberMagnet) {
      em.vx += ((p.x - em.x) / d) * 520 * dt;
      em.vy += ((p.y - em.y) / d) * 520 * dt;
    }
    em.x += em.vx * dt;
    em.y += em.vy * dt;
    if (em.life <= 0) {
      s.embers.splice(s.embers.indexOf(em), 1);
      continue;
    }
    if (p.alive && d < PLAYER.radius + 12) collectEmber(s, em, audio);
  }
}

export function updatePowerups(s, dt, audio) {
  const p = s.player;
  for (const pu of [...s.powerups]) {
    pu.life -= dt;
    pu.y += pu.vy * dt;
    if (pu.life <= 0) { s.powerups.splice(s.powerups.indexOf(pu), 1); continue; }
    if (p.alive && dist2(pu.x, pu.y, p.x, p.y) < (PLAYER.radius + 16) ** 2) {
      s.powerups.splice(s.powerups.indexOf(pu), 1);
      applyPowerup(s, pu.kind, audio);
    }
  }
}
