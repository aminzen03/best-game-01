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
- **Boss** — every 5th wave, the Void Maw: radial bullet rings, spawns drifters, enrages below half health.
- Pause with P / Esc, mute with M. Best score is kept between sessions.

## Run it

No build step, no network: static files only.

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static server and open `game/index.html` in desktop Chrome.

## Screenshots

The four screenshots under `screenshots/` are real renders of the game's own code, staged deterministically with `?shot=start|play|action|end&seed=1` (see `shots.json`).

## Files

- `game/index.html` + `game/src/` — the game: `config.js` (tuning), `random.js` (seeded RNG), `input.js` (keyboard/mouse), `audio.js` (synthesised sound), `world.js` (rules), `render.js` (drawing + HUD + screens), `shots.js` (screenshot scenes + autopilot), `main.js` (loop + state machine).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `serve.ts` — local static server for development.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=avjec4z5&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
