# Crash Club

<p align="center">
  <img src="./assets/crash-club-banner.svg" alt="Crash Club banner" width="100%" />
</p>

<p align="center">
  <strong>A multiplayer 3D browser driving arena built for quick browser chaos.</strong>
</p>

<p align="center">
  <strong>THIS PROJECT IS NO LONGER OPEN SOURCE.</strong><br />
  <strong>THE SOURCE CODE, ASSETS, BRANDING, AND PROJECT FILES ARE NOT LICENSED FOR COPYING, REUSE, MODIFICATION, REDISTRIBUTION, OR REHOSTING.</strong>
</p>

<p align="center">
  <strong>Play the official public version here:</strong><br />
  <a href="https://crash-club.vercel.app/"><strong>https://crash-club.vercel.app/</strong></a>
</p>

<p align="center">
  <a href="https://crash-club.vercel.app/"><img alt="Play Crash Club" src="https://img.shields.io/badge/Play-Crash%20Club-5AF0C1?style=for-the-badge" /></a>
  <img alt="Node" src="https://img.shields.io/badge/Node.js-20+-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL-111111?style=for-the-badge&logo=three.js&logoColor=white" />
  <img alt="WebSockets" src="https://img.shields.io/badge/Realtime-WebSockets-0EA5E9?style=for-the-badge" />
  <img alt="Alpha" src="https://img.shields.io/badge/Alpha-1.4-5AF0C1?style=for-the-badge" />
  <img alt="License" src="https://img.shields.io/badge/License-Play%20Only-DC2626?style=for-the-badge" />
</p>

> Crash Club is public so people can see and play the project. It is not public as an open-source codebase.

## Play Now

<p align="center">
  <a href="https://crash-club.vercel.app/"><strong>Play Crash Club in your browser</strong></a>
</p>

Crash Club is a 3D browser-based car combat arena where players drift, smash rivals, grab powerups, fight for the scoring ring, and get a second chance in an FPS-style Gulag after getting wrecked.

## What You Do

- Pick a driver name and join a room.
- Drive into the arena and fight for control of the scoring ring.
- Smash rivals, collect powerups, survive the chaos, and climb the leaderboard.
- Use boosts and powerups to stay alive or land bigger hits.
- If you get destroyed, fight through the Gulag for a chance to redeploy.
- Try to finish the round on the podium.

## Controls

### Driving

| Action | Keyboard | Touch |
| --- | --- | --- |
| Drive forward | `W` or `ArrowUp` | `Gas` |
| Brake / reverse | `S` or `ArrowDown` | `Brake` |
| Turn left | `A` or `ArrowLeft` | `Left` |
| Turn right | `D` or `ArrowRight` | `Right` |
| Boost | `Shift` | `Boost` |
| Respawn / reset while alive | `R` | `Reset` |
| Open menu | `Esc` | `Menu` |
| Free-cam height | `Q` / `E` | Keyboard only |

### Gulag

| Action | Control |
| --- | --- |
| Move | `WASD` |
| Aim | Mouse |
| Shoot | Click, `Space`, or `F` |

## Gameplay Basics

| Feature | What It Means |
| --- | --- |
| Browser play | The official public build runs at [crash-club.vercel.app](https://crash-club.vercel.app/). |
| Multiplayer rooms | Players can join shared rooms and play together. |
| Bot-filled matches | Rooms stay active even during solo testing. |
| Score ring | Holding the center ring gives steady points. |
| Powerups | Boost, repair, shield, and slam create tactical moments. |
| Wrecks | Destroying another car gives a larger score bonus. |
| Gulag redeploy | Destroyed players can earn a second chance through a compact FPS duel. |
| Podium rounds | The top three finishers get a podium moment before the next round. |

## Gameplay Preview

<p align="center">
  <img src="./assets/readme/github/driving-loop.gif" alt="Real Crash Club gameplay GIF showing a car driving through the arena" width="88%" />
</p>

This GIF shows the core driving feel: quick turns, arcade movement, road markings, arena lighting, and the kind of momentum you use to chase rivals or hold the scoring ring.

## Visual Tour

### Start Screen

<p align="center">
  <img src="./assets/readme/github/01-start-screen.png" alt="Crash Club start screen with driver name input, room options, and settings" width="88%" />
</p>

The start screen is where players choose a driver name, join or create a room, adjust settings, and jump into the arena. It is meant to make the game feel immediately playable instead of like a raw WebGL test.

### Live Arena HUD

<p align="center">
  <img src="./assets/readme/github/02-arena-hud.png" alt="Crash Club arena gameplay with HUD, leaderboard, radar, speed, boost, health, and score" width="88%" />
</p>

This screenshot shows the main arena view with the active HUD: score, health, boost, speed, radar, leaderboard, round info, and connection status. It is the normal play state once the match is running.

### Score Ring And Powerups

<p align="center">
  <img src="./assets/readme/github/03-center-ring-powerups.png" alt="Crash Club center scoring ring and glowing arena powerups" width="88%" />
</p>

The glowing center ring is the main objective zone. Staying in it earns points, while nearby powerups create risk-reward moments for boost, repair, shield, and slam plays.

### Bots And Radar

<p align="center">
  <img src="./assets/readme/github/04-bots-and-radar.png" alt="Crash Club bot-filled arena with radar dots, roads, props, and lighting" width="88%" />
</p>

Crash Club keeps rooms active with bot racers so the arena still feels alive when testing solo. The radar helps track nearby cars and pickups when the action gets messy.

### Driving Action

<p align="center">
  <img src="./assets/readme/github/05-driving-action.png" alt="Crash Club driving action screenshot with speed, boost, roads, guardrails, and arena lighting" width="88%" />
</p>

This image focuses on movement and readability: roads, guardrails, cones, lights, and arena props help players understand the space while driving fast.

### Gulag Duel

<p align="center">
  <img src="./assets/readme/github/gulag-duel.gif" alt="Crash Club Gulag GIF showing first-person second-chance duel gameplay" width="88%" />
</p>

The Gulag GIF shows the second-chance duel that can happen after your car gets destroyed. Win the duel and you redeploy back into the arena; lose and you move into spectator mode.

### Gulag HUD

<p align="center">
  <img src="./assets/readme/github/06-gulag-duel.png" alt="Crash Club Gulag screenshot with crosshair, enemy model, and duel HUD" width="88%" />
</p>

This screenshot shows the Gulag interface more clearly: crosshair, enemy target, compact duel HUD, and first-person combat view.

## Technology

Crash Club uses:

| Layer | Technology |
| --- | --- |
| Realtime server | Node.js |
| Multiplayer transport | WebSockets |
| 3D rendering | Three.js / WebGL |
| Public frontend hosting | Vercel |
| Live backend hosting | Render |

## Source Availability

The public repository no longer includes the game source files, project structure, deployment setup, build scripts, or downloadable release archives. The media files in this repository are included only to show what the game looks like in the README. The official way to access Crash Club is to play the hosted version linked above.

## License And Source Use

**Crash Club is no longer open source.**

Copyright (c) 2026 flowzygames. All rights reserved.

Crash Club is made available for public play only. You may play the official game and share official links to it, but you may not copy, modify, redistribute, rehost, reuse, extract, or create derivative works from the source code, assets, branding, screenshots, game logic, or other project materials without prior written permission from flowzygames.

Viewing this repository, the README media, or the official game does not grant ownership of Crash Club or permission to reuse any part of the project beyond playing the official public version.

## Official Link

<p align="center">
  <strong>Play Crash Club:</strong><br />
  <a href="https://crash-club.vercel.app/"><strong>https://crash-club.vercel.app/</strong></a>
</p>
