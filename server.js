const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const SCORE_TICK_MS = 500;
const PICKUP_RESPAWN_MS = 9000;
const WORLD_SIZE = 180;
const ROOM_IDLE_MS = 1000 * 60 * 10;

const PICKUP_TEMPLATES = [
  { id: "boost-north", x: 0, z: -66 },
  { id: "boost-south", x: 0, z: 66 },
  { id: "boost-east", x: 66, z: 0 },
  { id: "boost-west", x: -66, z: 0 },
  { id: "boost-center-east", x: 28, z: 28 },
  { id: "boost-center-west", x: -28, z: -28 }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const publicDir = path.join(__dirname, "public");
const rooms = new Map();
let nextPlayerId = 1;

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createPickups() {
  return PICKUP_TEMPLATES.map((pickup) => ({
    ...pickup,
    active: true,
    respawnAt: 0
  }));
}

function createRoom(code) {
  return {
    code,
    players: new Map(),
    pickups: createPickups(),
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

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    x: player.x,
    y: player.y,
    z: player.z,
    angle: player.angle,
    speed: player.speed,
    score: player.score || 0
  };
}

function serializePickup(pickup) {
  return {
    id: pickup.id,
    x: pickup.x,
    z: pickup.z,
    active: pickup.active
  };
}

function createSpawnState(id, name, color) {
  const spawnAngle = (Number(id) * 0.95) % (Math.PI * 2);
  const spawnRadius = 18 + (Number(id) % 5) * 6;
  return {
    name: String(name || `Driver ${id}`).slice(0, 18),
    color: color || randomColor(),
    x: Math.cos(spawnAngle) * spawnRadius,
    y: 0.85,
    z: Math.sin(spawnAngle) * spawnRadius,
    angle: spawnAngle + Math.PI,
    speed: 0,
    inZone: false
  };
}

function resetPlayerState(player) {
  Object.assign(player, createSpawnState(player.id, player.name, player.color));
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastRoom(room, message, exceptWs = null) {
  for (const player of room.players.values()) {
    if (player.ws !== exceptWs && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }
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
    if (room.players.size === 0 && now - room.lastActiveAt > ROOM_IDLE_MS) {
      rooms.delete(code);
    }
  }
}

function serveFile(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
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
        score: 0,
        ...createSpawnState(id, msg.name, msg.color)
      };
      room.players.set(player.id, player);

      send(ws, {
        type: "joined",
        id: player.id,
        room: room.code,
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
      player.x = clamp(Number(msg.x) || 0, -WORLD_SIZE, WORLD_SIZE);
      player.y = clamp(Number(msg.y) || 0, 0, 10);
      player.z = clamp(Number(msg.z) || 0, -WORLD_SIZE, WORLD_SIZE);
      player.angle = Number(msg.angle) || 0;
      player.speed = clamp(Number(msg.speed) || 0, -25, 60);
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
      resetPlayerState(player);
      send(ws, {
        type: "respawned",
        player: serializePlayer(player)
      });
      return;
    }

    if (msg.type === "pickup-collected") {
      const pickup = room.pickups.find((entry) => entry.id === msg.pickupId);
      if (!pickup || !pickup.active) {
        return;
      }
      pickup.active = false;
      pickup.respawnAt = Date.now() + PICKUP_RESPAWN_MS;
      player.score += 3;
      broadcastRoom(room, {
        type: "pickup-state",
        pickupId: pickup.id,
        active: false,
        collectorId: player.id
      });
      return;
    }

    if (msg.type === "hit") {
      const impulse = clamp(Number(msg.impulse) || 0, 0, 1);
      if (impulse > 0.22) {
        player.score += Math.max(1, Math.round(impulse * 2));
      }
      broadcastRoom(room, {
        type: "impact",
        sourceId: player.id,
        targetId: String(msg.targetId || ""),
        impulse
      });
    }
  });

  ws.on("close", () => {
    removePlayer(player);
  });

  ws.on("error", () => {
    removePlayer(player);
  });
});

setInterval(() => {
  cleanupRooms();
  const now = Date.now();

  for (const room of rooms.values()) {
    if (room.players.size === 0) {
      continue;
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

    broadcastRoom(room, {
      type: "snapshot",
      players: [...room.players.values()].map(serializePlayer)
    });
  }
}, 1000 / TICK_RATE);

setInterval(() => {
  for (const room of rooms.values()) {
    let scored = false;
    for (const player of room.players.values()) {
      if (player.inZone) {
        player.score += 1;
        scored = true;
      }
    }

    if (scored) {
      broadcastRoom(room, {
        type: "snapshot",
        players: [...room.players.values()].map(serializePlayer)
      });
    }
  }
}, SCORE_TICK_MS);

server.listen(PORT, () => {
  console.log(`Crash Club server running on http://localhost:${PORT}`);
});
