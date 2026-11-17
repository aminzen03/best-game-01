// NOVA EMBER — the simulation's spine: world state, the fixed step, and
// the pieces it wires together (waves, enemies, pickups, rifts, the player).
// The rules themselves live in one-job modules — effects.js, pickups.js,
// enemies.js, player.js, waves.js, boss.js — this file only orchestrates.
// It draws nothing and hears nothing directly; main.js passes it input and
// audio, render.js reads its state.
import {
  FIELD, PLAYER, ENEMY_UNLOCK, spawnInterval, RIFT,
} from './config.js';
import { sectorById } from './sectors.js';
import { dist2 } from './util.js';
import { addFloater, burst, updateEffects } from './effects.js';
import { collectEmber, dropEmbers, updateEmbers, updatePowerups, collectShard, updateShards } from './pickups.js';
import { hitShrine, updateShrines } from './shrines.js';
import { spawnEnemy, killEnemy, updateEnemies } from './enemies.js';
import { hurtPlayer, fadeLight } from './player.js';
import { startWave } from './waves.js';

export function createWorld(rng, best = 0, sectorId = 'cinder') {
  const state = {
    rng, best,
    sectorId, sector: sectorById(sectorId),
    time: 0, score: 0, combo: 0, comboTimer: 0, kills: 0,
    shotsFired: 0, shotsHit: 0, wavesCleared: 0,
    wave: 0, waveState: 'banner', waveTimer: 2.2, banner: '',
    lives: PLAYER.maxLives, gameOver: false, overTimer: 0,
    sectorCleared: false, sectorClearSaved: false,
    victory: false, victoryTimer: 0,
    player: null, bullets: [], enemies: [], embers: [], shards: [],
    powerups: [], rifts: [], shrines: [], particles: [], floaters: [], shockwaves: [],
    hitsTaken: 0, shrinesSpawned: 0, shrinesLit: 0,
    spawnQueue: [], spawnTimer: 0, riftTimer: 12,
    boss: null, shake: 0, flashRed: 0, flashGold: 0, lowLight: false,
  };
  resetWorld(state, sectorId);
  return state;
}

export function resetWorld(s, sectorId = null) {
  if (sectorId) {
    s.sectorId = sectorId;
    s.sector = sectorById(sectorId);
  }
  s.time = 0; s.score = 0; s.combo = 0; s.comboTimer = 0; s.kills = 0;
  s.shotsFired = 0; s.shotsHit = 0; s.wavesCleared = 0;
  s.wave = 0; s.waveState = 'banner'; s.waveTimer = 2.2; s.banner = 'WAVE 1';
  s.lives = PLAYER.maxLives; s.gameOver = false; s.overTimer = 0;
  s.sectorCleared = false; s.sectorClearSaved = false;
  s.victory = false; s.victoryTimer = 0;
  s.bullets = []; s.enemies = []; s.embers = []; s.shards = []; s.powerups = [];
  s.rifts = []; s.shrines = []; s.particles = []; s.floaters = []; s.shockwaves = [];
  s.hitsTaken = 0; s.shrinesSpawned = 0; s.shrinesLit = 0;
  s.spawnQueue = []; s.spawnTimer = 0; s.riftTimer = s.sector.riftEvery;
  s.boss = null; s.shake = 0; s.flashRed = 0; s.flashGold = 0;
  s.player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
    r: PLAYER.radius,
    fireCd: 0, dashTime: 0, dashCd: 0, invuln: 0, shield: 0, rapid: 0, spread: 0,
    light: PLAYER.lightMax, novaCharges: 1, embersGathered: 0, shardsGathered: 0, alive: true,
  };
}

function fireNova(s, audio) {
  const p = s.player;
  if (p.novaCharges <= 0 || s.gameOver) return false;
  p.novaCharges -= 1;
  s.shockwaves.push({ x: p.x, y: p.y, r: 20, maxR: PLAYER.novaRadius, life: 0.6, maxLife: 0.6 });
  s.shake = Math.max(s.shake, 12);
  s.flashGold = Math.max(s.flashGold, 0.25);
  for (const b of [...s.bullets]) {
    if (!b.friendly && dist2(b.x, b.y, p.x, p.y) < PLAYER.novaRadius ** 2) {
      burst(s, b.x, b.y, '#ff4d8d', 3, 120, 2);
      s.bullets.splice(s.bullets.indexOf(b), 1);
    }
  }
  for (const e of [...s.enemies]) {
    if (dist2(e.x, e.y, p.x, p.y) < PLAYER.novaRadius ** 2) {
      e.hp -= PLAYER.novaDamage;
      e.flash = 0.15;
      if (e.hp <= 0) killEnemy(s, e, audio);
    }
  }
  for (const em of [...s.embers]) {
    if (dist2(em.x, em.y, p.x, p.y) < PLAYER.novaRadius ** 2) collectEmber(s, em, audio);
  }
  for (const sh of [...s.shards]) {
    if (dist2(sh.x, sh.y, p.x, p.y) < PLAYER.novaRadius ** 2) collectShard(s, sh, audio);
  }
  if (audio) audio.nova();
  return true;
}

