import * as THREE from "three";

const WORLD_LIMIT = 176;
const CAR_RADIUS = 2.35;
const ENGINE_FORCE = 36;
const REVERSE_FORCE = 18;
const BRAKE_FORCE = 48;
const ROLL_DRAG = 2.8;
const LATERAL_GRIP = 8.2;
const TURN_RATE = 2.65;
const MAX_FORWARD_SPEED = 32;
const MAX_REVERSE_SPEED = 14;
const BOOST_FORCE = 58;
const BOOST_DRAIN = 25;
const BOOST_RECHARGE = 12;
const MAX_BOOST = 100;
const PICKUP_BOOST_GAIN = 38;
const SEND_INTERVAL_MS = 50;
const IMPACT_COOLDOWN_MS = 320;
const STUCK_RESPAWN_MS = 2800;
const SCORE_ZONE_MIN = 8;
const SCORE_ZONE_MAX = 18;
const PLAYER_COLOR = "#59f0c2";
const PICKUP_HEIGHT = 2.4;

const app = document.getElementById("app");
const roomCodeEl = document.getElementById("room-code");
const playerCountEl = document.getElementById("player-count");
const speedValueEl = document.getElementById("speed-value");
const boostValueEl = document.getElementById("boost-value");
const scoreValueEl = document.getElementById("score-value");
const leaderValueEl = document.getElementById("leader-value");
const leaderboardListEl = document.getElementById("leaderboard-list");
const connectionCard = document.getElementById("connection-card");
const nameInput = document.getElementById("name-input");
const renameButton = document.getElementById("rename-button");

const roomCode =
  (new URLSearchParams(window.location.search).get("room") || "main")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 16) || "main";
roomCodeEl.textContent = roomCode;

let currentName =
  localStorage.getItem("crash-club-name") || `Driver${Math.floor(Math.random() * 900 + 100)}`;
nameInput.value = currentName;

const keys = new Set();
const remoteCars = new Map();
const pickupMap = new Map();
const collisionCooldowns = new Map();
const boxColliders = [];
const circleColliders = [];
const ramps = [];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#6db8ff");
scene.fog = new THREE.Fog("#6db8ff", 100, 360);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 7, 12);

const ambientLight = new THREE.HemisphereLight("#fef3c7", "#305066", 1.4);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight("#fff5d6", 1.2);
sun.position.set(35, 42, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ color: "#2e5e39", roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const asphaltRing = new THREE.Mesh(
  new THREE.RingGeometry(36, 82, 64),
  new THREE.MeshStandardMaterial({ color: "#39414c", roughness: 0.92 })
);
asphaltRing.rotation.x = -Math.PI / 2;
asphaltRing.position.y = 0.02;
scene.add(asphaltRing);

const scoreRing = new THREE.Mesh(
  new THREE.RingGeometry(SCORE_ZONE_MIN, SCORE_ZONE_MAX, 48),
  new THREE.MeshStandardMaterial({
    color: "#ffcf6b",
    emissive: "#5f3f0b",
    transparent: true,
    opacity: 0.86,
    roughness: 0.5
  })
);
scoreRing.rotation.x = -Math.PI / 2;
scoreRing.position.y = 0.08;
scene.add(scoreRing);

const centerPlaza = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 6, 1.8, 32),
  new THREE.MeshStandardMaterial({ color: "#b56f3a", roughness: 0.9 })
);
centerPlaza.position.y = 0.9;
centerPlaza.castShadow = true;
centerPlaza.receiveShadow = true;
scene.add(centerPlaza);
circleColliders.push({ x: 0, z: 0, radius: 6.3, bounce: 0.45 });

const centralTotem = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 2.2, 11, 8),
  new THREE.MeshStandardMaterial({ color: "#4f46e5", roughness: 0.65, emissive: "#1c1b4b" })
);
centralTotem.position.y = 6;
centralTotem.castShadow = true;
scene.add(centralTotem);

const decorations = new THREE.Group();
scene.add(decorations);

function addBoxCollider(x, z, halfW, halfD, bounce = 0.48) {
  boxColliders.push({ x, z, halfW, halfD, bounce });
}

function addCircleCollider(x, z, radius, bounce = 0.45) {
  circleColliders.push({ x, z, radius, bounce });
}

