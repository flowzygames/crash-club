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
const CRATE_RESPAWN_MS = 7000;
const LOOT_STORM_RESPAWN_MS = 1400;
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
const FIRST_EVENT_DELAY_MS = Number(process.env.CRASH_CLUB_FIRST_EVENT_MS || 20000);
const FORCED_EVENT = process.env.CRASH_CLUB_FORCE_EVENT || "";
const FORCED_WEAPON = process.env.CRASH_CLUB_FORCE_WEAPON || "";
const EVENT_GAP_MIN_MS = 11000;
const EVENT_GAP_MAX_MS = 18000;
const STREAK_BOUNTY_MIN = 3;
const MULTI_WRECK_WINDOW_MS = 4500;
const BOMB_FUSE_MS = 20000;
const BOMB_PASS_LOCK_MS = 900;
const MAX_MINES = 18;
const BLACKHOLE_PULL_RADIUS = 46;
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
  },
  crate: {
    label: "Mystery Crate",
    color: "#c084fc",
    score: 1
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
  { id: "slam-center-west", type: "slam", x: -28, z: -28 },
  { id: "crate-ring-north", type: "crate", x: -9, z: -34 },
  { id: "crate-ring-south", type: "crate", x: 9, z: 34 },
  { id: "crate-ring-east", type: "crate", x: 34, z: -9 },
  { id: "crate-ring-west", type: "crate", x: -34, z: 9 },
  { id: "crate-corner-northwest", type: "crate", x: -80, z: 80 },
  { id: "crate-corner-southeast", type: "crate", x: 80, z: -80 },
  { id: "crate-lane-north", type: "crate", x: -30, z: -70 },
  { id: "crate-lane-south", type: "crate", x: 30, z: 70 }
];

const WEAPONS = {
  rocket: { label: "Homing Rockets", charges: 3, cooldownMs: 420 },
  mine: { label: "Prox Mines", charges: 3, cooldownMs: 360 },
  shockwave: { label: "Shockwave", charges: 1, cooldownMs: 0 },
  blackhole: { label: "Black Hole", charges: 1, cooldownMs: 0 }
};
const WEAPON_WEIGHTS = [
  ["rocket", 40],
  ["mine", 26],
  ["shockwave", 20],
  ["blackhole", 14]
];

const EXPLOSIONS = {
  rocket: { radius: 9, damage: 24, force: 30, lift: 13 },
  mine: { radius: 10, damage: 30, force: 26, lift: 19 },
  shockwave: { radius: 19, damage: 18, force: 50, lift: 11 },
  blackhole: { radius: 17, damage: 36, force: 62, lift: 24 },
  meteor: { radius: 11, damage: 32, force: 40, lift: 18 },
  bomb: { radius: 18, damage: 40, force: 70, lift: 28 }
};

const CHAOS_EVENTS = {
  meteors: { name: "METEOR SHOWER", tagline: "Watch the red circles. The sky is falling.", durationMs: 18000 },
  lowgrav: { name: "MOON GRAVITY", tagline: "Gravity is optional. Hit a ramp.", durationMs: 20000 },
  ice: { name: "BLACK ICE", tagline: "Zero grip. Pure drift.", durationMs: 18000 },
  bomb: { name: "HOT POTATO", tagline: "Someone has the bomb. Ram a rival to pass it.", durationMs: BOMB_FUSE_MS + 1500, minPlayers: 2 },
  ringrush: { name: "RING RUSH", tagline: "The ring is on the move. Triple points.", durationMs: 22000 },
  nitro: { name: "NITRO FRENZY", tagline: "Infinite boost. Overclocked engines.", durationMs: 15000 },
  bounty: { name: "BOUNTY HUNT", tagline: "Wreck the leader for +25.", durationMs: 20000, minPlayers: 2 },
  lootstorm: { name: "LOOT STORM", tagline: "Crates respawn instantly. Arm up.", durationMs: 16000 }
};
const FINAL_FRENZY = { name: "FINAL FRENZY", tagline: "Double points. Meteors. No mercy." };

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

const WORLD_SOURCES = {
  meteor: { id: "world-meteor", name: "a meteor", isWorld: true },
  bomb: { id: "world-bomb", name: "the bomb", isWorld: true }
};

const publicDir = path.join(__dirname, "public");
const rooms = new Map();
let nextPlayerId = 1;
let nextBotId = 1;
let nextEntityId = 1;

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

