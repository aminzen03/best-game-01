// NOVA EMBER — deterministic screenshot scenes behind ?shot=start|play|action|end.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// real game looks like and the same seed always gives the same frame.
// One file, one job: staging screenshots (and the title-screen demo).
import { FIELD, STEP, PLAYER } from './config.js';
import { resetWorld, stepWorld } from './world.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const ACTION_MAX_SECONDS = 300;
const END_PLAY_SECONDS = 30;
const END_MAX_SECONDS = 150;
const VICTORY_MAX_SECONDS = 600;

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

// Boss-fight driving: the Maw's radial rings and its minions punish a
// pilot who stands still, so this driver flees every nearby threat —
// repulsion from enemies and bullets — while orbiting the boss at ~300px,
// killing close minions first and saving the nova for a closing ring or a
// crowd. The same driver runs the title-screen attract mode, so the demo
// behind the menu can actually win a boss fight.
function bossFightInput(s) {
  const p = s.player;
  const boss = s.boss;
  // Repulsion from every nearby threat, so nothing reaches touch range.
  let fx = 0;
  let fy = 0;
  for (const e of s.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 280) {
      const w = (280 - d) / 280;
      fx += (dx / d) * w * 320;
      fy += (dy / d) * w * 320;
    }
  }
  for (const b of s.bullets) {
    if (b.friendly) continue;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 170) {
      const w = (170 - d) / 170;
      fx += (dx / d) * w * 260;
      fy += (dy / d) * w * 260;
    }
  }
  // Orbit the boss at ~300px: far enough that the ring's gaps are wide.
  // Very close in, drop the orbit and flee outright — the Maw's touch
  // radius is huge, and a dash along an orbit tangent can carry the pilot
  // straight into it.
  const dx = p.x - boss.x;
  const dy = p.y - boss.y;
  const d = Math.hypot(dx, dy) || 1;
  const radial = (d - 300) / 300;
  if (d < 150) {
    fx += (dx / d) * 320;
    fy += (dy / d) * 320;
  } else {
    fx += (dx / d) * radial * 120 - (dy / d) * 60;
    fy += (dy / d) * radial * 120 + (dx / d) * 60;
  }
  // Rifts pull everything within 250px toward them — including the pilot,
  // and a rift between pilot and Maw can drag the pilot into the Maw.
  // Steer clear of them during the boss fight.
  for (const r of s.rifts) {
    const rdx = p.x - r.x;
    const rdy = p.y - r.y;
    const rd = Math.hypot(rdx, rdy) || 1;
    if (rd < 260) {
      const w = (260 - rd) / 260;
      fx += (rdx / rd) * w * 300;
      fy += (rdy / rd) * w * 300;
    }
  }
  // Never get cornered: pure repulsion from the Maw flees in a straight
  // line until a wall stops it, and then the Maw walks in for the touch.
  // Near a wall, steer back toward the open field instead.
  const edge = 160;
  if (p.x < edge) fx += (edge - p.x) * 2.2;
  if (p.x > FIELD.width - edge) fx -= (p.x - (FIELD.width - edge)) * 2.2;
  if (p.y < edge) fy += (edge - p.y) * 2.2;
  if (p.y > FIELD.height - edge) fy -= (p.y - (FIELD.height - edge)) * 2.2;
  // Chase an ember when the light is critical and nothing is very close.
  let nearestED = Infinity;
  for (const e of s.enemies) {
    const dd = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (dd < nearestED) nearestED = dd;
  }
  if (p.light < 25 && nearestED > 200 * 200) {
    let best = null;
    let bestD = Infinity;
    for (const em of s.embers) {
      const dd = (em.x - p.x) ** 2 + (em.y - p.y) ** 2;
      if (dd < bestD) { bestD = dd; best = em; }
    }
    if (best) { fx += (best.x - p.x) * 2; fy += (best.y - p.y) * 2; }
  }
  const fl = Math.hypot(fx, fy) || 1;
  // Aim: the closest minion when one is near, the boss otherwise.
  let target = boss;
  let td = Infinity;
  for (const e of s.enemies) {
    const dd = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (dd < td) { td = dd; target = e; }
  }
  if (td > 230 * 230) target = boss;
  let nearBullets = 0;
  let nbd = Infinity;
  for (const b of s.bullets) {
    if (b.friendly) continue;
    const dd = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
    if (dd < 260 * 260) nearBullets += 1;
    if (dd < nbd) nbd = dd;
  }
  let nearCount = 0;
  for (const e of s.enemies) {
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 300 * 300) nearCount += 1;
  }
  return {
    move: { x: fx / fl, y: fy / fl },
    aimX: target.x,
    aimY: target.y,
    firing: true,
    dash: (Math.sqrt(nbd) < 95 || Math.sqrt(nearestED) < 95) && p.dashCd <= 0,
    nova: (nearBullets >= 4 || nearCount >= 6) && p.novaCharges > 0,
  };
}

// Drive the game like a decent player: chase embers when the light is low,
// keep a firing distance from the nearest enemy, dash out of a crowd,
// nova when surrounded. Returns the plain input object stepWorld takes.
export function autopilotInput(s) {
  if (s.boss) return bossFightInput(s);
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
 * name: start | play | action | end | victory (anything else is start).
 * `audio` is null in shot mode: screenshots are silent.
 */
export function stageShot(name, world, audio = null) {
  resetWorld(world, 'cinder');
  if (name === 'victory') {
    // Play the boss fight until the Maw dies, then let the celebration
    // run out (~1.5s, so the kill's floating texts fade) and freeze on
    // the win screen — the same real rules as a played run, driven by the
    // autopilot's boss-fight branch.
    runSeconds(world, VICTORY_MAX_SECONDS, autopilotInput, audio, (s) => s.sectorCleared);
    if (world.sectorCleared) {
      runSeconds(world, 1.5, autopilotInput, audio);
      return { screen: SCREEN_WIN, time: world.time };
    }
    return { screen: SCREEN_PLAY, time: world.time };
  }
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