function addBarrier(x, z, width, depth, color = "#ef4444") {
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(width, 2.8, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  barrier.position.set(x, 1.4, z);
  barrier.castShadow = true;
  barrier.receiveShadow = true;
  decorations.add(barrier);
  addBoxCollider(x, z, width / 2, depth / 2);
}

function addCrate(x, z, size = 6, color = "#8b5a2b") {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
  );
  crate.position.set(x, size / 2, z);
  crate.castShadow = true;
  crate.receiveShadow = true;
  decorations.add(crate);
  addBoxCollider(x, z, size / 2, size / 2, 0.35);
}

function addRamp(x, z, rotation, color = "#d97706") {
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(16, 1.4, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
  );
  ramp.position.set(x, 0.9, z);
  ramp.rotation.y = rotation;
  ramp.rotation.z = -0.18;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  decorations.add(ramp);
  ramps.push({ x, z, rotation, halfLength: 8, halfWidth: 4, maxHeight: 1.85, boost: 8.5 });
}

function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: "#6b4f35", roughness: 1 })
  );
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 6.2, 10),
    new THREE.MeshStandardMaterial({ color: "#149a5f", roughness: 0.9 })
  );
  trunk.position.set(x, 2, z);
  top.position.set(x, 6, z);
  trunk.castShadow = true;
  top.castShadow = true;
  decorations.add(trunk, top);
  addCircleCollider(x, z, 1.8, 0.42);
}

addBarrier(0, -104, 128, 5);
addBarrier(0, 104, 128, 5);
addBarrier(-104, 0, 5, 128);
addBarrier(104, 0, 5, 128);
addCrate(-36, 18, 7);
addCrate(36, -18, 7);
addCrate(-18, -42, 8, "#9a6c39");
addCrate(22, 46, 8, "#7c5330");
addCrate(58, 32, 6, "#a16207");
addCrate(-58, -32, 6, "#a16207");
addRamp(-52, 54, Math.PI * 0.15);
addRamp(60, -48, -Math.PI * 0.22, "#f59e0b");
addRamp(-12, -72, Math.PI * 0.6, "#f97316");
addRamp(74, 18, -Math.PI * 0.5, "#fb923c");

for (let i = 0; i < 18; i += 1) {
  const angle = (i / 18) * Math.PI * 2;
  addTree(Math.cos(angle) * 122, Math.sin(angle) * 122);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function makeTextSprite(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(12, 18, 28, 0.82)";
  drawRoundedRect(ctx, 12, 10, 232, 44, 18);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "700 28px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(9, 2.25, 1);
  return sprite;
}

function createCar(color) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.95, 4.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.18 })
  );
  body.position.y = 1.18;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.86, 2.3),
    new THREE.MeshStandardMaterial({ color: "#dbeafe", roughness: 0.2, metalness: 0.55 })
  );
  cabin.position.set(0, 1.9, -0.1);
  cabin.castShadow = true;
  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.34, 0.35),
    new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.7 })
  );
  bumperFront.position.set(0, 0.85, -2.45);
  const bumperRear = bumperFront.clone();
  bumperRear.position.z = 2.45;
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.18, 0.45),
    new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.5 })
  );
  spoiler.position.set(0, 2.08, 2.05);
  root.add(body, cabin, bumperFront, bumperRear, spoiler);
  const wheelGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.54, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.85 });
  const wheelPositions = [
    [-1.45, 0.66, -1.6],
    [1.45, 0.66, -1.6],
    [-1.45, 0.66, 1.6],
    [1.45, 0.66, 1.6]
  ];
  const wheels = [];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    root.add(wheel);
    wheels.push(wheel);
  }
  return { root, wheels };
}

function createPickupVisual(color = "#fbbf24") {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.28, 12, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.32 })
  );
  ring.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.72, 0),
    new THREE.MeshStandardMaterial({
      color: "#fff1b8",
      emissive: "#ffdd57",
      emissiveIntensity: 0.55,
      roughness: 0.2
    })
  );
  group.add(ring, core);
  return { group, ring, core };
}

