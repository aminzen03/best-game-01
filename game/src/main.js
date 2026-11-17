// NOVA EMBER — entrypoint: canvas setup, fixed-timestep loop, screens,
// and the ?shot= scene mode used for the entry's screenshots.
// One file, one job: run the game.
import { FIELD, STEP, PLAYER } from './config.js';
import { SECTORS, sectorById, nextSector } from './sectors.js';
import { loadSave, recordRun } from './save.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import {
  render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, SCREEN_PAUSE, SCREEN_WIN,
} from './render.js';
import { stageShot, autopilotInput } from './shots.js';
import { sectorCardAt } from './screens.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const rng = makeRng(seed * 7919 + 13);

const save = loadSave();
let selectedSector = save.sectors[save.lastSector] && save.sectors[save.lastSector].unlocked
  ? save.lastSector
  : SECTORS[0].id;

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(rng, save.best, selectedSector);

let screen = SCREEN_TITLE;
let time = 0;
let frozen = false; // shot mode: render one staged frame, never advance
let acc = 0;
let last = performance.now();
let runRecorded = false; // this run's stats were folded into the save

function runStats() {
  return {
    sectorId: world.sectorId,
    score: world.score,
    wavesCleared: world.wavesCleared,
    embers: world.player.embersGathered,
    shards: world.player.shardsGathered,
    shrinesLit: world.shrinesLit,
    shrinesSpawned: world.shrinesSpawned,
    hitsTaken: world.hitsTaken,
    cleared: world.sectorCleared,
    time: world.time,
  };
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function selectSector(id) {
  if (!save.sectors[id] || !save.sectors[id].unlocked) return false;
  if (selectedSector === id) return true;
  selectedSector = id;
  // The attract mode behind the title plays in the chosen sector.
  resetWorld(world, selectedSector);
  world.best = save.best;
  return true;
}

function startGame() {
  audio.unlock();
  resetWorld(world, selectedSector);
  world.best = save.best;
  runRecorded = false;
  screen = SCREEN_PLAY;
}

function backToTitle() {
  resetWorld(world, selectedSector);
  world.best = save.best;
  screen = SCREEN_TITLE;
}

function togglePause() {
  if (screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
  else if (screen === SCREEN_PAUSE) screen = SCREEN_PLAY;
}

// From the win screen: fly to the next sector, or back to the title when
// the campaign is complete (no next sector).
function advanceFromVictory() {
  audio.unlock();
  const next = nextSector(world.sectorId);
  if (next) {
    selectedSector = next.id;
    startGame();
  } else {
    backToTitle();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  if (frozen) {
    render(ctx, world, screen, time, audio.muted, true, { save, selectedSector });
    input.endFrame();
    return;
  }
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  time += dt;

  // Global keys.
  if (input.hit('m', 'M')) audio.toggleMute();
  if (input.hit('p', 'P', 'Escape')) togglePause();
  if (screen === SCREEN_WIN) {
    if (input.hit('Enter') || input.mouse.clicked) advanceFromVictory();
    else if (input.hit('t', 'T')) backToTitle();
  } else if (screen === SCREEN_TITLE) {
    // Sector select: keys 1-4, or click a card (click again to start).
    for (let i = 0; i < SECTORS.length; i += 1) {
      if (input.hit(String(i + 1))) selectSector(SECTORS[i].id);
    }
    if (input.mouse.clicked) {
      audio.unlock();
      const hit = sectorCardAt(input.mouse.x, input.mouse.y);
      if (hit) {
        if (hit === selectedSector) startGame();
        else selectSector(hit);
      } else {
        startGame();
      }
    }
    if (input.hit('Enter')) startGame();
  } else if (input.hit('Enter')) {
    if (screen === SCREEN_OVER && world.overTimer > 1) startGame();
  }
  if (input.hit('r', 'R')) {
    if (screen === SCREEN_OVER && world.overTimer > 1) startGame();
  }
  if (input.mouse.clicked && screen === SCREEN_OVER && world.overTimer > 1) {
    audio.unlock();
    startGame();
  }

  if (screen === SCREEN_TITLE) {
    // Attract mode: the autopilot plays behind the title.
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      stepWorld(world, autopilotInput(world), null, STEP);
      if (world.gameOver || world.victory) {
        resetWorld(world, selectedSector);
        world.best = save.best;
      }
    }
  } else if (screen === SCREEN_PLAY) {
    // Edge-triggered actions are read once per frame, not once per step,
    // so one key press is never spent twice.
    const dashPressed = input.hit('Shift') || input.mouse.rightClicked;
    const novaPressed = input.hit('e', 'E', 'q', 'Q');
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      acc -= STEP;
      guard += 1;
      stepWorld(world, {
        move: input.moveVector(),
        aimX: input.mouse.x,
        aimY: input.mouse.y,
        firing: input.firing(),
        dash: dashPressed,
        nova: novaPressed,
      }, audio, STEP);
    }
    if (acc >= STEP) acc = 0;
    // Clearing a sector's boss unlocks the next one right away.
    if (world.sectorCleared && !world.sectorClearSaved) {
      recordRun(save, runStats(), false);
      world.best = save.best;
      world.sectorClearSaved = true;
    }
    if (world.gameOver) {
      if (!runRecorded) {
        recordRun(save, runStats(), true);
        world.best = save.best;
        runRecorded = true;
      }
      if (world.overTimer > 1.2) screen = SCREEN_OVER;
    }
    // The boss is dead: after the celebration, the win screen takes over.
    // The run is recorded once, with its embers counted (the mid-run save
    // at sector-clear used countEmbers=false, so nothing double-counts).
    if (world.victory && world.victoryTimer > 1.2) {
      if (!runRecorded) {
        recordRun(save, runStats(), true);
        world.best = save.best;
        runRecorded = true;
      }
      screen = SCREEN_WIN;
    }
  }

  render(ctx, world, screen, time, audio.muted, false, { save, selectedSector });
  input.endFrame();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
});

// Test hook: the play-test driver reads the live state through this.
window.__ember = {
  get world() { return world; },
  get screen() { return screen; },
  get time() { return time; },
  get audio() { return audio; },
  get save() { return save; },
  get selectedSector() { return selectedSector; },
  start: startGame,
  title: backToTitle,
  select: selectSector,
};

if (shotName) {
  // Screenshot mode: stage the scene synchronously, render it frozen.
  const staged = stageShot(shotName, world, null);
  screen = staged.screen;
  time = staged.time;
  frozen = true;
  render(ctx, world, screen, time, audio.muted, true, { save, selectedSector: 'cinder' });
  document.title = `NOVA EMBER — shot ${shotName}`;
} else {
  requestAnimationFrame(frame);
}
