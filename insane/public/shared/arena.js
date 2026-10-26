// Shared arena layout for Crash Club INSANE.
// Loaded by the browser as a classic script (window.CRASH_CLUB_ARENA) and by the Node server via require().
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.CRASH_CLUB_ARENA = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const WORLD_SIZE = 180;
  const GRAVITY = 38;
  const LOW_GRAVITY_SCALE = 0.3;
  const HALF_PI = Math.PI / 2;
  const RING = { x: 0, z: 0, min: 8, max: 19 };

  const rails = [];
  for (let i = -6; i <= 6; i += 1) {
    rails.push({ x: i * 24, z: -94, sx: 18, sz: 2 });
    rails.push({ x: i * 24, z: 94, sx: 18, sz: 2 });
    rails.push({ x: -94, z: i * 24, sx: 2, sz: 18 });
    rails.push({ x: 94, z: i * 24, sx: 2, sz: 18 });
  }

  const buildings = [];
  for (let i = 0; i < 28; i += 1) {
    const side = i % 4;
    const offset = -140 + (i % 7) * 46;
    buildings.push({
      x: side < 2 ? offset : side === 2 ? -138 : 138,
      z: side < 2 ? (side === 0 ? -138 : 138) : offset,
      h: 12 + ((i * 17) % 28),
      sx: 18 + (i % 3) * 6,
      sz: 18 + (i % 4) * 5,
      colorIndex: i % 4
    });
  }

  const colliders = [
    ...rails.map((rail) => ({ x: rail.x, z: rail.z, r: Math.max(rail.sx, rail.sz) * 0.42, h: 3.2 })),
    ...buildings.map((building) => ({ x: building.x, z: building.z, r: 15, h: building.h }))
  ];

  // angle follows the car convention: forward = (sin(angle), cos(angle)). Ramps rise along forward.
  const ramps = [
    { id: "kick-north", x: 9, z: -46, angle: Math.PI, width: 12, length: 11, height: 3.2 },
    { id: "kick-south", x: -9, z: 46, angle: 0, width: 12, length: 11, height: 3.2 },
    { id: "kick-east", x: 46, z: 9, angle: HALF_PI, width: 12, length: 11, height: 3.2 },
    { id: "kick-west", x: -46, z: -9, angle: -HALF_PI, width: 12, length: 11, height: 3.2 },
    { id: "return-north", x: -12, z: -82, angle: 0, width: 10, length: 11, height: 3.4 },
    { id: "return-south", x: 12, z: 82, angle: Math.PI, width: 10, length: 11, height: 3.4 },
    { id: "return-east", x: 82, z: -12, angle: -HALF_PI, width: 10, length: 11, height: 3.4 },
    { id: "return-west", x: -82, z: 12, angle: HALF_PI, width: 10, length: 11, height: 3.4 },
    { id: "mega-southwest", x: -64, z: -64, angle: Math.PI / 4, width: 13, length: 22, height: 7, mega: true },
    { id: "mega-northeast", x: 64, z: 64, angle: (-3 * Math.PI) / 4, width: 13, length: 22, height: 7, mega: true }
  ];

  const jumpPads = [
    { id: "pad-northwest", x: -58, z: 58, r: 4.6, power: 34 },
    { id: "pad-southeast", x: 58, z: -58, r: 4.6, power: 34 },
    { id: "pad-outer-south", x: -22, z: 118, r: 4.6, power: 30 },
    { id: "pad-outer-north", x: 22, z: -118, r: 4.6, power: 30 }
  ];

  const boostPads = [
    { id: "strip-north", x: 9, z: -30, angle: Math.PI, width: 10, length: 7, speed: 64 },
    { id: "strip-south", x: -9, z: 30, angle: 0, width: 10, length: 7, speed: 64 },
    { id: "strip-east", x: 30, z: 9, angle: HALF_PI, width: 10, length: 7, speed: 64 },
    { id: "strip-west", x: -30, z: -9, angle: -HALF_PI, width: 10, length: 7, speed: 64 },
    { id: "strip-mega-southwest", x: -79, z: -79, angle: Math.PI / 4, width: 10, length: 7, speed: 66 },
    { id: "strip-mega-northeast", x: 79, z: 79, angle: (-3 * Math.PI) / 4, width: 10, length: 7, speed: 66 }
  ];

  function toLocal(feature, x, z) {
    const dx = x - feature.x;
    const dz = z - feature.z;
    const sin = Math.sin(feature.angle);
    const cos = Math.cos(feature.angle);
    return { along: dx * sin + dz * cos, side: dx * cos - dz * sin };
  }

  function rampProfile(t) {
    return Math.pow(Math.max(0, Math.min(1, t)), 1.5);
  }

  function rampHeightAt(ramp, x, z) {
    const local = toLocal(ramp, x, z);
    const halfLength = ramp.length / 2;
    if (Math.abs(local.side) > ramp.width / 2 || Math.abs(local.along) > halfLength) return 0;
    return ramp.height * rampProfile((local.along + halfLength) / ramp.length);
  }

  function groundHeightAt(x, z) {
    let height = 0;
    for (const ramp of ramps) {
      const reach = ramp.length + ramp.width;
      if (Math.abs(x - ramp.x) > reach || Math.abs(z - ramp.z) > reach) continue;
      const rampHeight = rampHeightAt(ramp, x, z);
      if (rampHeight > height) height = rampHeight;
    }
    return height;
  }

  // Slope of the ramp surface under (x, z), measured along a unit direction. 0 when not on a ramp.
  // Analytic, so it does not mistake the drop past a ramp lip for a downhill slope.
  function groundSlopeAt(x, z, dirX, dirZ) {
    let best = null;
    let bestHeight = 0;
    for (const ramp of ramps) {
      const rampHeight = rampHeightAt(ramp, x, z);
      if (rampHeight > bestHeight) {
        bestHeight = rampHeight;
        best = ramp;
      }
    }
    if (!best) return 0;
    const t = (toLocal(best, x, z).along + best.length / 2) / best.length;
    const rise = (best.height * 1.5 * Math.sqrt(Math.max(0, Math.min(1, t)))) / best.length;
    return rise * (dirX * Math.sin(best.angle) + dirZ * Math.cos(best.angle));
  }

  function jumpPadAt(x, z) {
    for (const pad of jumpPads) {
      const dx = x - pad.x;
      const dz = z - pad.z;
      if (dx * dx + dz * dz <= pad.r * pad.r) return pad;
    }
    return null;
  }

  function boostPadAt(x, z) {
    for (const pad of boostPads) {
      const local = toLocal(pad, x, z);
      if (Math.abs(local.side) <= pad.width / 2 && Math.abs(local.along) <= pad.length / 2) return pad;
    }
    return null;
  }

  // Ring Rush path: eases out of the center, then wanders the arena.
  function ringPathAt(seconds) {
    const blend = Math.max(0, Math.min(1, seconds / 2.5));
    return {
      x: Math.sin(seconds * 0.42) * 54 * blend,
      z: Math.sin(seconds * 0.33) * Math.cos(seconds * 0.11) * 48 * blend
    };
  }

  return {
    WORLD_SIZE,
    GRAVITY,
    LOW_GRAVITY_SCALE,
    RING,
    rails,
    buildings,
    colliders,
    ramps,
    jumpPads,
    boostPads,
    rampProfile,
    rampHeightAt,
    groundHeightAt,
    groundSlopeAt,
    jumpPadAt,
    boostPadAt,
    ringPathAt
  };
});