function isLive(player, now = Date.now()) {
  return Boolean(player) && player.mode === "arena" && player.health > 0 && !(player.wreckedUntil > now);
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

function resetChaos(room, now = Date.now()) {
  room.event = null;
  room.nextEventAt = now + FIRST_EVENT_DELAY_MS;
  room.recentEvents = room.recentEvents || [];
  room.projectiles = [];
  room.hazards = [];
  room.firstBloodTaken = false;
}

function createRoom(code) {
  const now = Date.now();
  const room = {
    code,
    players: new Map(),
    pickups: createPickups(),
    round: createRoundState(now),
    createdAt: now,
    lastActiveAt: now,
    lastSnapshotAt: 0,
    recentEvents: []
  };
  resetChaos(room, now);
  return room;
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

function getRing(room, now = Date.now()) {
  if (room.event?.kind === "ringrush") {
    const point = ARENA.ringPathAt((now - room.event.startedAt) / 1000);
    return { x: point.x, z: point.z, min: ARENA.RING.min, max: ARENA.RING.max, mult: 3 };
  }
  return { x: ARENA.RING.x, z: ARENA.RING.z, min: ARENA.RING.min, max: ARENA.RING.max, mult: 1 };
}

function isInRing(ring, x, z) {
  const dist = Math.hypot(x - ring.x, z - ring.z);
  return dist >= ring.min && dist <= ring.max;
}

function serializeEvent(event) {
  if (!event) return null;
  return {
    kind: event.kind,
    name: event.name,
    tagline: event.tagline,
    startedAt: event.startedAt,
    endsAt: event.endsAt,
    holderId: event.holderId || null,
    fuseEndsAt: event.fuseEndsAt || 0,
    targetId: event.targetId || null
  };
}

function serializeRoom(room, now = Date.now()) {
  const ring = getRing(room, now);
  return {
    phase: room.round.phase,
    round: room.round.round,
    endsAt: room.round.endsAt,
    nextRoundAt: room.round.nextRoundAt,
    winner: room.round.winner,
    standings: room.round.standings || [],
    now,
    version: GAME_VERSION,
    targetScore: ROUND_WIN_SCORE,
    event: serializeEvent(room.event),
    ring: { x: round2(ring.x), z: round2(ring.z), min: ring.min, max: ring.max, mult: ring.mult }
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
    weapon: player.weapon || null,
    weaponCharges: player.weaponCharges || 0,
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

function serializeProjectile(projectile, now = Date.now()) {
  return {
    id: projectile.id,
    kind: projectile.kind,
    ownerId: projectile.ownerId,
    x: round2(projectile.x),
    y: round2(projectile.y),
    z: round2(projectile.z),
    vx: round2(projectile.vx || 0),
    vz: round2(projectile.vz || 0),
    angle: round2(projectile.angle || 0),
    phase: projectile.phase || "flying",
    armed: projectile.armedAt ? now >= projectile.armedAt : true,
    collapseAt: projectile.collapseAt || 0
  };
}

function serializeHazard(hazard) {
  return {
    id: hazard.id,
    kind: hazard.kind,
    x: round2(hazard.x),
    y: round2(hazard.y || 0),
    z: round2(hazard.z),
    spawnedAt: hazard.spawnedAt,
    impactAt: hazard.impactAt
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
    weapon: null,
    weaponCharges: 0,
    shieldUntil: 0,
    slamUntil: 0,
    wreckedUntil: 0,
    nextStyleScoreAt: 0,
    botTarget: { x: 0, z: 0 },
    botPlan: null,
    botNextDecisionAt: 0,
    botNextHitAt: 0,
    botNextPickupCheckAt: 0,
    botNextWeaponAt: 0,
    botWeaponSince: 0,
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
    weapon: null,
    weaponCharges: 0,
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
    players: [...room.players.values()].map(serializePlayer),
    projectiles: room.projectiles.map((projectile) => serializeProjectile(projectile, now)),
    hazards: room.hazards.map(serializeHazard)
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

function addScore(room, player, points) {
  const base = Number(points) || 0;
  if (!player || player.isWorld || base <= 0) return 0;
  const frenzy = room?.event?.kind === "frenzy" ? 2 : 1;
  const value = player.isBot ? Math.floor(base * frenzy * BOT_SCORE_MULTIPLIER + Math.random()) : Math.round(base * frenzy);
  if (value <= 0) return 0;
  player.score = (player.score || 0) + value;
  return value;
}

function finishRound(room, winner, now = Date.now()) {
  if (room.round.phase === "intermission") {
    return;
  }
  endChaosEvent(room, now, { silent: true });
  room.projectiles = [];
  room.hazards = [];
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
  resetChaos(room, now);
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
  const awarded = addScore(room, player, points);
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

function rollWeapon() {
  if (WEAPONS[FORCED_WEAPON]) return FORCED_WEAPON;
  const total = WEAPON_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of WEAPON_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return WEAPON_WEIGHTS[0][0];
}

function applyPickup(player, pickup, room, now = Date.now()) {
  const meta = PICKUP_TYPES[pickup.type] || PICKUP_TYPES.boost;
  addScore(room, player, meta.score || 0);

  if (pickup.type === "repair") {
    player.health = clamp(player.health + meta.heal, 0, MAX_HEALTH);
  }
  if (pickup.type === "shield") {
    player.shieldUntil = now + SHIELD_DURATION_MS;
  }
  if (pickup.type === "slam") {
    player.slamUntil = now + SLAM_DURATION_MS;
  }
  if (pickup.type === "crate") {
    player.weapon = rollWeapon();
    player.weaponCharges = WEAPONS[player.weapon].charges;
    player.botWeaponSince = now;
  }

  send(player.ws, {
    type: "pickup-awarded",
    pickup: serializePickup(pickup),
    player: serializePlayer(player),
    weapon: pickup.type === "crate" ? player.weapon : null,
    expiresAt: pickup.type === "shield" ? player.shieldUntil : player.slamUntil
  });
  if (!player.isBot && pickup.type !== "crate") {
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

  const shielded = target.shieldUntil > now && !options.unblockable;
  const damage = Math.max(1, shielded ? Math.ceil(rawDamage * 0.35) : Math.round(rawDamage));
  const healthBefore = target.health;
  target.health = clamp(target.health - damage, 0, MAX_HEALTH);
  const dealt = healthBefore - target.health;
  const credited = source && !source.isWorld && source.id !== target.id ? source : null;
  if (credited) {
    credited.hits = (credited.hits || 0) + 1;
    let points = Math.max(1, Math.round(dealt / 8));
    if (room.event?.kind === "bounty" && room.event.targetId === target.id) points *= 2;
    addScore(room, credited, points);
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
    handleWreck(room, credited, target, options.cause || "ram", now, source);
  }
  return dealt;
}

function handleWreck(room, source, target, cause, now, rawSource) {
  const victimStreak = target.streak || 0;
  const bounty = victimStreak >= STREAK_BOUNTY_MIN ? Math.min(30, 4 + victimStreak * 4) : 0;
  const callouts = [];
  target.streak = 0;
  target.weapon = null;
  target.weaponCharges = 0;

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
    if (room.event?.kind === "bounty" && room.event.targetId === target.id) {
      bonus += 25;
      callouts.push("BOUNTY CLAIMED");
    }
    if (bounty) callouts.push("STREAK SNAPPED");
    addScore(room, source, bonus);
  }
  target.lastWreckedById = source ? source.id : null;

  broadcastRoom(room, {
    type: "wreck",
    sourceId: source?.id || rawSource?.id || null,
    sourceName: source?.name || rawSource?.name || "the arena",
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

  if (room.event?.kind === "bomb" && room.event.holderId === target.id && cause !== "bomb") {
    const heir = isLive(source, now) ? source : null;
    assignBomb(room, heir, now, heir ? `${heir.name} wrecked the bomb carrier and caught the bomb!` : null);
  }
  if (room.event?.kind === "bounty" && room.event.targetId === target.id) {
    endChaosEvent(room, now);
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
    enterGulag(room, target, source || rawSource, now);
  }
}

// Humans report their position every ~80ms; project it forward so blast checks match where the car really is.
// A stalled stream (hidden tab, hitch) is not projected: everyone sees that car frozen where it last reported.
function effectivePosition(player, now) {
  if (player.isBot) return player;
  const age = now - (player.lastStateAt || now);
  const staleness = age > 250 ? 0 : clamp(age / 1000, 0, 0.12);
  return { x: player.x + (player.vx || 0) * staleness, y: player.y || 0, z: player.z + (player.vz || 0) * staleness };
}

function explode(room, options, now = Date.now()) {
  const spec = EXPLOSIONS[options.kind] || EXPLOSIONS.rocket;
  const radius = options.radius || spec.radius;
  const x = options.x;
  const y = options.y || 0;
  const z = options.z;
  const source = options.source || null;
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return;
  const id = `fx-${nextEntityId++}`;

  const caught = [];
  for (const target of arenaPlayers(room, now)) {
    if (options.excludeId && target.id === options.excludeId) continue;
    const position = effectivePosition(target, now);
    const dx = position.x - x;
    const dz = position.z - z;
    const dy = ((position.y || 0) - y) * 0.6;
    const distance = Math.sqrt(dx * dx + dz * dz + dy * dy);
    if (distance > radius) continue;
    caught.push({ target, dx, dz, falloff: 1 - distance / radius });
  }

  // The server decides who was caught, so a client knocks itself back only when it also takes the damage.
  const hits = {};
  for (const { target, falloff } of caught) hits[target.id] = round2(falloff);
  broadcastRoom(room, {
    type: "explosion",
    id,
    kind: options.kind,
    x: round2(x),
    y: round2(y),
    z: round2(z),
    radius,
    force: spec.force,
    lift: spec.lift,
    sourceId: source?.id || null,
    excludeId: options.excludeId || null,
    hits
  });

  for (const { target, dx, dz, falloff } of caught) {
    damagePlayer(room, source, target, spec.damage * (0.35 + 0.65 * falloff), now, { cause: options.kind });
    if (target.isBot && target.mode === "arena") {
      const flat = Math.hypot(dx, dz) || 1;
      target.kx = (target.kx || 0) + (dx / flat) * spec.force * falloff;
      target.kz = (target.kz || 0) + (dz / flat) * spec.force * falloff;
      target.vy = Math.max(target.vy || 0, spec.lift * (0.4 + falloff * 0.6));
      target.airborne = true;
      target.y = (target.y || 0) + 0.05;
    }
  }
  maybeFinishRound(room, now);
}

function forwardOf(player) {
  return { x: Math.sin(player.angle || 0), z: Math.cos(player.angle || 0) };
}

function pickRocketTarget(room, owner, origin, angle, now) {
  const fx = Math.sin(angle);
  const fz = Math.cos(angle);
  let best = null;
  let bestScore = Infinity;
  for (const target of arenaPlayers(room, now)) {
    if (target.id === owner.id) continue;
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 110 || distance < 0.1) continue;
    const dot = (dx * fx + dz * fz) / distance;
    if (dot < 0.42) continue;
    const score = distance * (1.6 - dot);
    if (score < bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

function spawnProjectile(room, projectile) {
  room.projectiles.push(projectile);
  broadcastRoom(room, {
    type: "projectile-spawned",
    projectile: serializeProjectile(projectile)
  });
}

function removeProjectile(room, projectile) {
  const index = room.projectiles.indexOf(projectile);
  if (index >= 0) room.projectiles.splice(index, 1);
  broadcastRoom(room, {
    type: "projectile-removed",
    id: projectile.id
  });
}

function fireWeapon(room, player, now = Date.now()) {
  const weapon = WEAPONS[player.weapon];
  if (!weapon || (player.weaponCharges || 0) <= 0 || now < (player.nextFireAt || 0)) return false;
  player.weaponCharges -= 1;
  player.nextFireAt = now + weapon.cooldownMs;
  const kind = player.weapon;
  if (player.weaponCharges <= 0) {
    player.weapon = null;
    player.weaponCharges = 0;
  }

  const forward = forwardOf(player);
  const baseY = player.y || 0;
  if (kind === "rocket") {
    const origin = { x: player.x + forward.x * 4.2, z: player.z + forward.z * 4.2 };
    const target = pickRocketTarget(room, player, origin, player.angle || 0, now);
    const speed = 92;
    spawnProjectile(room, {
      id: `p-${nextEntityId++}`,
      kind,
      ownerId: player.id,
      x: origin.x,
      y: baseY + 1.5,
      z: origin.z,
      angle: player.angle || 0,
      speed,
      vx: forward.x * speed,
      vz: forward.z * speed,
      targetId: target?.id || null,
      bornAt: now,
      expiresAt: now + 2800
    });
  } else if (kind === "mine") {
    const mines = room.projectiles.filter((projectile) => projectile.kind === "mine");
    if (mines.length >= MAX_MINES) removeProjectile(room, mines[0]);
    const x = clamp(player.x - forward.x * 5.2, -WORLD_SIZE, WORLD_SIZE);
    const z = clamp(player.z - forward.z * 5.2, -WORLD_SIZE, WORLD_SIZE);
    spawnProjectile(room, {
      id: `p-${nextEntityId++}`,
      kind,
      ownerId: player.id,
      x,
      y: ARENA.groundHeightAt(x, z) + 0.3,
      z,
      angle: player.angle || 0,
      bornAt: now,
      armedAt: now + 700,
      ownerSafeUntil: now + 1800,
      expiresAt: now + 25000
    });
  } else if (kind === "shockwave") {
    explode(room, { kind, x: player.x, y: baseY, z: player.z, source: player, excludeId: player.id }, now);
  } else if (kind === "blackhole") {
    const speed = 48;
    spawnProjectile(room, {
      id: `p-${nextEntityId++}`,
      kind,
      ownerId: player.id,
      x: player.x + forward.x * 6,
      y: baseY + 2.6,
      z: player.z + forward.z * 6,
      angle: player.angle || 0,
      vx: forward.x * speed + (player.vx || 0) * 0.3,
      vz: forward.z * speed + (player.vz || 0) * 0.3,
      phase: "flying",
      bornAt: now,
      stopAt: now + 650,
      collapseAt: now + 650 + 3600
    });
  }

  broadcastRoom(room, {
    type: "weapon-fired",
    playerId: player.id,
    kind,
    player: serializePlayer(player)
  });
  return true;
}

function updateProjectiles(room, now, deltaSeconds) {
  if (!room.projectiles.length) return;
  const cars = arenaPlayers(room, now);
  for (const projectile of [...room.projectiles]) {
    if (room.round.phase !== "live") return;
    const owner = room.players.get(projectile.ownerId) || null;

    if (projectile.kind === "rocket") {
      const target = projectile.targetId ? room.players.get(projectile.targetId) : null;
      if (target && target.mode === "arena" && target.health > 0 && !(target.wreckedUntil > now)) {
        const desired = Math.atan2(target.x - projectile.x, target.z - projectile.z);
        const turn = clamp(angleDelta(projectile.angle, desired), -3.4 * deltaSeconds, 3.4 * deltaSeconds);
        projectile.angle += turn;
        const targetY = (target.y || 0) + 1.3;
        projectile.y += clamp(targetY - projectile.y, -18 * deltaSeconds, 18 * deltaSeconds);
      }
      projectile.vx = Math.sin(projectile.angle) * projectile.speed;
      projectile.vz = Math.cos(projectile.angle) * projectile.speed;
      const prevX = projectile.x;
      const prevZ = projectile.z;
      projectile.x += projectile.vx * deltaSeconds;
      projectile.z += projectile.vz * deltaSeconds;

      let detonate = now >= projectile.expiresAt || Math.abs(projectile.x) > WORLD_SIZE || Math.abs(projectile.z) > WORLD_SIZE;
      if (!detonate && projectile.y < ARENA.groundHeightAt(projectile.x, projectile.z) + 0.4) detonate = true;
      if (!detonate) {
        for (const collider of ARENA.colliders) {
          if (projectile.y > collider.h) continue;
          if (distanceSq2D(projectile.x, projectile.z, collider.x, collider.z) < collider.r * collider.r) {
            detonate = true;
            break;
          }
        }
      }
      if (!detonate) {
        for (const car of cars) {
          if (car.id === projectile.ownerId) continue;
          const position = effectivePosition(car, now);
          if (Math.abs((position.y || 0) + 1 - projectile.y) > 4) continue;
          const point = closestPointOnSegment2D(position.x, position.z, prevX, prevZ, projectile.x, projectile.z);
          if (distanceSq2D(point.x, point.z, position.x, position.z) < 3.6 * 3.6) {
            projectile.x = point.x;
            projectile.z = point.z;
            detonate = true;
            break;
          }
        }
      }
      if (detonate) {
        removeProjectile(room, projectile);
        explode(room, { kind: "rocket", x: projectile.x, y: projectile.y, z: projectile.z, source: owner, excludeId: projectile.ownerId }, now);
      }
      continue;
    }

    if (projectile.kind === "mine") {
      if (now >= projectile.expiresAt) {
        removeProjectile(room, projectile);
        continue;
      }
      if (now < projectile.armedAt) continue;
      const trigger = cars.find((car) => {
        if (car.id === projectile.ownerId && now < projectile.ownerSafeUntil) return false;
        const position = effectivePosition(car, now);
        if (Math.abs((position.y || 0) - projectile.y) > 3.5) return false;
        return distanceSq2D(position.x, position.z, projectile.x, projectile.z) < 4.4 * 4.4;
      });
      if (trigger) {
        removeProjectile(room, projectile);
        explode(room, { kind: "mine", x: projectile.x, y: projectile.y, z: projectile.z, source: owner }, now);
      }
      continue;
    }

    if (projectile.kind === "blackhole") {
      if (projectile.phase === "flying") {
        projectile.x = clamp(projectile.x + projectile.vx * deltaSeconds, -WORLD_SIZE, WORLD_SIZE);
        projectile.z = clamp(projectile.z + projectile.vz * deltaSeconds, -WORLD_SIZE, WORLD_SIZE);
        const hitWall = ARENA.colliders.some(
          (collider) => projectile.y <= collider.h && distanceSq2D(projectile.x, projectile.z, collider.x, collider.z) < collider.r * collider.r
        );
        if (hitWall || now >= projectile.stopAt) {
          projectile.phase = "pulling";
          projectile.vx = 0;
          projectile.vz = 0;
          // A hole that stopped above a building or rail would drop into it: settle just outside its footprint.
          for (const collider of ARENA.colliders) {
            const dx = projectile.x - collider.x;
            const dz = projectile.z - collider.z;
            const distance = Math.hypot(dx, dz);
            if (distance >= collider.r) continue;
            const outX = distance > 0.01 ? dx / distance : -Math.sin(projectile.angle || 0);
            const outZ = distance > 0.01 ? dz / distance : -Math.cos(projectile.angle || 0);
            projectile.x = clamp(collider.x + outX * (collider.r + 0.5), -WORLD_SIZE, WORLD_SIZE);
            projectile.z = clamp(collider.z + outZ * (collider.r + 0.5), -WORLD_SIZE, WORLD_SIZE);
          }
          // The pull is flat, so settle at car height or the collapse would miss what it pulled in.
          projectile.y = ARENA.groundHeightAt(projectile.x, projectile.z) + 2.2;
          if (hitWall) projectile.collapseAt = now + 3600;
          broadcastRoom(room, { type: "projectile-updated", projectile: serializeProjectile(projectile, now) });
        }
      } else {
        for (const car of cars) {
          if (!car.isBot || car.id === projectile.ownerId) continue;
          const dx = projectile.x - car.x;
          const dz = projectile.z - car.z;
          const distance = Math.hypot(dx, dz);
          if (distance > BLACKHOLE_PULL_RADIUS || distance < 0.5) continue;
          const pull = (1 - distance / BLACKHOLE_PULL_RADIUS) * 70 * deltaSeconds;
          car.kx = (car.kx || 0) + (dx / distance) * pull;
          car.kz = (car.kz || 0) + (dz / distance) * pull;
        }
      }
      if (now >= projectile.collapseAt) {
        removeProjectile(room, projectile);
        explode(room, { kind: "blackhole", x: projectile.x, y: projectile.y, z: projectile.z, source: owner, excludeId: projectile.ownerId }, now);
      }
    }
  }
}

function spawnMeteor(room, now, aimAtCars = true) {
  const cars = arenaPlayers(room, now);
  let x;
  let z;
  if (aimAtCars && cars.length && Math.random() < 0.62) {
    const target = cars[Math.floor(Math.random() * cars.length)];
    x = target.x + (target.vx || 0) * 1.3 + (Math.random() - 0.5) * 12;
    z = target.z + (target.vz || 0) * 1.3 + (Math.random() - 0.5) * 12;
  } else {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 95;
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
  }
  const hazardX = clamp(x, -WORLD_SIZE + 6, WORLD_SIZE - 6);
  const hazardZ = clamp(z, -WORLD_SIZE + 6, WORLD_SIZE - 6);
  const hazard = {
    id: `m-${nextEntityId++}`,
    kind: "meteor",
    x: hazardX,
    y: ARENA.groundHeightAt(hazardX, hazardZ),
    z: hazardZ,
    spawnedAt: now,
    impactAt: now + 1700
  };
  room.hazards.push(hazard);
  broadcastRoom(room, { type: "hazard-spawned", hazard: serializeHazard(hazard) });
}

function updateHazards(room, now) {
  if (!room.hazards.length) return;
  for (const hazard of [...room.hazards]) {
    if (now < hazard.impactAt) continue;
    room.hazards.splice(room.hazards.indexOf(hazard), 1);
    explode(room, { kind: "meteor", x: hazard.x, y: hazard.y || 0, z: hazard.z, source: WORLD_SOURCES.meteor }, now);
  }
}

function assignBomb(room, preferred, now, message, passerId = null) {
  const event = room.event;
  if (!event || event.kind !== "bomb") return;
  const candidates = arenaPlayers(room, now).filter((player) => player.id !== event.holderId);
  const holder = isLive(preferred, now) ? preferred : candidates[Math.floor(Math.random() * candidates.length)];
  if (!holder) {
    endChaosEvent(room, now);
    return;
  }
  event.holderId = holder.id;
  event.lastPasserId = passerId;
  event.passLockUntil = now + BOMB_PASS_LOCK_MS;
  broadcastRoom(room, {
    type: "bomb-passed",
    holderId: holder.id,
    holderName: holder.name,
    passerId,
    fuseEndsAt: event.fuseEndsAt
  });
  if (message) broadcastEvent(room, message, "danger");
}

function maybePassBomb(room, source, target, now) {
  const event = room.event;
  if (!event || event.kind !== "bomb" || event.holderId !== source.id || now < (event.passLockUntil || 0)) return;
  if (!isLive(target, now)) {
    // The ram wrecked them, so the bomb bounces to the nearest rival still driving instead.
    const heir = arenaPlayers(room, now)
      .filter((player) => player.id !== source.id && player.id !== target.id && isLive(player, now))
      .sort((a, b) => distanceSq2D(a.x, a.z, source.x, source.z) - distanceSq2D(b.x, b.z, source.x, source.z))[0];
    if (heir) {
      assignBomb(room, heir, now, `${source.name} wrecked ${target.name} and the bomb bounced to ${heir.name}!`, source.id);
    }
    return;
  }
  assignBomb(room, target, now, `${source.name} passed the bomb to ${target.name}!`, source.id);
}

function startChaosEvent(room, kind, now = Date.now()) {
  const meta = kind === "frenzy" ? FINAL_FRENZY : CHAOS_EVENTS[kind];
  const event = {
    kind,
    name: meta.name,
    tagline: meta.tagline,
    startedAt: now,
    endsAt: kind === "frenzy" ? room.round.endsAt : now + meta.durationMs,
    nextMeteorAt: now + 600
  };
  room.event = event;
  room.recentEvents = [kind, ...(room.recentEvents || [])].slice(0, 3);

  if (kind === "bomb") {
    event.fuseEndsAt = now + BOMB_FUSE_MS;
    event.endsAt = event.fuseEndsAt + 1500;
  }
  if (kind === "bounty") {
    const leader = arenaPlayers(room, now).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    event.targetId = leader?.id || null;
    if (leader) event.tagline = `Wreck ${leader.name} for +25. Hits on them pay double.`;
  }
  if (kind === "lootstorm") {
    for (const pickup of room.pickups) {
      if (pickup.type !== "crate" || pickup.active) continue;
      pickup.active = true;
      pickup.respawnAt = 0;
      broadcastRoom(room, { type: "pickup-state", pickupId: pickup.id, active: true });
    }
  }

  broadcastRoom(room, { type: "chaos-event", event: serializeEvent(event), room: serializeRoom(room, now) });
  if (kind === "bomb") {
    assignBomb(room, null, now, null);
  }
}

function endChaosEvent(room, now = Date.now(), options = {}) {
  const event = room.event;
  if (!event) return;
  room.event = null;
  if (event.kind !== "frenzy") {
    room.nextEventAt = now + EVENT_GAP_MIN_MS + Math.random() * (EVENT_GAP_MAX_MS - EVENT_GAP_MIN_MS);
  }
  if (!options.silent) {
    broadcastRoom(room, { type: "chaos-event-ended", kind: event.kind, room: serializeRoom(room, now) });
  }
}

function chooseChaosEvent(room, now, availableMs) {
  const active = arenaPlayers(room, now).length;
  const recent = new Set(room.recentEvents || []);
  const fits = (kind) => CHAOS_EVENTS[kind].durationMs <= availableMs;
  if (CHAOS_EVENTS[FORCED_EVENT]) return fits(FORCED_EVENT) ? FORCED_EVENT : null;
  const options = Object.entries(CHAOS_EVENTS)
    .filter(([kind, meta]) => fits(kind) && !recent.has(kind) && active >= (meta.minPlayers || 1))
    .map(([kind]) => kind);
  const pool = options.length ? options : Object.keys(CHAOS_EVENTS).filter((kind) => fits(kind) && !CHAOS_EVENTS[kind].minPlayers);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function updateChaos(room, now) {
  if (room.round.phase !== "live") return;
  const event = room.event;

  if (now >= room.round.endsAt - FINAL_FRENZY_MS && now < room.round.endsAt && event?.kind !== "frenzy") {
    endChaosEvent(room, now, { silent: true });
    startChaosEvent(room, "frenzy", now);
    return;
  }

  if (!event) {
    if (now >= room.nextEventAt) {
      const kind = chooseChaosEvent(room, now, room.round.endsAt - FINAL_FRENZY_MS - now);
      if (kind) {
        startChaosEvent(room, kind, now);
      } else {
        room.nextEventAt = room.round.endsAt;
      }
    }
    return;
  }

  if (event.kind === "meteors" && now >= event.nextMeteorAt) {
    spawnMeteor(room, now);
    event.nextMeteorAt = now + 380 + Math.random() * 160;
  }
  if (event.kind === "frenzy" && now >= event.nextMeteorAt) {
    spawnMeteor(room, now);
    event.nextMeteorAt = now + 900 + Math.random() * 500;
  }

  if (event.kind === "bomb") {
    const holder = room.players.get(event.holderId);
    if (!holder || holder.mode !== "arena" || holder.wreckedUntil > now) {
      assignBomb(room, null, now, null);
    }
    if (room.event === event && event.fuseEndsAt && now >= event.fuseEndsAt) {
      const victim = room.players.get(event.holderId);
      event.fuseEndsAt = 0;
      if (victim && victim.mode === "arena") {
        const passer = room.players.get(event.lastPasserId);
        const credit = passer && passer.id !== victim.id && passer.mode === "arena" ? passer : WORLD_SOURCES.bomb;
        broadcastEvent(room, `BOOM! The bomb went off on ${victim.name}.`, "danger");
        damagePlayer(room, credit, victim, 999, now, { cause: "bomb", unblockable: true });
        explode(room, { kind: "bomb", x: victim.x, y: victim.y || 0, z: victim.z, source: credit, excludeId: victim.id }, now);
      }
      if (room.event === event) endChaosEvent(room, now);
      return;
    }
  }

  if (event.kind === "bounty") {
    const target = room.players.get(event.targetId);
    if (!target || target.mode !== "arena") {
      endChaosEvent(room, now);
      return;
    }
  }

  if (room.event && now >= room.event.endsAt) {
    endChaosEvent(room, now);
  }
}

function chooseBotTarget(room, bot, now) {
  const livePickups = room.pickups.filter((pickup) => pickup.active);
  const crates = livePickups.filter((pickup) => pickup.type === "crate");
  const others = arenaPlayers(room, now).filter((player) => player.id !== bot.id);
  const humans = others.filter((player) => !player.isBot);
  const event = room.event;
  const roll = Math.random();
  bot.botNextDecisionAt = now + BOT_DECISION_MIN_MS + Math.random() * (BOT_DECISION_MAX_MS - BOT_DECISION_MIN_MS);

  if (event?.kind === "bomb" && others.length) {
    if (event.holderId === bot.id) {
      const nearest = others.sort((a, b) => distanceSq2D(a.x, a.z, bot.x, bot.z) - distanceSq2D(b.x, b.z, bot.x, bot.z))[0];
      bot.botTarget = { x: nearest.x + (nearest.vx || 0) * 0.4, z: nearest.z + (nearest.vz || 0) * 0.4 };
      bot.botNextDecisionAt = now + 260;
      return;
    }
    const holder = room.players.get(event.holderId);
    if (holder && distanceSq2D(holder.x, holder.z, bot.x, bot.z) < 40 * 40) {
      const away = Math.atan2(bot.x - holder.x, bot.z - holder.z) + (Math.random() - 0.5) * 0.8;
      bot.botTarget = { x: clamp(bot.x + Math.sin(away) * 45, -150, 150), z: clamp(bot.z + Math.cos(away) * 45, -150, 150) };
      return;
    }
  }

  if (event?.kind === "ringrush" && roll < 0.55) {
    const lead = ARENA.ringPathAt((now + 1500 - event.startedAt) / 1000);
    bot.botTarget = { x: lead.x, z: lead.z + ARENA.RING.min + 4 };
    return;
  }

  if (event?.kind === "bounty" && roll < 0.5) {
    const target = room.players.get(event.targetId);
    if (target && target.id !== bot.id && target.mode === "arena") {
      bot.botTarget = { x: target.x, z: target.z };
      return;
    }
  }

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

  if (!bot.weapon && crates.length && roll < 0.18) {
    const crate = crates.sort((a, b) => distanceSq2D(a.x, a.z, bot.x, bot.z) - distanceSq2D(b.x, b.z, bot.x, bot.z))[0];
    bot.botTarget = { x: crate.x, z: crate.z };
  } else if (humans.length > 0 && roll < 0.52) {
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
  pickup.respawnAt = now + (pickup.type === "crate" ? (room.event?.kind === "lootstorm" ? LOOT_STORM_RESPAWN_MS : CRATE_RESPAWN_MS) : PICKUP_RESPAWN_MS);
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

function updateBotVertical(room, bot, prevX, prevZ, deltaSeconds, now) {
  const gravity = ARENA.GRAVITY * (room.event?.kind === "lowgrav" ? ARENA.LOW_GRAVITY_SCALE : 1);
  const ground = ARENA.groundHeightAt(bot.x, bot.z);
  const prevGround = ARENA.groundHeightAt(prevX, prevZ);
  if (bot.airborne) {
    const prevY = bot.y;
    bot.vy -= gravity * deltaSeconds;
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
    bot.vy = pad.power * (room.event?.kind === "lowgrav" ? 0.7 : 1);
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

function updateBotWeapons(room, bot, now) {
  if (!bot.weapon || now < (bot.botNextWeaponAt || 0)) return;
  bot.botNextWeaponAt = now + 650;
  if (Math.random() < 0.5) return;
  const forward = forwardOf(bot);
  const others = arenaPlayers(room, now).filter((player) => player.id !== bot.id);
  let fire = false;

  if (bot.weapon === "rocket") {
    fire = Boolean(pickRocketTarget(room, bot, bot, bot.angle, now)) && others.some((other) => distanceSq2D(other.x, other.z, bot.x, bot.z) < 80 * 80);
  } else if (bot.weapon === "mine") {
    fire = others.some((other) => {
      const dx = other.x - bot.x;
      const dz = other.z - bot.z;
      const distance = Math.hypot(dx, dz);
      return distance < 30 && (dx * forward.x + dz * forward.z) / Math.max(distance, 0.1) < -0.55;
    });
  } else if (bot.weapon === "shockwave") {
    fire = others.some((other) => distanceSq2D(other.x, other.z, bot.x, bot.z) < 15 * 15);
  } else if (bot.weapon === "blackhole") {
    fire = others.filter((other) => {
      const dx = other.x - bot.x;
      const dz = other.z - bot.z;
      const distance = Math.hypot(dx, dz);
      return distance > 18 && distance < 70 && (dx * forward.x + dz * forward.z) / distance > 0.6;
    }).length >= 1;
  }

  if (!fire && now - (bot.botWeaponSince || now) > 9000) fire = true;
  if (fire) fireWeapon(room, bot, now);
}

function updateBots(room, now, deltaSeconds) {
  if (room.round.phase !== "live") {
    return;
  }
  const ring = getRing(room, now);
  const nitro = room.event?.kind === "nitro";
  const ice = room.event?.kind === "ice";

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
    const turnSpeed = (2.7 + personality * 0.55) * deltaSeconds * (ice ? 0.55 : 1) * (bot.airborne ? 0.15 : 1);
    const turn = clamp(angleDelta(bot.angle, desiredAngle), -turnSpeed, turnSpeed);
    bot.angle += turn;
    const speedLimit = (35 + (botSeed % 6) * 1.8 + Math.sin(now * 0.0012 + botSeed) * 3 + (bot.botPlan ? 8 : 0)) * (nitro ? 1.3 : 1);
    const acceleration = targetDistance > 7 ? 48 * personality : -56;
    if (!bot.airborne) {
      if (bot.speed > speedLimit) {
        bot.speed = Math.max(speedLimit, bot.speed - 24 * deltaSeconds);
      } else {
        bot.speed = clamp(bot.speed + acceleration * deltaSeconds, targetDistance > 7 ? 11 : 0, speedLimit);
      }
    }
    bot.boosting = nitro || bot.speed > speedLimit + 2 || Boolean(bot.botPlan && bot.botPlan.stage === 1);
    const knockDecay = Math.exp(-2.6 * deltaSeconds);
    bot.kx = (bot.kx || 0) * knockDecay;
    bot.kz = (bot.kz || 0) * knockDecay;
    bot.vx = Math.sin(bot.angle) * bot.speed + bot.kx;
    bot.vz = Math.cos(bot.angle) * bot.speed + bot.kz;
    bot.x += bot.vx * deltaSeconds;
    bot.z += bot.vz * deltaSeconds;
    bot.x = clamp(bot.x, -WORLD_SIZE, WORLD_SIZE);
    bot.z = clamp(bot.z, -WORLD_SIZE, WORLD_SIZE);
    updateBotVertical(room, bot, prevX, prevZ, deltaSeconds, now);
    resolveBotStaticCollisions(bot);
    bot.inZone = !bot.airborne && isInRing(ring, bot.x, bot.z);
    resolveBotBodyCollisions(room, bot, now);
    updateBotWeapons(room, bot, now);

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
        maybePassBomb(room, bot, target, now);
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
        edition: "insane",
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

function syncFireOrigin(player, msg) {
  const x = toNumber(msg.x, NaN);
  const z = toNumber(msg.z, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  if (distanceSq2D(x, z, player.x, player.z) > 14 * 14) return;
  player.x = clamp(x, -WORLD_SIZE, WORLD_SIZE);
  player.z = clamp(z, -WORLD_SIZE, WORLD_SIZE);
  player.y = clamp(toNumber(msg.y, player.y || 0), 0, 90);
  player.angle = normalizeAngle(toNumber(msg.angle, player.angle || 0));
  player.vx = clamp(toNumber(msg.vx, 0), -110, 110);
  player.vz = clamp(toNumber(msg.vz, 0), -110, 110);
  player.lastStateAt = Date.now();
}

function resetIdleRoom(room, now) {
  // The round clock and chaos deadlines kept running while nobody was here; start the next human on a fresh round.
  room.round = createRoundState(now, room.round.round + 1);
  room.pickups = createPickups();
  resetChaos(room, now);
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
    motd: "Welcome to Crash Club INSANE."
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
          weapon: null,
          weaponCharges: 0,
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
          pickups: room.pickups.map(serializePickup),
          projectiles: room.projectiles.map((projectile) => serializeProjectile(projectile)),
          hazards: room.hazards.map(serializeHazard)
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

      if (msg.type === "fire") {
        const now = Date.now();
        if (room.round.phase !== "live" || player.mode !== "arena" || player.wreckedUntil > now) {
          return;
        }
        syncFireOrigin(player, msg);
        fireWeapon(room, player, now);
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
        maybePassBomb(room, player, target, now);
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
          addScore(room, player, 6);
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
    updateChaos(room, now);
    updateBots(room, now, deltaSeconds);
    updateProjectiles(room, now, deltaSeconds);
    updateHazards(room, now);
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
  const ring = getRing(room, now);
  // Humans are checked against the server's ring (it moves during Ring Rush) with a little latency slack,
  // and only while their client is still reporting.
  const widen = (zone) => ({ ...zone, min: zone.min - 1.5, max: zone.max + 1.5 });
  const humanRing = widen(ring);
  let scored = false;
  for (const player of room.players.values()) {
    if (player.mode !== "arena" || player.health <= 0) continue;
    const inZone = player.isBot
      ? player.inZone
      : now - (player.lastStateAt || 0) < STATE_STALE_MS &&
        !player.airborne &&
        (isInRing(humanRing, player.x, player.z) ||
          // A roaming ring has moved on since the client drew it: also accept where it was one round trip ago.
          (ring.mult > 1 && isInRing(widen(getRing(room, Math.min(now, player.lastStateAt) - 250)), player.x, player.z)));
    if (inZone) {
      addScore(room, player, ring.mult);
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
  console.log(`Crash Club INSANE server running on http://localhost:${PORT}`);
});