function openRift(s) {
  let x = s.rng.range(180, FIELD.width - 180);
  let y = s.rng.range(140, FIELD.height - 140);
  if (dist2(x, y, s.player.x, s.player.y) < 300 * 300) {
    x = FIELD.width - x;
    y = FIELD.height - y;
  }
  s.rifts.push({ x, y, life: RIFT.lifetime, maxLife: RIFT.lifetime, hits: 0, charged: false });
  addFloater(s, x, y - 40, 'A RIFT OPENS', '#c77dff', 16);
}

function detonateRift(s, rift, audio) {
  s.shockwaves.push({ x: rift.x, y: rift.y, r: 30, maxR: RIFT.blastRadius, life: 0.7, maxLife: 0.7 });
  s.shake = Math.max(s.shake, 12);
  for (const e of [...s.enemies]) {
    if (dist2(e.x, e.y, rift.x, rift.y) < RIFT.blastRadius ** 2) {
      e.hp -= RIFT.blastDamage;
      e.flash = 0.2;
      if (e.hp <= 0) killEnemy(s, e, audio);
    }
  }
  for (const b of [...s.bullets]) {
    if (!b.friendly && dist2(b.x, b.y, rift.x, rift.y) < RIFT.blastRadius ** 2) {
      s.bullets.splice(s.bullets.indexOf(b), 1);
    }
  }
  dropEmbers(s, rift.x, rift.y, RIFT.emberReward);
  addFloater(s, rift.x, rift.y - 30, 'RIFT NOVA!', '#ffd166', 20);
  if (audio) audio.riftBlast();
}

