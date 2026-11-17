// NOVA EMBER — configuration: field, player, enemies, waves, palette.
// One file, one job: every number the game tunes lives here.
export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  accel: 2400,
  maxSpeed: 340,
  friction: 5.2,
  fireInterval: 0.12,
  bulletSpeed: 720,
  bulletRadius: 5,
  bulletDamage: 1,
  dashSpeed: 950,
  dashTime: 0.16,
  dashCooldown: 1.6,
  dashInvuln: 0.35,
  maxLives: 3,
  hitInvuln: 2.0,
  lightMax: 100,
  lightDrain: 1.6,
  lightPerEmber: 7,
  emberMagnet: 110,
  novaMax: 3,
  novaRadius: 340,
  novaDamage: 6,
};

export const ENEMY_TYPES = {
  drifter: {
    name: 'Drifter', shape: 'tri', color: '#ff4d8d', glow: '#ff2d78',
    radius: 16, hp: 1, speed: 92, score: 50, embers: 1, damage: 1,
  },
  weaver: {
    name: 'Weaver', shape: 'dart', color: '#37e6ff', glow: '#00c8f0',
    radius: 14, hp: 2, speed: 128, score: 80, embers: 2, damage: 1,
  },
  splitter: {
    name: 'Splitter', shape: 'hex', color: '#ffb347', glow: '#ff8c1a',
    radius: 20, hp: 3, speed: 70, score: 120, embers: 2, damage: 1,
  },
  stinger: {
    name: 'Stinger', shape: 'needle', color: '#ffe94d', glow: '#e8c400',
    radius: 11, hp: 1, speed: 225, score: 100, embers: 1, damage: 1,
  },
  orbiter: {
    name: 'Orbiter', shape: 'orb', color: '#c77dff', glow: '#9d4edd',
    radius: 17, hp: 3, speed: 105, score: 150, embers: 2, damage: 1,
  },
  maw: {
    name: 'Void Maw', shape: 'maw', color: '#ff3860', glow: '#d90429',
    radius: 64, hp: 380, speed: 42, score: 1500, embers: 10, damage: 2,
  },
};

// Which enemy kinds may appear from which wave on.
export const ENEMY_UNLOCK = {
  drifter: 1, weaver: 1, splitter: 2, stinger: 3, orbiter: 4,
};

// Wave composition: how many of each kind, and spawn pacing. `sector` is a
// sector def (sectors.js); its enemyMul scales the mix, so each region
// fights differently. With no sector, the base mix is used.
export function wavePlan(wave, sector = null) {
  const plan = [];
  const mul = (kind) => (sector && sector.enemyMul && sector.enemyMul[kind]) || 1;
  const add = (kind, n) => { if (n > 0) plan.push({ kind, n: Math.max(1, Math.round(n * mul(kind))) }); };
  add('drifter', 5 + wave * 2);
  add('weaver', wave >= 1 ? 2 + wave : 0);
  add('splitter', wave >= 2 ? 1 + Math.floor(wave / 2) : 0);
  add('stinger', wave >= 3 ? 2 + wave : 0);
  add('orbiter', wave >= 4 ? 1 + Math.floor(wave / 3) : 0);
  return plan;
}

export function spawnInterval(wave, speedMul = 1) {
  return Math.max(0.3, (1.15 - wave * 0.07) / speedMul);
}

export const POWERUP_TYPES = ['shield', 'rapid', 'spread', 'nova'];
export const POWERUP_DROP_CHANCE = 0.09;
export const POWERUP_DURATION = 8;

export const RIFT = {
  everySeconds: 15,
  lifetime: 7,
  radius: 250,
  pull: 300,
  hitsToCharge: 12,
  blastRadius: 430,
  blastDamage: 80,
  emberReward: 5,
};

export const COMBO = { windowSeconds: 3.0, step: 0.05, cap: 5 };

export const PALETTE = {
  bgTop: '#070716',
  bgBottom: '#0d1030',
  nebulaA: 'rgba(124, 58, 237, 0.20)',
  nebulaB: 'rgba(8, 145, 178, 0.16)',
  nebulaC: 'rgba(219, 39, 119, 0.12)',
  hud: '#e8f6ff',
  hudDim: '#8fa8c8',
  gold: '#ffd166',
  cyan: '#37e6ff',
  danger: '#ff3860',
};
