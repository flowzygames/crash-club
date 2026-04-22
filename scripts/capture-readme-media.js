const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const WebSocket = require("ws");

const root = process.cwd();
const outDir = path.join(root, "assets", "readme", "github");
const frameDir = path.join(root, "test-results", "readme-frames");
const gulagFrameDir = path.join(root, "test-results", "gulag-frames");
const serverPort = Number(process.env.CRASH_CLUB_PORT || 3000);
const debugPort = Number(process.env.CRASH_CLUB_DEBUG_PORT || 9339);
const room = `readme-gallery-${Date.now()}`;
const gameUrl = `http://127.0.0.1:${serverPort}/?room=${room}`;
const captureOnly = String(process.env.CRASH_CLUB_CAPTURE_ONLY || "");

fs.mkdirSync(outDir, { recursive: true });
for (const name of [
  "01-start-screen.png",
  "02-arena-hud.png",
  "03-center-ring-powerups.png",
  "04-bots-and-radar.png",
  "05-driving-action.png"
]) {
  fs.rmSync(path.join(outDir, name), { force: true });
}
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });
fs.rmSync(gulagFrameDir, { recursive: true, force: true });
fs.mkdirSync(gulagFrameDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function commandPath(name) {
  const command = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [name] : ["-v", name];
  const result = spawnSync(command, args, { shell: process.platform !== "win32" });
  if (result.status !== 0) return null;
  const output = result.stdout.toString().trim().split(/\r?\n/)[0];
  return output || null;
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/google/chrome/chrome",
    commandPath("google-chrome"),
    commandPath("google-chrome-stable"),
    commandPath("chromium"),
    commandPath("chromium-browser"),
    commandPath("chrome")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Could not find Chrome, Chromium, or Edge for README media capture.");
}

async function isServerReady() {
  try {
    const response = await fetch(`http://127.0.0.1:${serverPort}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let i = 0; i < 100; i += 1) {
    if (await isServerReady()) return;
    await sleep(250);
  }
  throw new Error(`Server did not become ready on port ${serverPort}.`);
}

async function waitForBrowser() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Keep waiting for the browser debug endpoint.
    }
    await sleep(250);
  }
  throw new Error("Browser remote debugging did not become ready.");
}

function makeCdp(ws, sessionId) {
  let id = 0;
  const pending = new Map();

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message || "CDP command failed"));
    else resolve(message.result || {});
  });

  return function send(method, params = {}, useSession = true) {
    const command = { id: ++id, method, params };
    if (useSession && sessionId) command.sessionId = sessionId;
    ws.send(JSON.stringify(command));
    return new Promise((resolve, reject) => pending.set(command.id, { resolve, reject }));
  };
}

async function capture(send, name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = path.join(outDir, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}

async function frame(send, index) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = path.join(frameDir, `frame-${String(index).padStart(3, "0")}.png`);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
}

async function gulagFrame(send, index) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = path.join(gulagFrameDir, `frame-${String(index).padStart(3, "0")}.png`);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
}

async function evalPage(send, expression) {
  return send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
}

async function waitForPage(send, expression, label, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    const result = await evalPage(send, expression);
    if (result.result?.value) return;
    await sleep(250);
  }
  const status = await evalPage(send, `({
    connection: document.querySelector("#connection-card")?.textContent || "",
    startText: document.querySelector("#start-button")?.textContent || "",
    hasCanvas: Boolean(document.querySelector("canvas")),
    bodyClass: document.body.className
  })`);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(status.result?.value || {})}`);
}

async function key(send, type, keyValue, code, windowsVirtualKeyCode) {
  await send("Input.dispatchKeyEvent", {
    type,
    key: keyValue,
    code,
    windowsVirtualKeyCode
  });
}

async function hold(send, keys, ms) {
  for (const item of keys) await key(send, "rawKeyDown", ...item);
  await sleep(ms);
  for (const item of [...keys].reverse()) await key(send, "keyUp", ...item);
}

async function assertArenaShot(send, label) {
  const status = await evalPage(send, `({
    objective: document.querySelector("#objective-card")?.textContent || "",
    combatVisible: Boolean(document.querySelector(".mode-overlay.combat-hud:not(.hidden)")),
    modeText: document.querySelector("#mode-title")?.textContent || ""
  })`);
  const value = status.result?.value || {};
  const text = `${value.objective} ${value.modeText}`;
  if (value.combatVisible || /gulag|spectator|free cam/i.test(text)) {
    throw new Error(`Refusing to save ${label} because the capture is not in the arena: ${JSON.stringify(value)}`);
  }
}

function joinSocket(name, color) {
  return new Promise((resolve, reject) => {
    const remote = new WebSocket(`ws://127.0.0.1:${serverPort}`);
    const timer = setTimeout(() => reject(new Error(`Timed out joining ${name}`)), 7000);
    remote.on("open", () => remote.send(JSON.stringify({ type: "join", room, name, color })));
    remote.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "joined") {
        clearTimeout(timer);
        resolve({ ws: remote, msg });
      }
    });
    remote.on("error", reject);
  });
}

