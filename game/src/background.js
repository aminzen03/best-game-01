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

export function drawBackground(ctx, time, sectorId = 'cinder') {
  const sector = sectorById(sectorId);
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, sector.bgTop || PALETTE.bgTop);
  grad.addColorStop(1, sector.bgBottom || PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const nebulae = [
    { x: 260, y: 180, r: 320, color: sector.nebulaA },
    { x: 1020, y: 520, r: 380, color: sector.nebulaB },
    { x: 900, y: 120, r: 260, color: sector.nebulaC },
    { x: 180, y: 600, r: 280, color: sector.nebulaB },
  ];
  for (const n of nebulae) {
    ctx.globalAlpha = 0.9;
    drawGlow(ctx, n.x + Math.sin(time * 0.05 + n.x) * 12, n.y + Math.cos(time * 0.04 + n.y) * 10, n.r, n.color, 1);
  }
  ctx.globalAlpha = 1;
  for (const st of stars) {
    const a = 0.35 + 0.3 * Math.sin(time * 1.4 + st.tw) + st.layer * 0.18;
    ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
    ctx.fillStyle = st.layer === 2 ? (sector.starTint || '#cfe8ff') : '#9db8d8';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
