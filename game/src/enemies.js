// NOVA EMBER — the Void's creatures: spawning, dying, and how each kind
// moves and fights. The boss's own attacks live in boss.js; this file owns
// the shared enemy loop.
// One file, one job: the enemies.
import { FIELD, PLAYER, COMBO, ENEMY_TYPES, ENEMY_UNLOCK } from './config.js';
import { TAU, dist2 } from './util.js';
import { burst, addFloater } from './effects.js';
import { dropEmbers, dropPowerup } from './pickups.js';
import { hurtPlayer } from './player.js';
import { mawBurst, mawSpawn } from './boss.js';

export function edgeSpawn(s, minPlayerDist = 300) {
  for (let tries = 0; tries < 12; tries += 1) {
    const side = s.rng.int(0, 3);
    let x = 0;
    let y = 0;
    if (side === 0) { x = s.rng.range(40, FIELD.width - 40); y = 36; }
    if (side === 1) { x = s.rng.range(40, FIELD.width - 40); y = FIELD.height - 36; }
    if (side === 2) { x = 36; y = s.rng.range(40, FIELD.height - 40); }
    if (side === 3) { x = FIELD.width - 36; y = s.rng.range(40, FIELD.height - 40); }
    if (dist2(x, y, s.player.x, s.player.y) > minPlayerDist * minPlayerDist) return { x, y };
  }
  return { x: 60, y: 60 };
}

export function spawnEnemy(s, kind, x = null, y = null) {
  const base = ENEMY_TYPES[kind];
  // The boss wears the sector's colours and name.
  const def = kind === 'maw'
    ? { ...base, color: s.sector.bossColor, glow: s.sector.bossGlow, name: s.sector.bossName }
    : base;
  const pos = x === null ? edgeSpawn(s) : { x, y };
  const hpScale = (1 + Math.floor((s.wave - 1) / 4)) * s.sector.hpMul;
  const e = {
    kind, def, x: pos.x, y: pos.y, vx: 0, vy: 0,
    hp: def.hp * (kind === 'maw' ? 1 : hpScale), maxHp: def.hp * (kind === 'maw' ? 1 : hpScale),
    r: def.radius, angle: s.rng.angle(), spin: s.rng.range(-1.6, 1.6),
    phase: s.rng.range(0, TAU), fireCd: s.rng.range(1.5, 3), flash: 0,
    burstCd: 3.2, spawnCd: 6, lungeCd: 0, lunging: 0,
  };
  s.enemies.push(e);
  if (kind === 'maw') s.boss = e;
  return e;
}

export function killEnemy(s, e, audio) {
  const idx = s.enemies.indexOf(e);
  if (idx === -1) return;
  s.enemies.splice(idx, 1);
  s.kills += 1;
  s.combo += 1;
  s.comboTimer = COMBO.windowSeconds;
  const mult = Math.min(COMBO.cap, 1 + s.combo * COMBO.step);
  const gained = Math.round(e.def.score * mult);
  s.score += gained;
  addFloater(s, e.x, e.y - 10, `+${gained}`, '#e8f6ff', 15);
  burst(s, e.x, e.y, e.def.glow, e.kind === 'maw' ? 60 : 16, 260);
  dropEmbers(s, e.x, e.y, e.def.embers);
  dropPowerup(s, e.x, e.y);
  if (audio) audio.enemyDie();
  if (e.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const d = spawnEnemy(s, 'drifter', e.x + s.rng.range(-24, 24), e.y + s.rng.range(-24, 24));
      d.vx = s.rng.range(-160, 160);
      d.vy = s.rng.range(-160, 160);
    }
  }
  if (e.kind === 'maw') {
    s.boss = null;
    s.shake = Math.max(s.shake, 22);
    dropEmbers(s, e.x, e.y, 6);
    s.player.novaCharges = Math.min(PLAYER.novaMax, s.player.novaCharges + 1);
    addFloater(s, e.x, e.y - 44, `${e.def.name} DESTROYED`, '#ffd166', 22);
    // Beating a sector's boss clears the sector and unlocks the next one.
    if (!s.sectorCleared) {
      s.sectorCleared = true;
      s.score += 1000;
      addFloater(s, e.x, e.y - 70, 'SECTOR CLEARED  +1000', '#7dff6a', 20);
    }
  }
}

