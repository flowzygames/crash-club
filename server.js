const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const GAME_VERSION = "1.3.0";
const TICK_RATE = 20;
const SCORE_TICK_MS = 500;
const PICKUP_RESPAWN_MS = 10000;
const WORLD_SIZE = 180;
const ROOM_IDLE_MS = 1000 * 60 * 10;
const MAX_HEALTH = 100;
const ROUND_DURATION_MS = 1000 * 60 * 3;
const INTERMISSION_MS = 1000 * 12;
const ROUND_WIN_SCORE = 75;
const SHIELD_DURATION_MS = 8000;
const SLAM_DURATION_MS = 9000;
const WRECK_RESPAWN_MS = 1800;
const GULAG_DURATION_MS = 45000;
const BOT_TARGET_PLAYERS = 5;
const BOT_DECISION_MIN_MS = 520;
const BOT_DECISION_MAX_MS = 1150;
const BOT_HIT_COOLDOWN_MS = 650;
const STYLE_SCORE_COOLDOWN_MS = 1250;

const PICKUP_TYPES = {
  boost: {
    label: "Boost",
    color: "#fbbf24",
    score: 3
  },
  repair: {
    label: "Repair",
    color: "#5af0c2",
    heal: 34,
    score: 2
  },
  shield: {
    label: "Shield",
    color: "#7eb8ff",
    score: 2
  },
  slam: {
    label: "Slam",
    color: "#ff4f8b",
    score: 4
  }
};

const PICKUP_TEMPLATES = [
  { id: "boost-north", type: "boost", x: 0, z: -66 },
  { id: "boost-south", type: "boost", x: 0, z: 66 },
  { id: "boost-east", type: "boost", x: 66, z: 0 },
  { id: "boost-west", type: "boost", x: -66, z: 0 },
  { id: "repair-yard", type: "repair", x: -48, z: 46 },
  { id: "repair-ditch", type: "repair", x: 52, z: -44 },
  { id: "shield-left", type: "shield", x: -78, z: -10 },
  { id: "shield-right", type: "shield", x: 78, z: 10 },
  { id: "slam-center-east", type: "slam", x: 28, z: 28 },
  { id: "slam-center-west", type: "slam", x: -28, z: -28 }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

const publicDir = path.join(__dirname, "public");
const rooms = new Map();
let nextPlayerId = 1;
let nextBotId = 1;

const BOT_NAMES = [
  "Mason Cole",
  "Jade Rivera",
  "Logan Pierce",
  "Avery Brooks",
  "Nolan Hayes",
  "Riley Stone",
  "Maya Quinn",
  "Eli Carter",
  "Sam Bishop",
  "Kai Morgan",
  "Tessa Reed",
  "Owen Blake",
  "Zara Knight",
  "Leo Bennett",
  "Ivy Parker",
  "Theo Walsh",
  "Mila Cross",
  "Noah Flynn",
  "Sage Collins",
  "Aria Lane"
];
const BOT_FIRST_NAMES = ["Mason", "Jade", "Logan", "Avery", "Nolan", "Riley", "Maya", "Eli", "Sam", "Kai", "Tessa", "Owen", "Zara", "Leo", "Ivy", "Theo", "Mila", "Noah", "Sage", "Aria", "Brooke", "Caleb", "Nia", "Miles", "Parker"];
const BOT_LAST_NAMES = ["Cole", "Rivera", "Pierce", "Brooks", "Hayes", "Stone", "Quinn", "Carter", "Bishop", "Morgan", "Reed", "Blake", "Knight", "Bennett", "Parker", "Walsh", "Cross", "Flynn", "Collins", "Lane", "Wells", "Foster", "Banks", "Hale", "Rowan"];

function sanitizeRoomCode(input) {
  const cleaned = String(input || "main")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 16);
  return cleaned || "main";
}

