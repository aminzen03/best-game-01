// NOVA EMBER — all canvas drawing: background, entities, HUD and screens.
// One file, one job: what the player sees. It simulates nothing.
import { FIELD, PLAYER, PALETTE } from './config.js';
import { makeRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';

const TAU = Math.PI * 2;

// Pre-rendered glow sprites: one radial gradient per colour, drawn cheaply.
const spriteCache = new Map();
function glowSprite(color) {
  if (spriteCache.has(color)) return spriteCache.get(color);
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  spriteCache.set(color, c);
  return c;
}

function drawGlow(ctx, x, y, radius, color, alpha = 0.8) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

// Starfield + nebula, fixed by seed so the background never jumps.
const bgRng = makeRng(20261116);
const stars = [];
for (let layer = 0; layer < 3; layer += 1) {
  for (let i = 0; i < 70; i += 1) {
    stars.push({
      x: bgRng.range(0, FIELD.width), y: bgRng.range(0, FIELD.height),
      r: bgRng.range(0.5, 1.4 + layer * 0.5), layer, tw: bgRng.range(0, TAU),
    });
  }
}
const nebulae = [
  { x: 260, y: 180, r: 320, color: PALETTE.nebulaA },
  { x: 1020, y: 520, r: 380, color: PALETTE.nebulaB },
  { x: 900, y: 120, r: 260, color: PALETTE.nebulaC },
  { x: 180, y: 600, r: 280, color: PALETTE.nebulaB },
];

function drawBackground(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const n of nebulae) {
    ctx.globalAlpha = 0.9;
    drawGlow(ctx, n.x + Math.sin(time * 0.05 + n.x) * 12, n.y + Math.cos(time * 0.04 + n.y) * 10, n.r, n.color, 1);
  }
  ctx.globalAlpha = 1;
  for (const st of stars) {
    const a = 0.35 + 0.3 * Math.sin(time * 1.4 + st.tw) + st.layer * 0.18;
    ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
    ctx.fillStyle = st.layer === 2 ? '#cfe8ff' : '#9db8d8';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx, x, y, angle, radius, color, flame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (flame) {
    ctx.fillStyle = 'rgba(255, 180, 80, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.9, 5);
    ctx.lineTo(-radius * 1.7 - flame * 8, 0);
    ctx.lineTo(-radius * 0.9, -5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(radius * 1.3, 0);
  ctx.lineTo(-radius * 0.9, radius * 0.85);
  ctx.lineTo(-radius * 0.45, 0);
  ctx.lineTo(-radius * 0.9, -radius * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(radius * 0.35, 0, radius * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawEnemyShape(ctx, e) {
  const { def } = e;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
  ctx.strokeStyle = def.glow;
  ctx.lineWidth = 2;
  if (def.shape === 'tri') {
    ctx.beginPath();
    ctx.moveTo(e.r, 0);
    ctx.lineTo(-e.r * 0.8, e.r * 0.8);
    ctx.lineTo(-e.r * 0.8, -e.r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.shape === 'dart') {
    ctx.beginPath();
    ctx.moveTo(e.r * 1.3, 0);
    ctx.lineTo(-e.r, e.r * 0.55);
    ctx.lineTo(-e.r * 0.5, 0);
    ctx.lineTo(-e.r, -e.r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.shape === 'hex') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU;
      if (i === 0) ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
      else ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.35, 0, TAU);
    ctx.fillStyle = '#1a0b00';
    ctx.fill();
  } else if (def.shape === 'needle') {
    ctx.beginPath();
    ctx.moveTo(e.r * 1.6, 0);
    ctx.lineTo(-e.r, e.r * 0.4);
    ctx.lineTo(-e.r, -e.r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (def.shape === 'orb') {
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.8, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.35, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  } else if (def.shape === 'maw') {
    // Eight sharp spikes around a toothed mouth.
    ctx.beginPath();
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * TAU;
      const rr = i % 2 === 0 ? e.r : e.r * 0.52;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Teeth: small triangles ringing the mouth, pointing inward.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + 0.2;
      const tx = Math.cos(a) * e.r * 0.42;
      const ty = Math.sin(a) * e.r * 0.42;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(a + 0.22) * 9, ty + Math.sin(a + 0.22) * 9);
      ctx.lineTo(tx + Math.cos(a - 0.22) * 9, ty + Math.sin(a - 0.22) * 9);
      ctx.lineTo(tx * 0.55, ty * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.3, 0, TAU);
    ctx.fillStyle = '#2b000a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.14, 0, TAU);
    ctx.fillStyle = '#ff5b7a';
    ctx.fill();
  }
  ctx.restore();
}

function drawRift(ctx, r, time) {
  ctx.save();
  ctx.translate(r.x, r.y);
  drawGlow(ctx, 0, 0, 120, '#7b2ff7', 0.35);
  ctx.rotate(time * 1.4);
  ctx.strokeStyle = '#c77dff';
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.globalAlpha = 0.85 - ring * 0.22;
    ctx.lineWidth = 3 - ring * 0.6;
    ctx.beginPath();
    const rr = 26 + ring * 22;
    ctx.arc(0, 0, rr, ring * 1.3, ring * 1.3 + Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  const charge = Math.min(1, r.hits / 12);
  if (charge > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`RIFT ${Math.round(charge * 100)}%`, r.x, r.y - 62);
  }
}

function drawPowerup(ctx, pu, time) {
  const bob = Math.sin(time * 3 + pu.x) * 4;
  const colors = { shield: '#37e6ff', rapid: '#7dff6a', spread: '#ffd166', nova: '#c77dff' };
  const labels = { shield: 'S', rapid: 'R', spread: 'W', nova: 'N' };
  const color = colors[pu.kind] || '#ffffff';
  drawGlow(ctx, pu.x, pu.y + bob, 26, color, 0.7);
  ctx.save();
  ctx.translate(pu.x, pu.y + bob);
  ctx.fillStyle = 'rgba(5, 8, 24, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels[pu.kind], 0, 1);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(255,255,255,0.12)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawHud(ctx, s, muted) {
  const p = s.player;
  const mult = Math.min(5, 1 + s.combo * 0.05);
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 30px ui-monospace, monospace';
  ctx.fillText(String(s.score).padStart(6, '0'), 20, 40);
  ctx.font = '13px ui-monospace, monospace';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`BEST ${Math.max(s.best, s.score)}`, 20, 60);
  if (s.combo >= 5) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.fillText(`COMBO x${mult.toFixed(1)}  (${s.combo})`, 20, 84);
  }
  // Wave, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.fillText(`WAVE ${Math.max(1, s.wave)}`, FIELD.width / 2, 34);
  if (s.boss) {
    ctx.fillStyle = '#ff3860';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText('VOID MAW', FIELD.width / 2, 54);
    bar(ctx, FIELD.width / 2 - 130, 62, 260, 8, s.boss.hp / s.boss.maxHp, '#ff3860');
  }
  // Lives + nova, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < PLAYER.maxLives; i += 1) {
    const x = FIELD.width - 24 - i * 30;
    const y = 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = i < s.lives ? '#37e6ff' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#c77dff';
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.fillText(`${'◆'.repeat(p.novaCharges)}${'◇'.repeat(PLAYER.novaMax - p.novaCharges)} NOVA [E]`, FIELD.width - 20, 60);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '12px ui-monospace, monospace';
  ctx.fillText(`DASH [SHIFT] ${p.dashCd > 0 ? Math.ceil(p.dashCd * 10) / 10 + 's' : 'READY'}`, FIELD.width - 20, 80);
  ctx.fillText(muted ? 'SOUND OFF [M]' : 'SOUND ON [M]', FIELD.width - 20, 98);
  // Light meter, bottom centre.
  const mw = 420;
  const mx = FIELD.width / 2 - mw / 2;
  const my = FIELD.height - 34;
  const low = s.lowLight;
  ctx.textAlign = 'center';
  ctx.fillStyle = low && Math.floor(s.time * 4) % 2 === 0 ? '#ff5b5b' : PALETTE.gold;
  ctx.font = 'bold 13px ui-monospace, monospace';
  ctx.fillText(low ? '⚠ LIGHT FADING — COLLECT EMBERS ⚠' : '✦ LIGHT ✦', FIELD.width / 2, my - 8);
  bar(ctx, mx, my, mw, 10, p.light / PLAYER.lightMax, low ? '#ff3860' : '#ffd166');
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, 10);
  // Active power-up timers, bottom left.
  ctx.textAlign = 'left';
  ctx.font = '13px ui-monospace, monospace';
  let py = FIELD.height - 44;
  if (p.shield > 0) { ctx.fillStyle = '#37e6ff'; ctx.fillText(`SHIELD ${p.shield.toFixed(0)}s`, 20, py); py -= 18; }
  if (p.rapid > 0) { ctx.fillStyle = '#7dff6a'; ctx.fillText(`RAPID ${p.rapid.toFixed(0)}s`, 20, py); py -= 18; }
  if (p.spread > 0) { ctx.fillStyle = '#ffd166'; ctx.fillText(`SPREAD ${p.spread.toFixed(0)}s`, 20, py); py -= 18; }
  // Wave banner.
  if (s.waveState === 'banner' || s.waveState === 'clear') {
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = s.waveState === 'clear' ? '#7dff6a' : PALETTE.hud;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(s.banner, FIELD.width / 2, FIELD.height / 2 - 60);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, s, time, steady = false) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const pulse = 1 + Math.sin(time * 2) * 0.02;
  ctx.save();
  ctx.translate(FIELD.width / 2, 168);
  ctx.scale(pulse, pulse);
  ctx.font = 'bold 84px system-ui, sans-serif';
  const grad = ctx.createLinearGradient(-260, 0, 260, 0);
  grad.addColorStop(0, '#37e6ff');
  grad.addColorStop(0.5, '#ffd166');
  grad.addColorStop(1, '#ff4d8d');
  ctx.fillStyle = grad;
  ctx.shadowColor = '#37e6ff';
  ctx.shadowBlur = 26;
  ctx.fillText('NOVA EMBER', 0, 0);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The last ember of a dying star. The Void is coming for your light.', FIELD.width / 2, 208);
  // How to play panel.
  const px = FIELD.width / 2 - 330;
  const py = 250;
  ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
  ctx.strokeStyle = 'rgba(55, 230, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, 660, 168, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 16px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HOW TO PLAY', px + 24, py + 32);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK / SPACE — fire',
    'SHIFT / RIGHT-CLICK — dash through danger',
    'E — NOVA blast (costs 1 charge)      P — pause      M — sound',
    'Your LIGHT drains — collect the embers of fallen Void to stay alive.',
    'Shoot a RIFT 12 times to charge it: it detonates into a nova.',
    'Survive the waves. Every 5th wave the VOID MAW comes.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, px + 24, py + 60 + i * 21));
  if (s.best > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.fillText(`BEST SCORE  ${s.best}`, FIELD.width / 2, 452);
  }
  if (steady || Math.floor(time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO IGNITE', FIELD.width / 2, 500);
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('A complete game: waves, boss, power-ups, nova, rifts — and a restart.', FIELD.width / 2, 540);
}

function drawGameOver(ctx, s, steady = false) {
  ctx.fillStyle = 'rgba(8, 2, 10, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5b7a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = '#ff3860';
  ctx.shadowBlur = 24;
  ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 200);
  ctx.shadowBlur = 0;
  const isBest = s.score >= s.best && s.score > 0;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 34px ui-monospace, monospace';
  ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 268);
  if (isBest) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText('★ NEW BEST ★', FIELD.width / 2, 306);
  } else {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '18px ui-monospace, monospace';
    ctx.fillText(`BEST  ${s.best}`, FIELD.width / 2, 306);
  }
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '17px ui-monospace, monospace';
  const acc = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 0;
  ctx.fillText(`WAVES SURVIVED  ${s.wavesCleared}      VOID DESTROYED  ${s.kills}      ACCURACY  ${acc}%`, FIELD.width / 2, 352);
  if (steady || Math.floor(s.time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 420);
  }
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('Press P or Esc to resume', FIELD.width / 2, FIELD.height / 2 + 30);
}

export function render(ctx, s, screen, time, muted, steady = false) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  if (s.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }
  drawBackground(ctx, time);
  for (const r of s.rifts) drawRift(ctx, r, time);
  // Embers.
  for (const em of s.embers) {
    const flick = 0.65 + 0.35 * Math.sin(time * 6 + em.x);
    drawGlow(ctx, em.x, em.y, 16, '#ffd166', flick);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(em.x, em.y, 4, 0, TAU);
    ctx.fill();
  }
  for (const pu of s.powerups) drawPowerup(ctx, pu, time);
  // Enemy bullets (under enemies).
  for (const b of s.bullets) {
    if (b.friendly) continue;
    drawGlow(ctx, b.x, b.y, 18, '#ff4d8d', 0.85);
    ctx.fillStyle = '#ffd7e6';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
  }
  // Enemies.
  for (const e of s.enemies) {
    drawGlow(ctx, e.x, e.y, e.r * 2.1, e.def.glow, 0.5);
    drawEnemyShape(ctx, e);
  }
  // Player bullets.
  for (const b of s.bullets) {
    if (!b.friendly) continue;
    drawGlow(ctx, b.x, b.y, 17, '#37e6ff', 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, TAU);
    ctx.fill();
  }
  // Player.
  const p = s.player;
  if (p.alive && screen !== SCREEN_OVER) {
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (!blink) {
      drawGlow(ctx, p.x, p.y, 44, '#37e6ff', 0.75);
      const moving = Math.hypot(p.vx, p.vy) > 60;
      drawShip(ctx, p.x, p.y, p.angle, PLAYER.radius, '#9ff3ff', moving ? 1 : 0);
      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(55, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER.radius + 10, 0, TAU);
        ctx.stroke();
      }
      if (p.dashTime > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER.radius + 18, 0, TAU);
        ctx.stroke();
      }
    }
  }
  // Particles (additive).
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of s.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Shockwaves.
  for (const w of s.shockwaves) {
    const a = Math.max(0, w.life / w.maxLife);
    ctx.strokeStyle = `rgba(255, 209, 102, ${a})`;
    ctx.lineWidth = 5 * a + 1;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(55, 230, 255, ${a * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * 0.82, 0, TAU);
    ctx.stroke();
  }
  // Floating texts.
  ctx.textAlign = 'center';
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size}px ui-monospace, monospace`;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Full-screen flashes (outside the shake transform).
  if (s.flashRed > 0) {
    ctx.fillStyle = `rgba(255, 40, 70, ${s.flashRed * 0.35})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (s.flashGold > 0) {
    ctx.fillStyle = `rgba(255, 209, 102, ${s.flashGold * 0.22})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (s.lowLight && !s.gameOver && screen === SCREEN_PLAY) {
    ctx.strokeStyle = `rgba(255, 56, 96, ${0.25 + 0.2 * Math.sin(time * 5)})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
  }

  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) drawHud(ctx, s, muted);
  if (screen === SCREEN_TITLE) drawTitle(ctx, s, time, steady);
  if (screen === SCREEN_OVER) drawGameOver(ctx, s, steady);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
}
