# Crash Club (v2.0)

A multiplayer 3D browser derby. Friends join the same room, fight over the gold scoring ring, launch off ramps,
chain stunts into combos, and wreck each other. Wrecked drivers fight back in from the Gulag, and every round
ends on a podium.

## Features

| Feature | What it does |
| --- | --- |
| Rooms and bots | Share a room code or invite link. Six bots keep every room busy; their score counts at 0.35x. |
| Gold ring | Holding the center ring scores steadily. First to 150 points, or the leader when the clock runs out, wins the round. |
| Pickups | Boost, repair, shield, and slam respawn around the arena. |
| Ramps and pads | Kickers on every road, two **SEND IT** mega ramps, jump pads, and boost strips that chain into ramps. Ramp lips are solid walls. |
| Stunts | Hop with `Space`. In the air: `W`/`S` flip, `A`/`D` spin, `Q`/`E` barrel roll. Land on your wheels or wipe out. |
| Stomps | Fall onto a rival from above for **Death From Above** damage. |
| Combos | Drifts, air, flips, spins, near misses, hits, and wrecks chain into a multiplier (up to x8) that cashes out as score. |
| Streaks and bounties | 3+ wrecks without dying sets you on fire and puts a bounty on your head. Multi-wrecks, First Blood, and Revenge all pay. |
| Final Frenzy | The last 30 seconds of every round score double, and the music and HUD ramp up to match. |
| Gulag and redeploy | A wrecked human drops into a 1v1 FPS duel. Win to redeploy; lose and spectate for 20 seconds, then redeploy. |
| Juice | Bloom, wreck explosions with debris, slow-mo on big hits, screen flashes, skid marks, speed lines, kill feed, announcer callouts (with optional voice), and a procedural soundtrack. |

## Run It

```bash
cd game
npm install
npm start
```

Open `http://localhost:3000` (add `?room=crew` to pick a room). Everyone on the same room code shares one arena.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Drive / brake | `W` `S` or arrows | `Gas` `Brake` |
| Steer | `A` `D` or arrows | `Left` `Right` |
| Boost (works in the air too) | `Shift` | `Boost` |
| Hop | `Space` | `Hop` |
| Front / back flip (air) | `W` / `S` (fresh press after takeoff) | - |
| Spin (air) | `A` / `D` | - |
| Barrel roll (air) | `Q` / `E` | - |
| Respawn / menu | `R` / `Esc` | `Reset` / `Menu` |

In the Gulag: `WASD` to move, mouse to aim, click, `Space`, or `F` to shoot. As a spectator: `WASD` and the mouse
fly the free cam, `Q` / `E` change height.

## Server Knobs

All optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP and WebSocket port |
| `CRASH_CLUB_BOT_TARGET` | `6` | Bots per room while a human is connected |
| `CRASH_CLUB_TICK_RATE` / `CRASH_CLUB_SNAPSHOT_RATE` | `24` / `15` | Simulation and network rates |
| `CRASH_CLUB_ROUND_MS` | `180000` | Round length |
| `CRASH_CLUB_README_SAFE_ARENA` | - | `1` makes humans immune to damage and keeps the round from ending (for captures) |

`GET /health` reports `{ ok, name, version, rooms }`.

## Deploying

This client speaks a newer protocol than the live v1.5 backend, so its frontend and backend have to be deployed together:

- **Backend:** any long-lived Node host (Render works). Set the service root to `game/` and use `npm start`.
- **Frontend:** Vercel with the project root set to `game/` (it uses `vercel.json` and `npm run build:vercel`). Set `CRASH_CLUB_SERVER_URL` to the v2 backend. There is deliberately no default, so a build can never point at the v1.5 server by accident.

The repository root (`render.yaml`, `backend/index.js`) still deploys the existing v1.5 backend and is untouched by this folder.

## Layout

| Path | What it is |
| --- | --- |
| `server.js` | Rooms, bots, scoring, the ring, Final Frenzy, wrecks and streaks, Gulag, podium |
| `public/shared/arena.js` | Arena layout shared by client and server: walls, buildings, ramps, pads, the ring |
| `public/app.js` | Three.js client: driving and air physics, effects, HUD, audio, networking |
| `public/vendor/jsm/` | Three.js r164 post-processing addons used for bloom |

## License

Same terms as the rest of this repository: Copyright (c) 2026 flowzygames, all rights reserved. See the root README.
