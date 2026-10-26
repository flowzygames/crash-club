const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const ARENA = require("./public/shared/arena.js");

const PORT = process.env.PORT || 3000;
const GAME_VERSION = "2.0.0";
const TICK_RATE = Number(process.env.CRASH_CLUB_TICK_RATE || 24);
const SNAPSHOT_RATE = Number(process.env.CRASH_CLUB_SNAPSHOT_RATE || 15);
const SCORE_TICK_MS = 500;
const PICKUP_RESPAWN_MS = 9000;
const RING_POINTS = 1;
const WORLD_SIZE = ARENA.WORLD_SIZE;
const ROOM_IDLE_MS = 1000 * 60 * 10;
const MAX_HEALTH = 100;
const ROUND_DURATION_MS = Number(process.env.CRASH_CLUB_ROUND_MS || 1000 * 60 * 3);
const INTERMISSION_MS = 1000 * 12;
const ROUND_WIN_SCORE = 150;
const SHIELD_DURATION_MS = 8000;
const SLAM_DURATION_MS = 9000;
const WRECK_RESPAWN_MS = 1800;
const GULAG_DURATION_MS = 45000;
const SPECTATOR_REDEPLOY_MS = 20000;
const BOT_TARGET_BOTS = Number(process.env.CRASH_CLUB_BOT_TARGET || 6);
const BOT_DECISION_MIN_MS = 420;
const BOT_DECISION_MAX_MS = 980;
const BOT_HIT_COOLDOWN_MS = 800;
const BOT_SCORE_MULTIPLIER = 0.35;
const STYLE_SCORE_COOLDOWN_MS = 900;
const STYLE_SCORE_MAX = 40;
const CAR_COLLISION_RADIUS = 2.35;
const CAR_COLLISION_AXIS_HALF = 2.65;
const CAR_COLLISION_RANGE = CAR_COLLISION_RADIUS * 2;
const HIT_LAG_ALLOWANCE = 2.8;
const STOMP_DAMAGE = 46;
const FINAL_FRENZY_MS = 30000;
const STREAK_BOUNTY_MIN = 3;
const MULTI_WRECK_WINDOW_MS = 4500;
const HUMAN_HIT_COOLDOWN_MS = 450;
const RESPAWN_COOLDOWN_MS = 4000;
const STATE_STALE_MS = 600;
const MAX_MESSAGE_BYTES = 16 * 1024;

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

const STREAK_CALLOUTS = {
  3: "is ON FIRE",
  5: "is on a RAMPAGE",
  7: "is UNSTOPPABLE",
  10: "is GODLIKE"
};

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

