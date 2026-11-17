// NOVA EMBER — all canvas drawing in play: entities, HUD, and the render
// orchestration. The backdrop lives in background.js, the full screens
// (title, game over, pause) in screens.js.
// One file, one job: what the player sees in play.
import { FIELD, PLAYER, COMBO, PALETTE } from './config.js';
import { drawBackground, drawGlow } from './background.js';
import {
  drawTitle, drawGameOver, drawPause, drawVictory,
} from './screens.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

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

function drawShrine(ctx, sh, time) {
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4 + sh.x);
  drawGlow(ctx, sh.x, sh.y, 70, sh.lit ? '#7dff6a' : '#ffd166', sh.lit ? 0.5 : 0.55 * pulse);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = sh.lit ? 'rgba(125, 255, 106, 0.25)' : 'rgba(255, 209, 102, 0.16)';
  ctx.strokeStyle = sh.lit ? '#7dff6a' : '#ffd166';
  ctx.lineWidth = 2.5;
  const r = 26;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Hit pips: how many shots remain to light it.
  if (!sh.lit) {
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < sh.maxHp; i += 1) {
      ctx.globalAlpha = i < sh.hp ? 0.95 : 0.25;
      ctx.beginPath();
      ctx.arc(sh.x - (sh.maxHp - 1) * 7 + i * 14, sh.y + 40, 4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHRINE', sh.x, sh.y - 40);
  } else {
    ctx.fillStyle = '#7dff6a';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHRINE LIT', sh.x, sh.y - 40);
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
  const mult = Math.min(COMBO.cap, 1 + s.combo * COMBO.step);
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
  // Wave + sector, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.fillText(`WAVE ${Math.max(1, s.wave)}`, FIELD.width / 2, 34);
  ctx.fillStyle = s.sector.accent;
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillText(`SECTOR · ${s.sector.name}`, FIELD.width / 2, 52);
  if (s.boss) {
    ctx.fillStyle = '#ff3860';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText(s.boss.def.name, FIELD.width / 2, 70);
    bar(ctx, FIELD.width / 2 - 130, 78, 260, 8, s.boss.hp / s.boss.maxHp, '#ff3860');
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
  // Light meter + ember harvest tally, bottom centre.
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
  ctx.fillStyle = p.embersGathered >= s.sector.emberTarget ? '#7dff6a' : PALETTE.gold;
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillText(`EMBERS ${p.embersGathered}/${s.sector.emberTarget}  ·  SHARDS ${p.shardsGathered}  ·  SHRINES ${s.shrinesLit}/${s.shrinesSpawned}`, FIELD.width / 2, my + 26);
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

export function render(ctx, s, screen, time, muted, steady = false, ui = null) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  if (s.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }
  drawBackground(ctx, time, s.sectorId, s.player);
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
  // Star shards: cyan diamonds, the second collectible.
  for (const sh of s.shards) {
    const tw = 0.7 + 0.3 * Math.sin(time * 5 + sh.x * 2);
    drawGlow(ctx, sh.x, sh.y, 18, '#37e6ff', tw);
    ctx.save();
    ctx.translate(sh.x, sh.y);
    ctx.rotate(time * 2 + sh.x);
    ctx.fillStyle = '#d9fbff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Shrines: glowing obelisks with hit pips.
  for (const shr of s.shrines) drawShrine(ctx, shr, time);
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
  if (p.alive && screen !== SCREEN_OVER && screen !== SCREEN_WIN) {
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
  if (screen === SCREEN_TITLE) drawTitle(ctx, s, time, steady, ui);
  if (screen === SCREEN_OVER) drawGameOver(ctx, s, steady, ui);
  if (screen === SCREEN_WIN) drawVictory(ctx, s, steady, ui);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
}