function randomColor() {
  const colors = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#a78bfa", "#f97316"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomBotName(room) {
  const used = new Set([...room.players.values()].map((player) => player.name));
  for (let tries = 0; tries < 10; tries += 1) {
    const first = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
    const last = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)];
    const name = `${first} ${last}`;
    if (!used.has(name)) return name;
  }
  return `${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]} ${nextBotId}`;
}

function randomGulagOpponentName() {
  const first = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
  const last = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)];
  return `${first} ${last}`;
}

function numberFromId(id) {
  const numeric = Number(id);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return String(id)
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function createPickups() {
  return PICKUP_TEMPLATES.map((pickup) => ({
    ...pickup,
    active: true,
    respawnAt: 0
  }));
}

function createRoundState(now = Date.now(), round = 1) {
  return {
    phase: "live",
    round,
    startedAt: now,
    endsAt: now + ROUND_DURATION_MS,
    nextRoundAt: 0,
    winner: null,
    standings: []
  };
}

function createRoom(code) {
  return {
    code,
    players: new Map(),
    pickups: createPickups(),
    round: createRoundState(),
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  };
}

function getRoom(code) {
  const key = sanitizeRoomCode(code);
  if (!rooms.has(key)) {
    rooms.set(key, createRoom(key));
  }
  const room = rooms.get(key);
  room.lastActiveAt = Date.now();
  return room;
}

function serializeRoom(room, now = Date.now()) {
  return {
    phase: room.round.phase,
    round: room.round.round,
    endsAt: room.round.endsAt,
    nextRoundAt: room.round.nextRoundAt,
    winner: room.round.winner,
    standings: room.round.standings || [],
    now,
    version: GAME_VERSION,
    targetScore: ROUND_WIN_SCORE
  };
}

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    mode: player.mode || "arena",
    x: player.x,
    y: player.y,
    z: player.z,
    angle: player.angle,
    speed: player.speed,
    isBot: Boolean(player.isBot),
    score: player.score || 0,
    roundWins: player.roundWins || 0,
    hits: player.hits || 0,
    health: player.health,
    wrecks: player.wrecks || 0,
    shieldUntil: player.shieldUntil || 0,
    slamUntil: player.slamUntil || 0,
    wreckedUntil: player.wreckedUntil || 0,
    gulagUntil: player.gulagUntil || 0
  };
}

function serializePickup(pickup) {
  const type = PICKUP_TYPES[pickup.type] || PICKUP_TYPES.boost;
  return {
    id: pickup.id,
    type: pickup.type,
    label: type.label,
    color: type.color,
    x: pickup.x,
    z: pickup.z,
    active: pickup.active
  };
}

function createSpawnState(id, name, color) {
  const seed = numberFromId(id);
  const spawnAngle = (seed * 0.95) % (Math.PI * 2);
  const spawnRadius = 26 + (seed % 5) * 8;
  return {
    name: String(name || `Driver ${id}`).slice(0, 18),
    color: color || randomColor(),
    x: Math.cos(spawnAngle) * spawnRadius,
    y: 0.08,
    z: Math.sin(spawnAngle) * spawnRadius,
    angle: spawnAngle + Math.PI,
    speed: 0,
    inZone: false
  };
}

function createBot(room) {
  const id = `bot-${nextBotId++}`;
  const name = randomBotName(room);
  return {
    id,
    roomCode: room.code,
    ws: null,
    isBot: true,
    mode: "arena",
    score: 0,
    roundWins: 0,
    hits: 0,
    health: MAX_HEALTH,
    wrecks: 0,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    nextStyleScoreAt: 0,
    botTarget: { x: 0, z: 0 },
    botNextDecisionAt: 0,
    botNextHitAt: 0,
    ...createSpawnState(id, name, randomColor())
  };
}

function humanCount(room) {
  return [...room.players.values()].filter((player) => !player.isBot).length;
}

function botCount(room) {
  return [...room.players.values()].filter((player) => player.isBot).length;
}

