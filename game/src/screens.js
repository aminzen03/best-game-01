// NOVA EMBER — the full screens: title (with the sector select), game
// over (with the run's stats), pause. The HUD and the in-play drawing live
// in render.js; these are the screens between runs.
// One file, one job: the screens.
import { FIELD, PLAYER, PALETTE } from './config.js';
import { SECTORS, nextSector } from './sectors.js';
import { medalsForRun, medalPips } from './save.js';

// Sector cards on the title screen: four across, shared with main.js for
// click hit-testing.
export const SECTOR_CARD = { w: 280, h: 140, gap: 20, y: 235 };
export function sectorCardRect(i) {
  const total = SECTORS.length * SECTOR_CARD.w + (SECTORS.length - 1) * SECTOR_CARD.gap;
  const x0 = (FIELD.width - total) / 2;
  return {
    x: x0 + i * (SECTOR_CARD.w + SECTOR_CARD.gap),
    y: SECTOR_CARD.y, w: SECTOR_CARD.w, h: SECTOR_CARD.h,
  };
}

// Pure hit test: which sector card (id) is at canvas point (x, y), or null.
export function sectorCardAt(x, y) {
  for (let i = 0; i < SECTORS.length; i += 1) {
    const r = sectorCardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return SECTORS[i].id;
  }
  return null;
}

