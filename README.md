# NOVA EMBER

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![make.fun · best-game-01 rank](https://make.fun/badge/best-game-01/aminzen03/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![make.fun · best-game-01 reward](https://make.fun/badge/best-game-01/aminzen03/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**NOVA EMBER** — the last ember of a dying star. A neon arena survival game: fly the Ember, blast the Void, and keep your light alive. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## The game

You are the last ember of a star the Void swallowed. Your light drains, always — the only way to stay alive is to destroy the Void's creatures and gather the embers they drop. Survive escalating waves; every 5th wave the **Void Maw** comes.

- **Move** — WASD / arrow keys. **Aim** — mouse. **Fire** — hold click or Space.
- **Dash** — Shift or right-click: a burst of speed with brief invulnerability.
- **Nova** — E: a shockwave that clears bullets and burns everything near you (costs 1 charge).
- **Rifts** — swirling gravity wells pull everything in. Shoot a rift 12 times and it detonates into a nova.
- **Power-ups** — shield, rapid fire, spread shot, nova charge.
- **Light** — your ember meter drains over time. Collect embers to refill it; if it empties, you lose a life.
- **Combo** — kills in quick succession raise your score multiplier, up to x5.
- **Boss** — every 5th wave the sector's Maw comes: radial bullet rings, spawns drifters, enrages below half health.
- **Star shards** — elites and the Maw drop star shards, a second collectible worth score: gather them like embers, tracked per sector.
- **Shrines** — one shrine wakes each wave from wave 2: shoot it 6 times to light it for score and shards. Lighting every shrine in a cleared run earns the SHRINEKEEPER medal.
- **Medals** — per-sector feats, earned once and kept: FLAWLESS (clear the boss without taking a hit), SWIFT (clear it in under three minutes), SHRINEKEEPER (light every shrine). Shown as ★ pips on the sector cards and on the win screen.
- **Sectors** — four themed regions (Cinder Drift, Void Reef, Starfall, Nova Core), each with its own look, enemy mix, pace, ember harvest target, and a landmark on the horizon — the dying star, void crystal spires, a broken ringed planet, the pulsing nova heart — over a layered parallax sky. Beat a sector's boss to clear it and unlock the next. Pick a sector on the title screen (click a card or press 1–4), and watch its per-sector best, best wave, ember and shard tallies, and medals.
- **Campaign — win the game** — beating a sector's boss ends the run in victory: a win screen with the run's stats (score, waves, time, kills, embers, accuracy) and the campaign's progress. Relight all four sectors and the light returns: the campaign is won. A run is an arc with an ending, not an endless loop.
- **Save** — best score, per-sector bests and unlocks persist between sessions; the game-over and win screens show the run's full stats (sector, waves, time, kills, embers, accuracy).
- Pause with P / Esc, mute with M. Best score is kept between sessions.

## Run it

No build step, no network: static files only.

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static server and open `game/index.html` in desktop Chrome.

## Screenshots

The four screenshots under `screenshots/` are real renders of the game's own code, staged deterministically with `?shot=start|play|action|victory&seed=1` (see `shots.json`): title with sector select, mid-wave play in Cinder Drift, the boss fight in Nova Core, and the win screen.

## Files

- `game/index.html` + `game/src/` — the game: `config.js` (tuning), `sectors.js` (the four regions), `save.js` (persistence + medals), `random.js` (seeded RNG), `input.js` (keyboard/mouse), `audio.js` (synthesised sound), `world.js` (the step orchestration), `waves.js` (wave director), `enemies.js` (spawning, AI, deaths), `boss.js` (the Maw's attacks), `player.js` (taking damage), `pickups.js` (embers, shards, power-ups), `shrines.js` (the shrine side objective), `effects.js` (particles, floaters, shockwaves), `util.js` (shared math), `render.js` (in-play drawing + HUD), `background.js` (the sector sky: parallax + landmarks), `screens.js` (title with sector select, game over, win screen, pause), `shots.js` (screenshot scenes + autopilot), `main.js` (loop + state machine).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `serve.ts` — local static server for development.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=avjec4z5&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
