# Deploy Crash Club

Crash Club needs a cloud host that can run a long-lived Node.js web service with WebSocket upgrades. A static-only host is not enough because multiplayer rooms, bots, scoring, and the Gulag all run through `server.js`.

## Recommended Host: Render

This repo includes `render.yaml`, so Render can create a web service from the GitHub repository.

1. Push the latest code to GitHub.
2. Open the Render Dashboard.
3. Choose **New +** then **Blueprint**.
4. Connect `flowzygames/crash-club`.
5. Confirm the service settings from `render.yaml`.
6. Deploy.

Render settings:

```text
Service type: Web Service
Runtime: Node
Build command: npm ci
Start command: npm start
Health check: /health
```

Useful environment variables:

```text
NODE_ENV=production
CRASH_CLUB_BOT_TARGET=6
CRASH_CLUB_TICK_RATE=20
CRASH_CLUB_SNAPSHOT_RATE=12
```

## After Deploy

When Render gives you a public URL, open:

```text
https://YOUR-SERVICE.onrender.com
https://YOUR-SERVICE.onrender.com?room=crew
https://YOUR-SERVICE.onrender.com/health
```

The browser client automatically chooses `wss://` when the page is served over `https://`, so multiplayer should connect through the same public cloud URL.

## Notes

Free Render web services can sleep after inactivity, so the first load after a break might take a little while. For a smoother always-online game, upgrade the instance later.

## Vercel Note

Vercel is great for frontend hosting, but this version of Crash Club cannot run its multiplayer backend fully on Vercel because the server is stateful and WebSocket-based. Vercel Functions do not act as WebSocket servers.

If you want to use Vercel anyway, use it for a static frontend later and keep the multiplayer Node server on a WebSocket-capable host such as Render. Running the whole current game on Vercel would require a bigger networking rewrite.
