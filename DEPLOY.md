# Deploy Crash Club

Crash Club can now use a two-part cloud setup:

1. Vercel hosts the fast public website.
2. A Node web service hosts the live multiplayer WebSocket server.

The split matters because multiplayer rooms, bots, scoring, pickups, damage, the Gulag, and podium flow all run through `server.js`. Vercel is excellent for the frontend, but the current backend still needs a long-lived WebSocket-capable host.

## Vercel Website + Live Backend

Deploy the backend first. This repo's Vercel build defaults to `https://crash-club.onrender.com`, and `CRASH_CLUB_SERVER_URL` can override it later if the backend URL changes.

Vercel settings:

```text
Framework preset: Other
Install command: npm ci
Build command: npm run build:vercel
Output directory: dist
Optional environment variable: CRASH_CLUB_SERVER_URL=https://YOUR-BACKEND-HOST
```

[vercel.json](./vercel.json) sets `framework` to `null`, which tells Vercel to use the `Other` preset even if the dashboard originally guessed `Node`. This is important because Crash Club's `app.js` is browser code, not a Vercel Function.

Default:

```text
CRASH_CLUB_SERVER_URL=https://crash-club.onrender.com
```

When Vercel builds the site, `scripts/build-vercel.js` copies `public/` to `dist/` and writes `dist/config.js` with the Render backend URL. The browser converts `https://` to `wss://` for multiplayer automatically.

Local Vercel-style build test:

```powershell
$env:CRASH_CLUB_SERVER_URL="http://localhost:3000"
npm.cmd run build:vercel
```

You can also test a deployed Vercel page against a one-off backend by adding `?server=`:

```text
https://YOUR-VERCEL-SITE.vercel.app?room=crew&server=https://YOUR-BACKEND-HOST
```

That URL parameter is optional. In production, the Vercel environment variable is cleaner.

## Vercel Troubleshooting

If the site loads but Start Driving does not enter the game, the frontend probably cannot reach the multiplayer server. Vercel may show no server logs because the page itself did not crash.

Open this URL:

```text
https://YOUR-VERCEL-SITE.vercel.app/config.js
```

Expected:

```js
window.CRASH_CLUB_SERVER_URL = "https://crash-club.onrender.com";
window.CRASH_CLUB_STATIC_FRONTEND = true;
```

If `CRASH_CLUB_SERVER_URL` is blank, redeploy from the latest GitHub commit. The current build script falls back to `https://crash-club.onrender.com` even when no Vercel environment variable is set.

If the URL is correct but the first click still disconnects, wait through the in-game retries. Free backend hosts can sleep, so Crash Club pings `/health` and retries the WebSocket while the server wakes up.

## Recommended Host: Render

This repo includes `render.yaml`, so Render can create a web service from the GitHub repository.

Use this Render Blueprint link:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/flowzygames/crash-club
```

Steps:

1. Open the Render Blueprint link above.
2. Sign in or create a Render account.
3. Connect GitHub if Render asks.
4. Confirm the `crash-club` web service from `render.yaml`.
5. Click **Apply** or **Create Blueprint**.
6. Wait until the service deploy says **Live**.
7. Open the Render service and copy its public URL.

The Render URL should look like this:

```text
https://SOMETHING.onrender.com
```

Copy the URL Render actually gives you. Do not guess it, because Render may change the service URL if the name is already taken.

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

## Connect Render To Vercel

After Render is live, the current Vercel build already uses `https://crash-club.onrender.com`. If you create a different Render service later, go back to Vercel and add this environment variable:

```text
Key: CRASH_CLUB_SERVER_URL
Value: https://YOUR-ACTUAL-RENDER-SERVICE.onrender.com
Environments: Production and Preview
```

Do not use `localhost:3000`. Do not use `https://crash-club.vercel.app`. Do not add `/health` at the end.

After adding the env var, redeploy Vercel. If you are using the default `https://crash-club.onrender.com` backend, just redeploy Vercel from the latest commit. Then check:

```text
https://crash-club.vercel.app/config.js
```

It should show the default backend, or your custom override:

```js
window.CRASH_CLUB_SERVER_URL = "https://crash-club.onrender.com";
window.CRASH_CLUB_STATIC_FRONTEND = true;
```

## Notes

Free Render web services can sleep after inactivity, so the first multiplayer connection after a break might take a little while. For a smoother always-online game, upgrade the backend instance later.