// One step of every living enemy: steer, shoot, lunge, orbit — then touch
// damage. `dt` is the fixed step.
export function updateEnemies(s, dt, audio) {
  const p = s.player;
  for (const e of [...s.enemies]) {
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const sp = e.def.speed * (1 + (s.wave - 1) * 0.03) * s.sector.speedMul;
    if (e.kind === 'drifter') {
      e.vx += nx * sp * 3 * dt;
      e.vy += ny * sp * 3 * dt;
    } else if (e.kind === 'weaver') {
      e.phase += dt * 4;
      const px = -ny * Math.sin(e.phase) * 90;
      const py = nx * Math.sin(e.phase) * 90;
      e.vx += (nx * sp + px) * 3 * dt;
      e.vy += (ny * sp + py) * 3 * dt;
    } else if (e.kind === 'splitter') {
      e.vx += nx * sp * 2 * dt;
      e.vy += ny * sp * 2 * dt;
    } else if (e.kind === 'stinger') {
      e.lungeCd -= dt;
      if (e.lunging > 0) {
        e.lunging -= dt;
      } else if (d < 260 && e.lungeCd <= 0) {
        e.lunging = 0.35;
        e.lungeCd = 2.2;
        e.vx = nx * 520;
        e.vy = ny * 520;
      } else {
        e.vx += nx * sp * 1.5 * dt;
        e.vy += ny * sp * 1.5 * dt;
      }
    } else if (e.kind === 'orbiter') {
      const want = 250;
      const radial = (d - want) / want;
      e.vx += (nx * radial * sp * 2 - ny * sp * 0.9) * 3 * dt;
      e.vy += (ny * radial * sp * 2 + nx * sp * 0.9) * 3 * dt;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && d < 560) {
        e.fireCd = 2.6;
        s.bullets.push({
          x: e.x, y: e.y, vx: nx * 190, vy: ny * 190,
          r: 7, dmg: 1, friendly: false, life: 4,
        });
      }
    } else if (e.kind === 'maw') {
      e.vx += nx * sp * 2 * dt;
      e.vy += ny * sp * 2 * dt;
      e.burstCd -= dt;
      if (e.burstCd <= 0) {
        e.burstCd = e.hp < e.maxHp / 2 ? 2.4 : 3.4;
        mawBurst(s, e, audio);
      }
      e.spawnCd -= dt;
      if (e.spawnCd <= 0) {
        e.spawnCd = 7;
        mawSpawn(s, e, spawnEnemy);
      }
    }
    // Cap speed, integrate, clamp to field.
    const esp = Math.hypot(e.vx, e.vy);
    const cap = e.kind === 'stinger' && e.lunging > 0 ? 560 : sp * 1.6;
    if (esp > cap) { e.vx = (e.vx / esp) * cap; e.vy = (e.vy / esp) * cap; }
    e.vx *= Math.exp(-1.2 * dt);
    e.vy *= Math.exp(-1.2 * dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = Math.min(FIELD.width - e.r, Math.max(e.r, e.x));
    e.y = Math.min(FIELD.height - e.r, Math.max(e.r, e.y));
    e.angle += e.spin * dt;

    // Touching the player hurts.
    if (p.alive) {
      const rr = e.r + PLAYER.radius - 2;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        hurtPlayer(s, 'touch', audio);
        // Knock the enemy back a little so one touch is not a chain.
        e.vx = -nx * 220;
        e.vy = -ny * 220;
      }
    }
  }
}

export { ENEMY_UNLOCK };