async function main() {
  let server = null;
  let browser = null;
  let ws = null;
  let attacker = null;

  try {
    if (!(await isServerReady())) {
      server = spawn(process.execPath, ["server.js"], {
        cwd: root,
        env: {
          ...process.env,
          PORT: String(serverPort),
          CRASH_CLUB_README_SAFE_ARENA: captureOnly === "arena" ? "1" : process.env.CRASH_CLUB_README_SAFE_ARENA
        },
        stdio: ["ignore", "pipe", "pipe"]
      });
      server.stdout.on("data", (data) => process.stdout.write(data));
      server.stderr.on("data", (data) => process.stderr.write(data));
    }
    await waitForServer();

    const browserPath = findBrowser();
    const profile = path.join(root, "test-results", `readme-browser-${Date.now()}`);
    browser = spawn(browserPath, [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--window-size=1920,1080",
      "--hide-scrollbars",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--no-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--use-gl=swiftshader",
      "about:blank"
    ], { stdio: "ignore" });

    const version = await waitForBrowser();
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.once("open", resolve));
    const browserSend = makeCdp(ws, null);
    const target = await browserSend("Target.createTarget", { url: "about:blank" }, false);
    const attached = await browserSend("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false);
    const send = makeCdp(ws, attached.sessionId);

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Input.setIgnoreInputEvents", { ignore: false });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send("Page.navigate", { url: gameUrl });
    await waitForPage(send, `Boolean(document.querySelector("#start-button"))`, "start screen");
    await waitForPage(send, `Boolean(document.querySelector("canvas"))`, "3D canvas");
    await capture(send, "01-start-screen.png");

    await evalPage(send, `
      localStorage.setItem("crash-club-name", "README Driver");
      document.querySelector("#name-input").value = "README Driver";
      document.querySelector("#start-button").click();
      true;
    `);
    await waitForPage(send, `document.body.classList.contains("is-driving")`, "driving mode");
    if (captureOnly === "gulag") {
      await sleep(700);
    } else {
      await sleep(1400);
      await assertArenaShot(send, "02-arena-hud.png");
      await capture(send, "02-arena-hud.png");

      await hold(send, [["w", "KeyW", 87], ["Shift", "ShiftLeft", 16]], 1600);
      await sleep(700);
      await assertArenaShot(send, "03-center-ring-powerups.png");
      await capture(send, "03-center-ring-powerups.png");

      await hold(send, [["w", "KeyW", 87], ["d", "KeyD", 68]], 1100);
      await sleep(550);
      await assertArenaShot(send, "04-bots-and-radar.png");
      await capture(send, "04-bots-and-radar.png");

      await hold(send, [["w", "KeyW", 87], ["a", "KeyA", 65], ["Shift", "ShiftLeft", 16]], 900);
      await sleep(450);
      await assertArenaShot(send, "05-driving-action.png");
      await capture(send, "05-driving-action.png");

      await key(send, "rawKeyDown", "w", "KeyW", 87);
      await key(send, "rawKeyDown", "Shift", "ShiftLeft", 16);
      for (let i = 0; i < 38; i += 1) {
        if (i === 8) await key(send, "rawKeyDown", "d", "KeyD", 68);
        if (i === 18) await key(send, "keyUp", "d", "KeyD", 68);
        if (i === 20) await key(send, "rawKeyDown", "a", "KeyA", 65);
        if (i === 30) await key(send, "keyUp", "a", "KeyA", 65);
        await sleep(95);
        await frame(send, i);
      }
      await key(send, "keyUp", "Shift", "ShiftLeft", 16);
      await key(send, "keyUp", "w", "KeyW", 87);
    }

    if (process.env.CRASH_CLUB_CAPTURE_GULAG !== "0" && captureOnly !== "arena") {
      const joined = await joinSocket("README Wrecker", "#ff4f8b");
      attacker = joined.ws;
      const targetPlayer = joined.msg.players.find((player) => player.name === "README Driver");
      if (!targetPlayer) throw new Error("Could not find README Driver for Gulag capture.");
      for (let i = 0; i < 8; i += 1) {
        attacker.send(JSON.stringify({ type: "hit", targetId: targetPlayer.id, impulse: 1.8 }));
        await sleep(220);
      }

      await waitForPage(send, `Boolean(document.querySelector(".mode-overlay.combat-hud:not(.hidden)"))`, "Gulag HUD");
      await sleep(550);
      await capture(send, "06-gulag-duel.png");

      for (let i = 0; i < 44; i += 1) {
        if (i % 4 === 0) {
          await key(send, "rawKeyDown", " ", "Space", 32);
          await key(send, "keyUp", " ", "Space", 32);
        }
        if (i === 8) await key(send, "rawKeyDown", "d", "KeyD", 68);
        if (i === 18) await key(send, "keyUp", "d", "KeyD", 68);
        if (i === 24) await key(send, "rawKeyDown", "a", "KeyA", 65);
        if (i === 34) await key(send, "keyUp", "a", "KeyA", 65);
        await gulagFrame(send, i);
        await sleep(60);
      }
    }

    console.log(JSON.stringify({
      browserPath,
      gameUrl,
      screenshots: fs.readdirSync(outDir).filter((file) => file.endsWith(".png")),
      frames: fs.readdirSync(frameDir).length,
      gulagFrames: fs.readdirSync(gulagFrameDir).length
    }, null, 2));
  } finally {
    if (attacker) attacker.close();
    if (ws) ws.close();
    if (browser) browser.kill();
    if (server) server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
