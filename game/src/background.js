// NOVA EMBER — the backdrop: gradient sky, nebulae and starfield, all in
// the current sector's colours, so each region looks like a different place.
// The stars are fixed by seed so the background never jumps; the nebulae
// drift slowly.
// One file, one job: the sky.
import { FIELD, PALETTE } from './config.js';
import { makeRng } from './random.js';
import { TAU } from './util.js';
import { sectorById } from './sectors.js';

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

export function drawGlow(ctx, x, y, radius, color, alpha = 0.8) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

// One big feature per sector, drawn behind the action so each region reads
// as a different place at a glance: the dying star over Cinder Drift, void
// crystal spires in the Reef, a broken ringed planet over Starfall, the
// pulsing nova heart at the Core. Landmarks parallax the least — they are
// the farthest layer.
function drawLandmark(ctx, sector, time, px, py) {
  const lm = sector.landmark;
  if (!lm) return;
  // Far-layer parallax: the landmark drifts slightly against the player.
  const ox = (px - FIELD.width / 2) * -0.015;
  const oy = (py - FIELD.height / 2) * -0.015;
  const x = lm.x + ox;
  const y = lm.y + oy;
  if (lm.kind === 'dying-star') {
    drawGlow(ctx, x, y, lm.r * 1.6, sector.accent, 0.5);
    // A dying star is a gradient, not a flat disc: bright core fading out.
    const starGrad = ctx.createRadialGradient(x, y, 0, x, y, lm.r * 0.55);
    starGrad.addColorStop(0, '#fff3c4');
    starGrad.addColorStop(0.45, sector.accent);
    starGrad.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(x, y, lm.r * 0.55, 0, TAU);
    ctx.fill();
    // Ash pillars rising from the ember fields below.
    for (let i = 0; i < 4; i += 1) {
      const ax = 120 + i * 320 + Math.sin(time * 0.1 + i * 2) * 8;
      const grad = ctx.createLinearGradient(0, FIELD.height, 0, FIELD.height - 260);
      grad.addColorStop(0, 'rgba(255, 140, 40, 0.10)');
      grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(ax, FIELD.height - 260, 26, 260);
    }
  } else if (lm.kind === 'crystals') {
    for (let i = 0; i < 5; i += 1) {
      const cx = 120 + i * 260 + Math.sin(time * 0.07 + i) * 6;
      const h = 130 + ((i * 67) % 130);
      const w = 34 + ((i * 29) % 26);
      drawGlow(ctx, cx, FIELD.height - h, 90, sector.accent, 0.35);
      ctx.fillStyle = sector.accent;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, FIELD.height);
      ctx.lineTo(cx, FIELD.height - h);
      ctx.lineTo(cx + w / 2, FIELD.height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (lm.kind === 'ringed-planet') {
    drawGlow(ctx, x, y, lm.r * 1.5, sector.accent, 0.4);
    ctx.fillStyle = '#0a2036';
    ctx.beginPath();
    ctx.arc(x, y, lm.r * 0.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = sector.accent;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y, lm.r * 1.5, lm.r * 0.32, -0.35, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Shard rain: short streaks falling from the broken sky.
    ctx.strokeStyle = 'rgba(207, 238, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const sx = ((i * 173 + time * 40) % (FIELD.width + 100)) - 50;
      const sy = ((i * 97 + time * 90) % (FIELD.height + 60)) - 30;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 14, sy - 26);
      ctx.stroke();
    }
  } else if (lm.kind === 'nova-heart') {
    const pulse = 1 + Math.sin(time * 1.8) * 0.08;
    drawGlow(ctx, x, y, lm.r * pulse, sector.accent, 0.55);
    ctx.fillStyle = '#fff3c4';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, lm.r * 0.34 * pulse, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = sector.accent;
    for (let ring = 0; ring < 2; ring += 1) {
      const rr = lm.r * (0.55 + ring * 0.35) * (1 + 0.05 * Math.sin(time * 1.8 + ring));
      ctx.globalAlpha = 0.5 - ring * 0.2;
      ctx.lineWidth = 3 - ring;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawBackground(ctx, time, sectorId = 'cinder', player = null) {
  const sector = sectorById(sectorId);
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, sector.bgTop || PALETTE.bgTop);
  grad.addColorStop(1, sector.bgBottom || PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Parallax: the backdrop drifts against the player's position, far
  // layers least. At the field centre the offset is zero.
  const px = player ? player.x : FIELD.width / 2;
  const py = player ? player.y : FIELD.height / 2;
  const parX = (px - FIELD.width / 2) * -1;
  const parY = (py - FIELD.height / 2) * -1;
  drawLandmark(ctx, sector, time, px, py);
  const nebulae = [
    { x: 260, y: 180, r: 320, color: sector.nebulaA },
    { x: 1020, y: 520, r: 380, color: sector.nebulaB },
    { x: 900, y: 120, r: 260, color: sector.nebulaC },
    { x: 180, y: 600, r: 280, color: sector.nebulaB },
  ];
  for (const n of nebulae) {
    ctx.globalAlpha = 0.9;
    drawGlow(
      ctx,
      n.x + Math.sin(time * 0.05 + n.x) * 12 + parX * 0.01,
      n.y + Math.cos(time * 0.04 + n.y) * 10 + parY * 0.01,
      n.r, n.color, 1,
    );
  }
  ctx.globalAlpha = 1;
  for (const st of stars) {
    const a = 0.35 + 0.3 * Math.sin(time * 1.4 + st.tw) + st.layer * 0.18;
    ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
    ctx.fillStyle = st.layer === 2 ? (sector.starTint || '#cfe8ff') : '#9db8d8';
    // Near star layers parallax more; positions wrap so no gaps open up.
    const f = 0.02 + st.layer * 0.015;
    const sx = (((st.x + parX * f) % FIELD.width) + FIELD.width) % FIELD.width;
    const sy = (((st.y + parY * f) % FIELD.height) + FIELD.height) % FIELD.height;
    ctx.beginPath();
    ctx.arc(sx, sy, st.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
