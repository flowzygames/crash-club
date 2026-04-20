const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const WebSocket = require("ws");

const root = process.cwd();
const frameDir = path.join(root, "test-results", "gulag-frames");
const outDir = path.join(root, "assets", "readme", "github");
const port = Number(process.env.CRASH_CLUB_PORT || 3000);
const room = `readme-gulag-${Date.now()}`;
const playerName = "README Gulag";
const url = `http://127.0.0.1:${port}/?room=${room}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    if (await isServerReady()) return;
    await sleep(250);
  }
  throw new Error(`Crash Club server did not become ready on port ${port}.`);
}

function connectSocket(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const timer = setTimeout(() => reject(new Error(`Timed out joining as ${name}`)), 7000);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join", room, name, color: "#ffcf6b" }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "joined") {
        clearTimeout(timer);
        resolve({ ws, msg });
      }
    });
    ws.on("error", reject);
  });
}

async function sendHits(attacker, targetId) {
  for (let i = 0; i < 8; i += 1) {
    attacker.send(JSON.stringify({ type: "hit", targetId, impulse: 1.8 }));
    await sleep(220);
  }
}

async function main() {
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  let server = null;
  let browser = null;
  let attacker = null;

  try {
    if (!(await isServerReady())) {
      server = spawn(process.execPath, ["server.js"], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"]
      });
      server.stdout.on("data", (data) => process.stdout.write(data));
      server.stderr.on("data", (data) => process.stderr.write(data));
      await waitForServer();
    }

    browser = await chromium.launch({
      headless: true,
      args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"]
    });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("#start-button");
    await page.fill("#name-input", playerName);
    await page.click("#start-button");
    await page.waitForFunction(() => document.body.classList.contains("is-driving"), null, { timeout: 10000 });
    await page.waitForTimeout(900);

    const joined = await connectSocket("README Wrecker");
    attacker = joined.ws;
    const target = joined.msg.players.find((player) => player.name === playerName);
    if (!target) throw new Error(`Could not find target player ${playerName}.`);

    await sendHits(attacker, target.id);
    await page.waitForFunction(() => document.querySelector(".mode-overlay.combat-hud:not(.hidden)"), null, { timeout: 10000 });
    await page.waitForTimeout(500);

    for (let i = 0; i < 60; i += 1) {
      if (i % 5 === 0) await page.keyboard.press("Space");
      if (i === 14) await page.keyboard.down("d");
      if (i === 24) await page.keyboard.up("d");
      if (i === 31) await page.keyboard.down("a");
      if (i === 41) await page.keyboard.up("a");
      await page.screenshot({ path: path.join(frameDir, `frame-${String(i).padStart(3, "0")}.png`) });
      await page.waitForTimeout(82);
    }

    console.log(JSON.stringify({ url, room, frames: fs.readdirSync(frameDir).length }, null, 2));
  } finally {
    if (attacker) attacker.close();
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
