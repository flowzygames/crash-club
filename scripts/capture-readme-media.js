const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const WebSocket = require("ws");

const root = process.cwd();
const outDir = path.join(root, "assets", "readme", "github");
const frameDir = path.join(root, "test-results", "readme-frames");
const serverPort = Number(process.env.CRASH_CLUB_PORT || 3000);
const debugPort = Number(process.env.CRASH_CLUB_DEBUG_PORT || 9339);
const gameUrl = `http://127.0.0.1:${serverPort}/?room=readme-gallery-${Date.now()}`;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

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

async function evalPage(send, expression) {
  return send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
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

async function main() {
  let server = null;
  let browser = null;
  let ws = null;

  try {
    if (!(await isServerReady())) {
      server = spawn(process.execPath, ["server.js"], {
        cwd: root,
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
    await sleep(3800);
    await capture(send, "01-start-screen.png");

    await evalPage(send, `
      localStorage.setItem("crash-club-name", "README Driver");
      document.querySelector("#name-input").value = "README Driver";
      document.querySelector("#start-button").click();
      true;
    `);
    await sleep(3400);
    await capture(send, "02-arena-hud.png");

    await hold(send, [["w", "KeyW", 87], ["Shift", "ShiftLeft", 16]], 1600);
    await sleep(700);
    await capture(send, "03-center-ring-powerups.png");

    await hold(send, [["w", "KeyW", 87], ["d", "KeyD", 68]], 1100);
    await sleep(550);
    await capture(send, "04-bots-and-radar.png");

    await hold(send, [["w", "KeyW", 87], ["a", "KeyA", 65], ["Shift", "ShiftLeft", 16]], 900);
    await sleep(450);
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

    console.log(JSON.stringify({
      browserPath,
      gameUrl,
      screenshots: fs.readdirSync(outDir).filter((file) => file.endsWith(".png")),
      frames: fs.readdirSync(frameDir).length
    }, null, 2));
  } finally {
    if (ws) ws.close();
    if (browser) browser.kill();
    if (server) server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
