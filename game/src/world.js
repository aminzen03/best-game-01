// NOVA EMBER — the simulation: player, enemies, bullets, embers, rifts,
// waves, the boss, scoring and the light economy.
// One file, one job: the rules. It draws nothing and hears nothing directly;
// main.js passes it input and audio, render.js reads its state.
import {
  FIELD, PLAYER, ENEMY_TYPES, ENEMY_UNLOCK, wavePlan, spawnInterval,
  POWERUP_TYPES, POWERUP_DROP_CHANCE, POWERUP_DURATION, RIFT, COMBO,
} from './config.js';

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(rng, best = 0) {
  const state = {
    rng, best,
    time: 0, score: 0, combo: 0, comboTimer: 0, kills: 0,
    shotsFired: 0, shotsHit: 0, wavesCleared: 0,
    wave: 0, waveState: 'banner', waveTimer: 2.2, banner: '',
    lives: PLAYER.maxLives, gameOver: false, overTimer: 0,
    player: null, bullets: [], enemies: [], embers: [],
    powerups: [], rifts: [], particles: [], floaters: [], shockwaves: [],
    spawnQueue: [], spawnTimer: 0, riftTimer: 12,
    boss: null, shake: 0, flashRed: 0, flashGold: 0, lowLight: false,
  };
  resetWorld(state);
  return state;
}

export function resetWorld(s) {
  s.time = 0; s.score = 0; s.combo = 0; s.comboTimer = 0; s.kills = 0;
  s.shotsFired = 0; s.shotsHit = 0; s.wavesCleared = 0;
  s.wave = 0; s.waveState = 'banner'; s.waveTimer = 2.2; s.banner = 'WAVE 1';
  s.lives = PLAYER.maxLives; s.gameOver = false; s.overTimer = 0;
  s.bullets = []; s.enemies = []; s.embers = []; s.powerups = [];
  s.rifts = []; s.particles = []; s.floaters = []; s.shockwaves = [];
  s.spawnQueue = []; s.spawnTimer = 0; s.riftTimer = 12;
  s.boss = null; s.shake = 0; s.flashRed = 0; s.flashGold = 0;
  s.player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
    r: PLAYER.radius,
    fireCd: 0, dashTime: 0, dashCd: 0, invuln: 0, shield: 0, rapid: 0, spread: 0,
    light: PLAYER.lightMax, novaCharges: 1, embersGathered: 0, alive: true,
  };
}

function addFloater(s, x, y, text, color, size = 16) {
  s.floaters.push({ x, y, text, life: 1, color, size });
}

