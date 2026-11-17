// NOVA EMBER — transient visual effects: particles, floating score text,
// shockwave rings. Everything here is cosmetic: it reads and writes the
// world's effect lists and nothing else.
// One file, one job: the fireworks.
import { TAU } from './util.js';

export function addFloater(s, x, y, text, color, size = 16) {
  s.floaters.push({ x, y, text, life: 1, color, size });
}

export function burst(s, x, y, color, n, speed = 220, size = 3) {
  for (let i = 0; i < n; i += 1) {
    const a = s.rng.angle();
    const v = s.rng.range(speed * 0.3, speed);
    s.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: s.rng.range(0.3, 0.7), maxLife: 0.7, size: s.rng.range(size * 0.5, size * 1.4), color,
    });
  }
  if (s.particles.length > 420) s.particles.splice(0, s.particles.length - 420);
}

export function updateParticles(s, dt) {
  for (const pt of [...s.particles]) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2.5 * dt);
    pt.vy *= Math.exp(-2.5 * dt);
    if (pt.life <= 0) s.particles.splice(s.particles.indexOf(pt), 1);
  }
}

export function updateFloaters(s, dt) {
  for (const f of [...s.floaters]) {
    f.life -= dt * 0.7;
    f.y -= 34 * dt;
    if (f.life <= 0) s.floaters.splice(s.floaters.indexOf(f), 1);
  }
}

export function updateShockwaves(s, dt) {
  for (const w of [...s.shockwaves]) {
    w.life -= dt;
    const t = 1 - Math.max(0, w.life) / w.maxLife;
    w.r = 20 + (w.maxR - 20) * (1 - (1 - t) * (1 - t));
    if (w.life <= 0) s.shockwaves.splice(s.shockwaves.indexOf(w), 1);
  }
}

export function updateEffects(s, dt) {
  updateParticles(s, dt);
  updateFloaters(s, dt);
  updateShockwaves(s, dt);
}
