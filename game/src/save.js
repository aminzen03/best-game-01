// NOVA EMBER — persistence: best score, per-sector progress, unlocks.
// The save is one JSON object in localStorage; every read and write is
// guarded, so the game still runs where storage is unavailable (file://,
// private mode) or the stored data is corrupt — it just starts fresh.
// One file, one job: remembering between sessions.
import { SECTORS, nextSector } from './sectors.js';

const KEY = 'nova-ember-save-v2';
const OLD_BEST_KEY = 'nova-ember-best';

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
    };
  }
  return { best: 0, totalEmbers: 0, sectors, lastSector: SECTORS[0].id };
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
        if (typeof parsed.lastSector === 'string' && save.sectors[parsed.lastSector]) {
          save.lastSector = parsed.lastSector;
        }
        if (parsed.sectors && typeof parsed.sectors === 'object') {
          for (const s of SECTORS) {
            const got = parsed.sectors[s.id];
            if (got && typeof got === 'object') {
              save.sectors[s.id] = {
                unlocked: !!got.unlocked || s.id === SECTORS[0].id,
                cleared: !!got.cleared,
                best: typeof got.best === 'number' ? got.best : 0,
                bestWave: typeof got.bestWave === 'number' ? got.bestWave : 0,
                embers: typeof got.embers === 'number' ? got.embers : 0,
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
// { sectorId, score, wavesCleared, embers, cleared, time }.
// countEmbers=false records bests/unlocks without adding to the lifetime
// ember total, so the mid-run "sector cleared" save never double-counts.
export function recordRun(save, run, countEmbers = true) {
  const sec = save.sectors[run.sectorId];
  if (!sec) return save;
  if (run.score > save.best) save.best = run.score;
  if (run.score > sec.best) sec.best = run.score;
  if (run.wavesCleared > sec.bestWave) sec.bestWave = run.wavesCleared;
  if (run.embers > sec.embers) sec.embers = run.embers;
  if (countEmbers) save.totalEmbers += run.embers;
  if (run.cleared) {
    sec.cleared = true;
    const next = nextSector(run.sectorId);
    if (next) save.sectors[next.id].unlocked = true;
  }
  save.lastSector = run.sectorId;
  saveSave(save);
  return save;
}