function burst(s, x, y, color, n, speed = 220, size = 3) {
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

function edgeSpawn(s, minPlayerDist = 300) {
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

function spawnEnemy(s, kind, x = null, y = null) {
  const def = ENEMY_TYPES[kind];
  const pos = x === null ? edgeSpawn(s) : { x, y };
  const hpScale = 1 + Math.floor((s.wave - 1) / 4);
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

function startWave(s, wave, audio) {
  s.wave = wave;
  s.waveState = 'active';
  s.spawnQueue = [];
  if (wave % 5 === 0) {
    const pos = edgeSpawn(s, 380);
    spawnEnemy(s, 'maw', pos.x, pos.y);
    s.banner = 'VOID MAW';
    if (audio) audio.bossWarn();
  } else {
    for (const { kind, n } of wavePlan(wave)) {
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

function dropEmbers(s, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    const a = s.rng.angle();
    s.embers.push({
      x, y, vx: Math.cos(a) * s.rng.range(40, 140), vy: Math.sin(a) * s.rng.range(40, 140),
      value: PLAYER.lightPerEmber, life: 9,
    });
  }
}

function dropPowerup(s, x, y) {
  if (!s.rng.chance(POWERUP_DROP_CHANCE)) return;
  s.powerups.push({ kind: s.rng.pick(POWERUP_TYPES), x, y, vx: 0, vy: -14, life: 10 });
}

function killEnemy(s, e, audio) {
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
    addFloater(s, e.x, e.y - 44, 'VOID MAW DESTROYED', '#ffd166', 22);
  }
}

function hurtPlayer(s, cause, audio) {
  const p = s.player;
  if (p.invuln > 0 || p.shield > 0 || p.dashTime > 0 || s.gameOver) return;
  s.lives -= 1;
  s.combo = 0;
  s.comboTimer = 0;
  p.invuln = PLAYER.hitInvuln;
  p.light = Math.max(p.light, 40);
  s.shake = Math.max(s.shake, 14);
  s.flashRed = 0.5;
  burst(s, p.x, p.y, '#ff3860', 24, 300);
  if (audio) audio.playerHit();
  if (s.lives <= 0) {
    s.gameOver = true;
    s.overTimer = 0;
    burst(s, p.x, p.y, '#37e6ff', 70, 380);
    p.alive = false;
    if (audio) audio.gameOver();
  }
}

function fadeLight(s, audio) {
  const p = s.player;
  s.lives -= 1;
  s.combo = 0;
  p.light = 55;
  p.invuln = PLAYER.hitInvuln;
  s.flashGold = 0.7;
  s.shake = Math.max(s.shake, 10);
  addFloater(s, p.x, p.y - 30, 'THE LIGHT FADES', '#ffd166', 20);
  if (audio) audio.playerHit();
  if (s.lives <= 0) {
    s.gameOver = true;
    s.overTimer = 0;
    burst(s, p.x, p.y, '#ffd166', 70, 380);
    p.alive = false;
    if (audio) audio.gameOver();
  }
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
  if (audio) audio.nova();
  return true;
}

function collectEmber(s, em, audio) {
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

function applyPowerup(s, kind, audio) {
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
    updateParticles(s, dt);
    updateFloaters(s, dt);
    updateShockwaves(s, dt);
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
        s.spawnTimer = spawnInterval(s.wave);
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
    s.riftTimer = RIFT.everySeconds;
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
  for (const e of [...s.enemies]) {
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const sp = e.def.speed * (1 + (s.wave - 1) * 0.03);
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
      e.spawnCd -= dt;
      if (e.spawnCd <= 0) {
        e.spawnCd = 7;
        for (let i = 0; i < 3; i += 1) {
          spawnEnemy(s, 'drifter', e.x + s.rng.range(-70, 70), e.y + s.rng.range(-70, 70));
        }
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

  // --- embers: drift, magnet, collect ---
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

  // --- powerups ---
  for (const pu of [...s.powerups]) {
    pu.life -= dt;
    pu.y += pu.vy * dt;
    if (pu.life <= 0) { s.powerups.splice(s.powerups.indexOf(pu), 1); continue; }
    if (p.alive && dist2(pu.x, pu.y, p.x, p.y) < (PLAYER.radius + 16) ** 2) {
      s.powerups.splice(s.powerups.indexOf(pu), 1);
      applyPowerup(s, pu.kind, audio);
    }
  }

  updateParticles(s, dt);
  updateFloaters(s, dt);
  updateShockwaves(s, dt);
  s.shake = Math.max(0, s.shake - dt * 30);
  s.flashRed = Math.max(0, s.flashRed - dt);
  s.flashGold = Math.max(0, s.flashGold - dt);
}

function updateParticles(s, dt) {
  for (const pt of [...s.particles]) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2.5 * dt);
    pt.vy *= Math.exp(-2.5 * dt);
    if (pt.life <= 0) s.particles.splice(s.particles.indexOf(pt), 1);
  }
}

function updateFloaters(s, dt) {
  for (const f of [...s.floaters]) {
    f.life -= dt * 0.7;
    f.y -= 34 * dt;
    if (f.life <= 0) s.floaters.splice(s.floaters.indexOf(f), 1);
  }
}

function updateShockwaves(s, dt) {
  for (const w of [...s.shockwaves]) {
    w.life -= dt;
    const t = 1 - Math.max(0, w.life) / w.maxLife;
    w.r = 20 + (w.maxR - 20) * (1 - (1 - t) * (1 - t));
    if (w.life <= 0) s.shockwaves.splice(s.shockwaves.indexOf(w), 1);
  }
}
