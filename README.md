<p align="center">
  <img src="./assets/crash-club-banner.svg" alt="Crash Club banner" width="100%" />
</p>

<h1 align="center">Crash Club</h1>

<p align="center">
  A multiplayer 3D browser driving arena where friends can join the same room,
  slam into each other, steal boost pickups, and fight for the top score.
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-24+-43853D?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL-111111?style=for-the-badge&logo=three.js&logoColor=white">
  <img alt="WebSockets" src="https://img.shields.io/badge/Realtime-WebSockets-0EA5E9?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-5AF0C1?style=for-the-badge">
</p>

## Why It's Cool

- Real-time local multiplayer over Wi-Fi
- 3D browser arena with ramps, obstacles, pickups, and scoring
- Heavier arcade driving with boost and impact feedback
- Simple setup: no build step, just Node + browser
- Easy to expand into rounds, powerups, maps, and cosmetics

## Gameplay

`Crash Club` drops players into the same arena using a shared room URL. From there, the loop is simple:

- Drive fast and control the center ring for passive points
- Smash into friends for extra score
- Grab glowing boost pickups before someone else does
- Respawn quickly if you get stuck and get right back into the chaos

## Controls

- `WASD` or arrow keys: drive
- `Shift`: use boost
- `R`: respawn if stuck

## Quick Start

```powershell
npm.cmd install
npm.cmd start
```

Open the game:

```text
http://localhost:3000
http://localhost:3000?room=after-school
```

Use the same room URL on other devices on your Wi-Fi to join the same arena.

## Stack

- `Three.js` for rendering
- `ws` for WebSocket multiplayer
- plain `Node.js` static hosting + room state
- vanilla browser client with no build tooling

## Project Structure

- [`server.js`](./server.js): static hosting, room state, pickups, respawns, and score updates
- [`public/index.html`](./public/index.html): HUD, controls, and leaderboard shell
- [`public/app.js`](./public/app.js): 3D scene, driving feel, hitboxes, pickups, and client networking
- [`public/styles.css`](./public/styles.css): HUD and leaderboard styling
- [`assets/crash-club-banner.svg`](./assets/crash-club-banner.svg): GitHub-ready repo banner

## Current Features

- Multiplayer room join flow
- Car-to-car collision response
- Arena wall, crate, tree, and center-plaza hitboxes
- Shared boost pickup spawning and respawning
- Center-zone scoring
- Manual and automatic respawn recovery
- Live leaderboard and in-game HUD

## Roadmap

1. Move more collision and impact authority onto the server
2. Add rounds, timers, and win conditions
3. Replace blockout props with a proper low-poly art pass
4. Add more pickups like jump, shield, repair, or slam
5. Expand the arena into a larger map with districts and stunt routes

## License

MIT. See [`LICENSE`](./LICENSE).