// One fixed step of the game. `input` is { move:{x,y}, aimX, aimY, firing,
// dash, nova } — plain data, so the autopilot can drive it too.
export function stepWorld(s, input, audio, dt) {
  s.time += dt;
  const p = s.player;

  if (s.gameOver) {
    s.overTimer += dt;
    updateEffects(s, dt);
    s.shake = Math.max(0, s.shake - dt * 30);
    s.flashRed = Math.max(0, s.flashRed - dt);
    s.flashGold = Math.max(0, s.flashGold - dt);
    return;
  }

  // The boss is dead: freeze the fight for a short celebration, then the
  // win screen takes over (main.js watches victoryTimer).
  if (s.victory) {
    s.victoryTimer += dt;
    updateEffects(s, dt);
    s.shake = Math.max(0, s.shake - dt * 30);
    s.flashRed = Math.max(0, s.flashRed - dt);
    s.flashGold = Math.max(0, s.flashGold - dt);
    return;
  }

  // --- wave flow ---
  if (s.waveState === 'banner') {
    s.waveTimer -= dt;
    if (s.waveTimer <= 0) startWave(s, s.wave + 1, audio);
  } else if (s.waveState === 'active') {
    if (s.spawnQueue.length > 0) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.spawnTimer = spawnInterval(s.wave, s.sector.speedMul);
        const kind = s.spawnQueue.shift();
        if (ENEMY_UNLOCK[kind] <= s.wave) spawnEnemy(s, kind);
      }
    } else if (s.enemies.length === 0 && !s.boss) {
      s.waveState = 'clear';
      s.waveTimer = 2.6;
      s.wavesCleared += 1;
      const bonus = 100 * s.wave;
      s.score += bonus;
      p.light = Math.min(PLAYER.lightMax, p.light + 20);
      p.novaCharges = Math.min(PLAYER.novaMax, p.novaCharges + 1);
      s.banner = `WAVE ${s.wave} CLEAR  +${bonus}`;
      if (audio) audio.waveClear();
    }
  } else if (s.waveState === 'clear') {
    s.waveTimer -= dt;
    if (s.waveTimer <= 0) {
      s.waveState = 'banner';
      s.waveTimer = 1.6;
      s.banner = `WAVE ${s.wave + 1}`;
    }
  }

  // --- rifts ---
  s.riftTimer -= dt;
  if (s.riftTimer <= 0) {
    s.riftTimer = s.sector.riftEvery;
    if (s.rifts.length < 2) openRift(s);
  }

  // --- player ---
  const mv = input.move;
  if (p.dashTime > 0) {
    p.dashTime -= dt;
  } else {
    p.vx += mv.x * PLAYER.accel * dt;
    p.vy += mv.y * PLAYER.accel * dt;
    const damp = Math.exp(-PLAYER.friction * dt);
    p.vx *= damp;
    p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > PLAYER.maxSpeed) { p.vx = (p.vx / sp) * PLAYER.maxSpeed; p.vy = (p.vy / sp) * PLAYER.maxSpeed; }
  }
  p.x = Math.min(FIELD.width - p.r, Math.max(p.r, p.x + p.vx * dt));
  p.y = Math.min(FIELD.height - p.r, Math.max(p.r, p.y + p.vy * dt));
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  p.fireCd -= dt;
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.shield = Math.max(0, p.shield - dt);
  p.rapid = Math.max(0, p.rapid - dt);
  p.spread = Math.max(0, p.spread - dt);

  if (input.dash && p.dashCd <= 0 && (mv.x !== 0 || mv.y !== 0)) {
    p.dashCd = PLAYER.dashCooldown;
    p.dashTime = PLAYER.dashTime;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
    const len = Math.hypot(mv.x, mv.y) || 1;
    p.vx = (mv.x / len) * PLAYER.dashSpeed;
    p.vy = (mv.y / len) * PLAYER.dashSpeed;
    burst(s, p.x, p.y, '#37e6ff', 10, 200, 3);
    if (audio) audio.dash();
  }
  if (input.nova) fireNova(s, audio);

  if (input.firing && p.fireCd <= 0) {
    const interval = PLAYER.fireInterval * (p.rapid > 0 ? 0.55 : 1);
    p.fireCd = interval;
    const angles = p.spread > 0 ? [-0.14, 0, 0.14] : [0];
    for (const off of angles) {
      const a = p.angle + off;
      s.bullets.push({
        x: p.x + Math.cos(a) * (p.r + 6), y: p.y + Math.sin(a) * (p.r + 6),
        vx: Math.cos(a) * PLAYER.bulletSpeed, vy: Math.sin(a) * PLAYER.bulletSpeed,
        r: PLAYER.bulletRadius, dmg: PLAYER.bulletDamage, friendly: true, life: 1.1,
      });
    }
    s.shotsFired += angles.length;
    if (audio) audio.shoot();
  }

  // Light drains; embers keep you alive.
  p.light -= PLAYER.lightDrain * dt;
  s.lowLight = p.light < 25;
  if (p.light <= 0) fadeLight(s, audio);

  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }

  // --- bullets ---
  for (const b of [...s.bullets]) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
      s.bullets.splice(s.bullets.indexOf(b), 1);
      continue;
    }
    // Rifts swallow bullets and charge.
    for (const r of s.rifts) {
      if (b.friendly && dist2(b.x, b.y, r.x, r.y) < 46 * 46) {
        r.hits += 1;
        burst(s, b.x, b.y, '#c77dff', 3, 100, 2);
        s.bullets.splice(s.bullets.indexOf(b), 1);
        if (r.hits >= RIFT.hitsToCharge && !r.charged) {
          r.charged = true;
          detonateRift(s, r, audio);
          s.rifts.splice(s.rifts.indexOf(r), 1);
        }
        break;
      }
    }
    if (!s.bullets.includes(b)) continue;
    if (b.friendly) {
      // Shrines take hits too: 6 shots light one.
      for (const sh of [...s.shrines]) {
        if (!sh.lit && dist2(b.x, b.y, sh.x, sh.y) < 30 * 30) {
          s.bullets.splice(s.bullets.indexOf(b), 1);
          s.shotsHit += 1;
          hitShrine(s, sh, b.dmg, audio);
          break;
        }
      }
      if (!s.bullets.includes(b)) continue;
      for (const e of [...s.enemies]) {
        const rr = e.r + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          e.hp -= b.dmg;
          e.flash = 0.08;
          s.shotsHit += 1;
          burst(s, b.x, b.y, e.def.glow, 4, 160, 2);
          s.bullets.splice(s.bullets.indexOf(b), 1);
          if (e.hp <= 0) killEnemy(s, e, audio);
          break;
        }
      }
    } else if (p.alive) {
      const rr = PLAYER.radius + b.r;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        s.bullets.splice(s.bullets.indexOf(b), 1);
        hurtPlayer(s, 'bullet', audio);
      }
    }
  }

  // --- enemies ---
  updateEnemies(s, dt, audio);

  // --- rifts pull things in ---
  for (const r of [...s.rifts]) {
    r.life -= dt;
    if (r.life <= 0) {
      burst(s, r.x, r.y, '#c77dff', 14, 160, 2);
      s.rifts.splice(s.rifts.indexOf(r), 1);
      continue;
    }
    const pullAt = (x, y, strength) => {
      const dx = r.x - x;
      const dy = r.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > RIFT.radius) return { fx: 0, fy: 0 };
      const f = (1 - d / RIFT.radius) * strength;
      return { fx: (dx / d) * f, fy: (dy / d) * f };
    };
    const fp = pullAt(p.x, p.y, RIFT.pull * 0.55);
    p.vx += fp.fx * dt;
    p.vy += fp.fy * dt;
    for (const e of s.enemies) {
      const f = pullAt(e.x, e.y, RIFT.pull);
      e.vx += f.fx * dt;
      e.vy += f.fy * dt;
    }
    for (const em of s.embers) {
      const f = pullAt(em.x, em.y, RIFT.pull * 0.8);
      em.vx += f.fx * dt;
      em.vy += f.fy * dt;
    }
  }

  // --- pickups ---
  updateEmbers(s, dt, audio);
  updateShards(s, dt, audio);
  updatePowerups(s, dt, audio);
  updateShrines(s, dt);

  updateEffects(s, dt);
  s.shake = Math.max(0, s.shake - dt * 30);
  s.flashRed = Math.max(0, s.flashRed - dt);
  s.flashGold = Math.max(0, s.flashGold - dt);
}
