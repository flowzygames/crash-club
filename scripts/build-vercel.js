const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outDir = path.join(rootDir, "dist");
const serverUrl = (process.env.CRASH_CLUB_SERVER_URL || "").trim();

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(publicDir, outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "config.js"),
  [
    `window.CRASH_CLUB_SERVER_URL = ${JSON.stringify(serverUrl)};`,
    "window.CRASH_CLUB_STATIC_FRONTEND = true;"
  ].join("\n") + "\n"
);

if (serverUrl) {
  console.log(`Built Vercel frontend with multiplayer backend: ${serverUrl}`);
} else {
  console.log("Built Vercel frontend without CRASH_CLUB_SERVER_URL.");
  console.log("Set CRASH_CLUB_SERVER_URL in Vercel to your live Node/WebSocket backend.");
}