function ensureBots(room) {
  const humans = humanCount(room);
  const desiredBots = humans > 0 ? Math.max(0, BOT_TARGET_PLAYERS - humans) : 0;

  while (botCount(room) < desiredBots) {
    const bot = createBot(room);
    room.players.set(bot.id, bot);
    broadcastRoom(room, {
      type: "player-joined",
      player: serializePlayer(bot)
    });
  }

  while (botCount(room) > desiredBots) {
    const bot = [...room.players.values()].find((player) => player.isBot);
    if (!bot) {
      return;
    }
    room.players.delete(bot.id);
    broadcastRoom(room, {
      type: "player-left",
      id: bot.id
    });
  }
}

function resetPlayerForRound(player) {
  Object.assign(player, createSpawnState(player.id, player.name, player.color), {
    mode: "arena",
    health: MAX_HEALTH,
    score: 0,
    wrecks: 0,
    hits: 0,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    gulagUntil: 0,
    nextStyleScoreAt: 0
  });
}

function respawnPlayer(player) {
  Object.assign(player, createSpawnState(player.id, player.name, player.color), {
    mode: "arena",
    health: MAX_HEALTH,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    gulagUntil: 0,
    nextStyleScoreAt: 0
  });
}

function sendPlayerState(room, player, type = "player-updated") {
  broadcastRoom(room, {
    type,
    player: serializePlayer(player)
  });
}

function enterGulag(room, player, source, now = Date.now()) {
  player.mode = "gulag";
  player.health = 0;
  player.speed = 0;
  player.wreckedUntil = 0;
  player.shieldUntil = 0;
  player.slamUntil = 0;
  player.gulagUntil = now + GULAG_DURATION_MS;
  player.gulagOpponent = randomGulagOpponentName();
  send(player.ws, {
    type: "gulag-started",
    player: serializePlayer(player),
    opponentName: player.gulagOpponent,
    endsAt: player.gulagUntil
  });
  broadcastEvent(room, `${player.name} got sent to the Gulag by ${source.name}.`, "danger");
  sendPlayerState(room, player);
}

function sendToSpectator(room, player, reason = "lost the Gulag") {
  player.mode = "spectator";
  player.health = 0;
  player.speed = 0;
  player.wreckedUntil = 0;
  player.gulagUntil = 0;
  player.shieldUntil = 0;
  player.slamUntil = 0;
  send(player.ws, {
    type: "spectator-started",
    reason,
    player: serializePlayer(player)
  });
  broadcastEvent(room, `${player.name} is spectating after they ${reason}.`, "danger");
  sendPlayerState(room, player);
}

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastRoom(room, message, exceptWs = null) {
  for (const player of room.players.values()) {
    if (player.ws && player.ws !== exceptWs && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }
}

function broadcastSnapshot(room, now = Date.now()) {
  broadcastRoom(room, {
    type: "snapshot",
    room: serializeRoom(room, now),
    players: [...room.players.values()].map(serializePlayer)
  });
}

function broadcastEvent(room, text, tone = "info") {
  broadcastRoom(room, {
    type: "event",
    text,
    tone
  });
}

function removePlayer(player) {
  if (!player || !player.roomCode) {
    return;
  }
  const room = rooms.get(player.roomCode);
  if (!room || !room.players.has(player.id)) {
    return;
  }
  room.players.delete(player.id);
  room.lastActiveAt = Date.now();
  broadcastRoom(room, {
    type: "player-left",
    id: player.id
  });
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (humanCount(room) === 0 && now - room.lastActiveAt > ROOM_IDLE_MS) {
      rooms.delete(code);
    }
  }
}

function findWinner(room) {
  return [...room.players.values()].sort((a, b) => b.score - a.score || a.wrecks - b.wrecks)[0] || null;
}

function buildStandings(room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score || b.wrecks - a.wrecks || String(a.name).localeCompare(String(b.name)))
    .slice(0, 3)
    .map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      score: player.score || 0,
      wrecks: player.wrecks || 0,
      roundWins: player.roundWins || 0,
      isBot: Boolean(player.isBot)
    }));
}