function drawSectorCards(ctx, ui) {
  const save = ui.save;
  const selected = ui.selectedSector;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.fillText('— CHOOSE YOUR SECTOR —', FIELD.width / 2, SECTOR_CARD.y - 16);
  for (let i = 0; i < SECTORS.length; i += 1) {
    const sec = SECTORS[i];
    const rec = save.sectors[sec.id];
    const r = sectorCardRect(i);
    const locked = !rec.unlocked;
    const isSelected = selected === sec.id;
    ctx.fillStyle = locked ? 'rgba(8, 8, 16, 0.85)' : 'rgba(8, 12, 32, 0.82)';
    ctx.strokeStyle = locked
      ? 'rgba(255,255,255,0.18)'
      : isSelected ? sec.accent : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = locked ? '#6b7a90' : sec.accent;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(sec.name, r.x + r.w / 2, r.y + 32);
    ctx.fillStyle = locked ? '#5a6a80' : PALETTE.hudDim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(sec.tag, r.x + r.w / 2, r.y + 54);
    if (locked) {
      const prev = SECTORS[i - 1];
      ctx.fillStyle = '#8fa8c8';
      ctx.font = 'bold 13px ui-monospace, monospace';
      ctx.fillText('🔒 LOCKED', r.x + r.w / 2, r.y + 88);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Clear the ${prev.name} boss`, r.x + r.w / 2, r.y + 108);
    } else {
      ctx.fillStyle = PALETTE.hud;
      ctx.font = '13px ui-monospace, monospace';
      ctx.fillText(`BEST ${rec.best}  ·  WAVE ${rec.bestWave}`, r.x + r.w / 2, r.y + 86);
      ctx.fillStyle = rec.embers >= sec.emberTarget ? '#7dff6a' : PALETTE.gold;
      ctx.fillText(`EMBERS ${rec.embers}/${sec.emberTarget}  ·  SHARDS ${rec.shards}`, r.x + r.w / 2, r.y + 108);
      // Medals earned in this sector, beside the cleared/selected mark.
      const pips = medalPips(rec.medals);
      if (isSelected) {
        ctx.fillStyle = sec.accent;
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillText(`◆ SELECTED  ${pips}`, r.x + r.w / 2, r.y + 128);
      } else if (rec.cleared) {
        ctx.fillStyle = '#7dff6a';
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillText(`✓ CLEARED  ${pips}`, r.x + r.w / 2, r.y + 128);
      } else {
        ctx.fillStyle = PALETTE.hudDim;
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillText(`MEDALS  ${pips}`, r.x + r.w / 2, r.y + 128);
      }
    }
  }
}

export function drawTitle(ctx, s, time, steady = false, ui = null) {
  ctx.fillStyle = 'rgba(4, 4, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const pulse = 1 + Math.sin(time * 2) * 0.02;
  ctx.save();
  ctx.translate(FIELD.width / 2, 140);
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
  ctx.fillText('The last ember of a dying star. The Void is coming for your light.', FIELD.width / 2, 180);
  if (ui && ui.save) drawSectorCards(ctx, ui);
  // How to play panel.
  const px = FIELD.width / 2 - 330;
  const py = 400;
  ctx.fillStyle = 'rgba(8, 12, 32, 0.78)';
  ctx.strokeStyle = 'rgba(55, 230, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, 660, 132, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 16px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HOW TO PLAY', px + 24, py + 28);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK / SPACE — fire',
    'SHIFT / RIGHT-CLICK — dash      E — NOVA blast      P — pause      M — sound',
    'Your LIGHT drains — collect the embers of fallen Void to stay alive.',
    'RIFT 12 hits to charge · SHRINE 6 hits to light for shards · MAW every 5th wave.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, px + 24, py + 54 + i * 21));
  if (s.best > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.fillText(`BEST SCORE  ${s.best}`, FIELD.width / 2, 566);
  }
  if (steady || Math.floor(time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('CLICK A SECTOR, THEN CLICK OR PRESS ENTER TO IGNITE', FIELD.width / 2, 604);
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Clear each sector\'s boss to relight it — relight all four sectors to win the campaign.', FIELD.width / 2, 644);
}

export function drawGameOver(ctx, s, steady = false, ui = null) {
  ctx.fillStyle = 'rgba(8, 2, 10, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5b7a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = '#ff3860';
  ctx.shadowBlur = 24;
  ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 180);
  ctx.shadowBlur = 0;
  const isBest = s.score >= s.best && s.score > 0;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 34px ui-monospace, monospace';
  ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 246);
  if (isBest) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText('★ NEW BEST ★', FIELD.width / 2, 284);
  } else {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '18px ui-monospace, monospace';
    ctx.fillText(`BEST  ${s.best}`, FIELD.width / 2, 284);
  }
  // Run stats: sector, waves, time, kills, ember harvest, accuracy.
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60).toString().padStart(2, '0');
  const acc = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 0;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '17px ui-monospace, monospace';
  ctx.fillText(
    `SECTOR  ${s.sector.name}      WAVES  ${s.wavesCleared}      TIME  ${mins}:${secs}`,
    FIELD.width / 2, 326,
  );
  ctx.fillText(
    `VOID DESTROYED  ${s.kills}      EMBERS  ${s.player.embersGathered}/${s.sector.emberTarget}      ACCURACY  ${acc}%`,
    FIELD.width / 2, 354,
  );
  ctx.fillText(
    `SHARDS  ${s.player.shardsGathered}      SHRINES LIT  ${s.shrinesLit}/${s.shrinesSpawned}      HITS TAKEN  ${s.hitsTaken}`,
    FIELD.width / 2, 380,
  );
  if (ui && ui.save) {
    const rec = ui.save.sectors[s.sectorId];
    if (rec) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = '15px ui-monospace, monospace';
      ctx.fillText(`SECTOR BEST  ${rec.best}  ·  BEST WAVE  ${rec.bestWave}  ·  MEDALS  ${medalPips(rec.medals)}`, FIELD.width / 2, 406);
    }
  }
  if (s.sectorCleared) {
    const next = nextSector(s.sectorId);
    ctx.fillStyle = '#7dff6a';
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText(
      next ? `★ SECTOR CLEARED — ${next.name} UNLOCKED ★` : '★ ALL SECTORS CLEARED — YOU ARE THE LAST LIGHT ★',
      FIELD.width / 2, 442,
    );
  }
  if (steady || Math.floor(s.time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 488);
  }
}

export function drawVictory(ctx, s, steady = false, ui = null) {
  // The win screen: beating a sector's boss ends the run in victory, with
  // the run's stats and the campaign's progress — the counterweight to the
  // game-over screen, and the reason a run has an ending at all.
  ctx.fillStyle = 'rgba(2, 12, 4, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const save = ui && ui.save;
  // Count sectors the save already has cleared, plus this run's sector:
  // the save is only folded when the run is recorded, which in shot mode
  // never happens — but this sector IS relit, so it counts.
  const clearedCount = save
    ? SECTORS.filter((sec) => (
      (save.sectors[sec.id] && save.sectors[sec.id].cleared)
      || (sec.id === s.sectorId && s.sectorCleared)
    )).length
    : 0;
  const campaignComplete = clearedCount >= SECTORS.length;
  const next = nextSector(s.sectorId);
  ctx.fillStyle = '#7dff6a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = '#7dff6a';
  ctx.shadowBlur = 24;
  ctx.fillText(campaignComplete ? 'THE LIGHT RETURNS' : 'SECTOR RELIT', FIELD.width / 2, 170);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 34px ui-monospace, monospace';
  ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 238);
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60).toString().padStart(2, '0');
  const acc = s.shotsFired > 0 ? Math.round((s.shotsHit / s.shotsFired) * 100) : 0;
  ctx.font = '17px ui-monospace, monospace';
  ctx.fillText(
    `SECTOR  ${s.sector.name}      WAVES  ${s.wavesCleared}      TIME  ${mins}:${secs}`,
    FIELD.width / 2, 288,
  );
  ctx.fillText(
    `VOID DESTROYED  ${s.kills}      EMBERS  ${s.player.embersGathered}/${s.sector.emberTarget}      ACCURACY  ${acc}%`,
    FIELD.width / 2, 316,
  );
  const runMedals = medalsForRun({
    cleared: s.sectorCleared, hitsTaken: s.hitsTaken, time: s.time,
    shrinesLit: s.shrinesLit, shrinesSpawned: s.shrinesSpawned,
  });
  ctx.fillText(
    `SHARDS  ${s.player.shardsGathered}      SHRINES LIT  ${s.shrinesLit}/${s.shrinesSpawned}      MEDALS  ${medalPips(runMedals)}`,
    FIELD.width / 2, 344,
  );
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 18px ui-monospace, monospace';
  ctx.fillText(`SECTORS RELIT  ${clearedCount}/${SECTORS.length}`, FIELD.width / 2, 372);
  ctx.fillStyle = '#7dff6a';
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.fillText(
    campaignComplete
      ? '★ ALL SECTORS CLEARED — YOU ARE THE LAST LIGHT ★'
      : `★ ${next.name} UNLOCKED ★`,
    FIELD.width / 2, 410,
  );
  if (steady || Math.floor(s.time * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(
      campaignComplete ? 'PRESS ENTER — RETURN TO TITLE' : `PRESS ENTER — FLY TO ${next.name}`,
      FIELD.width / 2, 458,
    );
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('T — BACK TO TITLE', FIELD.width / 2, 496);
}

export function drawPause(ctx) {
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
