// NOVA EMBER — the player taking damage: losing a life to a hit, and the
// light running out. Both end the run when the last life is gone.
// One file, one job: what hurts the Ember.
import { PLAYER } from './config.js';
import { burst, addFloater } from './effects.js';

export function hurtPlayer(s, cause, audio) {
  const p = s.player;
  if (p.invuln > 0 || p.shield > 0 || p.dashTime > 0 || s.gameOver) return;
  s.hitsTaken += 1;
  s.lives -= 1;
  s.combo = 0;
  s.comboTimer = 0;
  p.invuln = PLAYER.hitInvuln;
  p.light = Math.max(p.light, 40);
  s.shake = Math.max(s.shake, 14);
  s.flashRed = 0.5;
  burst(s, p.x, p.y, '#ff3860', 24, 300);
  if (audio) audio.playerHit();
  if (s.lives <= 0) endRun(s, audio, '#37e6ff');
}

export function fadeLight(s, audio) {
  const p = s.player;
  s.hitsTaken += 1;
  s.lives -= 1;
  s.combo = 0;
  p.light = 55;
  p.invuln = PLAYER.hitInvuln;
  s.flashGold = 0.7;
  s.shake = Math.max(s.shake, 10);
  addFloater(s, p.x, p.y - 30, 'THE LIGHT FADES', '#ffd166', 20);
  if (audio) audio.playerHit();
  if (s.lives <= 0) endRun(s, audio, '#ffd166');
}

function endRun(s, audio, burstColor) {
  const p = s.player;
  s.gameOver = true;
  s.overTimer = 0;
  burst(s, p.x, p.y, burstColor, 70, 380);
  p.alive = false;
  if (audio) audio.gameOver();
}