const playerCar = createCar(PLAYER_COLOR);
scene.add(playerCar.root);
let playerNameSprite = makeTextSprite(currentName, PLAYER_COLOR);
playerNameSprite.position.set(0, 4.3, 0);
playerCar.root.add(playerNameSprite);

const state = {
  id: null,
  connected: false,
  position: new THREE.Vector3(0, 0.85, 0),
  velocity: new THREE.Vector3(),
  heading: Math.PI,
  boost: 65,
  score: 0,
  inZone: false,
  lastSentAt: 0,
  stuckMs: 0,
  impactFlash: 0,
  cameraShake: 0,
  lastRespawnAt: 0
};

let socket = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function updateConnection(text, online) {
  connectionCard.textContent = text;
  connectionCard.classList.toggle("online", Boolean(online));
  connectionCard.classList.toggle("offline", !online);
}

function updatePlayerCount() {
  playerCountEl.textContent = String(remoteCars.size + 1);
}

function updateLeaderboard() {
  const entries = [
    { id: state.id || "self", name: currentName, score: state.score, isYou: true },
    ...[...remoteCars.values()].map((remote) => ({
      id: remote.id,
      name: remote.name,
      score: remote.score,
      isYou: false
    }))
  ].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const leader = entries[0] || { name: "You", score: 0 };
  leaderValueEl.textContent = `${leader.name} - ${leader.score}`;
  leaderboardListEl.innerHTML = entries
    .slice(0, 5)
    .map(
      (entry, index) => `
        <div class="leaderboard-row ${entry.isYou ? "is-you" : ""}">
          <span class="leaderboard-rank">${index + 1}</span>
          <strong>${entry.name}</strong>
          <span>${entry.score} pts</span>
        </div>
      `
    )
    .join("");
}

function updateHud() {
  speedValueEl.textContent = String(Math.round(state.velocity.length() * 3));
  boostValueEl.textContent = String(Math.round(state.boost));
  scoreValueEl.textContent = String(state.score);
  updateLeaderboard();
}

function updateName() {
  const trimmed = nameInput.value.trim().slice(0, 18) || currentName;
  nameInput.value = trimmed;
  currentName = trimmed;
  localStorage.setItem("crash-club-name", trimmed);
  playerCar.root.remove(playerNameSprite);
  playerNameSprite = makeTextSprite(trimmed, PLAYER_COLOR);
  playerNameSprite.position.set(0, 4.3, 0);
  playerCar.root.add(playerNameSprite);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "rename", name: trimmed }));
  }
  updateLeaderboard();
}

renameButton.addEventListener("click", updateName);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    updateName();
  }
});

