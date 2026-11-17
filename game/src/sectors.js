// NOVA EMBER — the four sectors: themed regions the player unlocks by
// beating the boss of the previous one. Each sector is a different place
// with its own look, enemy mix, pace and ember harvest target, so a run is
// a progression arc, not one arena repeated.
// One file, one job: what the sectors are.
export const SECTORS = [
  {
    id: 'cinder',
    name: 'CINDER DRIFT',
    tag: 'Ember fields of the dying star',
    accent: '#ffb347',
    bgTop: '#160a08',
    bgBottom: '#241233',
    nebulaA: 'rgba(255, 140, 40, 0.20)',
    nebulaB: 'rgba(255, 80, 60, 0.14)',
    nebulaC: 'rgba(255, 180, 80, 0.12)',
    starTint: '#ffd9a0',
    emberTarget: 30,
    hpMul: 1,
    speedMul: 1,
    riftEvery: 15,
    enemyMul: { drifter: 1.2, weaver: 1, splitter: 1, stinger: 1, orbiter: 1 },
    bossName: 'VOID MAW',
    bossColor: '#ff3860',
    bossGlow: '#d90429',
    landmark: { kind: 'dying-star', x: 1060, y: 150, r: 170 },
  },
  {
    id: 'reef',
    name: 'VOID REEF',
    tag: 'Rifts breed in the dark',
    accent: '#c77dff',
    bgTop: '#0d0618',
    bgBottom: '#160a30',
    nebulaA: 'rgba(124, 58, 237, 0.22)',
    nebulaB: 'rgba(157, 78, 221, 0.16)',
    nebulaC: 'rgba(199, 125, 255, 0.12)',
    starTint: '#dcc6ff',
    emberTarget: 45,
    hpMul: 1.15,
    speedMul: 1.05,
    riftEvery: 11,
    enemyMul: { drifter: 1, weaver: 1.1, splitter: 1.5, stinger: 1, orbiter: 1.3 },
    bossName: 'RIFT MAW',
    bossColor: '#b517ff',
    bossGlow: '#7b2ff7',
    landmark: { kind: 'crystals', x: 640, y: 700, r: 200 },
  },
  {
    id: 'starfall',
    name: 'STARFALL',
    tag: 'Shards rain from a broken sky',
    accent: '#37e6ff',
    bgTop: '#04101a',
    bgBottom: '#0a2436',
    nebulaA: 'rgba(8, 145, 178, 0.20)',
    nebulaB: 'rgba(55, 230, 255, 0.14)',
    nebulaC: 'rgba(120, 220, 255, 0.12)',
    starTint: '#cfeeff',
    emberTarget: 60,
    hpMul: 1.25,
    speedMul: 1.1,
    riftEvery: 13,
    enemyMul: { drifter: 1, weaver: 1.3, splitter: 1.1, stinger: 1.6, orbiter: 1.2 },
    bossName: 'SHARD MAW',
    bossColor: '#00b4d8',
    bossGlow: '#0077b6',
    landmark: { kind: 'ringed-planet', x: 1080, y: 120, r: 130 },
  },
  {
    id: 'core',
    name: 'NOVA CORE',
    tag: 'The heart of the dying star',
    accent: '#ffd166',
    bgTop: '#1a0800',
    bgBottom: '#33120a',
    nebulaA: 'rgba(255, 209, 102, 0.20)',
    nebulaB: 'rgba(255, 56, 96, 0.14)',
    nebulaC: 'rgba(255, 140, 40, 0.12)',
    starTint: '#ffe9b0',
    emberTarget: 80,
    hpMul: 1.4,
    speedMul: 1.15,
    riftEvery: 12,
    enemyMul: { drifter: 1.3, weaver: 1.3, splitter: 1.4, stinger: 1.4, orbiter: 1.4 },
    bossName: 'NOVA MAW',
    bossColor: '#ffb703',
    bossGlow: '#fb8500',
    landmark: { kind: 'nova-heart', x: 640, y: 190, r: 210 },
  },
];

export function sectorById(id) {
  return SECTORS.find((s) => s.id === id) || SECTORS[0];
}

export function sectorIndex(id) {
  const i = SECTORS.findIndex((s) => s.id === id);
  return i === -1 ? 0 : i;
}

export function nextSector(id) {
  const i = sectorIndex(id);
  return i + 1 < SECTORS.length ? SECTORS[i + 1] : null;
}
