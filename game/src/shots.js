// NOVA EMBER — deterministic screenshot scenes behind ?shot=start|play|action|end.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// real game looks like and the same seed always gives the same frame.
// One file, one job: staging screenshots (and the title-screen demo).
import { FIELD, STEP, PLAYER } from './config.js';
import { resetWorld, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const ACTION_MAX_SECONDS = 300;
const END_PLAY_SECONDS = 30;
const END_MAX_SECONDS = 150;

function nearestEnemy(s) {
  let best = null;
  let bestD = Infinity;
  for (const e of s.enemies) {
    const d = (e.x - s.player.x) ** 2 + (e.y - s.player.y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return { enemy: best, dist: Math.sqrt(bestD) };
}

function nearestEmber(s) {
  let best = null;
  let bestD = Infinity;
  for (const em of s.embers) {
    const d = (em.x - s.player.x) ** 2 + (em.y - s.player.y) ** 2;
    if (d < bestD) { bestD = d; best = em; }
  }
  return { ember: best, dist: Math.sqrt(bestD) };
}

function nearestBullet(s) {
  let best = null;
  let bestD = Infinity;
  for (const b of s.bullets) {
    if (b.friendly) continue;
    const d = (b.x - s.player.x) ** 2 + (b.y - s.player.y) ** 2;
    if (d < bestD) { bestD = d; best = b; }
  }
  return { bullet: best, dist: Math.sqrt(bestD) };
}

// Drive the game like a decent player: chase embers when the light is low,
// keep a firing distance from the nearest enemy, dash out of a crowd,
// nova when surrounded. Returns the plain input object stepWorld takes.
export function autopilotInput(s) {
  const p = s.player;
  const { enemy, dist: enemyDist } = nearestEnemy(s);
  const { ember, dist: emberDist } = nearestEmber(s);
  const { bullet, dist: bulletDist } = nearestBullet(s);

  let tx = p.x;
  let ty = p.y;
  if (p.light < 62 && ember) {
    tx = ember.x;
    ty = ember.y;
  } else if (enemy) {
    // Strafe at ~260px from the target, circling it.
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = 260;
    const radial = (d - want) / want;
    tx = p.x + (dx / d) * radial * 120 - (dy / d) * 60;
    ty = p.y + (dy / d) * radial * 120 + (dx / d) * 60;
  }
  // Dodge an incoming bullet: step sideways from its path.
  if (bullet && bulletDist < 150) {
    const bvx = bullet.vx;
    const bvy = bullet.vy;
    const bl = Math.hypot(bvx, bvy) || 1;
    tx += (-bvy / bl) * 140;
    ty += (bvx / bl) * 140;
  }
  // Keep the fight in the open field: near a wall, steer back to the centre
  // instead of camping a corner.
  const edge = 150;
  if (p.x < edge) tx += (edge - p.x) * 1.4;
  if (p.x > FIELD.width - edge) tx -= (p.x - (FIELD.width - edge)) * 1.4;
  if (p.y < edge) ty += (edge - p.y) * 1.4;
  if (p.y > FIELD.height - edge) ty -= (p.y - (FIELD.height - edge)) * 1.4;
  // Stay inside the field with a margin.
  tx = Math.min(FIELD.width - 60, Math.max(60, tx));
  ty = Math.min(FIELD.height - 60, Math.max(60, ty));

  const dx = tx - p.x;
  const dy = ty - p.y;
  const dl = Math.hypot(dx, dy) || 1;
  const move = dl > 12 ? { x: dx / dl, y: dy / dl } : { x: 0, y: 0 };

  let nearCount = 0;
  for (const e of s.enemies) {
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 300 * 300) nearCount += 1;
  }
  return {
    move,
    aimX: enemy ? enemy.x : p.x + 100,
    aimY: enemy ? enemy.y : p.y,
    firing: !!enemy,
    dash: enemyDist < 95 && p.dashCd <= 0,
    nova: nearCount >= 6 && p.novaCharges > 0,
  };
}

// A lazy player: drifts slowly, never fires, never chases embers.
function lazyInput(s) {
  const p = s.player;
  return {
    move: { x: Math.sin(s.time * 0.4) * 0.5, y: Math.cos(s.time * 0.3) * 0.5 },
    aimX: p.x + 100, aimY: p.y, firing: false, dash: false, nova: false,
  };
}

function runSeconds(s, seconds, inputFn, audio, stopWhen) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(s, inputFn(s), audio, STEP);
    if (stopWhen && stopWhen(s)) break;
    if (s.gameOver) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * name: start | play | action | end (anything else is start).
 * `audio` is null in shot mode: screenshots are silent.
 */
export function stageShot(name, world, audio = null) {
  resetWorld(world, 'cinder');
  if (name !== 'play' && name !== 'action' && name !== 'end') {
    runSeconds(world, START_SECONDS, autopilotInput, audio);
    return { screen: SCREEN_TITLE, time: START_SECONDS };
  }
  if (name === 'play') {
    // Mid-wave-4, once the field is busy: later waves spawn faster and
    // denser, so the frame shows several enemies, bullets and embers.
    runSeconds(world, 100, autopilotInput, audio, (s) => s.wave >= 4 && s.enemies.length >= 4);
    return { screen: world.gameOver ? SCREEN_OVER : SCREEN_PLAY, time: world.time };
  }
  if (name === 'action') {
    // Fast-forward to the wave-5 boss fight, and catch the frame just after
    // the Maw fires a radial burst, with minions around and the boss
    // mid-field — no nova, so the bullet ring stays in the frame.
    runSeconds(world, ACTION_MAX_SECONDS, autopilotInput, audio, (s) => {
      if (!s.boss) return false;
      const minions = s.enemies.length - 1;
      const midField = s.boss.y > 200 && s.boss.y < 520 && s.boss.x > 300 && s.boss.x < 980;
      return minions >= 3 && s.boss.burstCd > 2.4 && midField;
    });
    runSeconds(world, 0.6, autopilotInput, audio);
    return { screen: SCREEN_PLAY, time: world.time };
  }
  // end: play well for a while, then go lazy until the light fades.
  runSeconds(world, END_PLAY_SECONDS, autopilotInput, audio);
  runSeconds(world, END_MAX_SECONDS, lazyInput, audio, (s) => s.gameOver);
  return { screen: SCREEN_OVER, time: world.time };
}