window.addEventListener("keydown", (event) => {
  if (document.activeElement === nameInput && event.key !== "Escape") {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "r" && !event.repeat) {
    requestRespawn();
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateRemoteLabel(remote) {
  if (remote.label) {
    remote.car.root.remove(remote.label);
  }
  remote.label = makeTextSprite(remote.name, remote.color || "#ffffff");
  remote.label.position.set(0, 4.3, 0);
  remote.car.root.add(remote.label);
}

function ensureRemoteCar(player) {
  if (player.id === state.id) {
    state.score = player.score || 0;
    return;
  }
  let remote = remoteCars.get(player.id);
  if (!remote) {
    const car = createCar(player.color || "#f97316");
    car.root.position.set(player.x, player.y, player.z);
    car.root.rotation.y = player.angle;
    remote = {
      id: player.id,
      car,
      name: player.name || `Driver ${player.id}`,
      color: player.color || "#f97316",
      score: player.score || 0,
      speed: player.speed || 0,
      targetPosition: new THREE.Vector3(player.x, player.y, player.z),
      targetAngle: player.angle,
      pulse: 0
    };
    updateRemoteLabel(remote);
    remoteCars.set(player.id, remote);
    scene.add(car.root);
    updatePlayerCount();
  }
  if (remote.name !== player.name || remote.color !== player.color) {
    remote.name = player.name || remote.name;
    remote.color = player.color || remote.color;
    updateRemoteLabel(remote);
  }
  remote.score = player.score || 0;
  remote.speed = player.speed || 0;
  remote.targetPosition.set(player.x, player.y, player.z);
  remote.targetAngle = player.angle;
}

function removeRemoteCar(id) {
  const remote = remoteCars.get(id);
  if (!remote) {
    return;
  }
  scene.remove(remote.car.root);
  remoteCars.delete(id);
  updatePlayerCount();
  updateLeaderboard();
}

function ensurePickups(pickups) {
  for (const pickup of pickups) {
    if (!pickupMap.has(pickup.id)) {
      const visual = createPickupVisual();
      visual.group.position.set(pickup.x, PICKUP_HEIGHT, pickup.z);
      scene.add(visual.group);
      pickupMap.set(pickup.id, { id: pickup.id, x: pickup.x, z: pickup.z, active: pickup.active, ...visual });
    }
    const localPickup = pickupMap.get(pickup.id);
    localPickup.active = pickup.active;
    localPickup.group.visible = pickup.active;
  }
}

function setPickupState(pickupId, active) {
  const pickup = pickupMap.get(pickupId);
  if (!pickup) {
    return;
  }
  pickup.active = active;
  pickup.group.visible = active;
}

function pulseImpact(targetId, impulse = 0.5) {
  const remote = remoteCars.get(targetId);
  if (remote) {
    remote.pulse = Math.max(remote.pulse, impulse);
  }
}

function sampleRamp(position) {
  let bestHeight = 0.85;
  let bestBoost = 0;
  for (const ramp of ramps) {
    const dx = position.x - ramp.x;
    const dz = position.z - ramp.z;
    const cos = Math.cos(-ramp.rotation);
    const sin = Math.sin(-ramp.rotation);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    if (Math.abs(localX) <= ramp.halfLength && Math.abs(localZ) <= ramp.halfWidth) {
      const t = clamp((localX + ramp.halfLength) / (ramp.halfLength * 2), 0, 1);
      bestHeight = Math.max(bestHeight, 0.85 + t * ramp.maxHeight);
      bestBoost = Math.max(bestBoost, ramp.boost * (0.25 + t));
    }
  }
  return { height: bestHeight, boost: bestBoost };
}

function applyBounce(nx, nz, bounce = 0.45) {
  const normalVelocity = state.velocity.x * nx + state.velocity.z * nz;
  if (normalVelocity < 0) {
    state.velocity.x -= (1 + bounce) * normalVelocity * nx;
    state.velocity.z -= (1 + bounce) * normalVelocity * nz;
  }
}

function resolveWorldBounds() {
  let collided = 0;
  if (state.position.x < -WORLD_LIMIT || state.position.x > WORLD_LIMIT) {
    const nx = state.position.x < -WORLD_LIMIT ? 1 : -1;
    state.position.x = clamp(state.position.x, -WORLD_LIMIT, WORLD_LIMIT);
    applyBounce(nx, 0, 0.5);
    collided += 1;
  }
  if (state.position.z < -WORLD_LIMIT || state.position.z > WORLD_LIMIT) {
    const nz = state.position.z < -WORLD_LIMIT ? 1 : -1;
    state.position.z = clamp(state.position.z, -WORLD_LIMIT, WORLD_LIMIT);
    applyBounce(0, nz, 0.5);
    collided += 1;
  }
  return collided;
}

function resolveBoxCollision(box) {
  const closestX = clamp(state.position.x, box.x - box.halfW, box.x + box.halfW);
  const closestZ = clamp(state.position.z, box.z - box.halfD, box.z + box.halfD);
  let dx = state.position.x - closestX;
  let dz = state.position.z - closestZ;
  let distance = Math.hypot(dx, dz);
  if (distance >= CAR_RADIUS) {
    return false;
  }
  if (distance < 0.001) {
    const offsetX = state.position.x - box.x;
    const offsetZ = state.position.z - box.z;
    if (Math.abs(offsetX) > Math.abs(offsetZ)) {
      dx = offsetX >= 0 ? 1 : -1;
      dz = 0;
    } else {
      dx = 0;
      dz = offsetZ >= 0 ? 1 : -1;
    }
    distance = 1;
  }
  const nx = dx / distance;
  const nz = dz / distance;
  const penetration = CAR_RADIUS - distance;
  state.position.x += nx * penetration;
  state.position.z += nz * penetration;
  applyBounce(nx, nz, box.bounce);
  return true;
}

function resolveCircleCollision(circle) {
  const dx = state.position.x - circle.x;
  const dz = state.position.z - circle.z;
  const distance = Math.hypot(dx, dz);
  const minDistance = CAR_RADIUS + circle.radius;
  if (distance >= minDistance) {
    return false;
  }
  const safeDistance = Math.max(distance, 0.001);
  const nx = dx / safeDistance;
  const nz = dz / safeDistance;
  const penetration = minDistance - safeDistance;
  state.position.x += nx * penetration;
  state.position.z += nz * penetration;
  applyBounce(nx, nz, circle.bounce);
  return true;
}

function resolveStaticCollisions() {
  let collisions = resolveWorldBounds();
  for (const box of boxColliders) {
    if (resolveBoxCollision(box)) {
      collisions += 1;
    }
  }
  for (const circle of circleColliders) {
    if (resolveCircleCollision(circle)) {
      collisions += 1;
    }
  }
  return collisions;
}

function resolveRemoteCollisions(now) {
  let collisions = 0;
  for (const [id, remote] of remoteCars.entries()) {
    const dx = state.position.x - remote.car.root.position.x;
    const dz = state.position.z - remote.car.root.position.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = CAR_RADIUS * 2.05;
    if (distance <= 0 || distance >= minDistance) {
      continue;
    }
    const nx = dx / distance;
    const nz = dz / distance;
    const penetration = minDistance - distance;
    state.position.x += nx * penetration * 0.65;
    state.position.z += nz * penetration * 0.65;
    const remoteVelocity = new THREE.Vector3(
      Math.sin(remote.targetAngle) * remote.speed,
      0,
      Math.cos(remote.targetAngle) * remote.speed
    );
    const relativeImpact =
      (state.velocity.x - remoteVelocity.x) * nx + (state.velocity.z - remoteVelocity.z) * nz;
    const impulse = clamp(Math.abs(relativeImpact) / 24, 0.18, 1);
    state.velocity.x += nx * (7 + impulse * 9);
    state.velocity.z += nz * (7 + impulse * 9);
    state.cameraShake = Math.min(0.8, state.cameraShake + impulse * 0.2);
    state.impactFlash = Math.max(state.impactFlash, impulse * 0.15);
    pulseImpact(id, impulse);
    const cooldown = collisionCooldowns.get(id) || 0;
    if (now - cooldown > IMPACT_COOLDOWN_MS && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "hit", targetId: id, impulse }));
      collisionCooldowns.set(id, now);
    }
    collisions += 1;
  }
  return collisions;
}

