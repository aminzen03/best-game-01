// NOVA EMBER — entrypoint: canvas setup, fixed-timestep loop, screens,
// and the ?shot= scene mode used for the entry's screenshots.
// One file, one job: run the game.
import { FIELD, STEP, PLAYER } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, SCREEN_PAUSE } from './render.js';
import { stageShot, autopilotInput } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const rng = makeRng(seed * 7919 + 13);

function loadBest() {
  try {
    return Number(window.localStorage.getItem('nova-ember-best') || '0') || 0;
  } catch {
    return 0;
  }
}
function saveBest(score) {
  try {
    window.localStorage.setItem('nova-ember-best', String(score));
  } catch {
    /* storage unavailable (file://, private mode): best is session-only */
  }
}

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(rng, loadBest());

let screen = SCREEN_TITLE;
let time = 0;
let frozen = false; // shot mode: render one staged frame, never advance
let acc = 0;
let last = performance.now();

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

function startGame() {
  audio.unlock();
  resetWorld(world);
  world.best = loadBest();
  screen = SCREEN_PLAY;
}

function backToTitle() {
  resetWorld(world);
  world.best = loadBest();
  screen = SCREEN_TITLE;
}

function togglePause() {
  if (screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
  else if (screen === SCREEN_PAUSE) screen = SCREEN_PLAY;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (frozen) {
    render(ctx, world, screen, time, audio.muted, true);
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
  if (input.hit('Enter')) {
    if (screen === SCREEN_TITLE) startGame();
    else if (screen === SCREEN_OVER && world.overTimer > 1) startGame();
  }
  if (input.hit('r', 'R')) {
    if (screen === SCREEN_OVER && world.overTimer > 1) startGame();
  }
  if (input.mouse.clicked) {
    audio.unlock();
    if (screen === SCREEN_TITLE) startGame();
    else if (screen === SCREEN_OVER && world.overTimer > 1) startGame();
  }

  if (screen === SCREEN_TITLE) {
    // Attract mode: the autopilot plays behind the title.
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      stepWorld(world, autopilotInput(world), null, STEP);
      if (world.gameOver) {
        resetWorld(world);
        world.best = loadBest();
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
    if (world.gameOver) {
      if (world.score > world.best) {
        world.best = world.score;
        saveBest(world.score);
      }
      if (world.overTimer > 1.2) screen = SCREEN_OVER;
    }
  }

  render(ctx, world, screen, time, audio.muted);
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
  start: startGame,
  title: backToTitle,
};

if (shotName) {
  // Screenshot mode: stage the scene synchronously, render it frozen.
  const staged = stageShot(shotName, world, null);
  screen = staged.screen;
  time = staged.time;
  frozen = true;
  render(ctx, world, screen, time, audio.muted, true);
  document.title = `NOVA EMBER — shot ${shotName}`;
} else {
  requestAnimationFrame(frame);
}