function finishRound(room, winner, now = Date.now()) {
  if (room.round.phase === "intermission") {
    return;
  }
  room.round.phase = "intermission";
  room.round.endsAt = now;
  room.round.nextRoundAt = now + INTERMISSION_MS;
  room.round.standings = buildStandings(room);
  room.round.winner = winner
    ? {
        id: winner.id,
        name: winner.name,
        score: winner.score,
        wrecks: winner.wrecks,
        isBot: Boolean(winner.isBot)
      }
    : null;
  if (winner) {
    winner.roundWins = (winner.roundWins || 0) + 1;
  }
  broadcastEvent(room, winner ? `${winner.name} wins the round!` : "Round over. Nobody scored.", "win");
  broadcastSnapshot(room, now);
}

function startNextRound(room, now = Date.now()) {
  room.round = createRoundState(now, room.round.round + 1);
  room.pickups = createPickups();
  for (const player of room.players.values()) {
    resetPlayerForRound(player);
  }
  broadcastRoom(room, {
    type: "round-started",
    room: serializeRoom(room, now),
    players: [...room.players.values()].map(serializePlayer),
    pickups: room.pickups.map(serializePickup)
  });
  broadcastEvent(room, `Round ${room.round.round} is live. First to ${ROUND_WIN_SCORE} wins.`, "start");
}

function maybeFinishRound(room, now = Date.now()) {
  if (room.round.phase !== "live") {
    return;
  }
  const winnerByScore = [...room.players.values()].find((player) => player.score >= ROUND_WIN_SCORE);
  if (winnerByScore) {
    finishRound(room, winnerByScore, now);
    return;
  }
  if (now >= room.round.endsAt) {
    finishRound(room, findWinner(room), now);
  }
}

function applyPickup(player, pickup, room, now = Date.now()) {
  const meta = PICKUP_TYPES[pickup.type] || PICKUP_TYPES.boost;
  player.score += meta.score || 0;

  if (pickup.type === "repair") {
    player.health = clamp(player.health + meta.heal, 0, MAX_HEALTH);
  }
  if (pickup.type === "shield") {
    player.shieldUntil = now + SHIELD_DURATION_MS;
  }
  if (pickup.type === "slam") {
    player.slamUntil = now + SLAM_DURATION_MS;
  }

  send(player.ws, {
    type: "pickup-awarded",
    pickup: serializePickup(pickup),
    player: serializePlayer(player),
    expiresAt: pickup.type === "shield" ? player.shieldUntil : player.slamUntil
  });
  broadcastEvent(room, `${player.name} grabbed ${meta.label}.`, pickup.type);
}

function damagePlayer(room, source, target, rawDamage, now = Date.now()) {
  if (!source || !target || target.mode === "spectator" || target.mode === "gulag" || target.wreckedUntil > now || room.round.phase !== "live") {
    return;
  }
  if (process.env.CRASH_CLUB_README_SAFE_ARENA === "1" && !target.isBot) {
    return;
  }

  const shielded = target.shieldUntil > now;
  const damage = shielded ? Math.ceil(rawDamage * 0.35) : rawDamage;
  target.health = clamp(target.health - damage, 0, MAX_HEALTH);
  source.hits = (source.hits || 0) + 1;
  source.score += Math.max(1, Math.round(damage / 8));

  if (target.health <= 0) {
    source.wrecks = (source.wrecks || 0) + 1;
    source.score += 8;
    if (target.isBot) {
      target.wreckedUntil = now + WRECK_RESPAWN_MS;
      broadcastEvent(room, `${source.name} wrecked ${target.name}!`, "danger");
    } else {
      enterGulag(room, target, source, now);
    }
  }

  broadcastRoom(room, {
    type: "player-damaged",
    sourceId: source.id,
    targetId: target.id,
    damage,
    shielded,
    player: serializePlayer(target),
    source: serializePlayer(source)
  });
}

