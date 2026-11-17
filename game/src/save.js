// NOVA EMBER — persistence: best score, per-sector progress, unlocks.
// The save is one JSON object in localStorage; every read and write is
// guarded, so the game still runs where storage is unavailable (file://,
// private mode) or the stored data is corrupt — it just starts fresh.
// One file, one job: remembering between sessions.
import { SECTORS, nextSector } from './sectors.js';
import { MEDALS, MEDAL_NAMES, SWIFT_SECONDS } from './config.js';

const KEY = 'nova-ember-save-v2';
const OLD_BEST_KEY = 'nova-ember-best';

// Medals for one finished run: flawless = the boss fell without the
// player taking a hit; swift = under three minutes; shrinekeeper = every
// shrine that woke in the run was lit. `run` is the same shape recordRun
// takes. Medals are only earned on a cleared run.
export function medalsForRun(run) {
  return {
    flawless: !!run.cleared && run.hitsTaken === 0,
    swift: !!run.cleared && run.time <= SWIFT_SECONDS,
    shrine: !!run.cleared && run.shrinesSpawned > 0 && run.shrinesLit >= run.shrinesSpawned,
  };
}

// '★★☆' pips for a medals object, in MEDALS order.
export function medalPips(medals) {
  return MEDALS.map((m) => (medals && medals[m] ? '★' : '☆')).join('');
}

export function medalNames(medals) {
  return MEDALS.filter((m) => medals && medals[m]).map((m) => MEDAL_NAMES[m]);
}

// A memory fallback so the module also works outside a browser (tests).
const memoryStore = new Map();
function storage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch {
    /* fall through to memory */
  }
  return {
    getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
    setItem: (k, v) => { memoryStore.set(k, v); },
  };
}

export function emptySave() {
  const sectors = {};
  for (const s of SECTORS) {
    sectors[s.id] = {
      unlocked: s.id === SECTORS[0].id,
      cleared: false,
      best: 0,
      bestWave: 0,
      embers: 0,
      shards: 0,
      shrines: 0,
      medals: { flawless: false, swift: false, shrine: false },
    };
  }
  return { best: 0, totalEmbers: 0, totalShards: 0, sectors, lastSector: SECTORS[0].id };
}

export function loadSave() {
  const save = emptySave();
  try {
    const raw = storage().getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.best === 'number') save.best = parsed.best;
        if (typeof parsed.totalEmbers === 'number') save.totalEmbers = parsed.totalEmbers;
        if (typeof parsed.totalShards === 'number') save.totalShards = parsed.totalShards;
        if (typeof parsed.lastSector === 'string' && save.sectors[parsed.lastSector]) {
          save.lastSector = parsed.lastSector;
        }
        if (parsed.sectors && typeof parsed.sectors === 'object') {
          for (const s of SECTORS) {
            const got = parsed.sectors[s.id];
            if (got && typeof got === 'object') {
              const medals = { flawless: false, swift: false, shrine: false };
              if (got.medals && typeof got.medals === 'object') {
                for (const m of MEDALS) medals[m] = !!got.medals[m];
              }
              save.sectors[s.id] = {
                unlocked: !!got.unlocked || s.id === SECTORS[0].id,
                cleared: !!got.cleared,
                best: typeof got.best === 'number' ? got.best : 0,
                bestWave: typeof got.bestWave === 'number' ? got.bestWave : 0,
                embers: typeof got.embers === 'number' ? got.embers : 0,
                shards: typeof got.shards === 'number' ? got.shards : 0,
                shrines: typeof got.shrines === 'number' ? got.shrines : 0,
                medals,
              };
            }
          }
        }
      }
      return save;
    }
    // One-time migration from the v1 best-only key.
    const oldBest = Number(storage().getItem(OLD_BEST_KEY) || '0') || 0;
    if (oldBest > 0) save.best = oldBest;
  } catch {
    /* corrupt or unavailable storage: start fresh */
  }
  return save;
}

export function saveSave(save) {
  try {
    storage().setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable: progress is session-only */
  }
}

// Fold one finished run into the save. `run` is
// { sectorId, score, wavesCleared, embers, shards, shrinesLit,
//   shrinesSpawned, hitsTaken, cleared, time }.
// countEmbers=false records bests/unlocks without adding to the lifetime
// totals, so the mid-run "sector cleared" save never double-counts.
export function recordRun(save, run, countEmbers = true) {
  const sec = save.sectors[run.sectorId];
  if (!sec) return save;
  if (run.score > save.best) save.best = run.score;
  if (run.score > sec.best) sec.best = run.score;
  if (run.wavesCleared > sec.bestWave) sec.bestWave = run.wavesCleared;
  if (run.embers > sec.embers) sec.embers = run.embers;
  if ((run.shards || 0) > sec.shards) sec.shards = run.shards;
  if ((run.shrinesLit || 0) > sec.shrines) sec.shrines = run.shrinesLit;
  if (countEmbers) {
    save.totalEmbers += run.embers || 0;
    save.totalShards += run.shards || 0;
  }
  const earned = medalsForRun(run);
  for (const m of MEDALS) if (earned[m]) sec.medals[m] = true;
  if (run.cleared) {
    sec.cleared = true;
    const next = nextSector(run.sectorId);
    if (next) save.sectors[next.id].unlocked = true;
  }
  save.lastSector = run.sectorId;
  saveSave(save);
  return save;
}
