const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outDir = path.join(rootDir, "dist");
// No default: this v2 client speaks a newer protocol than the live v1.5 backend, so it must be pointed
// at a v2 server explicitly. Without one, the page shows its built-in "missing backend URL" message.
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
  console.log(`Built Crash Club frontend with multiplayer backend: ${serverUrl}`);
} else {
  console.warn("CRASH_CLUB_SERVER_URL is not set. Set it to a Crash Club v2 backend (npm start in this folder) before deploying.");
}