function chooseBotTarget(room, bot, now) {
  const livePickups = room.pickups.filter((pickup) => pickup.active);
  const humans = [...room.players.values()].filter((player) => !player.isBot && player.mode === "arena" && player.health > 0);
  const roll = Math.random();

  if (humans.length > 0 && roll < 0.58) {
    const target = humans[Math.floor(Math.random() * humans.length)];
    bot.botTarget = { x: target.x, z: target.z };
  } else if (livePickups.length > 0 && roll < 0.83) {
    const pickup = livePickups[Math.floor(Math.random() * livePickups.length)];
    bot.botTarget = { x: pickup.x, z: pickup.z };
  } else {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 70;
    bot.botTarget = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  bot.botNextDecisionAt = now + BOT_DECISION_MIN_MS + Math.random() * (BOT_DECISION_MAX_MS - BOT_DECISION_MIN_MS);
}

function collectPickupFor(player, pickup, room, now) {
  pickup.active = false;
  pickup.respawnAt = now + PICKUP_RESPAWN_MS;
  applyPickup(player, pickup, room, now);
  broadcastRoom(room, {
    type: "pickup-state",
    pickupId: pickup.id,
    active: false,
    collectorId: player.id
  });
  maybeFinishRound(room, now);
}

function updateBots(room, now, deltaSeconds) {
  if (room.round.phase !== "live") {
    return;
  }

  for (const bot of room.players.values()) {
    if (!bot.isBot) {
      continue;
    }

    if (bot.wreckedUntil > now || bot.health <= 0) {
      bot.speed = 0;
      continue;
    }

    if (!bot.botTarget || now >= bot.botNextDecisionAt) {
      chooseBotTarget(room, bot, now);
    }

    const dx = bot.botTarget.x - bot.x;
    const dz = bot.botTarget.z - bot.z;
    const targetDistance = Math.hypot(dx, dz);
    const desiredAngle = Math.atan2(dx, dz);
    const turn = clamp(angleDelta(bot.angle, desiredAngle), -2.6 * deltaSeconds, 2.6 * deltaSeconds);
    bot.angle += turn;
    bot.speed = clamp(bot.speed + (targetDistance > 6 ? 36 : -44) * deltaSeconds, 11, 39);
    bot.x += Math.sin(bot.angle) * bot.speed * deltaSeconds;
    bot.z += Math.cos(bot.angle) * bot.speed * deltaSeconds;
    bot.x = clamp(bot.x, -WORLD_SIZE, WORLD_SIZE);
    bot.z = clamp(bot.z, -WORLD_SIZE, WORLD_SIZE);
    bot.y = 0.08;
    bot.inZone = Math.hypot(bot.x, bot.z) >= 8 && Math.hypot(bot.x, bot.z) <= 18;

    if (targetDistance < 5) {
      bot.botNextDecisionAt = 0;
    }

    for (const pickup of room.pickups) {
      if (pickup.active && Math.hypot(bot.x - pickup.x, bot.z - pickup.z) < 4.6) {
        collectPickupFor(bot, pickup, room, now);
        break;
      }
    }

    if (now < bot.botNextHitAt) {
      continue;
    }

    for (const target of room.players.values()) {
      if (target.id === bot.id || target.mode !== "arena" || target.wreckedUntil > now || target.health <= 0) {
        continue;
      }

      const distance = Math.hypot(bot.x - target.x, bot.z - target.z);
      if (distance < 5.1 && bot.speed > 13) {
        const damage = Math.round(clamp(bot.speed / 31, 0.35, 1.35) * 24);
        damagePlayer(room, bot, target, damage, now);
        broadcastRoom(room, {
          type: "impact",
          sourceId: bot.id,
          targetId: target.id,
          impulse: clamp(bot.speed / 28, 0.25, 1.15),
          slam: false
        });
        bot.botNextHitAt = now + BOT_HIT_COOLDOWN_MS;
        break;
      }
    }
  }
}

function serveFile(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(
      JSON.stringify({
        ok: true,
        name: "crash-club",
        version: GAME_VERSION,
        rooms: rooms.size
      })
    );
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(serveFile);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let player = null;

  send(ws, {
    type: "hello",
    motd: "Welcome to Crash Club."
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      if (player) {
        return;
      }

      const room = getRoom(msg.room);
      const id = String(nextPlayerId++);
      player = {
        id,
        roomCode: room.code,
        ws,
        mode: "arena",
        score: 0,
        health: MAX_HEALTH,
        wrecks: 0,
        shieldUntil: 0,
        slamUntil: 0,
        wreckedUntil: 0,
        nextStyleScoreAt: 0,
        ...createSpawnState(id, msg.name, msg.color)
      };
      room.players.set(player.id, player);
      ensureBots(room);

      send(ws, {
        type: "joined",
        id: player.id,
        room: room.code,
        roomState: serializeRoom(room),
        players: [...room.players.values()].map(serializePlayer),
        pickups: room.pickups.map(serializePickup)
      });

      broadcastRoom(
        room,
        {
          type: "player-joined",
          player: serializePlayer(player)
        },
        ws
      );
      broadcastEvent(room, `${player.name} joined the arena.`, "join");
      return;
    }

    if (!player) {
      return;
    }

    const room = rooms.get(player.roomCode);
    if (!room) {
      return;
    }
    room.lastActiveAt = Date.now();

    if (msg.type === "state") {
      if (player.mode !== "arena") {
        return;
      }
      player.x = clamp(Number(msg.x) || 0, -WORLD_SIZE, WORLD_SIZE);
      player.y = clamp(Number(msg.y) || 0, 0, 10);
      player.z = clamp(Number(msg.z) || 0, -WORLD_SIZE, WORLD_SIZE);
      player.angle = Number(msg.angle) || 0;
      player.speed = clamp(Number(msg.speed) || 0, -25, 70);
      player.inZone = Boolean(msg.inZone);
      return;
    }

    if (msg.type === "rename") {
      player.name = String(msg.name || player.name).slice(0, 18);
      broadcastRoom(room, {
        type: "player-renamed",
        id: player.id,
        name: player.name
      });
      return;
    }

    if (msg.type === "respawn") {
      if (player.mode !== "arena") {
        send(ws, {
          type: "event",
          text: player.mode === "gulag" ? "Win the Gulag to respawn." : "Spectators stay in free cam until the next round.",
          tone: "danger"
        });
        return;
      }
      respawnPlayer(player);
      send(ws, {
        type: "respawned",
        player: serializePlayer(player)
      });
      broadcastEvent(room, `${player.name} respawned.`, "info");
      return;
    }

    if (msg.type === "pickup-collected") {
      if (room.round.phase !== "live" || player.mode !== "arena") {
        return;
      }
      const pickup = room.pickups.find((entry) => entry.id === msg.pickupId);
      if (!pickup || !pickup.active) {
        return;
      }
      pickup.active = false;
      pickup.respawnAt = Date.now() + PICKUP_RESPAWN_MS;
      applyPickup(player, pickup, room);
      broadcastRoom(room, {
        type: "pickup-state",
        pickupId: pickup.id,
        active: false,
        collectorId: player.id
      });
      maybeFinishRound(room);
      return;
    }

    if (msg.type === "hit") {
      const now = Date.now();
      if (player.mode !== "arena") {
        return;
      }
      const impulse = clamp(Number(msg.impulse) || 0, 0, 1.8);
      const target = room.players.get(String(msg.targetId || ""));
      const slamReady = player.slamUntil > now;
      const damage = Math.round(impulse * (slamReady ? 38 : 24));
      if (slamReady) {
        player.slamUntil = 0;
      }
      if (target && target.id !== player.id && damage > 4) {
        damagePlayer(room, player, target, damage, now);
      }
      broadcastRoom(room, {
        type: "impact",
        sourceId: player.id,
        targetId: String(msg.targetId || ""),
        impulse,
        slam: slamReady
      });
      maybeFinishRound(room, now);
      return;
    }

    if (msg.type === "style-score") {
      const now = Date.now();
      if (room.round.phase !== "live" || player.mode !== "arena" || player.health <= 0 || player.wreckedUntil > now) {
        return;
      }
      if (player.nextStyleScoreAt && player.nextStyleScoreAt > now) {
        return;
      }
      const points = clamp(Math.round(Number(msg.points) || 1), 1, 5);
      const reason = String(msg.reason || "style").replace(/[^a-z0-9 -]/gi, "").slice(0, 24) || "style";
      player.score += points;
      player.nextStyleScoreAt = now + STYLE_SCORE_COOLDOWN_MS;
      send(player.ws, {
        type: "style-awarded",
        reason,
        points,
        player: serializePlayer(player)
      });
      broadcastEvent(room, `${player.name} +${points} ${reason}.`, "boost");
      maybeFinishRound(room, now);
      return;
    }

    if (msg.type === "gulag-result") {
      const now = Date.now();
      if (player.mode !== "gulag") {
        return;
      }
      if (msg.result === "win" && player.gulagUntil >= now) {
        respawnPlayer(player);
        player.score += 6;
        send(ws, {
          type: "gulag-ended",
          result: "win",
          player: serializePlayer(player)
        });
        sendPlayerState(room, player, "respawned");
        broadcastEvent(room, `${player.name} won the Gulag and redeployed!`, "win");
      } else {
        sendToSpectator(room, player, msg.result === "timeout" ? "timed out in the Gulag" : "lost the Gulag");
      }
      maybeFinishRound(room, now);
    }
  });

  ws.on("close", () => {
    removePlayer(player);
    if (player?.roomCode && rooms.has(player.roomCode)) {
      ensureBots(rooms.get(player.roomCode));
    }
  });

  ws.on("error", () => {
    removePlayer(player);
    if (player?.roomCode && rooms.has(player.roomCode)) {
      ensureBots(rooms.get(player.roomCode));
    }
  });
});