function respawnLocal(player) {
  state.position.set(player.x, player.y, player.z);
  state.velocity.set(0, 0, 0);
  state.heading = player.angle;
  state.boost = Math.max(state.boost, 55);
  state.stuckMs = 0;
  state.cameraShake = 0;
  state.impactFlash = 0;
  state.lastRespawnAt = performance.now();
}

function requestRespawn() {
  const now = performance.now();
  if (now - state.lastRespawnAt < 900) {
    return;
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "respawn" }));
  } else {
    respawnLocal({ x: 0, y: 0.85, z: 0, angle: Math.PI });
  }
}

function updateDriving(delta) {
  const accelerate = keys.has("w") || keys.has("arrowup");
  const brake = keys.has("s") || keys.has("arrowdown");
  const steerLeft = keys.has("a") || keys.has("arrowleft");
  const steerRight = keys.has("d") || keys.has("arrowright");
  const boosting = keys.has("shift") && accelerate && state.boost > 0;
  const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const forwardSpeed = state.velocity.dot(forward);
  const lateralSpeed = state.velocity.dot(right);
  if (accelerate) {
    state.velocity.addScaledVector(forward, ENGINE_FORCE * delta);
  } else if (brake) {
    if (forwardSpeed > 2) {
      state.velocity.addScaledVector(forward, -BRAKE_FORCE * delta);
    } else {
      state.velocity.addScaledVector(forward, -REVERSE_FORCE * delta);
    }
  } else {
    state.velocity.addScaledVector(forward, -forwardSpeed * ROLL_DRAG * delta);
  }
  state.velocity.addScaledVector(right, -lateralSpeed * LATERAL_GRIP * delta);
  if (boosting) {
    state.velocity.addScaledVector(forward, BOOST_FORCE * delta);
    state.boost = clamp(state.boost - BOOST_DRAIN * delta, 0, MAX_BOOST);
  } else {
    state.boost = clamp(state.boost + BOOST_RECHARGE * delta, 0, MAX_BOOST);
  }
  const steerInput = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
  if (steerInput !== 0) {
    const steerStrength = TURN_RATE * clamp(Math.abs(forwardSpeed) / 18, 0.22, 1.25);
    state.heading += steerInput * steerStrength * delta * (forwardSpeed >= -0.75 ? 1 : -1);
  }
  const postTurnForward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const clampedForwardSpeed = state.velocity.dot(postTurnForward);
  const maxForward = boosting ? MAX_FORWARD_SPEED + 11 : MAX_FORWARD_SPEED;
  if (clampedForwardSpeed > maxForward) {
    state.velocity.addScaledVector(postTurnForward, maxForward - clampedForwardSpeed);
  }
  if (clampedForwardSpeed < -MAX_REVERSE_SPEED) {
    state.velocity.addScaledVector(postTurnForward, -MAX_REVERSE_SPEED - clampedForwardSpeed);
  }
  state.position.addScaledVector(state.velocity, delta);
  const ramp = sampleRamp(state.position);
  state.position.y = ramp.height;
  if (ramp.boost > 0 && clampedForwardSpeed > 6) {
    state.velocity.addScaledVector(postTurnForward, ramp.boost * delta);
  }
  const collisions = resolveStaticCollisions() + resolveRemoteCollisions(performance.now());
  const centerDistance = Math.hypot(state.position.x, state.position.z);
  state.inZone = centerDistance >= SCORE_ZONE_MIN && centerDistance <= SCORE_ZONE_MAX;
  scoreRing.material.emissive.set(state.inZone ? "#cc8f11" : "#5f3f0b");
  if (collisions > 0 && Math.abs(clampedForwardSpeed) < 1.4 && (accelerate || brake || steerInput !== 0)) {
    state.stuckMs += delta * 1000;
  } else {
    state.stuckMs = Math.max(0, state.stuckMs - delta * 1400);
  }
  if (state.stuckMs > STUCK_RESPAWN_MS) {
    requestRespawn();
  }
  const roll = clamp(-state.velocity.dot(new THREE.Vector3(postTurnForward.z, 0, -postTurnForward.x)) * 0.024, -0.16, 0.16);
  const pitch = clamp(-clampedForwardSpeed * 0.008, -0.08, 0.08);
  playerCar.root.position.copy(state.position);
  playerCar.root.rotation.set(pitch, state.heading, roll);
  for (const wheel of playerCar.wheels) {
    wheel.rotation.x -= clampedForwardSpeed * delta * 0.9;
  }
}

