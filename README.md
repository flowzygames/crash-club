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

<p align="center">
  <img src="./assets/crash-club-release-card.svg" alt="Crash Club v1.0 release card" width="78%" />
</p>

## Release 1.0

`Crash Club` is now a playable v1.0 browser release. It is still intentionally lightweight and easy to run, but the game loop has moved beyond a driving demo into a real arcade match: bot-filled rooms, timed rounds, health, powerups, wrecks, radar, touch controls, audio feedback, and a release-ready menu.

## Why It's Cool

- Real-time local multiplayer over Wi-Fi
- Bot opponents keep solo rooms playable while friends join
- 3D browser arena with ramps, obstacles, powerups, and scoring
- Full match loop with timed rounds, health, wrecks, respawns, and winners
- Heavier arcade driving with boost, damage, shields, slam hits, and impact feedback
- Release UI with start menu, invite copy, radar, event feed, and touch buttons
- Simple setup: no build step, just Node + browser
- Easy to expand into rounds, powerups, maps, and cosmetics

## Gameplay

`Crash Club` drops players into the same arena using a shared room URL. From there, the loop is simple:

- Drive fast and control the center ring for passive points
- Smash into friends to damage them and score wreck bonuses
- Grab boost, repair, shield, and slam pickups before someone else does
- Win by reaching the score target or leading when the timer runs out
- Respawn quickly if you get stuck or get wrecked and jump back into the chaos

## Version 1.0 Features

- Bot-filled rooms target four racers, so the arena is active even solo
- Round wins persist across rounds on the live leaderboard
- Radar shows your car, rivals, bots, and active pickups
- Release start screen gates audio and gives the game a real first impression
- Copy-invite button makes sharing a room URL easy
- Touch controls make phones and tablets usable on the same Wi-Fi
- Damage vignette, camera shake, pickup tones, and round banners add feedback
- `/health` endpoint reports version and server status

## Arcade Flavor

This is built to feel like a tiny browser arcade cabinet: quick to join, loud in the best way, and chaotic enough that the room starts yelling after the first good crash.

- Neon boost pickups create mini races inside the bigger arena
- Center-ring scoring turns the map into a fight zone instead of an empty sandbox
- Repair, shield, and slam pickups create comeback moments instead of pure driving
- Ramps, bumps, camera shake, wrecks, and respawns keep the match moving

## Controls

- `WASD` or arrow keys: drive
- `Shift`: use boost
- `R`: respawn if stuck
- `Esc`: open the release menu
- Touch buttons appear automatically on narrow screens

## Game Rules

- A round lasts 3 minutes or ends when someone reaches the score target
- Center-ring control gives steady points
- Pickup grabs give small score bursts and tactical effects
- Ramming deals health damage based on impact speed
- Wrecking another player gives a bigger score bonus
- Shield reduces incoming damage for a short window
- Slam powers up your next big hit

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

Check the server:

```text
http://localhost:3000/health
```

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
- [`assets/crash-club-logo.svg`](./assets/crash-club-logo.svg): square project logo
- [`assets/crash-club-release-card.svg`](./assets/crash-club-release-card.svg): v1.0 release card
- [`assets/crash-club-wordmark.svg`](./assets/crash-club-wordmark.svg): compact wordmark
- [`public/og-image.svg`](./public/og-image.svg): social preview image

## Current Features

- Multiplayer room join flow
- Bot-filled solo and small-room play
- Car-to-car collision response
- Health, damage, wrecks, and timed respawns
- Timed rounds with intermission and winner banners
- Arena wall, crate, tree, and center-plaza hitboxes
- Shared boost, repair, shield, and slam pickup spawning
- Center-zone scoring
- Manual and automatic respawn recovery
- Live leaderboard, round wins, radar, health/boost meters, round timer, and event feed
- Release menu, copy invite, mobile touch controls, favicon, manifest, and social art

## Roadmap

1. Move full collision authority onto the server with rewind checks
2. Add selectable modes like derby, king-of-the-ring, and stunt race
3. Replace blockout props with a proper low-poly art pass
4. Add more pickups like jump, oil slick, magnet, or shockwave
5. Expand the arena into a larger map with districts and stunt routes

## License

MIT. See [`LICENSE`](./LICENSE).
