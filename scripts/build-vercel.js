const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outDir = path.join(rootDir, "dist");
const defaultServerUrl = "https://crash-club.onrender.com";
const configuredServerUrl = (process.env.CRASH_CLUB_SERVER_URL || "").trim();
const serverUrl = configuredServerUrl || defaultServerUrl;

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(publicDir, outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "config.js"),
  [
    `window.CRASH_CLUB_SERVER_URL = ${JSON.stringify(serverUrl)};`,
    "window.CRASH_CLUB_STATIC_FRONTEND = true;"
  ].join("\n") + "\n"
);

if (configuredServerUrl) {
  console.log(`Built Vercel frontend with configured multiplayer backend: ${serverUrl}`);
} else {
  console.log(`Built Vercel frontend with default multiplayer backend: ${serverUrl}`);
  console.log("Set CRASH_CLUB_SERVER_URL in Vercel only if you want to override this backend.");
}