function updateRemoteCars(delta) {
  for (const remote of remoteCars.values()) {
    remote.car.root.position.lerp(remote.targetPosition, 0.18);
    remote.car.root.rotation.y += angleDelta(remote.car.root.rotation.y, remote.targetAngle) * 0.18;
    remote.pulse = Math.max(0, remote.pulse - delta * 3.2);
    remote.car.root.scale.setScalar(1 + remote.pulse * 0.09);
    for (const wheel of remote.car.wheels) {
      wheel.rotation.x -= remote.speed * delta * 0.03;
    }
  }
}

function updatePickups(delta, elapsed) {
  for (const pickup of pickupMap.values()) {
    if (!pickup.active) {
      pickup.group.visible = false;
      continue;
    }
    pickup.group.visible = true;
    pickup.group.position.y = PICKUP_HEIGHT + Math.sin(elapsed * 2.2 + pickup.x * 0.02) * 0.35;
    pickup.group.rotation.y += delta * 1.8;
    pickup.ring.rotation.z += delta * 2.6;
  }
}

function collectNearbyPickups() {
  for (const pickup of pickupMap.values()) {
    if (!pickup.active) {
      continue;
    }
    const distance = Math.hypot(state.position.x - pickup.x, state.position.z - pickup.z);
    if (distance < 4.4) {
      state.boost = clamp(state.boost + PICKUP_BOOST_GAIN, 0, MAX_BOOST);
      state.impactFlash = Math.max(state.impactFlash, 0.2);
      setPickupState(pickup.id, false);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "pickup-collected", pickupId: pickup.id }));
      }
    }
  }
}

