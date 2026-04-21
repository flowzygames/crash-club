const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const WebSocket = require("ws");

const root = process.cwd();
const outDir = path.join(root, "assets", "readme", "github");
const frameDir = path.join(root, "test-results", "gulag-frames");
const serverPort = Number(process.env.CRASH_CLUB_PORT || 3000);
const debugPort = Number(process.env.CRASH_CLUB_DEBUG_PORT || 9340);
const room = `readme-gulag-${Date.now()}`;
const playerName = "README Gulag";
const gameUrl = `http://127.0.0.1:${serverPort}/?room=${room}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function commandPath(name) {
  const result = spawnSync(process.platform === "win32" ? "where" : "command", process.platform === "win32" ? [name] : ["-v", name], {
    shell: process.platform !== "win32"
  });
  if (result.status !== 0) return null;
  return result.stdout.toString().trim().split(/\r?\n/)[0] || null;
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    commandPath("chrome"),
    commandPath("msedge")
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Could not find Chrome or Edge for Gulag capture.");
  return found;
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
      // Keep waiting for CDP.
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

async function evalPage(send, expression) {
  return send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
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
    releaseHidden: document.querySelector("#release-screen")?.classList.contains("hidden") || false,
    hasCanvas: Boolean(document.querySelector("canvas")),
    bodyClass: document.body.className
  })`);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(status.result?.value || {})}`);
}

async function screenshot(send, file) {
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
}

function joinSocket(name, color) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${serverPort}`);
    const timer = setTimeout(() => reject(new Error(`Timed out joining ${name}`)), 7000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "join", room, name, color })));
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

async function main() {
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  let server = null;
  let browser = null;
  let ws = null;
  let attacker = null;

  try {
    if (!(await isServerReady())) {
      server = spawn(process.execPath, ["server.js"], {
        cwd: root,
        env: { ...process.env, PORT: String(serverPort) },
        stdio: ["ignore", "pipe", "pipe"]
      });
      server.stdout.on("data", (data) => process.stdout.write(data));
      server.stderr.on("data", (data) => process.stderr.write(data));
    }
    await waitForServer();

    browser = spawn(findBrowser(), [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${path.join(root, "test-results", `gulag-browser-${Date.now()}`)}`,
      "--window-size=1920,1080",
      "--hide-scrollbars",
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
    await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: gameUrl });
    await waitForPage(send, `Boolean(document.querySelector("#start-button"))`, "start screen");
    await waitForPage(send, `Boolean(document.querySelector("canvas"))`, "3D canvas");
    await evalPage(send, `
      localStorage.setItem("crash-club-name", ${JSON.stringify(playerName)});
      const input = document.querySelector("#name-input");
      const button = document.querySelector("#start-button");
      if (input) {
        input.value = ${JSON.stringify(playerName)};
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      button?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
      button?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      button?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      button?.click();
      true;
    `);
    await sleep(3200);
    if (!(await evalPage(send, `document.body.classList.contains("is-driving")`)).result?.value) {
      await evalPage(send, `
        const input = document.querySelector("#name-input");
        const button = document.querySelector("#start-button");
        if (input) input.value = ${JSON.stringify(playerName)};
        button?.click();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        window.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
        true;
      `);
      await sleep(2600);
    }
    await waitForPage(send, `document.body.classList.contains("is-driving")`, "driving mode", 140);
    await sleep(900);

    const joined = await joinSocket("README Wrecker", "#ff4f8b");
    attacker = joined.ws;
    const targetPlayer = joined.msg.players.find((player) => player.name === playerName);
    if (!targetPlayer) throw new Error(`Could not find player ${playerName}.`);
    for (let i = 0; i < 8; i += 1) {
      attacker.send(JSON.stringify({ type: "hit", targetId: targetPlayer.id, impulse: 1.8 }));
      await sleep(220);
    }

    await waitForPage(send, `document.querySelector(".mode-overlay.combat-hud:not(.hidden)")`, "Gulag HUD");
    await sleep(550);
    await screenshot(send, path.join(outDir, "06-gulag-duel.png"));

    for (let i = 0; i < 44; i += 1) {
      if (i % 4 === 0) {
        await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
      }
      if (i === 8) await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "d", code: "KeyD", windowsVirtualKeyCode: 68 });
      if (i === 18) await send("Input.dispatchKeyEvent", { type: "keyUp", key: "d", code: "KeyD", windowsVirtualKeyCode: 68 });
      if (i === 24) await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
      if (i === 34) await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
      await screenshot(send, path.join(frameDir, `frame-${String(i).padStart(3, "0")}.png`));
      await sleep(60);
    }

    console.log(JSON.stringify({ gameUrl, frames: fs.readdirSync(frameDir).length }, null, 2));
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