setInterval(() => {
  cleanupRooms();
  const now = Date.now();
  const deltaSeconds = 1 / TICK_RATE;

  for (const room of rooms.values()) {
    ensureBots(room);

    if (humanCount(room) === 0) {
      continue;
    }

    updateBots(room, now, deltaSeconds);

    if (room.round.phase === "intermission" && now >= room.round.nextRoundAt) {
      startNextRound(room, now);
    }

    for (const player of room.players.values()) {
      if (player.mode === "gulag" && player.gulagUntil > 0 && player.gulagUntil <= now) {
        sendToSpectator(room, player, "timed out in the Gulag");
        continue;
      }

      if (player.isBot && player.wreckedUntil > 0 && player.wreckedUntil <= now) {
        respawnPlayer(player);
        send(player.ws, {
          type: "respawned",
          player: serializePlayer(player)
        });
      }
    }

    for (const pickup of room.pickups) {
      if (!pickup.active && pickup.respawnAt <= now) {
        pickup.active = true;
        pickup.respawnAt = 0;
        broadcastRoom(room, {
          type: "pickup-state",
          pickupId: pickup.id,
          active: true
        });
      }
    }

    maybeFinishRound(room, now);
    broadcastSnapshot(room, now);
  }
}, 1000 / TICK_RATE);

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.round.phase !== "live") {
      continue;
    }
    let scored = false;
    for (const player of room.players.values()) {
      if (player.inZone && player.health > 0) {
        player.score += 1;
        scored = true;
      }
    }

    if (scored) {
      maybeFinishRound(room, now);
      broadcastSnapshot(room, now);
    }
  }
}, SCORE_TICK_MS);

server.listen(PORT, () => {
  console.log(`Crash Club server running on http://localhost:${PORT}`);
});