function updateCamera(delta) {
  const behind = new THREE.Vector3(Math.sin(state.heading) * -12.5, 8.2, Math.cos(state.heading) * -12.5);
  const desired = state.position.clone().add(behind);
  camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
  state.cameraShake = Math.max(0, state.cameraShake - delta * 1.4);
  const shake = state.cameraShake;
  camera.position.x += (Math.random() - 0.5) * shake;
  camera.position.y += (Math.random() - 0.5) * shake * 0.6;
  camera.position.z += (Math.random() - 0.5) * shake;
  camera.lookAt(state.position.clone().add(new THREE.Vector3(0, 2.4, 0)));
}

function sendStateIfNeeded() {
  const now = performance.now();
  if (socket?.readyState !== WebSocket.OPEN || now - state.lastSentAt <= SEND_INTERVAL_MS) {
    return;
  }
  socket.send(
    JSON.stringify({
      type: "state",
      x: state.position.x,
      y: state.position.y,
      z: state.position.z,
      angle: state.heading,
      speed: state.velocity.length(),
      inZone: state.inZone
    })
  );
  state.lastSentAt = now;
}

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  socket.addEventListener("open", () => {
    updateConnection("Connected. Waiting for room handshake...", true);
    socket.send(JSON.stringify({ type: "join", room: roomCode, name: currentName, color: PLAYER_COLOR }));
  });
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "joined") {
      state.id = msg.id;
      state.connected = true;
      updateConnection(`Live in room "${msg.room}". Invite friends with the same URL.`, true);
      ensurePickups(msg.pickups || []);
      for (const player of msg.players || []) {
        if (player.id === state.id) {
          state.score = player.score || 0;
          respawnLocal(player);
        } else {
          ensureRemoteCar(player);
        }
      }
      updatePlayerCount();
      updateHud();
      return;
    }
    if (msg.type === "player-joined") {
      ensureRemoteCar(msg.player);
      updateHud();
      return;
    }
    if (msg.type === "player-left") {
      removeRemoteCar(msg.id);
      updateHud();
      return;
    }
    if (msg.type === "player-renamed") {
      if (msg.id !== state.id) {
        const remote = remoteCars.get(msg.id);
        if (remote) {
          remote.name = msg.name;
          updateRemoteLabel(remote);
        }
      }
      updateHud();
      return;
    }
    if (msg.type === "pickup-state") {
      setPickupState(msg.pickupId, msg.active);
      updateHud();
      return;
    }
    if (msg.type === "respawned") {
      respawnLocal(msg.player);
      state.score = msg.player.score || state.score;
      updateHud();
      return;
    }
    if (msg.type === "snapshot") {
      for (const player of msg.players || []) {
        ensureRemoteCar(player);
      }
      updateHud();
      return;
    }
    if (msg.type === "impact") {
      if (msg.targetId === state.id) {
        const angle = Math.atan2(state.position.x, state.position.z);
        state.velocity.x += Math.sin(angle) * (4 + msg.impulse * 8);
        state.velocity.z += Math.cos(angle) * (4 + msg.impulse * 8);
        state.cameraShake = Math.min(1, state.cameraShake + msg.impulse * 0.25);
        state.impactFlash = Math.max(state.impactFlash, msg.impulse * 0.2);
      } else {
        pulseImpact(msg.targetId, msg.impulse);
      }
    }
  });
  socket.addEventListener("close", () => {
    state.connected = false;
    updateConnection("Server disconnected. Refresh after restarting the server.", false);
  });
  socket.addEventListener("error", () => {
    updateConnection("Could not reach the multiplayer server.", false);
  });
}

connect();
updateHud();

const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateDriving(delta);
  updateRemoteCars(delta);
  updatePickups(delta, elapsed);
  collectNearbyPickups();
  updateCamera(delta);
  sendStateIfNeeded();
  updateHud();
  state.impactFlash = Math.max(0, state.impactFlash - delta * 0.6);
  renderer.toneMappingExposure = 1 + state.impactFlash * 0.3;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