function toText(value, fallback = "") {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function toNumber(value, fallback = 0) {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rankPlayers(a, b) {
  return (b.score || 0) - (a.score || 0) || (b.wrecks || 0) - (a.wrecks || 0) || String(a.name).localeCompare(String(b.name));
}

function sanitizeRoomCode(input) {
  const cleaned = (toText(input, "") || "main")
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

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function distanceSq2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function cross2D(ax, az, bx, bz) {
  return ax * bz - az * bx;
}

function segmentsIntersect2D(a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z) {
  const d1 = cross2D(a2x - a1x, a2z - a1z, b1x - a1x, b1z - a1z);
  const d2 = cross2D(a2x - a1x, a2z - a1z, b2x - a1x, b2z - a1z);
  const d3 = cross2D(b2x - b1x, b2z - b1z, a1x - b1x, a1z - b1z);
  const d4 = cross2D(b2x - b1x, b2z - b1z, a2x - b1x, a2z - b1z);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function closestPointOnSegment2D(px, pz, ax, az, bx, bz) {
  const sx = bx - ax;
  const sz = bz - az;
  const lengthSq = sx * sx + sz * sz;
  if (lengthSq <= 0.000001) {
    return { x: ax, z: az };
  }
  const t = clamp(((px - ax) * sx + (pz - az) * sz) / lengthSq, 0, 1);
  return { x: ax + sx * t, z: az + sz * t };
}

function closestSegments2D(a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z) {
  if (segmentsIntersect2D(a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z)) {
    const ix = (Math.max(Math.min(a1x, a2x), Math.min(b1x, b2x)) + Math.min(Math.max(a1x, a2x), Math.max(b1x, b2x))) * 0.5;
    const iz = (Math.max(Math.min(a1z, a2z), Math.min(b1z, b2z)) + Math.min(Math.max(a1z, a2z), Math.max(b1z, b2z))) * 0.5;
    return { ax: ix, az: iz, bx: ix, bz: iz, distanceSq: 0 };
  }

  const candidates = [];
  let point = closestPointOnSegment2D(a1x, a1z, b1x, b1z, b2x, b2z);
  candidates.push({ ax: a1x, az: a1z, bx: point.x, bz: point.z });
  point = closestPointOnSegment2D(a2x, a2z, b1x, b1z, b2x, b2z);
  candidates.push({ ax: a2x, az: a2z, bx: point.x, bz: point.z });
  point = closestPointOnSegment2D(b1x, b1z, a1x, a1z, a2x, a2z);
  candidates.push({ ax: point.x, az: point.z, bx: b1x, bz: b1z });
  point = closestPointOnSegment2D(b2x, b2z, a1x, a1z, a2x, a2z);
  candidates.push({ ax: point.x, az: point.z, bx: b2x, bz: b2z });

  let best = candidates[0];
  best.distanceSq = distanceSq2D(best.ax, best.az, best.bx, best.bz);
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    candidate.distanceSq = distanceSq2D(candidate.ax, candidate.az, candidate.bx, candidate.bz);
    if (candidate.distanceSq < best.distanceSq) {
      best = candidate;
    }
  }
  return best;
}

function getCarAxis(player) {
  const fx = Math.sin(player.angle || 0) * CAR_COLLISION_AXIS_HALF;
  const fz = Math.cos(player.angle || 0) * CAR_COLLISION_AXIS_HALF;
  return {
    ax: player.x - fx,
    az: player.z - fz,
    bx: player.x + fx,
    bz: player.z + fz
  };
}

function getPlayerCollision(source, target, allowance = 0) {
  if (!source || !target) return null;
  const sourceAxis = getCarAxis(source);
  const targetAxis = getCarAxis(target);
  const closest = closestSegments2D(sourceAxis.ax, sourceAxis.az, sourceAxis.bx, sourceAxis.bz, targetAxis.ax, targetAxis.az, targetAxis.bx, targetAxis.bz);
  const distance = Math.sqrt(closest.distanceSq);
  const range = CAR_COLLISION_RANGE + allowance;
  if (!(distance < range)) return null;

  let nx = distance > 0.0001 ? (closest.ax - closest.bx) / distance : source.x - target.x;
  let nz = distance > 0.0001 ? (closest.az - closest.bz) / distance : source.z - target.z;
  const normalLength = Math.hypot(nx, nz);
  if (normalLength < 0.0001 || !Number.isFinite(normalLength)) {
    nx = 1;
    nz = 0;
  } else if (distance <= 0.0001) {
    nx /= normalLength;
    nz /= normalLength;
  }

  return {
    nx,
    nz,
    penetration: range - distance,
    contactX: (closest.ax + closest.bx) * 0.5,
    contactZ: (closest.az + closest.bz) * 0.5,
    distance
  };
}

function getRelativeClosingSpeed(source, target, collision) {
  const sourceVx = Number.isFinite(source.vx) ? source.vx : Math.sin(source.angle || 0) * (source.speed || 0);
  const sourceVz = Number.isFinite(source.vz) ? source.vz : Math.cos(source.angle || 0) * (source.speed || 0);
  const targetVx = Number.isFinite(target.vx) ? target.vx : Math.sin(target.angle || 0) * (target.speed || 0);
  const targetVz = Number.isFinite(target.vz) ? target.vz : Math.cos(target.angle || 0) * (target.speed || 0);
  const rvx = sourceVx - targetVx;
  const rvz = sourceVz - targetVz;
  return Math.max(0, -(rvx * collision.nx + rvz * collision.nz));
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
  const now = Date.now();
  return {
    code,
    players: new Map(),
    pickups: createPickups(),
    round: createRoundState(now),
    firstBloodTaken: false,
    createdAt: now,
    lastActiveAt: now,
    lastSnapshotAt: 0
  };
}

// Starts the next round on a fresh grid: new clock, every pickup back, first blood up for grabs again.
function resetRoundState(room, now) {
  room.round = createRoundState(now, room.round.round + 1);
  room.pickups = createPickups();
  room.firstBloodTaken = false;
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

// slack widens the scoring band, so a human whose position is a few frames old still counts.
function isInRing(x, z, slack = 0) {
  const dist = Math.hypot(x - ARENA.RING.x, z - ARENA.RING.z);
  return dist >= ARENA.RING.min - slack && dist <= ARENA.RING.max + slack;
}

// The last FINAL_FRENZY_MS of a live round pay double. A cashout flushed as the clock runs out still counts.
function isFinalFrenzy(room, now = Date.now()) {
  return room.round.phase === "live" && now >= room.round.endsAt - FINAL_FRENZY_MS;
}

function serializeRoom(room, now = Date.now()) {
  return {
    phase: room.round.phase,
    round: room.round.round,
    endsAt: room.round.endsAt,
    frenzyAt: room.round.endsAt - FINAL_FRENZY_MS,
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
    x: round2(player.x),
    y: round2(player.y),
    z: round2(player.z),
    angle: round2(player.angle),
    speed: round2(player.speed),
    vx: round2(player.vx || 0),
    vz: round2(player.vz || 0),
    pitch: round2(player.pitch || 0),
    roll: round2(player.roll || 0),
    boosting: Boolean(player.boosting),
    airborne: Boolean(player.airborne),
    isBot: Boolean(player.isBot),
    score: player.score || 0,
    roundWins: player.roundWins || 0,
    hits: player.hits || 0,
    health: player.health,
    wrecks: player.wrecks || 0,
    streak: player.streak || 0,
    shieldUntil: player.shieldUntil || 0,
    slamUntil: player.slamUntil || 0,
    wreckedUntil: player.wreckedUntil || 0,
    gulagUntil: player.gulagUntil || 0,
    spectatorUntil: player.spectatorUntil || 0
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

function isClearSpawn(x, z) {
  if (ARENA.groundHeightAt(x, z) > 0 || ARENA.jumpPadAt(x, z) || ARENA.boostPadAt(x, z)) return false;
  if (ARENA.ramps.some((ramp) => Math.hypot(x - ramp.x, z - ramp.z) < ramp.length / 2 + ramp.width / 2 + 3)) return false;
  return !ARENA.colliders.some((collider) => Math.hypot(x - collider.x, z - collider.z) < collider.r + 4);
}

function createSpawnState(id, name, color) {
  const seed = numberFromId(id);
  let spawnAngle = (seed * 0.95) % (Math.PI * 2);
  const spawnRadius = 26 + (seed % 5) * 8;
  for (let tries = 0; tries < 24 && !isClearSpawn(Math.cos(spawnAngle) * spawnRadius, Math.sin(spawnAngle) * spawnRadius); tries += 1) {
    spawnAngle += 0.27;
  }
  const x = Math.cos(spawnAngle) * spawnRadius;
  const z = Math.sin(spawnAngle) * spawnRadius;
  return {
    name: (toText(name, "") || `Driver ${id}`).slice(0, 18),
    color: color || randomColor(),
    x,
    y: ARENA.groundHeightAt(x, z),
    z,
    angle: spawnAngle + Math.PI,
    speed: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    kx: 0,
    kz: 0,
    pitch: 0,
    roll: 0,
    boosting: false,
    airborne: false,
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
    streak: 0,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    nextStyleScoreAt: 0,
    botTarget: { x: 0, z: 0 },
    botPlan: null,
    botNextDecisionAt: 0,
    botNextHitAt: 0,
    botNextPickupCheckAt: 0,
    ...createSpawnState(id, name, randomColor())
  };
}

function humanCount(room) {
  return [...room.players.values()].filter((player) => !player.isBot).length;
}

function botCount(room) {
  return [...room.players.values()].filter((player) => player.isBot).length;
}

function arenaPlayers(room, now = Date.now()) {
  return [...room.players.values()].filter((player) => player.mode === "arena" && player.health > 0 && !(player.wreckedUntil > now));
}

function ensureBots(room) {
  const humans = humanCount(room);
  const desiredBots = humans > 0 ? Math.max(0, BOT_TARGET_BOTS) : 0;

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
    streak: 0,
    multiCount: 0,
    lastWreckAt: 0,
    lastWreckedById: null,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    gulagUntil: 0,
    spectatorUntil: 0,
    nextStyleScoreAt: 0,
    pendingStyle: 0,
    botPlan: null
  });
}

function respawnPlayer(player, options = {}) {
  // A voluntary reset (R) only unsticks the car: it keeps health and powerups so it is never a free heal.
  const kept = options.voluntary
    ? { health: player.health, shieldUntil: player.shieldUntil || 0, slamUntil: player.slamUntil || 0 }
    : { health: MAX_HEALTH, shieldUntil: 0, slamUntil: 0 };
  Object.assign(player, createSpawnState(player.id, player.name, player.color), {
    mode: "arena",
    ...kept,
    wreckedUntil: 0,
    gulagUntil: 0,
    spectatorUntil: 0,
    botPlan: null
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
  broadcastEvent(room, `${player.name} got sent to the Gulag by ${source?.name || "the arena"}.`, "danger");
  sendPlayerState(room, player);
}

function sendToSpectator(room, player, reason = "lost the Gulag", now = Date.now()) {
  player.mode = "spectator";
  player.health = 0;
  player.speed = 0;
  player.wreckedUntil = 0;
  player.gulagUntil = 0;
  player.shieldUntil = 0;
  player.slamUntil = 0;
  player.spectatorUntil = now + SPECTATOR_REDEPLOY_MS;
  send(player.ws, {
    type: "spectator-started",
    reason,
    redeployAt: player.spectatorUntil,
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
  const payload = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws && player.ws !== exceptWs && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(payload);
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
  return [...room.players.values()].sort(rankPlayers)[0] || null;
}

function buildStandings(room) {
  return [...room.players.values()]
    .sort(rankPlayers)
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

function addScore(room, player, points, now = Date.now()) {
  const base = Number(points) || 0;
  if (!player || base <= 0) return 0;
  const frenzy = isFinalFrenzy(room, now) ? 2 : 1;
  const value = player.isBot ? Math.floor(base * frenzy * BOT_SCORE_MULTIPLIER + Math.random()) : Math.round(base * frenzy);
  if (value <= 0) return 0;
  player.score = (player.score || 0) + value;
  return value;
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
  resetRoundState(room, now);
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

function awardStyle(room, player, points, reason, now) {
  const awarded = addScore(room, player, points, now);
  player.nextStyleScoreAt = now + STYLE_SCORE_COOLDOWN_MS;
  send(player.ws, {
    type: "style-awarded",
    reason,
    points: awarded,
    player: serializePlayer(player)
  });
  if (awarded >= 15) {
    broadcastEvent(room, `${player.name} cashed a ${awarded} pt ${reason}.`, "combo");
  }
}

// Pays held cashouts once the cooldown is over, or all of them when the clock runs out.
function flushPendingStyle(room, now, ignoreCooldown = false) {
  for (const player of room.players.values()) {
    if (!player.pendingStyle) continue;
    if (!ignoreCooldown && player.nextStyleScoreAt > now) continue;
    const points = player.pendingStyle;
    player.pendingStyle = 0;
    if (player.mode !== "arena" || player.health <= 0 || player.wreckedUntil > now) continue;
    awardStyle(room, player, points, player.pendingStyleReason || "style", now);
  }
}

function maybeFinishRound(room, now = Date.now()) {
  if (room.round.phase !== "live") {
    return;
  }
  if (now >= room.round.endsAt) {
    flushPendingStyle(room, now, true);
  }
  if (process.env.CRASH_CLUB_README_SAFE_ARENA === "1") {
    return;
  }
  const winnerByScore = [...room.players.values()].filter((player) => player.score >= ROUND_WIN_SCORE).sort(rankPlayers)[0];
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
  addScore(room, player, meta.score || 0, now);

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
  if (!player.isBot) {
    broadcastEvent(room, `${player.name} grabbed ${meta.label}.`, pickup.type);
  }
}

function damagePlayer(room, source, target, rawDamage, now = Date.now(), options = {}) {
  if (!target || target.mode !== "arena" || target.wreckedUntil > now || target.health <= 0 || room.round.phase !== "live") {
    return 0;
  }
  if (process.env.CRASH_CLUB_README_SAFE_ARENA === "1" && !target.isBot) {
    return 0;
  }

  if (!Number.isFinite(rawDamage) || rawDamage <= 0) {
    return 0;
  }

  const shielded = target.shieldUntil > now;
  const damage = Math.max(1, shielded ? Math.ceil(rawDamage * 0.35) : Math.round(rawDamage));
  const healthBefore = target.health;
  target.health = clamp(target.health - damage, 0, MAX_HEALTH);
  const dealt = healthBefore - target.health;
  const credited = source && source.id !== target.id ? source : null;
  if (credited) {
    credited.hits = (credited.hits || 0) + 1;
    addScore(room, credited, Math.max(1, Math.round(dealt / 8)), now);
  }

  broadcastRoom(room, {
    type: "player-damaged",
    sourceId: source?.id || null,
    targetId: target.id,
    damage: dealt,
    shielded,
    cause: options.cause || "ram",
    player: serializePlayer(target),
    source: credited ? serializePlayer(credited) : null
  });

  if (target.health <= 0) {
    handleWreck(room, credited, target, options.cause || "ram", now);
  }
  return dealt;
}

function handleWreck(room, source, target, cause, now) {
  const victimStreak = target.streak || 0;
  const bounty = victimStreak >= STREAK_BOUNTY_MIN ? Math.min(30, 4 + victimStreak * 4) : 0;
  const callouts = [];
  target.streak = 0;

  if (source) {
    source.wrecks = (source.wrecks || 0) + 1;
    source.streak = (source.streak || 0) + 1;
    source.multiCount = now - (source.lastWreckAt || 0) <= MULTI_WRECK_WINDOW_MS ? (source.multiCount || 0) + 1 : 1;
    source.lastWreckAt = now;
    let bonus = 8 + bounty;
    if (!room.firstBloodTaken) {
      room.firstBloodTaken = true;
      bonus += 5;
      callouts.push("FIRST BLOOD");
    }
    if (source.lastWreckedById === target.id) {
      bonus += 5;
      source.lastWreckedById = null;
      callouts.push("REVENGE");
    }
    if (bounty) callouts.push("STREAK SNAPPED");
    addScore(room, source, bonus, now);
  }
  target.lastWreckedById = source ? source.id : null;

  broadcastRoom(room, {
    type: "wreck",
    sourceId: source?.id || null,
    sourceName: source?.name || "the arena",
    targetId: target.id,
    targetName: target.name,
    cause,
    streak: source?.streak || 0,
    multi: source?.multiCount || 0,
    bounty,
    victimStreak,
    callouts,
    x: round2(target.x),
    y: round2(target.y),
    z: round2(target.z),
    color: target.color
  });

  if (source && STREAK_CALLOUTS[source.streak]) {
    broadcastEvent(room, `${source.name} ${STREAK_CALLOUTS[source.streak]}!`, "streak");
  }

  if (target.isBot) {
    target.wreckedUntil = now + WRECK_RESPAWN_MS;
    target.speed = 0;
    target.kx = 0;
    target.kz = 0;
    if (source) {
      broadcastEvent(room, `${source.name} wrecked ${target.name}!`, "danger");
    }
  } else {
    enterGulag(room, target, source, now);
  }
}

function chooseBotTarget(room, bot, now) {
  const livePickups = room.pickups.filter((pickup) => pickup.active);
  const others = arenaPlayers(room, now).filter((player) => player.id !== bot.id);
  const humans = others.filter((player) => !player.isBot);
  const roll = Math.random();
  bot.botNextDecisionAt = now + BOT_DECISION_MIN_MS + Math.random() * (BOT_DECISION_MAX_MS - BOT_DECISION_MIN_MS);

  if (!bot.botPlan && roll > 0.9) {
    const ramp = ARENA.ramps[Math.floor(Math.random() * ARENA.ramps.length)];
    const fx = Math.sin(ramp.angle);
    const fz = Math.cos(ramp.angle);
    const approach = ramp.length / 2 + 24;
    bot.botPlan = {
      stage: 0,
      expiresAt: now + 9000,
      approach: { x: ramp.x - fx * approach, z: ramp.z - fz * approach },
      exit: { x: ramp.x + fx * 50, z: ramp.z + fz * 50 }
    };
  }
  if (bot.botPlan) {
    bot.botTarget = bot.botPlan.stage === 0 ? bot.botPlan.approach : bot.botPlan.exit;
    return;
  }

  if (humans.length > 0 && roll < 0.52) {
    const target = humans[Math.floor(Math.random() * humans.length)];
    bot.botTarget = { x: target.x, z: target.z };
  } else if (others.length > 0 && roll < 0.68) {
    const target = others[Math.floor(Math.random() * others.length)];
    bot.botTarget = { x: target.x, z: target.z };
  } else if (livePickups.length > 0 && roll < 0.84) {
    const pickup = livePickups[Math.floor(Math.random() * livePickups.length)];
    bot.botTarget = { x: pickup.x, z: pickup.z };
  } else {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 70;
    bot.botTarget = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }
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

function resolveBotBodyCollisions(room, bot, now) {
  for (const target of room.players.values()) {
    if (target.id === bot.id || target.mode !== "arena" || target.wreckedUntil > now || target.health <= 0) {
      continue;
    }
    if (Math.abs((target.y || 0) - (bot.y || 0)) > 3) {
      continue;
    }
    const collision = getPlayerCollision(bot, target);
    if (!collision) {
      continue;
    }
    const push = Math.min(2.4, collision.penetration * 0.62 + 0.12);
    const nextX = bot.x + collision.nx * push;
    const nextZ = bot.z + collision.nz * push;
    if (ARENA.groundHeightAt(nextX, nextZ) - (bot.y || 0) > 1.6) {
      continue;
    }
    bot.x = nextX;
    bot.z = nextZ;
    bot.speed *= 0.74;
    bot.vx = Math.sin(bot.angle) * bot.speed;
    bot.vz = Math.cos(bot.angle) * bot.speed;
  }
}

function resolveBotStaticCollisions(bot) {
  for (const collider of ARENA.colliders) {
    if ((bot.y || 0) > collider.h) continue;
    const dx = bot.x - collider.x;
    const dz = bot.z - collider.z;
    const distance = Math.hypot(dx, dz);
    const min = collider.r + 2.4;
    if (distance > 0.001 && distance < min) {
      bot.x = collider.x + (dx / distance) * min;
      bot.z = collider.z + (dz / distance) * min;
      bot.speed *= 0.55;
      bot.kx *= 0.3;
      bot.kz *= 0.3;
      bot.botNextDecisionAt = 0;
    }
  }
}

function steerBotAroundRamp(bot, now) {
  if (now < (bot.botDetourUntil || 0)) return;
  let nearest = ARENA.ramps[0];
  for (const ramp of ARENA.ramps) {
    if (distanceSq2D(bot.x, bot.z, ramp.x, ramp.z) < distanceSq2D(bot.x, bot.z, nearest.x, nearest.z)) nearest = ramp;
  }
  const away = Math.atan2(bot.x - nearest.x, bot.z - nearest.z) + (Math.random() < 0.5 ? -0.9 : 0.9);
  bot.botTarget = {
    x: clamp(bot.x + Math.sin(away) * 28, -WORLD_SIZE + 10, WORLD_SIZE - 10),
    z: clamp(bot.z + Math.cos(away) * 28, -WORLD_SIZE + 10, WORLD_SIZE - 10)
  };
  bot.botPlan = null;
  bot.botDetourUntil = now + 1400;
  bot.botNextDecisionAt = now + 1400;
}

function updateBotVertical(bot, prevX, prevZ, deltaSeconds, now) {
  const ground = ARENA.groundHeightAt(bot.x, bot.z);
  const prevGround = ARENA.groundHeightAt(prevX, prevZ);
  if (bot.airborne) {
    const prevY = bot.y;
    bot.vy -= ARENA.GRAVITY * deltaSeconds;
    bot.y += bot.vy * deltaSeconds;
    bot.pitch = clamp(-bot.vy * 0.02, -0.45, 0.45);
    let landY = ground;
    if (ARENA.hitsRampFace(prevX, prevZ, bot.x, bot.z, 1, prevY, bot.y)) {
      // Flew into a ramp's tall face: bounce off it instead of popping onto the top.
      bot.x = prevX;
      bot.z = prevZ;
      bot.speed *= 0.4;
      bot.kx = (bot.kx || 0) * -0.3;
      bot.kz = (bot.kz || 0) * -0.3;
      landY = prevGround;
    }
    if (bot.y <= landY) {
      bot.y = landY;
      bot.vy = 0;
      bot.airborne = false;
      bot.pitch = 0;
    }
    return;
  }

  if (ground - bot.y > 1.6 && prevGround - bot.y > 1.6) {
    // Already inside a ramp body (shoved in): stand on the surface rather than staying trapped.
    bot.y = ground;
    bot.vy = 0;
    return;
  }
  // Sampled along the move, so fast climbs at low tick rates never hit a phantom wall.
  if (ARENA.hitsRampFace(prevX, prevZ, bot.x, bot.z, 1.6, bot.y, bot.y)) {
    if (!ARENA.hitsRampFace(prevX, prevZ, bot.x, prevZ, 1.6, bot.y, bot.y)) {
      bot.z = prevZ;
    } else if (!ARENA.hitsRampFace(prevX, prevZ, prevX, bot.z, 1.6, bot.y, bot.y)) {
      bot.x = prevX;
    } else {
      bot.x = prevX;
      bot.z = prevZ;
    }
    bot.speed *= 0.6;
    steerBotAroundRamp(bot, now);
    return;
  }
  if (ground < bot.y - 0.25) {
    bot.airborne = true;
    bot.vy = Math.max(0, bot.vy);
    return;
  }
  bot.vy = clamp((ground - bot.y) / Math.max(deltaSeconds, 0.001), 0, 40);
  bot.y = ground;
  bot.pitch = ground > 0.05 ? -0.22 : 0;

  const pad = ARENA.jumpPadAt(bot.x, bot.z);
  if (pad) {
    bot.vy = pad.power;
    bot.airborne = true;
    bot.y += 0.1;
  }
  const strip = ARENA.boostPadAt(bot.x, bot.z);
  if (strip) {
    // Strips push along their arrows. Bots heading against the arrow just cross, since their engine would
    // keep driving them back onto it and the push would compound into an oscillation.
    const facing = Math.cos(angleDelta(bot.angle, strip.angle));
    if (facing > 0.7) {
      bot.speed = Math.max(bot.speed, strip.speed);
    } else if (facing > -0.3) {
      const dirX = Math.sin(strip.angle);
      const dirZ = Math.cos(strip.angle);
      const knockAlong = (bot.kx || 0) * dirX + (bot.kz || 0) * dirZ;
      if (knockAlong < strip.speed) {
        const add = strip.speed - Math.max(0, knockAlong);
        bot.kx = (bot.kx || 0) + dirX * add;
        bot.kz = (bot.kz || 0) + dirZ * add;
      }
    }
  }
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
      bot.vx = 0;
      bot.vz = 0;
      continue;
    }

    if (bot.botPlan) {
      const goal = bot.botPlan.stage === 0 ? bot.botPlan.approach : bot.botPlan.exit;
      if (now > bot.botPlan.expiresAt) {
        bot.botPlan = null;
      } else if (distanceSq2D(bot.x, bot.z, goal.x, goal.z) < 7 * 7) {
        if (bot.botPlan.stage === 0) {
          bot.botPlan.stage = 1;
          bot.botTarget = bot.botPlan.exit;
        } else {
          bot.botPlan = null;
          bot.botNextDecisionAt = 0;
        }
      }
    }

    if (!bot.botTarget || now >= bot.botNextDecisionAt) {
      chooseBotTarget(room, bot, now);
    }

    const prevX = bot.x;
    const prevZ = bot.z;
    const dx = bot.botTarget.x - bot.x;
    const dz = bot.botTarget.z - bot.z;
    const targetDistance = Math.hypot(dx, dz);
    const botSeed = numberFromId(bot.id);
    const personality = 0.9 + (botSeed % 7) * 0.035;
    const weave = bot.botPlan ? 0 : Math.sin(now * 0.0017 + botSeed) * 0.085;
    const desiredAngle = Math.atan2(dx, dz) + weave;
    const turnSpeed = (2.7 + personality * 0.55) * deltaSeconds * (bot.airborne ? 0.15 : 1);
    const turn = clamp(angleDelta(bot.angle, desiredAngle), -turnSpeed, turnSpeed);
    bot.angle += turn;
    const speedLimit = 35 + (botSeed % 6) * 1.8 + Math.sin(now * 0.0012 + botSeed) * 3 + (bot.botPlan ? 8 : 0);
    const acceleration = targetDistance > 7 ? 48 * personality : -56;
    if (!bot.airborne) {
      if (bot.speed > speedLimit) {
        bot.speed = Math.max(speedLimit, bot.speed - 24 * deltaSeconds);
      } else {
        bot.speed = clamp(bot.speed + acceleration * deltaSeconds, targetDistance > 7 ? 11 : 0, speedLimit);
      }
    }
    bot.boosting = bot.speed > speedLimit + 2 || Boolean(bot.botPlan && bot.botPlan.stage === 1);
    const knockDecay = Math.exp(-2.6 * deltaSeconds);
    bot.kx = (bot.kx || 0) * knockDecay;
    bot.kz = (bot.kz || 0) * knockDecay;
    bot.vx = Math.sin(bot.angle) * bot.speed + bot.kx;
    bot.vz = Math.cos(bot.angle) * bot.speed + bot.kz;
    bot.x += bot.vx * deltaSeconds;
    bot.z += bot.vz * deltaSeconds;
    bot.x = clamp(bot.x, -WORLD_SIZE, WORLD_SIZE);
    bot.z = clamp(bot.z, -WORLD_SIZE, WORLD_SIZE);
    updateBotVertical(bot, prevX, prevZ, deltaSeconds, now);
    resolveBotStaticCollisions(bot);
    bot.inZone = !bot.airborne && isInRing(bot.x, bot.z);
    resolveBotBodyCollisions(room, bot, now);

    if (targetDistance < 5 && !bot.botPlan) {
      bot.botNextDecisionAt = 0;
    }

    if (now >= (bot.botNextPickupCheckAt || 0)) {
      bot.botNextPickupCheckAt = now + 520;
      for (const pickup of room.pickups) {
        if (pickup.active && (bot.y || 0) < 8 && Math.hypot(bot.x - pickup.x, bot.z - pickup.z) < 4.6) {
          collectPickupFor(bot, pickup, room, now);
          break;
        }
      }
    }

    if (now < bot.botNextHitAt) {
      continue;
    }

    for (const target of room.players.values()) {
      if (target.id === bot.id || target.mode !== "arena" || target.wreckedUntil > now || target.health <= 0) {
        continue;
      }
      const verticalGap = (bot.y || 0) - (target.y || 0);
      const stomp = bot.airborne && bot.vy < -4 && verticalGap > 0.6 && verticalGap < 5;
      if (!stomp && Math.abs(verticalGap) > 3) {
        continue;
      }

      const collision = getPlayerCollision(bot, target, stomp ? 1.2 : 0.35);
      if (collision && (bot.speed > 13 || stomp)) {
        const closingSpeed = Math.max(bot.speed, getRelativeClosingSpeed(bot, target, collision));
        const damage = stomp ? STOMP_DAMAGE : Math.round(clamp(closingSpeed / 38, 0.32, 1.08) * 23);
        damagePlayer(room, bot, target, damage, now, { cause: stomp ? "stomp" : "ram" });
        broadcastRoom(room, {
          type: "impact",
          sourceId: bot.id,
          targetId: target.id,
          impulse: clamp(bot.speed / 34, 0.25, 1.18),
          slam: false,
          stomp
        });
        if (stomp) {
          bot.vy = 16;
          bot.airborne = true;
        }
        bot.botNextHitAt = now + BOT_HIT_COOLDOWN_MS;
        break;
      }
    }
  }
}

function serveFile(req, res) {
  try {
    serveRequest(req, res);
  } catch (error) {
    console.error("HTTP request failed", error);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
}

function serveRequest(req, res) {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, "http://localhost");
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }
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
const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });

function resetIdleRoom(room, now) {
  // The round clock kept running while nobody was here; start the next human on a fresh round.
  resetRoundState(room, now);
  room.idleSince = 0;
}

wss.on("connection", (ws) => {
  let player = null;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

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
    if (!msg || typeof msg !== "object") {
      return;
    }
    try {
      if (msg.type === "join") {
        if (player) {
          return;
        }

        const room = getRoom(msg.room);
        if (room.idleSince && humanCount(room) === 0) {
          resetIdleRoom(room, Date.now());
        }
        const id = String(nextPlayerId++);
        const color = toText(msg.color, "");
        player = {
          id,
          roomCode: room.code,
          ws,
          mode: "arena",
          score: 0,
          health: MAX_HEALTH,
          wrecks: 0,
          streak: 0,
          shieldUntil: 0,
          slamUntil: 0,
          wreckedUntil: 0,
          nextStyleScoreAt: 0,
          nextHitAt: 0,
          nextRespawnAt: 0,
          lastStateAt: 0,
          ...createSpawnState(id, msg.name, /^#[0-9a-f]{6}$/i.test(color) ? color : null)
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
        player.x = clamp(toNumber(msg.x, player.x), -WORLD_SIZE, WORLD_SIZE);
        player.y = clamp(toNumber(msg.y, player.y), 0, 90);
        player.z = clamp(toNumber(msg.z, player.z), -WORLD_SIZE, WORLD_SIZE);
        player.angle = normalizeAngle(toNumber(msg.angle, player.angle || 0));
        player.speed = clamp(toNumber(msg.speed, 0), -25, 110);
        player.vx = clamp(toNumber(msg.vx, 0), -110, 110);
        player.vz = clamp(toNumber(msg.vz, 0), -110, 110);
        player.pitch = clamp(toNumber(msg.pitch, 0), -40, 40);
        player.roll = clamp(toNumber(msg.roll, 0), -40, 40);
        player.boosting = Boolean(msg.boosting);
        player.airborne = Boolean(msg.airborne);
        player.lastStateAt = Date.now();
        return;
      }

      if (msg.type === "rename") {
        player.name = (toText(msg.name, "") || player.name).slice(0, 18);
        broadcastRoom(room, {
          type: "player-renamed",
          id: player.id,
          name: player.name
        });
        return;
      }

      if (msg.type === "respawn") {
        const now = Date.now();
        if (room.round.phase !== "live") {
          return;
        }
        if (player.mode !== "arena") {
          send(ws, {
            type: "event",
            text: player.mode === "gulag" ? "Win the Gulag to respawn." : "Spectators redeploy automatically. Hang tight.",
            tone: "danger"
          });
          return;
        }
        if ((player.nextRespawnAt || 0) > now) {
          return;
        }
        player.nextRespawnAt = now + RESPAWN_COOLDOWN_MS;
        respawnPlayer(player, { voluntary: true });
        send(ws, {
          type: "respawned",
          player: serializePlayer(player)
        });
        broadcastEvent(room, `${player.name} respawned.`, "info");
        return;
      }

      if (msg.type === "pickup-collected") {
        const pickup = room.pickups.find((entry) => entry.id === msg.pickupId);
        if (!pickup) {
          return;
        }
        if (room.round.phase !== "live" || player.mode !== "arena" || !pickup.active) {
          // The client hid it optimistically; tell it the real state so it does not stay invisible.
          send(ws, { type: "pickup-state", pickupId: pickup.id, active: pickup.active });
          return;
        }
        collectPickupFor(player, pickup, room, Date.now());
        return;
      }

      if (msg.type === "hit") {
        const now = Date.now();
        if (room.round.phase !== "live" || player.mode !== "arena" || player.wreckedUntil > now || (player.nextHitAt || 0) > now) {
          return;
        }
        const impulse = clamp(toNumber(msg.impulse, 0), 0, 1.8);
        const target = room.players.get(toText(msg.targetId, ""));
        if (!target || target.id === player.id || target.mode !== "arena") {
          return;
        }
        const slamReady = player.slamUntil > now;
        // The last state can be a few frames old while falling fast, so take the height sent with the hit
        // when it is within what the car could have fallen or climbed since that state.
        const stateAge = clamp((now - (player.lastStateAt || now)) / 1000, 0, 0.3);
        const reportedY = toNumber(msg.y, NaN);
        const attackerY =
          Number.isFinite(reportedY) && Math.abs(reportedY - (player.y || 0)) <= stateAge * 60 + 0.5 ? reportedY : player.y || 0;
        const verticalGap = attackerY - (target.y || 0);
        // A stomp needs the server's own view of the attacker falling from above, not just the client's claim.
        const stomp = Boolean(msg.stomp) && player.airborne && verticalGap > 0.6 && verticalGap < 6;
        const verticalOk = stomp || Math.abs(verticalGap) < 4.5;
        const collision = verticalOk ? getPlayerCollision(player, target, HIT_LAG_ALLOWANCE + (stomp ? 1.4 : 0)) : null;
        if (!collision) {
          return;
        }
        player.nextHitAt = now + HUMAN_HIT_COOLDOWN_MS;
        // The attacker hit the target where its client drew it, which lags the server's copy; like bot rams,
        // the attacker's own reported speed is a floor so a skewed normal does not zero out a real hit.
        const closingSpeed = Math.max(
          getRelativeClosingSpeed(player, target, collision),
          Math.hypot(player.vx || 0, player.vz || 0) * 0.9
        );
        const validatedImpulse = clamp(Math.min(impulse, closingSpeed / 38 + 0.5), 0, slamReady ? 1.9 : 1.55);
        let damage = Math.round(validatedImpulse * (slamReady ? 38 : 24));
        if (stomp) damage = Math.max(damage, STOMP_DAMAGE);
        if (slamReady) {
          player.slamUntil = 0;
        }
        if (damage > 4) {
          damagePlayer(room, player, target, damage, now, { cause: stomp ? "stomp" : slamReady ? "slam" : "ram" });
        }
        broadcastRoom(room, {
          type: "impact",
          sourceId: player.id,
          targetId: target.id,
          impulse: validatedImpulse || impulse,
          slam: slamReady,
          stomp
        });
        maybeFinishRound(room, now);
        return;
      }

      if (msg.type === "style-score") {
        const now = Date.now();
        if (room.round.phase !== "live" || player.mode !== "arena" || player.health <= 0 || player.wreckedUntil > now) {
          return;
        }
        const points = clamp(Math.round(toNumber(msg.points, 1)), 1, STYLE_SCORE_MAX);
        const reason = (toText(msg.reason, "") || "style").replace(/[^a-z0-9 -]/gi, "").slice(0, 24) || "style";
        if (player.nextStyleScoreAt && player.nextStyleScoreAt > now) {
          // Back-to-back cashouts (common right before the round ends) are held, not dropped. The hold is
          // capped at one cashout, so the cooldown still limits the rate.
          player.pendingStyle = Math.min(STYLE_SCORE_MAX, (player.pendingStyle || 0) + points);
          player.pendingStyleReason = reason;
          return;
        }
        awardStyle(room, player, points, reason, now);
        maybeFinishRound(room, now);
        return;
      }

      if (msg.type === "gulag-result") {
        const now = Date.now();
        if (player.mode !== "gulag" || room.round.phase !== "live") {
          return;
        }
        if (msg.result === "win" && player.gulagUntil >= now) {
          respawnPlayer(player);
          addScore(room, player, 6, now);
          send(ws, {
            type: "gulag-ended",
            result: "win",
            player: serializePlayer(player)
          });
          sendPlayerState(room, player, "respawned");
          broadcastEvent(room, `${player.name} won the Gulag and redeployed!`, "start");
        } else {
          sendToSpectator(room, player, msg.result === "timeout" ? "timed out in the Gulag" : "lost the Gulag", now);
        }
        maybeFinishRound(room, now);
      }
    } catch (error) {
      console.error("Client message failed", error);
    }
  });

  const leave = () => {
    removePlayer(player);
    const room = player?.roomCode ? rooms.get(player.roomCode) : null;
    if (room) {
      ensureBots(room);
      if (humanCount(room) === 0 && !room.idleSince) room.idleSince = Date.now();
    }
  };
  ws.on("close", leave);
  ws.on("error", leave);
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

function shutdown(signal) {
  console.log(`Crash Club received ${signal}. Closing server...`);
  clearInterval(heartbeat);
  for (const ws of wss.clients) {
    try {
      ws.close(1001, "Server restarting");
    } catch {
      ws.terminate();
    }
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// Last line of defence: one bad request or packet should never take every room down with it.
process.on("uncaughtException", (error) => console.error("Uncaught exception", error));
process.on("unhandledRejection", (error) => console.error("Unhandled rejection", error));

setInterval(() => {
  cleanupRooms();
  const now = Date.now();
  const deltaSeconds = 1 / TICK_RATE;

  for (const room of rooms.values()) {
    try {
      tickRoom(room, now, deltaSeconds);
    } catch (error) {
      console.error(`Room ${room.code} tick failed`, error);
    }
  }
}, 1000 / TICK_RATE);

function tickRoom(room, now, deltaSeconds) {
  ensureBots(room);

  if (humanCount(room) === 0) {
    return;
  }

  if (room.round.phase === "live") {
    flushPendingStyle(room, now);
    updateBots(room, now, deltaSeconds);
  }

  if (room.round.phase === "intermission" && now >= room.round.nextRoundAt) {
    startNextRound(room, now);
  }

  for (const player of room.players.values()) {
    if (player.mode === "gulag" && player.gulagUntil > 0 && player.gulagUntil <= now && room.round.phase === "live") {
      sendToSpectator(room, player, "timed out in the Gulag", now);
      continue;
    }

    if (player.mode === "spectator" && player.spectatorUntil > 0 && player.spectatorUntil <= now && room.round.phase === "live") {
      respawnPlayer(player);
      send(player.ws, {
        type: "respawned",
        reason: "redeploy",
        player: serializePlayer(player)
      });
      broadcastEvent(room, `${player.name} is back from the dead.`, "start");
      continue;
    }

    if (player.isBot && player.wreckedUntil > 0 && player.wreckedUntil <= now) {
      respawnPlayer(player);
      broadcastRoom(room, {
        type: "player-updated",
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
  if (now - (room.lastSnapshotAt || 0) >= 1000 / SNAPSHOT_RATE) {
    room.lastSnapshotAt = now;
    broadcastSnapshot(room, now);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    try {
      scoreRing(room, now);
    } catch (error) {
      console.error(`Room ${room.code} ring scoring failed`, error);
    }
  }
}, SCORE_TICK_MS);

function scoreRing(room, now) {
  if (room.round.phase !== "live") {
    return;
  }
  let scored = false;
  for (const player of room.players.values()) {
    if (player.mode !== "arena" || player.health <= 0) continue;
    // Humans get a little latency slack, and only count while their client is still reporting.
    const inZone = player.isBot
      ? player.inZone
      : now - (player.lastStateAt || 0) < STATE_STALE_MS && !player.airborne && isInRing(player.x, player.z, 1.5);
    if (inZone) {
      addScore(room, player, RING_POINTS, now);
      scored = true;
    }
  }

  if (scored) {
    maybeFinishRound(room, now);
    if (now - (room.lastSnapshotAt || 0) >= 1000 / SNAPSHOT_RATE) {
      room.lastSnapshotAt = now;
      broadcastSnapshot(room, now);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Crash Club server running on http://localhost:${PORT}`);
});
