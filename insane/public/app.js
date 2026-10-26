import("three")
  .then((THREE) => {
    const VERSION = "2.0.0";
    const ARENA = globalThis.CRASH_CLUB_ARENA;
    const WORLD_SIZE = ARENA.WORLD_SIZE;
    const STATE_SEND_MS = 80;
    const HIT_COOLDOWN_MS = 520;
    const MAX_BOOST = 100;
    const CENTER_MIN = ARENA.RING.min;
    const CENTER_MAX = ARENA.RING.max;
    const MAX_EFFECTS = 140;
    const GULAG_ENEMY_MAX_HEALTH = 180;
    const GULAG_BODY_DAMAGE = 20;
    const GULAG_HEADSHOT_DAMAGE = 42;
    const GULAG_BOUNDS = { minX: -30, maxX: 30, minZ: 256, maxZ: 328 };
    const CAR_COLLISION_RADIUS = 2.35;
    const CAR_COLLISION_AXIS_HALF = 2.65;
    const CAR_COLLISION_RANGE = CAR_COLLISION_RADIUS * 2;
    const CAR_SWEEP_MARGIN = 0.45;
    const HOP_POWER = 15;
    const HOP_COOLDOWN_MS = 900;
    const AIR_SPIN_RATE = 4.6;
    const AIR_FLIP_RATE = 5.4;
    const COMBO_WINDOW_MS = 3200;
    const COMBO_MAX_CASHOUT = 40;
    const BLACKHOLE_PULL_RADIUS = 46;
    const TWO_PI = Math.PI * 2;

    const pickupMeta = {
      boost: { label: "Boost", color: "#ffcf6b", emissive: "#8a5c00" },
      repair: { label: "Repair", color: "#59f0c2", emissive: "#0f6b56" },
      shield: { label: "Shield", color: "#7eb8ff", emissive: "#204a82" },
      slam: { label: "Slam", color: "#ff4f8b", emissive: "#7e173b" },
      crate: { label: "Mystery Crate", color: "#c084fc", emissive: "#5b21b6" }
    };

    const weaponMeta = {
      rocket: { label: "Homing Rockets", color: "#ff8a4c", glyph: "\u{1F680}", hint: "Locks onto whoever is in front of you." },
      mine: { label: "Prox Mines", color: "#ffcf6b", glyph: "\u{1F4A3}", hint: "Drops behind you. Arms after a beat." },
      shockwave: { label: "Shockwave", color: "#7eb8ff", glyph: "\u{1F300}", hint: "Blasts everyone near you into orbit." },
      blackhole: { label: "Black Hole", color: "#c084fc", glyph: "\u{1F573}\u{FE0F}", hint: "Lobbed forward. Sucks cars in, then pops." }
    };

    const chaosMeta = {
      meteors: { color: "#ff6b1f" },
      lowgrav: { color: "#9be7ff" },
      ice: { color: "#bdefff" },
      bomb: { color: "#ff2d55" },
      ringrush: { color: "#ffcf6b" },
      nitro: { color: "#59f0c2" },
      bounty: { color: "#ffd166" },
      lootstorm: { color: "#c084fc" },
      frenzy: { color: "#ff2d55" }
    };

    const explosionStyles = {
      rocket: { core: "#ffb36b", ring: "#ff8a4c", smoke: 4 },
      mine: { core: "#ffe08a", ring: "#ffcf6b", smoke: 5 },
      shockwave: { core: "#bfe0ff", ring: "#7eb8ff", smoke: 0 },
      blackhole: { core: "#e9d5ff", ring: "#c084fc", smoke: 3 },
      meteor: { core: "#ff9a4c", ring: "#ff4f1f", smoke: 7 },
      bomb: { core: "#fff1c2", ring: "#ff2d55", smoke: 9 },
      wreck: { core: "#ffd08a", ring: "#ff6b3d", smoke: 6 }
    };

    const causeGlyphs = {
      ram: "\u{1F4A5}",
      slam: "\u{1F528}",
      stomp: "⬇️",
      rocket: "\u{1F680}",
      mine: "\u{1F4A3}",
      shockwave: "\u{1F300}",
      blackhole: "\u{1F573}\u{FE0F}",
      meteor: "☄️",
      bomb: "\u{1F9E8}"
    };

    const els = {
      app: document.getElementById("app"),
      release: document.getElementById("release-screen"),
      name: document.getElementById("name-input"),
      roomInput: document.getElementById("room-input"),
      start: document.getElementById("start-button"),
      rename: document.getElementById("rename-button"),
      menu: document.getElementById("menu-button"),
      copy: document.getElementById("copy-invite-button"),
      room: document.getElementById("room-code"),
      count: document.getElementById("player-count"),
      speed: document.getElementById("speed-value"),
      boost: document.getElementById("boost-value"),
      score: document.getElementById("score-value"),
      health: document.getElementById("health-value"),
      round: document.getElementById("round-value"),
      timer: document.getElementById("timer-value"),
      power: document.getElementById("power-value"),
      healthBar: document.getElementById("health-bar"),
      boostBar: document.getElementById("boost-bar"),
      objective: document.getElementById("objective-card"),
      version: document.getElementById("version-value"),
      leader: document.getElementById("leader-value"),
      leaderboard: document.getElementById("leaderboard-list"),
      connection: document.getElementById("connection-card"),
      radar: document.getElementById("radar-canvas"),
      toast: document.getElementById("toast-stack"),
      banner: document.getElementById("round-banner"),
      bannerKicker: document.getElementById("round-kicker"),
      bannerMessage: document.getElementById("round-message"),
      damage: document.getElementById("damage-vignette"),
      speedLines: document.getElementById("speed-lines"),
      settings: document.getElementById("settings-button"),
      settingsPanel: document.getElementById("settings-popover"),
      settingsClose: document.getElementById("settings-close-button"),
      quality: document.getElementById("quality-select"),
      qualityMenu: document.getElementById("quality-select-popover"),
      sound: document.getElementById("sound-toggle"),
      soundMenu: document.getElementById("sound-toggle-popover"),
      volume: document.getElementById("volume-slider"),
      volumeMenu: document.getElementById("volume-slider-popover"),
      roomInputMenu: document.getElementById("room-input-popover"),
      roomJoin: document.getElementById("room-join-button"),
      music: document.getElementById("music-toggle"),
      musicMenu: document.getElementById("music-toggle-popover"),
      announcer: document.getElementById("announcer-toggle"),
      announcerMenu: document.getElementById("announcer-toggle-popover"),
      streak: document.getElementById("streak-value"),
      chaosBar: document.getElementById("chaos-bar"),
      chaosBarName: document.getElementById("chaos-bar-name"),
      chaosBarDetail: document.getElementById("chaos-bar-detail"),
      chaosBarFill: document.getElementById("chaos-bar-fill"),
      chaosBanner: document.getElementById("chaos-banner"),
      chaosKicker: document.getElementById("chaos-kicker"),
      chaosTitle: document.getElementById("chaos-title"),
      chaosTagline: document.getElementById("chaos-tagline"),
      callout: document.getElementById("callout"),
      calloutText: document.getElementById("callout-text"),
      calloutSub: document.getElementById("callout-sub"),
      bombWarning: document.getElementById("bomb-warning"),
      bombTimer: document.getElementById("bomb-timer"),
      combo: document.getElementById("combo-meter"),
      comboMult: document.getElementById("combo-mult"),
      comboPoints: document.getElementById("combo-points"),
      comboLabels: document.getElementById("combo-labels"),
      comboTimer: document.getElementById("combo-timer"),
      weaponSlot: document.getElementById("weapon-slot"),
      weaponGlyph: document.getElementById("weapon-glyph"),
      weaponName: document.getElementById("weapon-name"),
      weaponCharges: document.getElementById("weapon-charges"),
      killfeed: document.getElementById("killfeed"),
      flash: document.getElementById("flash-overlay")
    };
    const modeOverlay = createModeOverlay();
    const settings = loadSettings();
    applyQualityClasses();

    const url = new URL(location.href);
    const serverOverride = url.searchParams.get("server");
    let roomCode = sanitizeRoom(url.searchParams.get("room") || localStorage.getItem("crash-club-room") || "main");
    const input = new Set();
    const players = new Map();
    const pickups = new Map();
    const projectiles = new Map();
    const hazards = new Map();
    const effects = [];
    const blasts = [];
    const debris = [];
    const colliders = ARENA.colliders;
    const scratch2 = new THREE.Vector2();
    const scratch3 = new THREE.Vector3();
    const radarCtx = els.radar?.getContext("2d");
    let sunLight = null;
    let ringVisual = null;
    let stuntVisuals = { pads: [], strips: [] };
    let composer = null;
    let bloomPass = null;
    let flashLights = [];
    let skidMarks = null;

    const state = {
      id: null,
      socket: null,
      joined: false,
      mode: "arena",
      menuOpen: true,
      lastStateAt: 0,
      lastHitAt: 0,
      lastWallHitAt: 0,
      lastHudAt: 0,
      lastLeaderboardDrawAt: 0,
      lastRadarDrawAt: 0,
      lastPickupCheckAt: 0,
      lastPickupVisualAt: 0,
      lastNoticeAt: 0,
      lastToastText: "",
      lastToastAt: 0,
      lastMissingBackendAt: 0,
      connectWanted: false,
      connectionAttempt: 0,
      reconnectTimer: null,
      preconnected: false,
      mouseLook: false,
      serverOffset: 0,
      serverOffsetReady: false,
      nextFireAt: 0,
      timeScale: 1,
      slowmoUntil: 0,
      lastCalloutAt: 0,
      calloutTimer: 0,
      bannerTimer: 0,
      weaponRollUntil: 0,
      lastBombBeepAt: 0,
      ring: { x: 0, z: 0, min: CENTER_MIN, max: CENTER_MAX, mult: 1 },
      combo: { count: 0, points: 0, multiplier: 1, expiresAt: 0, labels: [] },
      room: {
        code: roomCode,
        phase: "live",
        round: 1,
        endsAt: Date.now() + 180000,
        nextRoundAt: 0,
        winner: null,
        standings: [],
        now: Date.now(),
        targetScore: 150,
        event: null,
        ring: null
      },
      car: {
        x: 0,
        y: 0,
        vy: 0,
        airborne: false,
        airTime: 0,
        airSpin: 0,
        airPitch: 0,
        airRoll: 0,
        groundPitch: 0,
        lastHopAt: 0,
        padCooldownUntil: 0,
        overspeedUntil: 0,
        lastStripId: null,
        lastStripAt: 0,
        streak: 0,
        weapon: null,
        weaponCharges: 0,
        z: 34,
        prevX: 0,
        prevZ: 34,
        prevAngle: Math.PI,
        angle: Math.PI,
        speed: 0,
        velocity: new THREE.Vector2(0, 0),
        boost: 72,
        health: 100,
        score: 0,
        roundWins: 0,
        shieldUntil: 0,
        slamUntil: 0,
        wreckedUntil: 0,
        gulagUntil: 0,
        driftCharge: 0,
        cameraShake: 0,
        lastBoostTrailAt: 0,
        lastSkidSmokeAt: 0,
        boosting: false,
        name: loadName(),
        color: loadColor()
      },
      gulag: {
        active: false,
        resultSent: false,
        opponentName: "Warden",
        health: 100,
        enemyHealth: GULAG_ENEMY_MAX_HEALTH,
        enemyFireAt: 0,
        playerFireAt: 0,
        firing: false,
        hitFlash: 0,
        muzzleFlash: 0,
        enemyMuzzleFlash: 0,
        enemyDodgeUntil: 0,
        enemyDodgeSide: 1,
        endsAt: 0,
        yaw: Math.PI,
        pitch: 0,
        position: new THREE.Vector3(0, 2.2, 268),
        velocity: new THREE.Vector3(),
        enemyPosition: new THREE.Vector3(0, 0, 310),
        enemyVelocity: new THREE.Vector3()
      },
      spectator: {
        yaw: Math.PI,
        pitch: -0.25,
        speed: 42,
        position: new THREE.Vector3(0, 58, 92),
        velocity: new THREE.Vector3()
      },
      podium: {
        active: false,
        round: 0,
        startedAt: 0,
        lastConfettiAt: 0,
        entrants: [],
        cars: [],
        confetti: []
      }
    };
    let lightweightNoticeTimer = 0;

    if (els.room) els.room.textContent = roomCode;
    if (els.version) els.version.textContent = VERSION;
    if (els.name) els.name.value = state.car.name;
    syncRoomInputs();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09131f");
    scene.fog = new THREE.FogExp2("#0d1724", 0.009);
    const arenaBackground = scene.background.clone();
    const arenaFog = scene.fog;

    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
    const renderer = new THREE.WebGLRenderer({ antialias: settings.quality === "showcase", powerPreference: "high-performance" });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());
    renderer.shadowMap.enabled = settings.quality === "showcase";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    els.app.appendChild(renderer.domElement);
    const particleGeometry = new THREE.SphereGeometry(1, 8, 6);
    const fx = createSharedFxAssets();
    const fxRoot = new THREE.Group();
    scene.add(fxRoot);

    const localCar = createCarMesh(state.car.color, true, state.car.name);
    scene.add(localCar.group);

    buildWorld();
    const gulagWorld = createGulagWorld();
    scene.add(gulagWorld.group);
    const podiumShowcase = createPodiumShowcase();
    scene.add(podiumShowcase.group);
    scene.add(camera);
    const weapon = createWeaponMesh();
    camera.add(weapon);
    setupLights();
    setupControls();
    setupSettingsControls();
    applyQualitySettings();
    loadPostProcessing();
    setTimeout(prewarmBackendConnection, 800);
    showBanner("Garage Open", "Pick a name and send it.");

    const clock = new THREE.Clock();
    requestAnimationFrame(loop);

    function loop() {
      const frameNow = performance.now();
      const rawDt = Math.min(clock.getDelta(), settings.quality === "performance" ? 0.042 : 0.05);
      updateTimeScale(frameNow);
      const dt = rawDt * state.timeScale;
      if (state.podium.active) {
        updatePodium(rawDt);
      } else if (state.mode === "gulag") {
        updateGulag(rawDt);
      } else if (state.mode === "spectator") {
        updateSpectator(rawDt);
      } else {
        updateLocalCar(dt);
      }
      if (!state.podium.active) {
        updateRing(dt);
        updateRemoteCars(dt);
        updatePickups(dt);
        updateStuntVisuals(dt);
        updateProjectiles(dt);
        updateHazards(dt);
      }
      updateEffects(dt);
      updateBlasts(dt);
      updateCombo();
      if (state.mode === "arena" && !state.podium.active) updateCamera(dt, rawDt);
      if (frameNow - state.lastHudAt >= getHudInterval()) {
        state.lastHudAt = frameNow;
        updateHud();
      }
      sendLocalState();
      updateEngineAudio();
      updateMusic();
      renderFrame(rawDt);
      requestAnimationFrame(loop);
    }

    function renderFrame(dt) {
      if (composer && settings.quality !== "performance") {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }
    }

    async function loadPostProcessing() {
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import("three/addons/postprocessing/EffectComposer.js"),
          import("three/addons/postprocessing/RenderPass.js"),
          import("three/addons/postprocessing/UnrealBloomPass.js"),
          import("three/addons/postprocessing/OutputPass.js")
        ]);
        const nextComposer = new EffectComposer(renderer);
        nextComposer.addPass(new RenderPass(scene, camera));
        bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.65, 0.42, 0.8);
        nextComposer.addPass(bloomPass);
        nextComposer.addPass(new OutputPass());
        composer = nextComposer;
        applyQualitySettings();
      } catch (error) {
        console.warn("Bloom unavailable, rendering without post-processing.", error);
        composer = null;
      }
    }

    function updateTimeScale(frameNow) {
      const target = frameNow < state.slowmoUntil ? 0.28 : 1;
      state.timeScale += (target - state.timeScale) * (target < state.timeScale ? 0.5 : 0.12);
      if (Math.abs(state.timeScale - target) < 0.01) state.timeScale = target;
      document.body.classList.toggle("is-slowmo", state.timeScale < 0.9 && settings.quality !== "performance");
    }

    function triggerSlowmo(durationMs = 420) {
      if (settings.quality === "performance") durationMs *= 0.6;
      state.slowmoUntil = Math.max(state.slowmoUntil, performance.now() + durationMs);
    }

    function flashScreen(color = "#ffffff", strength = 0.6) {
      if (!els.flash) return;
      els.flash.style.setProperty("--flash-color", color);
      els.flash.style.transition = "none";
      els.flash.style.opacity = String(strength);
      requestAnimationFrame(() => {
        els.flash.style.transition = "opacity 380ms ease-out";
        els.flash.style.opacity = "0";
      });
    }

    function getServerNow() {
      return Date.now() + state.serverOffset;
    }

    function setupLights() {
      const hemi = new THREE.HemisphereLight("#bde9ff", "#17202b", 1.35);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight("#fff2d0", 4.4);
      sun.position.set(-55, 82, 35);
      sun.castShadow = settings.quality === "showcase";
      sun.shadow.mapSize.set(settings.quality === "showcase" ? 1024 : 256, settings.quality === "showcase" ? 1024 : 256);
      sun.shadow.camera.left = -150;
      sun.shadow.camera.right = 150;
      sun.shadow.camera.top = 150;
      sun.shadow.camera.bottom = -150;
      scene.add(sun);
      sunLight = sun;

      const arenaGlow = new THREE.PointLight("#59f0c2", 2.4, 120);
      arenaGlow.position.set(0, 16, 0);
      scene.add(arenaGlow);

      // Fixed pool so explosions never change the light count (which would recompile every material).
      flashLights = [];
      for (let i = 0; i < 3; i += 1) {
        const light = new THREE.PointLight("#ffb36b", 0, 70, 1.6);
        light.position.set(0, -50, 0);
        scene.add(light);
        flashLights.push({ light, life: 0, maxLife: 1, peak: 0 });
      }
    }

    function buildWorld() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(460, 460, 24, 24),
        new THREE.MeshStandardMaterial({
          color: "#172c25",
          roughness: 0.92,
          metalness: 0.03,
          map: makeGroundTexture()
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      addRoad(0, 0, 36, 360, 0);
      addRoad(0, 0, 36, 360, Math.PI / 2);
      addRoad(0, 0, 22, 260, Math.PI / 4);
      addRoad(0, 0, 22, 260, -Math.PI / 4);
      addCenterArena();
      addGuardRails();
      addProps();
      addStuntFeatures();
      addSkyDetails();
      skidMarks = createSkidMarks();
    }

    function addRoad(x, z, width, length, rotation) {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({ color: "#243243", roughness: 0.86, metalness: 0.02 })
      );
      road.position.set(x, 0.025, z);
      road.rotation.set(-Math.PI / 2, 0, rotation);
      road.receiveShadow = true;
      scene.add(road);

      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, length * 0.92),
        new THREE.MeshBasicMaterial({ color: "#f3ce73", transparent: true, opacity: 0.78 })
      );
      stripe.position.set(x, 0.035, z);
      stripe.rotation.set(-Math.PI / 2, 0, rotation);
      scene.add(stripe);
    }

    function addCenterArena() {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#ffcf6b",
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(CENTER_MIN, CENTER_MAX, 96), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;

      const torusMat = new THREE.MeshStandardMaterial({ color: "#ffcf6b", emissive: "#5d3b00", emissiveIntensity: 0.8 });
      const torus = new THREE.Mesh(new THREE.TorusGeometry(CENTER_MAX, 0.32, 10, 96), torusMat);
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.22;

      const beacon = new THREE.PointLight("#ffcf6b", 1.2, 52);
      beacon.position.set(0, 9, 0);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(CENTER_MAX, CENTER_MAX, 70, 48, 1, true),
        new THREE.MeshBasicMaterial({
          color: "#ffcf6b",
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      pillar.position.y = 35;
      pillar.visible = false;

      group.add(ring, torus, beacon, pillar);
      scene.add(group);
      ringVisual = { group, ringMat, torusMat, beacon, pillar };
    }

    function addGuardRails() {
      const railMat = new THREE.MeshStandardMaterial({ color: "#87a1b8", roughness: 0.45, metalness: 0.45 });
      const postMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.55, metalness: 0.35 });

      for (const rail of ARENA.rails) {
        addRail(rail.x, rail.z, rail.sx, rail.sz, railMat, postMat);
      }
    }

    function addRail(x, z, sx, sz, railMat, postMat) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 1.2, sz), railMat);
      rail.position.set(x, 1.6, z);
      rail.castShadow = true;
      rail.receiveShadow = true;
      scene.add(rail);

      const post = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.2, 1.7), postMat);
      post.position.set(x, 1.6, z);
      post.castShadow = true;
      scene.add(post);
    }

    function addProps() {
      const colors = ["#31465e", "#203244", "#415067", "#26384c"];
      for (const spec of ARENA.buildings) {
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(spec.sx, spec.h, spec.sz),
          new THREE.MeshStandardMaterial({ color: colors[spec.colorIndex], roughness: 0.7, metalness: 0.05 })
        );
        building.position.set(spec.x, spec.h / 2, spec.z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
      }

      const coneMat = new THREE.MeshStandardMaterial({ color: "#ff7a3d", roughness: 0.55 });
      const coneStripe = new THREE.MeshBasicMaterial({ color: "#fff4d6" });
      for (let i = 0; i < 44; i += 1) {
        const angle = (i / 44) * Math.PI * 2;
        const radius = i % 2 ? 57 : 73;
        const cone = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 8), coneMat);
        body.position.y = 1.6;
        body.castShadow = true;
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.95, 0.18, 8), coneStripe);
        stripe.position.y = 1.65;
        cone.add(body, stripe);
        cone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        scene.add(cone);
      }

      for (let i = 0; i < 14; i += 1) {
        addStreetLight(Math.cos(i * 0.9) * 102, Math.sin(i * 0.9) * 102);
      }

      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        addTrackChevron(Math.cos(angle) * 31, Math.sin(angle) * 31, -angle + Math.PI / 2, i % 2 ? "#59f0c2" : "#ffcf6b");
      }

      addBillboard(-118, -54, Math.PI / 5, "BOOST", "#59f0c2");
      addBillboard(118, 52, -Math.PI / 1.2, "WRECK", "#ff4f8b");
      addBillboard(-70, 120, Math.PI, "RING", "#ffcf6b");
    }

    function addStreetLight(x, z) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 12, 10),
        new THREE.MeshStandardMaterial({ color: "#52677a", metalness: 0.35, roughness: 0.45 })
      );
      pole.position.set(x, 6, z);
      pole.castShadow = true;
      scene.add(pole);

      const lamp = new THREE.PointLight("#8edbff", 0.9, 34);
      lamp.position.set(x, 12.2, z);
      scene.add(lamp);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: "#c9f0ff" }));
      bulb.position.copy(lamp.position);
      scene.add(bulb);
    }

    function makeChevronGeometry() {
      const shape = new THREE.Shape();
      shape.moveTo(0, 2.9);
      shape.lineTo(3.2, 0);
      shape.lineTo(1.35, 0);
      shape.lineTo(0, 1.08);
      shape.lineTo(-1.35, 0);
      shape.lineTo(-3.2, 0);
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    }

    function addTrackChevron(x, z, rotation, color) {
      const mesh = new THREE.Mesh(
        makeChevronGeometry(),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, side: THREE.DoubleSide })
      );
      mesh.rotation.set(-Math.PI / 2, 0, rotation);
      mesh.position.set(x, 0.08, z);
      scene.add(mesh);
    }

    function addBillboard(x, z, rotation, title, accent) {
      const group = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: "#0b1018", metalness: 0.25, roughness: 0.55 });
      const boardMat = new THREE.MeshBasicMaterial({ map: makeBillboardTexture(title, accent), transparent: true });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), boardMat);
      board.position.y = 9.5;
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), postMat);
      const rightPost = leftPost.clone();
      leftPost.position.set(-7.6, 4.5, -0.15);
      rightPost.position.set(7.6, 4.5, -0.15);
      group.add(board, leftPost, rightPost);
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      scene.add(group);
    }

    function makeBillboardTexture(title, accent) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 512, 192);
      gradient.addColorStop(0, "rgba(7, 13, 24, 0.96)");
      gradient.addColorStop(1, "rgba(16, 30, 45, 0.94)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 18, 18, 476, 156, 24);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = "900 72px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, 256, 88);
      ctx.fillStyle = "rgba(245, 247, 251, 0.86)";
      ctx.font = "700 24px Trebuchet MS, Arial";
      ctx.fillText("CRASH CLUB", 256, 135);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function glowColor(hex, boost = 1.6) {
      return new THREE.Color(hex).multiplyScalar(boost);
    }

    function addStuntFeatures() {
      const rampMat = new THREE.MeshStandardMaterial({
        color: "#26354b",
        roughness: 0.48,
        metalness: 0.4,
        emissive: "#0b1a2c",
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
      });
      const megaMat = new THREE.MeshStandardMaterial({
        color: "#3b2150",
        roughness: 0.42,
        metalness: 0.42,
        emissive: "#2a0b3d",
        emissiveIntensity: 0.65,
        side: THREE.DoubleSide
      });
      const edgeMat = new THREE.MeshBasicMaterial({ color: glowColor("#59f0c2"), side: THREE.DoubleSide });
      const megaEdgeMat = new THREE.MeshBasicMaterial({ color: glowColor("#ff4f8b"), side: THREE.DoubleSide });
      const chevronMat = new THREE.MeshBasicMaterial({ color: "#59f0c2", transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
      const megaChevronMat = new THREE.MeshBasicMaterial({ color: "#ff4f8b", transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
      const chevronGeometry = makeChevronGeometry();

      for (const ramp of ARENA.ramps) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(makeRampGeometry(ramp.width, ramp.length, ramp.height), ramp.mega ? megaMat : rampMat);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const edge = ramp.mega ? megaEdgeMat : edgeMat;
        const lip = new THREE.Mesh(new THREE.BoxGeometry(ramp.width + 0.3, 0.24, 0.34), edge);
        lip.position.set(0, ramp.height + 0.04, ramp.length / 2 - 0.12);
        group.add(lip);
        const edgeGeometry = makeRampEdgeGeometry(ramp);
        for (const side of [-1, 1]) {
          const strip = new THREE.Mesh(edgeGeometry, edge);
          strip.position.x = side * (ramp.width / 2);
          group.add(strip);
        }
        for (const t of [0.3, 0.62]) {
          const chevron = new THREE.Mesh(chevronGeometry, ramp.mega ? megaChevronMat : chevronMat);
          chevron.position.set(0, ramp.height * ARENA.rampProfile(t) + 0.08, -ramp.length / 2 + ramp.length * t);
          chevron.rotation.x = Math.PI / 2 - Math.atan(rampSlopeAt(ramp, t));
          chevron.scale.setScalar(ramp.mega ? 1.3 : 0.85);
          group.add(chevron);
        }
        group.position.set(ramp.x, 0, ramp.z);
        group.rotation.y = ramp.angle;
        scene.add(group);

        if (ramp.mega) {
          const sideX = Math.cos(ramp.angle);
          const sideZ = -Math.sin(ramp.angle);
          addBillboard(
            ramp.x + sideX * 19 + Math.sin(ramp.angle) * 2,
            ramp.z + sideZ * 19 + Math.cos(ramp.angle) * 2,
            ramp.angle + Math.PI,
            "SEND IT",
            "#ff4f8b"
          );
        }
      }

      const padBaseMat = new THREE.MeshStandardMaterial({ color: "#101a26", roughness: 0.4, metalness: 0.5, emissive: "#0d3b33", emissiveIntensity: 0.6 });
      const padGlowMat = new THREE.MeshBasicMaterial({ color: glowColor("#59f0c2", 1.5), transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
      for (const pad of ARENA.jumpPads) {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r + 0.5, 0.32, 36), padBaseMat);
        base.position.y = 0.16;
        base.receiveShadow = true;
        const glow = new THREE.Mesh(new THREE.RingGeometry(pad.r * 0.45, pad.r * 0.9, 40), padGlowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.34;
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4), padGlowMat);
        arrow.position.y = 1.6;
        group.add(base, glow, arrow);
        const rings = [];
        for (let i = 0; i < 3; i += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(pad.r * 0.8, 0.08, 6, 36),
            new THREE.MeshBasicMaterial({ color: "#59f0c2", transparent: true, opacity: 0.6, depthWrite: false })
          );
          ring.rotation.x = Math.PI / 2;
          ring.userData.offset = i / 3;
          group.add(ring);
          rings.push(ring);
        }
        group.position.set(pad.x, 0, pad.z);
        scene.add(group);
        stuntVisuals.pads.push({ group, arrow, rings, pad });
      }

      const stripTexture = makeStripTexture();
      const stripMat = new THREE.MeshBasicMaterial({ map: stripTexture, color: glowColor("#ffffff", 1.35), transparent: true, opacity: 0.92, depthWrite: false });
      for (const strip of ARENA.boostPads) {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(strip.width, strip.length), stripMat);
        mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
        group.add(mesh);
        group.position.set(strip.x, 0.06, strip.z);
        group.rotation.y = strip.angle;
        scene.add(group);
      }
      stuntVisuals.strips.push({ texture: stripTexture });
    }

    function rampSlopeAt(ramp, t) {
      return (ramp.height * 1.5 * Math.sqrt(Math.max(0, t))) / ramp.length;
    }

    function makeRampGeometry(width, length, height, segments = 14) {
      const positions = [];
      const hw = width / 2;
      const hl = length / 2;
      const quad = (a, b, c, d) => positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < segments; i += 1) {
        const f0 = -hl + (length * i) / segments;
        const f1 = -hl + (length * (i + 1)) / segments;
        const h0 = height * ARENA.rampProfile(i / segments);
        const h1 = height * ARENA.rampProfile((i + 1) / segments);
        quad([-hw, h0, f0], [-hw, h1, f1], [hw, h1, f1], [hw, h0, f0]);
        quad([-hw, 0, f0], [-hw, 0, f1], [-hw, h1, f1], [-hw, h0, f0]);
        quad([hw, 0, f0], [hw, h0, f0], [hw, h1, f1], [hw, 0, f1]);
      }
      quad([-hw, 0, hl], [-hw, height, hl], [hw, height, hl], [hw, 0, hl]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      return geometry;
    }

    function makeRampEdgeGeometry(ramp, segments = 14) {
      const positions = [];
      const hl = ramp.length / 2;
      for (let i = 0; i < segments; i += 1) {
        const f0 = -hl + (ramp.length * i) / segments;
        const f1 = -hl + (ramp.length * (i + 1)) / segments;
        const h0 = ramp.height * ARENA.rampProfile(i / segments);
        const h1 = ramp.height * ARENA.rampProfile((i + 1) / segments);
        positions.push(0, h0 - 0.04, f0, 0, h1 - 0.04, f1, 0, h1 + 0.2, f1);
        positions.push(0, h0 - 0.04, f0, 0, h1 + 0.2, f1, 0, h0 + 0.2, f0);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      return geometry;
    }

    function makeStripTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(6, 30, 32, 0.55)";
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "#59f0c2";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(22, 92);
      ctx.lineTo(64, 40);
      ctx.lineTo(106, 92);
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1.6);
      return texture;
    }

    function createSkidMarks() {
      const count = 280;
      const mesh = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.75, 1.5),
        new THREE.MeshBasicMaterial({ color: "#05070b", transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
        count
      );
      const dummy = new THREE.Object3D();
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = 0; i < count; i += 1) mesh.setMatrixAt(i, dummy.matrix);
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, dummy, index: 0, count };
    }

    function addSkidMark(x, z, angle) {
      if (!skidMarks || settings.quality === "performance") return;
      const { mesh, dummy } = skidMarks;
      dummy.position.set(x, ARENA.groundHeightAt(x, z) + 0.045, z);
      dummy.rotation.set(-Math.PI / 2, 0, angle);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(skidMarks.index, dummy.matrix);
      skidMarks.index = (skidMarks.index + 1) % skidMarks.count;
      mesh.instanceMatrix.needsUpdate = true;
    }

    function updateRing(dt) {
      const event = state.room.event;
      const rush = event?.kind === "ringrush" && state.room.phase === "live";
      let x = ARENA.RING.x;
      let z = ARENA.RING.z;
      if (rush) {
        const point = ARENA.ringPathAt(Math.max(0, (getServerNow() - event.startedAt) / 1000));
        x = point.x;
        z = point.z;
      }
      state.ring.x = x;
      state.ring.z = z;
      state.ring.mult = rush ? 3 : 1;
      if (!ringVisual) return;
      ringVisual.group.position.set(x, 0, z);
      ringVisual.pillar.visible = rush;
      ringVisual.ringMat.opacity = rush ? 0.5 + Math.sin(performance.now() * 0.008) * 0.2 : 0.36;
      ringVisual.torusMat.emissiveIntensity = rush ? 2.4 : 0.8;
      ringVisual.beacon.intensity = rush ? 2.6 : 1.2;
      if (rush) ringVisual.pillar.rotation.y += dt * 0.6;
    }

    function updateStuntVisuals(dt) {
      const t = performance.now() * 0.001;
      const animateRings = settings.quality !== "performance";
      for (const entry of stuntVisuals.pads) {
        entry.arrow.position.y = 1.5 + Math.sin(t * 4 + entry.pad.x) * 0.35;
        entry.arrow.rotation.y += dt * 2.4;
        for (const ring of entry.rings) {
          ring.visible = animateRings;
          if (!animateRings) continue;
          const phase = (t * 0.9 + ring.userData.offset) % 1;
          ring.position.y = 0.4 + phase * 6;
          ring.scale.setScalar(1 - phase * 0.45);
          ring.material.opacity = (1 - phase) * 0.7;
        }
      }
      for (const strip of stuntVisuals.strips) strip.texture.offset.y -= dt * 1.8;
    }

    function createModeOverlay() {
      const overlay = document.createElement("div");
      overlay.className = "mode-overlay hidden";
      overlay.innerHTML = `
        <div class="mode-card">
          <span class="mode-kicker" id="mode-kicker">GULAG</span>
          <strong id="mode-title">Second chance duel</strong>
          <p id="mode-copy">WASD to move, mouse to aim, click or Space to shoot.</p>
          <div class="mode-bars">
            <span><b>YOU</b><i id="mode-health">100</i></span>
            <span><b>ENEMY</b><i id="mode-enemy">100</i></span>
            <span><b>TIME</b><i id="mode-time">45</i></span>
          </div>
        </div>
        <div class="crosshair" aria-hidden="true"></div>
      `;
      document.body.appendChild(overlay);
      return {
        root: overlay,
        kicker: overlay.querySelector("#mode-kicker"),
        title: overlay.querySelector("#mode-title"),
        copy: overlay.querySelector("#mode-copy"),
        health: overlay.querySelector("#mode-health"),
        enemy: overlay.querySelector("#mode-enemy"),
        time: overlay.querySelector("#mode-time")
      };
    }

    function createGulagWorld() {
      const group = new THREE.Group();
      group.visible = false;
      const coverAreas = [];
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(66, 84),
        new THREE.MeshStandardMaterial({
          color: "#171c27",
          roughness: 0.72,
          metalness: 0.08,
          map: makeGulagFloorTexture()
        })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0.015, 292);
      floor.receiveShadow = true;
      group.add(floor);

      const wallMat = new THREE.MeshStandardMaterial({
        color: "#151b27",
        roughness: 0.56,
        metalness: 0.22,
        emissive: "#07101b",
        emissiveIntensity: 0.24
      });
      const panelMat = new THREE.MeshStandardMaterial({
        color: "#202b3a",
        roughness: 0.44,
        metalness: 0.34,
        emissive: "#0d1a2a",
        emissiveIntensity: 0.34
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: "#070a10", roughness: 0.84, metalness: 0.2 });
      const coverMat = new THREE.MeshStandardMaterial({
        color: "#3a4659",
        roughness: 0.5,
        metalness: 0.34,
        emissive: "#0c1522",
        emissiveIntensity: 0.22
      });
      const stripeMat = new THREE.MeshBasicMaterial({ color: "#59f0c2", transparent: true, opacity: 0.74, depthWrite: false });
      const dangerMat = new THREE.MeshBasicMaterial({ color: "#ff4f8b", transparent: true, opacity: 0.52, depthWrite: false });
      const goldMat = new THREE.MeshBasicMaterial({ color: "#ffcf6b", transparent: true, opacity: 0.68, depthWrite: false });

      function addBox({ x, y, z, sx, sy, sz, mat = wallMat, cover = false }) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (cover) coverAreas.push({ x, z, hx: sx / 2 + 1.15, hz: sz / 2 + 1.15 });
        return mesh;
      }

      for (const wall of [
        { x: 0, z: 252, sx: 66, sz: 2 },
        { x: 0, z: 332, sx: 66, sz: 2 },
        { x: -33, z: 292, sx: 2, sz: 82 },
        { x: 33, z: 292, sx: 2, sz: 82 }
      ]) {
        addBox({ ...wall, y: 3.7, sy: 7.4 });
      }

      for (const beam of [
        { x: -20, z: 292, sx: 0.8, sz: 78 },
        { x: 20, z: 292, sx: 0.8, sz: 78 },
        { x: 0, z: 270, sx: 62, sz: 0.8 },
        { x: 0, z: 314, sx: 62, sz: 0.8 }
      ]) {
        addBox({ ...beam, y: 6.95, sy: 0.55, mat: darkMat });
      }

      for (let i = 0; i < 6; i += 1) {
        const x = -25 + i * 10;
        addBox({ x, y: 3.8, z: 331.2, sx: 6.8, sy: 4.6, sz: 0.35, mat: panelMat });
        addBox({ x, y: 3.8, z: 252.8, sx: 6.8, sy: 4.6, sz: 0.35, mat: panelMat });
      }

      for (let i = 0; i < 4; i += 1) {
        const z = 263 + i * 19;
        addBox({ x: -32.1, y: 3.5, z, sx: 0.32, sy: 4.2, sz: 8.6, mat: panelMat });
        addBox({ x: 32.1, y: 3.5, z, sx: 0.32, sy: 4.2, sz: 8.6, mat: panelMat });
      }

      for (const cover of [
        { x: -18, z: 283, sx: 8.5, sz: 2.3 },
        { x: 18, z: 301, sx: 8.5, sz: 2.3 },
        { x: -8, z: 307, sx: 3, sz: 8 },
        { x: 8, z: 287, sx: 3, sz: 8 }
      ]) {
        addBox({ ...cover, y: 0.78, sy: 1.56, mat: coverMat, cover: true });
        const cap = new THREE.Mesh(new THREE.BoxGeometry(cover.sx + 0.3, 0.12, cover.sz + 0.3), stripeMat);
        cap.position.set(cover.x, 1.6, cover.z);
        group.add(cap);
      }

      for (const pad of [
        { x: 0, z: 268, color: "#59f0c2" },
        { x: 0, z: 316, color: "#ff4f8b" }
      ]) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(4.8, 5.35, 48),
          new THREE.MeshBasicMaterial({ color: pad.color, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
        );
        ring.position.set(pad.x, 0.045, pad.z);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);
      }

      for (let i = 0; i < 9; i += 1) {
        const x = -24 + i * 6;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.28), i % 2 ? dangerMat : goldMat);
        stripe.position.set(x, 0.055, 292);
        stripe.rotation.x = -Math.PI / 2;
        group.add(stripe);
      }

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(21, 4.2),
        new THREE.MeshBasicMaterial({ map: makeGulagSignTexture(), transparent: true, depthWrite: false })
      );
      sign.position.set(0, 5.05, 331.02);
      sign.rotation.y = Math.PI;
      group.add(sign);

      const enemy = createGulagEnemyModel("Gulag Rival");
      enemy.position.copy(state.gulag.enemyPosition);
      group.add(enemy);

      for (const light of [
        { color: "#ff4f8b", x: -22, z: 262, intensity: 2.9 },
        { color: "#59f0c2", x: 22, z: 322, intensity: 2.6 },
        { color: "#ffcf6b", x: 0, z: 292, intensity: 1.6 }
      ]) {
        const point = new THREE.PointLight(light.color, light.intensity, 64);
        point.position.set(light.x, 7.8, light.z);
        group.add(point);
      }

      const fill = new THREE.HemisphereLight("#d6f4ff", "#28111f", 1.25);
      group.add(fill);

      const overhead = new THREE.SpotLight("#d6f4ff", 4.2, 88, 0.74, 0.48, 1.5);
      overhead.position.set(0, 16, 292);
      overhead.target.position.set(0, 0, 292);
      overhead.castShadow = true;
      overhead.shadow.mapSize.set(1024, 1024);
      group.add(overhead, overhead.target);

      return { group, enemy, coverAreas };
    }

    function createGulagEnemyModel(name) {
      const enemy = new THREE.Group();
      const suitMat = new THREE.MeshStandardMaterial({
        color: "#121823",
        roughness: 0.38,
        metalness: 0.42,
        emissive: "#07111f",
        emissiveIntensity: 0.32
      });
      const armorMat = new THREE.MeshStandardMaterial({
        color: "#46546b",
        roughness: 0.3,
        metalness: 0.48,
        emissive: "#5c102b",
        emissiveIntensity: 0.45
      });
      const accentMat = new THREE.MeshBasicMaterial({ color: "#ff4f8b" });
      const darkMat = new THREE.MeshStandardMaterial({ color: "#03050a", roughness: 0.62, metalness: 0.42 });
      const glowMat = new THREE.MeshBasicMaterial({ color: "#d6f4ff" });
      const warningMat = new THREE.MeshBasicMaterial({ color: "#ffcf6b" });
      const haloMat = new THREE.MeshBasicMaterial({ color: "#59f0c2", transparent: true, opacity: 0.58, depthWrite: false });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.42, 0.62), suitMat);
      torso.position.y = 1.85;
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.82, 0.18), armorMat);
      chest.position.set(0, 2.05, -0.4);
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.08), accentMat);
      core.position.set(0, 2.11, -0.52);
      const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.28, 8), darkMat);
      waist.position.y = 1.08;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.62, 0.68), darkMat);
      head.position.y = 2.93;
      const helmetCrown = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.28, 0.78), armorMat);
      helmetCrown.position.y = 3.28;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.08), glowMat);
      visor.position.set(0, 2.98, -0.39);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.2), armorMat);
      jaw.position.set(0, 2.72, -0.35);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.28, 10), darkMat);
      neck.position.y = 2.52;
      const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.62), armorMat);
      const rightShoulder = leftShoulder.clone();
      leftShoulder.position.set(-0.95, 2.38, -0.02);
      rightShoulder.position.set(0.95, 2.38, -0.02);
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.14, 0.32), darkMat);
      backpack.position.set(0, 1.92, 0.48);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), warningMat);
      antenna.position.set(0.34, 2.98, 0.58);
      antenna.rotation.z = -0.22;

      const armGeo = new THREE.CapsuleGeometry(0.16, 0.86, 4, 8);
      const legGeo = new THREE.CapsuleGeometry(0.18, 1.02, 4, 8);
      const leftArm = new THREE.Mesh(armGeo, suitMat);
      const rightArm = new THREE.Mesh(armGeo, suitMat);
      leftArm.position.set(-0.94, 1.86, -0.42);
      rightArm.position.set(0.94, 1.86, -0.42);
      leftArm.rotation.set(0.82, 0, 0.26);
      rightArm.rotation.set(0.82, 0, -0.26);
      const leftLeg = new THREE.Mesh(legGeo, darkMat);
      const rightLeg = new THREE.Mesh(legGeo, darkMat);
      leftLeg.position.set(-0.34, 0.72, 0);
      rightLeg.position.set(0.34, 0.72, 0);
      const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.72), darkMat);
      const rightBoot = leftBoot.clone();
      leftBoot.position.set(-0.34, 0.13, -0.1);
      rightBoot.position.set(0.34, 0.13, -0.1);
      const leftKnee = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.16), armorMat);
      const rightKnee = leftKnee.clone();
      leftKnee.position.set(-0.34, 0.92, -0.25);
      rightKnee.position.set(0.34, 0.92, -0.25);

      const gun = new THREE.Group();
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 1.45), darkMat);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.88, 10), darkMat);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.46), armorMat);
      const gunGlow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.34), glowMat);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), accentMat);
      gunBody.position.set(0, 0, -0.3);
      barrel.position.set(0, 0, -1.12);
      barrel.rotation.x = Math.PI / 2;
      stock.position.set(0, 0.02, 0.48);
      gunGlow.position.set(0, 0.05, -0.82);
      muzzle.position.set(0, 0, -1.52);
      muzzle.visible = false;
      gun.add(gunBody, barrel, stock, gunGlow, muzzle);
      gun.position.set(0, 2.05, -0.86);
      gun.rotation.x = -0.06;

      const torsoHalo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 6, 48), haloMat);
      torsoHalo.position.y = 2.05;
      const footGlow = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.18, 40), haloMat);
      footGlow.rotation.x = -Math.PI / 2;
      footGlow.position.y = 0.035;

      const label = createNameLabel(name, "#ffcf6b");
      label.position.set(0, 3.9, 0);

      enemy.add(
        torso,
        chest,
        core,
        waist,
        head,
        helmetCrown,
        visor,
        jaw,
        neck,
        leftShoulder,
        rightShoulder,
        backpack,
        antenna,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        leftBoot,
        rightBoot,
        leftKnee,
        rightKnee,
        gun,
        torsoHalo,
        footGlow,
        label
      );
      enemy.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      enemy.userData = {
        label,
        arms: [leftArm, rightArm],
        legs: [leftLeg, rightLeg],
        armorMat,
        suitMat,
        gun,
        muzzle,
        torsoHalo
      };
      return enemy;
    }

    function createWeaponMesh() {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: "#111722", roughness: 0.42, metalness: 0.48 });
      const dark = new THREE.MeshStandardMaterial({ color: "#03050a", roughness: 0.5, metalness: 0.55 });
      const accent = new THREE.MeshBasicMaterial({ color: "#59f0c2" });
      const flare = new THREE.MeshBasicMaterial({ color: "#ffcf6b", transparent: true, opacity: 0.95 });
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.4), dark);
      grip.position.set(0.46, -0.5, -0.88);
      grip.rotation.x = -0.25;
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.92), mat);
      receiver.position.set(0.4, -0.27, -1.24);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 1.12), dark);
      rail.position.set(0.4, -0.06, -1.28);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.82, 12), dark);
      barrel.position.set(0.4, -0.25, -1.9);
      barrel.rotation.x = Math.PI / 2;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 0.52), accent);
      glow.position.set(0.4, -0.08, -1.55);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), flare);
      muzzle.position.set(0.4, -0.25, -2.34);
      muzzle.visible = false;
      const muzzleLight = new THREE.PointLight("#ffcf6b", 0, 10);
      muzzleLight.position.copy(muzzle.position);
      group.add(grip, receiver, rail, barrel, glow, muzzle, muzzleLight);
      group.userData = { muzzle, muzzleLight, baseZ: -1.24 };
      group.scale.setScalar(0.62);
      group.visible = false;
      return group;
    }

    function makeGulagFloorTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#171c27";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(89, 240, 194, 0.16)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 207, 107, 0.26)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(256, 0);
      ctx.lineTo(256, 512);
      ctx.moveTo(0, 256);
      ctx.lineTo(512, 256);
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 4);
      return texture;
    }

    function makeGulagSignTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 768, 192);
      gradient.addColorStop(0, "rgba(7, 10, 18, 0.96)");
      gradient.addColorStop(0.5, "rgba(32, 16, 30, 0.98)");
      gradient.addColorStop(1, "rgba(7, 10, 18, 0.96)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 14, 14, 740, 164, 26);
      ctx.fill();
      ctx.strokeStyle = "#ff4f8b";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = "rgba(89, 240, 194, 0.7)";
      ctx.lineWidth = 3;
      ctx.strokeRect(42, 46, 684, 102);
      ctx.fillStyle = "#ffcf6b";
      ctx.font = "900 30px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ONE LIFE", 384, 54);
      ctx.fillStyle = "#f8fbff";
      ctx.font = "900 62px Trebuchet MS, Arial";
      ctx.fillText("LAST CHANCE", 384, 105);
      ctx.fillStyle = "rgba(89, 240, 194, 0.9)";
      ctx.font = "800 21px Trebuchet MS, Arial";
      ctx.fillText("WIN THE DUEL TO REDEPLOY", 384, 143);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function addSkyDetails() {
      const starGeo = new THREE.BufferGeometry();
      const starPositions = [];
      for (let i = 0; i < 180; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const r = 150 + Math.random() * 130;
        starPositions.push(Math.cos(a) * r, 80 + Math.random() * 95, Math.sin(a) * r);
      }
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#d6f4ff", size: 1.25, transparent: true, opacity: 0.72 })));

      const cloudMat = new THREE.MeshBasicMaterial({ color: "#b7d7e8", transparent: true, opacity: 0.18 });
      for (let i = 0; i < 9; i += 1) {
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(11 + (i % 3) * 3, 12, 8), cloudMat);
        cloud.scale.set(2.6, 0.42, 0.72);
        cloud.position.set(-150 + i * 38, 62 + (i % 3) * 7, -95 + (i % 5) * 45);
        scene.add(cloud);
      }
    }

    function createSharedFxAssets() {
      const additive = (color, opacity = 0.9) =>
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      const crownMat = new THREE.MeshStandardMaterial({ color: "#ffcf6b", emissive: "#ff9f1c", emissiveIntensity: 1.4, metalness: 0.7, roughness: 0.25 });
      return {
        flameGeometry: new THREE.ConeGeometry(0.42, 2.6, 10, 1, true),
        bubbleGeometry: new THREE.SphereGeometry(4.6, 24, 16),
        sphereGeometry: new THREE.SphereGeometry(1, 18, 12),
        ringGeometry: new THREE.RingGeometry(0.82, 1, 48),
        debrisGeometry: new THREE.BoxGeometry(0.9, 0.5, 1.2),
        rockGeometry: new THREE.DodecahedronGeometry(2.2, 0),
        crownBandGeometry: new THREE.CylinderGeometry(1.05, 1.2, 0.55, 12, 1, true),
        crownSpikeGeometry: new THREE.ConeGeometry(0.26, 0.75, 6),
        bombGeometry: new THREE.SphereGeometry(1.15, 16, 12),
        crownMat,
        bombMat: new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.35, metalness: 0.6, emissive: "#3a0010", emissiveIntensity: 0.6 }),
        fuseMat: new THREE.MeshBasicMaterial({ color: "#c9a26b" }),
        sparkMat: additive(glowColor("#ffcf6b", 2.2), 1),
        flameMat: additive(glowColor("#59f0c2", 1.8), 0.85),
        fireFlameMat: additive(glowColor("#ff7a1f", 1.8), 0.9),
        shieldMat: new THREE.MeshBasicMaterial({ color: "#7eb8ff", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
        additive
      };
    }

    function createCrown() {
      const crown = new THREE.Group();
      const band = new THREE.Mesh(fx.crownBandGeometry, fx.crownMat);
      crown.add(band);
      for (let i = 0; i < 5; i += 1) {
        const spike = new THREE.Mesh(fx.crownSpikeGeometry, fx.crownMat);
        const angle = (i / 5) * TWO_PI;
        spike.position.set(Math.cos(angle) * 1.1, 0.6, Math.sin(angle) * 1.1);
        crown.add(spike);
      }
      return crown;
    }

    function createBombProp() {
      const bomb = new THREE.Group();
      const shell = new THREE.Mesh(fx.bombGeometry, fx.bombMat);
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), fx.fuseMat);
      fuse.position.set(0.3, 1.25, 0);
      fuse.rotation.z = -0.4;
      const spark = new THREE.Mesh(fx.sphereGeometry, fx.sparkMat);
      spark.scale.setScalar(0.32);
      spark.position.set(0.5, 1.62, 0);
      bomb.add(shell, fuse, spark);
      bomb.userData.spark = spark;
      return bomb;
    }

    function createCarMesh(color, isLocal, name, isBot = false) {
      const group = new THREE.Group();
      const chassis = new THREE.Group();
      chassis.rotation.order = "YXZ";
      group.add(chassis);
      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.42,
        metalness: 0.28,
        emissive: color,
        emissiveIntensity: isLocal ? 0.08 : 0.04
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: "#0b111a", roughness: 0.55, metalness: 0.2 });
      const glassMat = new THREE.MeshStandardMaterial({ color: "#bdefff", roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.72 });
      const tireMat = new THREE.MeshStandardMaterial({ color: "#06080c", roughness: 0.78 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.25, 7.2), bodyMat);
      body.position.y = 0.78;
      body.castShadow = true;
      body.receiveShadow = true;
      const nose = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.75, 2.4), bodyMat);
      nose.position.set(0, 0.98, 3.45);
      nose.castShadow = true;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.35, 2.8), glassMat);
      cabin.position.set(0, 1.78, -0.55);
      cabin.castShadow = true;
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.22, 0.55), darkMat);
      spoiler.position.set(0, 1.68, -4.0);
      spoiler.castShadow = true;
      const underglow = new THREE.PointLight(color, isLocal ? 1.25 : 0.6, 12);
      underglow.position.set(0, 0.35, 0);

      const headMat = new THREE.MeshBasicMaterial({ color: "#fff6ca" });
      const tailMat = new THREE.MeshBasicMaterial({ color: "#ff315d" });
      const leftHead = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.25, 0.16), headMat);
      const rightHead = leftHead.clone();
      leftHead.position.set(-1.25, 0.95, 3.68);
      rightHead.position.set(1.25, 0.95, 3.68);
      const leftTail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.16), tailMat);
      const rightTail = leftTail.clone();
      leftTail.position.set(-1.25, 0.91, -3.68);
      rightTail.position.set(1.25, 0.91, -3.68);

      const wheels = [];
      for (const x of [-2.35, 2.35]) {
        for (const z of [-2.55, 2.55]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.6, 18), tireMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.36, z);
          wheel.castShadow = true;
          wheels.push(wheel);
        }
      }

      const label = createNameLabel(name || "Driver", isLocal ? "#59f0c2" : "#ffffff");
      label.position.set(0, 3.55, 0);

      const botMarker = new THREE.Group();
      if (isBot) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.65, 0.1, 8, 42),
          new THREE.MeshBasicMaterial({ color: "#ffcf6b", transparent: true, opacity: 0.82 })
        );
        ring.rotation.x = Math.PI / 2;
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 10, 8),
          new THREE.MeshBasicMaterial({ color: "#ffcf6b" })
        );
        beacon.position.y = 0.85;
        const light = new THREE.PointLight("#ffcf6b", 0.8, 18);
        light.position.y = 0.85;
        botMarker.position.y = 3.8;
        botMarker.add(ring, beacon, light);
      }

      const flames = [];
      for (const x of [-1.2, 1.2]) {
        const flame = new THREE.Mesh(fx.flameGeometry, fx.flameMat);
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(x, 0.86, -4.95);
        flame.visible = false;
        flames.push(flame);
      }
      const fireFlames = [];
      for (const x of [-1.6, 0, 1.6]) {
        const flame = new THREE.Mesh(fx.flameGeometry, fx.fireFlameMat);
        flame.position.set(x, 2.3, -1.2 + Math.abs(x) * 0.6);
        flame.scale.set(1.3, 0.9, 1.3);
        flame.visible = false;
        fireFlames.push(flame);
      }
      const bubble = new THREE.Mesh(fx.bubbleGeometry, fx.shieldMat);
      bubble.scale.set(1, 0.62, 1.15);
      bubble.position.y = 1.2;
      bubble.visible = false;
      const crown = createCrown();
      crown.position.y = 5.6;
      crown.visible = false;
      const bomb = createBombProp();
      bomb.position.y = 6.4;
      bomb.visible = false;

      chassis.add(body, nose, cabin, spoiler, leftHead, rightHead, leftTail, rightTail, ...wheels, ...flames, ...fireFlames);
      group.add(underglow, label, botMarker, bubble, crown, bomb);
      return {
        group,
        chassis,
        wheels,
        label,
        bodyMat,
        underglow,
        flames,
        fireFlames,
        bubble,
        crown,
        bomb,
        baseColor: new THREE.Color(color),
        target: new THREE.Vector3(),
        targetAngle: 0
      };
    }

    function updateCarExtras(mesh, info, now, dt) {
      const flicker = 0.75 + Math.random() * 0.5;
      for (const flame of mesh.flames) {
        flame.visible = Boolean(info.boosting);
        if (flame.visible) flame.scale.set(1, flicker * (1.2 + (info.overspeed ? 0.6 : 0)), 1);
      }
      const onFire = (info.streak || 0) >= 3;
      for (const [index, flame] of mesh.fireFlames.entries()) {
        flame.visible = onFire && settings.quality !== "performance";
        if (flame.visible) flame.scale.set(1.3, 0.7 + Math.sin(now * 0.02 + index * 2) * 0.25 + Math.random() * 0.2, 1.3);
      }
      mesh.underglow.color.copy(onFire ? fireColor : mesh.baseColor);
      mesh.bubble.visible = Boolean(info.shielded);
      if (mesh.bubble.visible) {
        mesh.bubble.rotation.y += dt * 1.6;
        mesh.bubble.material.opacity = 0.12 + Math.sin(now * 0.01) * 0.05;
      }
      mesh.crown.visible = Boolean(info.isLeader);
      if (mesh.crown.visible) {
        mesh.crown.rotation.y += dt * 1.8;
        mesh.crown.position.y = 5.6 + Math.sin(now * 0.004) * 0.2;
      }
      mesh.bomb.visible = Boolean(info.hasBomb);
      if (mesh.bomb.visible) {
        const fuseLeft = Math.max(0, (state.room.event?.fuseEndsAt || 0) - getServerNow());
        const rate = fuseLeft < 5000 ? 0.04 : 0.016;
        mesh.bomb.userData.spark.scale.setScalar(0.25 + (Math.sin(now * rate) > 0 ? 0.25 : 0.05));
        mesh.bomb.rotation.y += dt * 3;
        mesh.bomb.position.y = 6.4 + Math.sin(now * 0.01) * 0.25;
      }
      if (mesh.slamGlow !== info.slamming) {
        mesh.slamGlow = info.slamming;
        mesh.bodyMat.emissive.set(info.slamming ? "#ff4f8b" : mesh.baseColor);
        mesh.bodyMat.emissiveIntensity = info.slamming ? 0.55 : mesh === localCar ? 0.08 : 0.04;
      }
    }

    function createNameLabel(name, color) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(5, 10, 18, 0.74)";
      roundRect(ctx, 8, 10, 240, 42, 18);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = "800 24px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(name).slice(0, 18), 128, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
      sprite.scale.set(8.5, 2.1, 1);
      return sprite;
    }

    function updateNameLabel(sprite, name, color) {
      const replacement = createNameLabel(name, color);
      sprite.material.map.dispose();
      sprite.material.dispose();
      sprite.material = replacement.material;
    }

    function createPodiumShowcase() {
      const group = new THREE.Group();
      group.visible = false;

      const baseMat = new THREE.MeshStandardMaterial({
        color: "#111827",
        roughness: 0.48,
        metalness: 0.34,
        emissive: "#06111f",
        emissiveIntensity: 0.3
      });
      const topMat = new THREE.MeshStandardMaterial({
        color: "#27364a",
        roughness: 0.38,
        metalness: 0.45,
        emissive: "#102238",
        emissiveIntensity: 0.34
      });
      const trimMats = ["#ffcf6b", "#bdefff", "#ff8a4c"].map(
        (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 })
      );

      const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(23, 26, 0.55, 80),
        new THREE.MeshStandardMaterial({ color: "#0b111a", roughness: 0.64, metalness: 0.22 })
      );
      floor.position.y = -0.28;
      floor.receiveShadow = true;
      group.add(floor);

      const stages = [
        { rank: 2, x: -8.5, height: 2.3, width: 7.2, colorIndex: 1 },
        { rank: 1, x: 0, height: 3.55, width: 8.4, colorIndex: 0 },
        { rank: 3, x: 8.5, height: 1.65, width: 7.2, colorIndex: 2 }
      ];

      for (const stage of stages) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(stage.width, stage.height, 7.4), baseMat);
        block.position.set(stage.x, stage.height / 2, 0);
        block.castShadow = true;
        block.receiveShadow = true;

        const top = new THREE.Mesh(new THREE.BoxGeometry(stage.width + 0.35, 0.22, 7.75), topMat);
        top.position.set(stage.x, stage.height + 0.11, 0);
        top.castShadow = true;
        top.receiveShadow = true;

        const trim = new THREE.Mesh(new THREE.BoxGeometry(stage.width + 0.5, 0.16, 0.22), trimMats[stage.colorIndex]);
        trim.position.set(stage.x, stage.height + 0.28, -3.98);

        const rank = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, 2.1),
          new THREE.MeshBasicMaterial({ map: makeRankTexture(stage.rank, trimMats[stage.colorIndex].color.getStyle()), transparent: true })
        );
        rank.position.set(stage.x, stage.height * 0.48, -3.82);

        group.add(block, top, trim, rank);
      }

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 5),
        new THREE.MeshBasicMaterial({ map: makePodiumSignTexture(), transparent: true, depthWrite: false })
      );
      sign.position.set(0, 8.7, -5.2);
      group.add(sign);

      const backGlow = new THREE.PointLight("#ffcf6b", 2.2, 42);
      backGlow.position.set(0, 8, -7);
      const tealGlow = new THREE.PointLight("#59f0c2", 2.1, 38);
      tealGlow.position.set(-11, 5.5, 5);
      const pinkGlow = new THREE.PointLight("#ff4f8b", 2, 38);
      pinkGlow.position.set(11, 5.5, 5);
      group.add(backGlow, tealGlow, pinkGlow);

      const confettiGeometry = new THREE.BoxGeometry(0.18, 0.035, 0.34);
      const confettiMaterials = ["#ffcf6b", "#59f0c2", "#ff4f8b", "#7eb8ff", "#f8fbff", "#ff8a4c"].map(
        (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      );

      return {
        group,
        confettiGeometry,
        confettiMaterials,
        slots: [
          { rank: 1, x: 0, y: 3.82, z: 0.15, angle: Math.PI },
          { rank: 2, x: -8.5, y: 2.57, z: 0.15, angle: Math.PI * 0.92 },
          { rank: 3, x: 8.5, y: 1.92, z: 0.15, angle: Math.PI * 1.08 }
        ]
      };
    }

    function makeRankTexture(rank, color) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(5, 10, 18, 0.7)";
      roundRect(ctx, 18, 18, 220, 156, 28);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fillStyle = "#f8fbff";
      ctx.font = "900 96px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`#${rank}`, 128, 98);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function makePodiumSignTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 896;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 896, 256);
      gradient.addColorStop(0, "rgba(7, 12, 22, 0.94)");
      gradient.addColorStop(0.5, "rgba(43, 30, 12, 0.96)");
      gradient.addColorStop(1, "rgba(7, 12, 22, 0.94)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 18, 18, 860, 220, 34);
      ctx.fill();
      ctx.strokeStyle = "#ffcf6b";
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.fillStyle = "#59f0c2";
      ctx.font = "900 34px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ROUND COMPLETE", 448, 64);
      ctx.fillStyle = "#f8fbff";
      ctx.font = "900 74px Trebuchet MS, Arial";
      ctx.fillText("TOP 3 PODIUM", 448, 134);
      ctx.fillStyle = "rgba(255, 79, 139, 0.95)";
      ctx.font = "800 25px Trebuchet MS, Arial";
      ctx.fillText("CONFETTI, BRAGGING RIGHTS, THEN BACK TO CHAOS", 448, 190);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function setupControls() {
      addEventListener("pointerdown", unlockAudio, { once: true });
      addEventListener("keydown", unlockAudio, { once: true });
      els.start?.addEventListener("click", startDriving);
      els.rename?.addEventListener("click", saveName);
      els.menu?.addEventListener("click", () => setMenu(!state.menuOpen));
      els.copy?.addEventListener("click", copyInvite);
      els.name?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") startDriving();
      });
      els.roomInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") startDriving();
      });
      els.roomInputMenu?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          joinTypedRoom();
        }
      });
      els.roomJoin?.addEventListener("click", joinTypedRoom);
      addEventListener("pointermove", handlePointerLook);
      addEventListener("pointerdown", (event) => {
        if (state.mode === "gulag") {
          event.preventDefault();
          state.gulag.firing = true;
          document.body.requestPointerLock?.();
          fireGulagShot();
        } else if (state.mode === "spectator") {
          event.preventDefault();
          document.body.requestPointerLock?.();
        } else if (event.button === 0 && event.pointerType === "mouse" && event.target === renderer.domElement) {
          fireWeapon();
        }
      });
      addEventListener("pointerup", () => {
        state.mouseLook = false;
        state.gulag.firing = false;
      });

      addEventListener("keydown", (event) => {
        const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
        if (typing && event.key !== "Escape") return;
        const key = normalizeKey(event.key);
        if (key === "escape") {
          if (state.mode === "gulag" || state.mode === "spectator") {
            document.exitPointerLock?.();
            return;
          }
          if (state.joined) setMenu(!state.menuOpen);
          return;
        }
        if (key === "r") {
          sendMessage({ type: "respawn" });
          return;
        }
        if ((key === " " || key === "f") && state.mode === "gulag") {
          event.preventDefault();
          fireGulagShot();
          return;
        }
        if (key === " " && state.mode === "arena") {
          event.preventDefault();
          if (!event.repeat) hopCar();
          return;
        }
        if (key === "f" && state.mode === "arena") {
          if (!event.repeat) fireWeapon();
          return;
        }
        input.add(key);
      });

      addEventListener("keyup", (event) => input.delete(normalizeKey(event.key)));
      addEventListener("resize", onResize);

      for (const button of document.querySelectorAll(".touch-controls button")) {
        const key = button.dataset.key;
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          if (key === "r") {
            sendMessage({ type: "respawn" });
            return;
          }
          if (key === " ") {
            hopCar();
            return;
          }
          if (key === "fire") {
            fireWeapon();
            return;
          }
          input.add(key);
          button.classList.add("is-down");
        });
        const release = (event) => {
          event.preventDefault();
          input.delete(key);
          button.classList.remove("is-down");
        };
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("pointerleave", release);
      }
    }

    function syncRoomInputs() {
      for (const input of [els.roomInput, els.roomInputMenu]) {
        if (input) input.value = roomCode;
      }
      if (els.room) els.room.textContent = roomCode;
    }

    function setRoomCode(value, options = {}) {
      const nextRoom = sanitizeRoom(value);
      const changed = nextRoom !== roomCode;
      roomCode = nextRoom;
      state.room.code = roomCode;
      localStorage.setItem("crash-club-room", roomCode);
      syncRoomInputs();
      if (options.updateUrl !== false) {
        const nextUrl = new URL(location.href);
        if (roomCode === "main") nextUrl.searchParams.delete("room");
        else nextUrl.searchParams.set("room", roomCode);
        history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }
      return changed;
    }

    function getTypedRoomCode() {
      return els.roomInputMenu?.value || els.roomInput?.value || roomCode;
    }

    function roomShareUrl(code = roomCode) {
      const nextRoom = sanitizeRoom(code);
      const invite = new URL(location.href);
      if (nextRoom === "main") invite.searchParams.delete("room");
      else invite.searchParams.set("room", nextRoom);
      return invite.toString();
    }

    function joinTypedRoom() {
      const changed = setRoomCode(getTypedRoomCode());
      if (state.joined && changed) {
        toast(`Switching to room ${roomCode}...`, "info");
        location.assign(roomShareUrl(roomCode));
        return;
      }
      if (!state.joined) {
        startDriving();
        return;
      }
      toggleSettingsPanel(false);
      setMenu(false);
      toast(`Already in room ${roomCode}.`, "info");
    }

    function setupSettingsControls() {
      syncSettingsControls();
      els.settings?.addEventListener("click", () => toggleSettingsPanel());
      els.settingsClose?.addEventListener("click", () => toggleSettingsPanel(false));
      els.quality?.addEventListener("change", (event) => updateSetting("quality", event.target.value));
      els.qualityMenu?.addEventListener("change", (event) => updateSetting("quality", event.target.value));
      els.sound?.addEventListener("change", (event) => updateSetting("sound", event.target.checked));
      els.soundMenu?.addEventListener("change", (event) => updateSetting("sound", event.target.checked));
      els.volume?.addEventListener("input", (event) => updateSetting("volume", Number(event.target.value) / 100));
      els.volumeMenu?.addEventListener("input", (event) => updateSetting("volume", Number(event.target.value) / 100));
      els.music?.addEventListener("change", (event) => updateSetting("music", event.target.checked));
      els.musicMenu?.addEventListener("change", (event) => updateSetting("music", event.target.checked));
      els.announcer?.addEventListener("change", (event) => updateSetting("announcer", event.target.checked));
      els.announcerMenu?.addEventListener("change", (event) => updateSetting("announcer", event.target.checked));
    }

    function toggleSettingsPanel(forceOpen) {
      const open = forceOpen ?? els.settingsPanel?.classList.contains("hidden");
      els.settingsPanel?.classList.toggle("hidden", !open);
    }

    function updateSetting(key, value) {
      if (key === "quality") {
        settings.quality = ["performance", "balanced", "showcase"].includes(value) ? value : "performance";
        settings.qualityManual = true;
        applyQualitySettings();
      } else if (key === "sound") {
        settings.sound = Boolean(value);
      } else if (key === "volume") {
        settings.volume = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
      } else if (key === "music") {
        settings.music = Boolean(value);
      } else if (key === "announcer") {
        settings.announcer = Boolean(value);
        if (!settings.announcer) globalThis.speechSynthesis?.cancel();
      }
      saveSettings();
      syncSettingsControls();
    }

    function syncSettingsControls() {
      for (const select of [els.quality, els.qualityMenu]) {
        if (select) select.value = settings.quality;
      }
      for (const toggle of [els.sound, els.soundMenu]) {
        if (toggle) toggle.checked = settings.sound;
      }
      for (const slider of [els.volume, els.volumeMenu]) {
        if (slider) slider.value = String(Math.round(settings.volume * 100));
      }
      for (const toggle of [els.music, els.musicMenu]) {
        if (toggle) toggle.checked = settings.music;
      }
      for (const toggle of [els.announcer, els.announcerMenu]) {
        if (toggle) toggle.checked = settings.announcer;
      }
    }

    function loadSettings() {
      const defaults = { quality: "showcase", sound: true, music: true, announcer: true, volume: 0.55, qualityManual: false };
      try {
        const saved = JSON.parse(localStorage.getItem("crash-club-settings") || "{}");
        const qualityManual = saved.qualityManual === true;
        return {
          quality: qualityManual && ["performance", "balanced", "showcase"].includes(saved.quality) ? saved.quality : defaults.quality,
          sound: typeof saved.sound === "boolean" ? saved.sound : defaults.sound,
          music: typeof saved.music === "boolean" ? saved.music : defaults.music,
          announcer: typeof saved.announcer === "boolean" ? saved.announcer : defaults.announcer,
          volume: Number.isFinite(Number(saved.volume)) ? THREE.MathUtils.clamp(Number(saved.volume), 0, 1) : defaults.volume,
          qualityManual
        };
      } catch {
        return defaults;
      }
    }

    function saveSettings() {
      localStorage.setItem("crash-club-settings", JSON.stringify(settings));
    }

    function applyQualityClasses() {
      document.body.classList.toggle("quality-performance", settings.quality === "performance");
      document.body.classList.toggle("quality-balanced", settings.quality === "balanced");
      document.body.classList.toggle("quality-showcase", settings.quality === "showcase");
    }

    function applyQualitySettings() {
      applyQualityClasses();
      renderer.setPixelRatio(getRenderPixelRatio());
      renderer.shadowMap.enabled = settings.quality === "showcase";
      if (sunLight) {
        sunLight.castShadow = settings.quality === "showcase";
        sunLight.shadow.mapSize.set(settings.quality === "showcase" ? 1024 : 256, settings.quality === "showcase" ? 1024 : 256);
      }
      localCar.label.visible = settings.quality !== "performance";
      if (settings.quality === "performance") {
        localCar.underglow.intensity = Math.min(localCar.underglow.intensity, 0.7);
      }
      if (composer) {
        composer.setPixelRatio(getRenderPixelRatio());
        composer.setSize(innerWidth, innerHeight);
      }
      if (bloomPass) {
        bloomPass.strength = settings.quality === "showcase" ? 0.65 : 0.45;
        bloomPass.radius = settings.quality === "showcase" ? 0.45 : 0.3;
      }
    }

    function getRenderPixelRatio() {
      if (settings.quality === "showcase") return Math.min(devicePixelRatio || 1, 1.25);
      if (settings.quality === "balanced") return Math.min(devicePixelRatio || 1, 1);
      return 0.72;
    }

    function getHudInterval() {
      return settings.quality === "performance" ? 150 : 90;
    }

    function getMaxEffects() {
      if (settings.quality === "showcase") return MAX_EFFECTS;
      if (settings.quality === "balanced") return 48;
      return 28;
    }

    function handlePointerLook(event) {
      if (state.mode !== "gulag" && state.mode !== "spectator") return;
      if (document.pointerLockElement !== document.body && event.buttons !== 1) return;
      const target = state.mode === "gulag" ? state.gulag : state.spectator;
      target.yaw -= event.movementX * 0.0024;
      target.pitch = THREE.MathUtils.clamp(target.pitch - event.movementY * 0.002, -1.1, 1.05);
    }

    function unlockAudio(event) {
      if (!event.isTrusted) return;
      playTone.enabled = true;
      warmAudio();
    }

    function startDriving() {
      const changedRoom = setRoomCode(els.roomInput?.value || roomCode);
      if (state.joined && changedRoom) {
        toast(`Switching to room ${roomCode}...`, "info");
        location.assign(roomShareUrl(roomCode));
        return;
      }
      saveName({ silent: true });
      if (isStaticFrontendMissingBackend()) {
        showMissingBackendMessage();
        return;
      }
      state.connectWanted = true;
      if (state.socket?.readyState === WebSocket.CONNECTING) {
        setStatus("Waking the multiplayer backend. Starting as soon as it connects...", "offline");
        toast("Still connecting. If the backend is sleeping, give it a few seconds.", "info");
        return;
      }
      setStatus("Connecting to Crash Club...", "offline");
      wakeBackend();
      if (!state.socket || state.socket.readyState > WebSocket.OPEN) {
        state.connectionAttempt = 0;
        connectSocket({ joinOnOpen: true });
      } else if (state.socket.readyState === WebSocket.OPEN && !state.joined) {
        joinRoom();
      } else if (state.joined) {
        setMenu(false);
      }
    }

    function saveName(options = {}) {
      state.car.name = String(els.name?.value || "Driver").trim().slice(0, 18) || "Driver";
      localStorage.setItem("crash-club-name", state.car.name);
      updateNameLabel(localCar.label, state.car.name, "#59f0c2");
      sendMessage({ type: "rename", name: state.car.name });
      if (!options.silent) toast(`Name saved: ${state.car.name}`, "info");
    }

    function getConfiguredServerEndpoint() {
      return String(serverOverride || globalThis.CRASH_CLUB_SERVER_URL || "").trim();
    }

    function isStaticFrontendMissingBackend() {
      return Boolean(globalThis.CRASH_CLUB_STATIC_FRONTEND) && !getConfiguredServerEndpoint();
    }

    function showMissingBackendMessage() {
      const now = performance.now();
      const message = "Vercel site is live, but no backend URL was injected. Redeploy the latest build or set CRASH_CLUB_SERVER_URL in Vercel.";
      setStatus(message, "offline");
      if (now - state.lastMissingBackendAt > 4500) {
        state.lastMissingBackendAt = now;
        toast("Missing backend URL. Redeploy latest or set CRASH_CLUB_SERVER_URL.", "danger");
      }
      if (els.objective) {
        els.objective.textContent = "Cloud setup needed: Vercel hosts the game page, but multiplayer needs a live Node/WebSocket backend URL.";
      }
    }

    function normalizeServerUrl(rawEndpoint, targetProtocol) {
      const withProtocol = /^[a-z]+:\/\//i.test(rawEndpoint) ? rawEndpoint : `https://${rawEndpoint}`;
      const endpoint = new URL(withProtocol);
      if (targetProtocol === "ws") {
        if (endpoint.protocol === "https:") endpoint.protocol = "wss:";
        if (endpoint.protocol === "http:") endpoint.protocol = "ws:";
      } else {
        if (endpoint.protocol === "wss:") endpoint.protocol = "https:";
        if (endpoint.protocol === "ws:") endpoint.protocol = "http:";
      }
      return endpoint.toString().replace(/\/$/, "");
    }

    function getServerWebSocketUrl() {
      const configured = String(globalThis.CRASH_CLUB_SERVER_URL || "").trim();
      const rawEndpoint = String(serverOverride || configured).trim();
      if (rawEndpoint) {
        try {
          return normalizeServerUrl(rawEndpoint, "ws");
        } catch (error) {
          console.warn("Invalid Crash Club server URL", rawEndpoint, error);
        }
      }
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${location.host}`;
    }

    function getServerHealthUrl() {
      const rawEndpoint = getConfiguredServerEndpoint();
      try {
        const base = rawEndpoint ? normalizeServerUrl(rawEndpoint, "http") : location.origin;
        return `${base}/health`;
      } catch (error) {
        console.warn("Invalid Crash Club health URL", rawEndpoint, error);
        return null;
      }
    }

    function wakeBackend() {
      const healthUrl = getServerHealthUrl();
      if (!healthUrl || isStaticFrontendMissingBackend()) return;
      fetch(healthUrl, { cache: "no-store", mode: "no-cors" }).catch(() => {});
    }

    function prewarmBackendConnection() {
      if (state.joined || state.socket || isStaticFrontendMissingBackend() || !getConfiguredServerEndpoint()) return;
      wakeBackend();
      connectSocket({ joinOnOpen: false, retryOnClose: false, quiet: true });
    }

    function connectSocket(options = {}) {
      const { joinOnOpen = state.connectWanted, retryOnClose = true, quiet = false } = options;
      clearTimeout(state.reconnectTimer);
      const socket = new WebSocket(getServerWebSocketUrl());
      state.socket = socket;
      socket.addEventListener("open", () => {
        state.connectionAttempt = 0;
        state.preconnected = !joinOnOpen && !state.connectWanted;
        if (joinOnOpen || state.connectWanted) {
          setStatus("Connected. Joining room...", "offline");
          joinRoom();
        } else if (!quiet) {
          setStatus("Multiplayer backend ready. Pick a name and start driving.", "online");
        }
      });
      socket.addEventListener("message", (event) => {
        try {
          handleMessage(JSON.parse(event.data));
        } catch (error) {
          console.warn("Bad server message", error);
        }
      });
      socket.addEventListener("close", () => {
        state.joined = false;
        state.preconnected = false;
        if (socket !== state.socket) return;
        if (retryOnClose) scheduleReconnect();
        else state.socket = null;
      });
      socket.addEventListener("error", () => {
        if (socket !== state.socket) return;
        if (!quiet) setStatus("Connection interrupted. Retrying if the backend is waking up...", "offline");
      });
    }

    function scheduleReconnect() {
      if (!state.connectWanted || isStaticFrontendMissingBackend()) {
        setStatus("Disconnected. Start again to reconnect.", "offline");
        return;
      }
      state.connectionAttempt += 1;
      const maxAttempts = 8;
      if (state.connectionAttempt > maxAttempts) {
        setStatus("Could not reach the multiplayer backend. Check CRASH_CLUB_SERVER_URL and make sure the backend is awake.", "offline");
        toast("Backend unreachable. Check the Vercel env var and backend URL.", "danger");
        return;
      }
      const delay = Math.min(9000, 700 + state.connectionAttempt * state.connectionAttempt * 450);
      setStatus(`Multiplayer backend is not responding. Retrying in ${Math.ceil(delay / 1000)}s...`, "offline");
      state.reconnectTimer = setTimeout(() => {
        wakeBackend();
        connectSocket({ joinOnOpen: true });
      }, delay);
    }

    function joinRoom() {
      state.connectWanted = true;
      sendMessage({ type: "join", room: roomCode, name: state.car.name, color: state.car.color });
    }

    function handleMessage(msg) {
      if (msg.type === "hello") return;

      if (msg.type === "joined") {
        state.id = String(msg.id);
        state.joined = true;
        state.preconnected = false;
        state.mode = "arena";
        setRoomCode(msg.room || roomCode);
        applyRoom(msg.roomState);
        setPlayers(msg.players || []);
        setPickups(msg.pickups || []);
        syncProjectiles(msg.projectiles || []);
        syncHazards(msg.hazards || []);
        const self = (msg.players || []).find((player) => String(player.id) === state.id);
        if (self) syncLocalTransform(self);
        syncRoundPresentation();
        if (state.room.event) startChaosPresentation(state.room.event);
        setMenu(false);
        setStatus(`Online in room ${state.room.code}`, "online");
        playTone(360, 0.08, "triangle", 0.05);
        return;
      }

      if (msg.type === "snapshot") {
        applyRoom(msg.room);
        setPlayers(msg.players || []);
        syncProjectiles(msg.projectiles || []);
        syncHazards(msg.hazards || []);
        syncRoundPresentation();
        return;
      }

      if (msg.type === "round-started") {
        endPodiumShow();
        clearArenaChaos();
        applyRoom(msg.room);
        setPlayers(msg.players || []);
        setPickups(msg.pickups || []);
        const self = (msg.players || []).find((player) => String(player.id) === state.id);
        if (self && state.mode === "arena") {
          syncLocalTransform(self);
          state.car.velocity.set(0, 0);
        }
        showBanner("Round " + state.room.round, "Fresh grid. Go wreck something.");
        toast(`Round ${state.room.round} started.`, "start");
        return;
      }

      if (msg.type === "player-joined" && msg.player) {
        upsertPlayer(msg.player);
        toast(`${msg.player.name} joined.`, "join");
        return;
      }

      if (msg.type === "player-left") {
        removeRemotePlayer(String(msg.id));
        return;
      }

      if (msg.type === "player-renamed") {
        const entry = players.get(String(msg.id));
        if (entry) {
          entry.name = msg.name;
          updateNameLabel(entry.mesh.label, msg.name, "#ffffff");
        }
        return;
      }

      if (msg.type === "player-updated" && msg.player) {
        upsertPlayer(msg.player);
        return;
      }

      if (msg.type === "pickup-state") {
        const pickup = pickups.get(msg.pickupId);
        if (pickup) {
          pickup.active = Boolean(msg.active);
          pickup.mesh.visible = pickup.active;
        }
        return;
      }

      if (msg.type === "pickup-awarded") {
        if (msg.player) upsertPlayer(msg.player);
        if (msg.weapon && weaponMeta[msg.weapon]) {
          startWeaponRoll(msg.weapon);
          return;
        }
        const meta = msg.pickup ? pickupMeta[msg.pickup.type] : null;
        if (meta) {
          lightweightNotice(`Picked up ${meta.label}.`);
          playTone(msg.pickup.type === "repair" ? 640 : 520, 0.05, "triangle", 0.035);
        }
        return;
      }

      if (msg.type === "style-awarded") {
        if (msg.player) upsertPlayer(msg.player);
        playTone(720, 0.07, "triangle", 0.04);
        return;
      }

      if (msg.type === "respawned" && msg.player) {
        upsertPlayer(msg.player, true);
        if (String(msg.player.id) === state.id) {
          state.mode = "arena";
          endGulag();
          syncLocalTransform(msg.player);
          state.car.velocity.set(0, 0);
          if (msg.reason === "redeploy") {
            showBanner("Back From The Dead", "Spectator timer is up. Go get revenge.");
            callout("REDEPLOYED", "Make it count", "#59f0c2", { voice: "back from the dead" });
          } else {
            showBanner("Redeployed", "You are back in the arena.");
          }
        }
        return;
      }

      if (msg.type === "gulag-started") {
        if (msg.player) upsertPlayer(msg.player);
        startGulag(msg);
        return;
      }

      if (msg.type === "gulag-ended" && msg.player) {
        upsertPlayer(msg.player, true);
        if (String(msg.player.id) === state.id) {
          state.mode = "arena";
          endGulag();
          syncLocalTransform(msg.player);
          state.car.velocity.set(0, 0);
          setMenu(false);
          showBanner("Gulag Won", "You earned your respawn.");
          playTone(820, 0.14, "triangle", 0.06);
        }
        return;
      }

      if (msg.type === "spectator-started") {
        if (msg.player) upsertPlayer(msg.player);
        state.spectator.redeployAt = msg.redeployAt || 0;
        startSpectator(msg.reason || "lost the Gulag");
        return;
      }

      if (msg.type === "player-damaged") {
        if (msg.player) upsertPlayer(msg.player);
        if (msg.source) upsertPlayer(msg.source);
        if (String(msg.targetId) === state.id) {
          state.car.health = msg.player?.health ?? state.car.health;
          state.car.damageFlash = 0.9;
        } else if (String(msg.sourceId) === state.id) {
          const labels = { ram: "SMASH", slam: "SLAM", stomp: "STOMP", rocket: "ROCKET HIT", mine: "MINE HIT", shockwave: "SHOCKWAVE", blackhole: "SINGULARITY" };
          const points = { ram: 2, slam: 4, stomp: 10, rocket: 3, mine: 3, shockwave: 3, blackhole: 5 };
          if (labels[msg.cause]) addCombo(labels[msg.cause], points[msg.cause]);
          playTone(msg.shielded ? 380 : 980, 0.04, "square", 0.03);
        }
        return;
      }

      if (msg.type === "impact") {
        const source = getPlayerPosition(msg.sourceId);
        const target = getPlayerPosition(msg.targetId);
        if (source && target) spawnImpact(target.x, target.y + 1.2, target.z, msg.slam || msg.stomp ? "#ff4f8b" : "#ffcf6b", msg.stomp ? 18 : 10);
        playTone(msg.slam || msg.stomp ? 150 : 190, 0.08, "sawtooth", 0.035);
        if (msg.stomp && String(msg.targetId) === state.id) {
          state.car.cameraShake = Math.max(state.car.cameraShake, 0.8);
          callout("STOMPED", "Look up next time", "#ff4f8b", { minor: true });
        }
        return;
      }

      if (msg.type === "chaos-event") {
        applyRoom(msg.room);
        startChaosPresentation(msg.event);
        return;
      }

      if (msg.type === "chaos-event-ended") {
        applyRoom(msg.room);
        endChaosPresentation(msg.kind);
        return;
      }

      if (msg.type === "wreck") {
        handleWreckMessage(msg);
        return;
      }

      if (msg.type === "explosion") {
        handleExplosionMessage(msg);
        return;
      }

      if (msg.type === "projectile-spawned" || msg.type === "projectile-updated") {
        upsertProjectile(msg.projectile);
        return;
      }

      if (msg.type === "projectile-removed") {
        removeProjectile(msg.id);
        return;
      }

      if (msg.type === "hazard-spawned") {
        upsertHazard(msg.hazard);
        return;
      }

      if (msg.type === "bomb-passed") {
        handleBombPassed(msg);
        return;
      }

      if (msg.type === "weapon-fired") {
        if (msg.player) upsertPlayer(msg.player);
        handleWeaponFired(msg);
        return;
      }

      if (msg.type === "event") {
        if (pickupMeta[msg.tone]) {
          lightweightNotice(msg.text);
          return;
        }
        toast(msg.text, msg.tone || "info");
        if (msg.tone === "win" && /wins the round|Round over/.test(msg.text)) showBanner("Round Over", msg.text);
      }
    }

    const MULTI_NAMES = { 2: "DOUBLE WRECK", 3: "TRIPLE WRECK", 4: "QUAD WRECK", 5: "WRECKTACULAR" };
    const STREAK_NAMES = { 3: "ON FIRE", 5: "RAMPAGE", 7: "UNSTOPPABLE", 10: "GODLIKE" };
    const fireColor = new THREE.Color("#ff7a1f");
    const music = { gain: null, nextTime: 0, step: 0, intensity: 0 };

    function getObjectiveText() {
      const event = state.room.phase === "live" ? state.room.event : null;
      const car = state.car;
      if (event?.kind === "bomb" && String(event.holderId) === state.id) return "YOU HAVE THE BOMB. Ram anyone to pass it before it blows.";
      if (event?.kind === "bounty" && String(event.targetId) === state.id) return "You are the bounty. Survive, or someone cashes +25 on your wreck.";
      if (car.inZone) {
        return state.ring.mult > 1 ? "Ring Rush! Triple points while you hold the moving ring." : "Scoring zone active. Hold the ring or ram anyone trying to steal it.";
      }
      if (event?.kind === "ringrush") return "The ring is on the move. Chase the golden pillar for triple points.";
      if (event?.kind === "meteors" || event?.kind === "frenzy") return "Red circles mean incoming meteors. Keep moving.";
      if (car.weapon && weaponMeta[car.weapon]) return `Armed with ${weaponMeta[car.weapon].label}. Press F or click to fire.`;
      return "Chase the gold ring, hit ramps, grab purple crates for weapons, and wreck rivals.";
    }

    function getChaosDetail(event, left, serverNow) {
      const secs = `${Math.ceil(left / 1000)}s`;
      const nameOf = (id) => (String(id) === state.id ? "YOU" : players.get(String(id))?.name || "???");
      if (event.kind === "bomb") {
        const fuse = Math.max(0, ((event.fuseEndsAt || 0) - serverNow) / 1000);
        return event.holderId ? `${nameOf(event.holderId)} ${causeGlyphs.bomb} ${fuse.toFixed(1)}s` : secs;
      }
      if (event.kind === "bounty") return event.targetId ? `Target: ${nameOf(event.targetId)} · ${secs}` : secs;
      if (event.kind === "ringrush") return `Ring x3 · ${secs}`;
      if (event.kind === "frenzy") return `x2 points · ${secs}`;
      return secs;
    }

    function updateChaosHud() {
      const event = state.room.phase === "live" && !state.podium.active ? state.room.event : null;
      const serverNow = getServerNow();
      if (els.chaosBar) {
        els.chaosBar.classList.toggle("hidden", !event);
        if (event) {
          const total = Math.max(1, event.endsAt - event.startedAt);
          const left = Math.max(0, event.endsAt - serverNow);
          els.chaosBarName.textContent = event.name;
          els.chaosBarFill.style.transform = `scaleX(${(left / total).toFixed(3)})`;
          els.chaosBarDetail.textContent = getChaosDetail(event, left, serverNow);
        }
      }
      const holdingBomb = Boolean(event?.kind === "bomb" && String(event.holderId) === state.id && state.mode === "arena" && event.fuseEndsAt > serverNow);
      document.body.classList.toggle("is-bomb-holder", holdingBomb);
      els.bombWarning?.classList.toggle("hidden", !holdingBomb);
      if (!holdingBomb) return;
      const left = event.fuseEndsAt - serverNow;
      if (els.bombTimer) els.bombTimer.textContent = (left / 1000).toFixed(1);
      const interval = left < 3000 ? 160 : left < 7000 ? 380 : 800;
      const now = performance.now();
      if (now - state.lastBombBeepAt > interval) {
        state.lastBombBeepAt = now;
        playTone(left < 3000 ? 1500 : 1100, 0.05, "square", 0.035);
      }
    }

    function startWeaponRoll(weapon) {
      state.weaponRollUntil = performance.now() + 750;
      playSweep(300, 900, 0.7, "square", 0.018);
      setTimeout(() => {
        const meta = weaponMeta[weapon];
        if (!meta) return;
        callout(meta.label.toUpperCase(), meta.hint, meta.color, { minor: true, duration: 1100 });
        playTone(880, 0.1, "triangle", 0.05);
        updateWeaponHud();
      }, 760);
    }

    function updateWeaponHud() {
      if (!els.weaponSlot) return;
      const now = performance.now();
      const rolling = now < state.weaponRollUntil;
      els.weaponSlot.classList.toggle("is-rolling", rolling);
      if (rolling) {
        const keys = Object.keys(weaponMeta);
        const meta = weaponMeta[keys[Math.floor(now / 90) % keys.length]];
        els.weaponGlyph.textContent = meta.glyph;
        els.weaponName.textContent = "Rolling...";
        els.weaponCharges.textContent = "Mystery crate";
        els.weaponSlot.style.setProperty("--weapon-color", meta.color);
        return;
      }
      const meta = weaponMeta[state.car.weapon];
      els.weaponSlot.classList.toggle("is-armed", Boolean(meta));
      if (!meta) {
        els.weaponGlyph.textContent = "?";
        els.weaponName.textContent = "No weapon";
        els.weaponCharges.textContent = "Grab a purple crate";
        els.weaponSlot.style.removeProperty("--weapon-color");
        return;
      }
      const charges = state.car.weaponCharges;
      els.weaponGlyph.textContent = meta.glyph;
      els.weaponName.textContent = meta.label;
      els.weaponCharges.textContent = `${charges} ${charges === 1 ? "charge" : "charges"} · F / click`;
      els.weaponSlot.style.setProperty("--weapon-color", meta.color);
    }

    function fireWeapon() {
      if (state.mode !== "arena" || !state.joined || state.menuOpen || state.podium.active || state.room.phase !== "live") return;
      const car = state.car;
      const now = performance.now();
      if (now < state.weaponRollUntil || now < state.nextFireAt) return;
      if (!car.weapon || car.weaponCharges <= 0) {
        lightweightNotice("No weapon. Grab a purple Mystery Crate.");
        return;
      }
      state.nextFireAt = now + 300;
      sendMessage({ type: "fire", x: car.x, y: car.y, z: car.z, angle: car.angle, vx: car.velocity.x, vz: car.velocity.y });
    }

    function comboValue() {
      const combo = state.combo;
      return Math.min(COMBO_MAX_CASHOUT, Math.max(1, Math.round(combo.points * (0.6 + 0.4 * combo.multiplier) * 0.8)));
    }

    function comboColor(multiplier) {
      if (multiplier >= 6) return "#ff4f8b";
      if (multiplier >= 4) return "#c084fc";
      if (multiplier >= 2) return "#59f0c2";
      return "#ffcf6b";
    }

    function addCombo(label, points) {
      if (!state.joined || state.mode !== "arena" || state.room.phase !== "live" || state.podium.active) return;
      const combo = state.combo;
      const previous = combo.multiplier;
      combo.count += 1;
      combo.points += points;
      combo.multiplier = Math.min(8, 1 + Math.floor(combo.count / 2));
      combo.expiresAt = performance.now() + COMBO_WINDOW_MS;
      combo.labels.unshift(label);
      if (combo.labels.length > 5) combo.labels.length = 5;
      playTone(420 + Math.min(combo.count, 12) * 45, 0.06, "triangle", 0.035);
      if (combo.multiplier > previous && combo.multiplier >= 3) {
        callout(`COMBO x${combo.multiplier}`, label, comboColor(combo.multiplier), { minor: true, duration: 900 });
      }
      if (els.combo) {
        els.combo.classList.remove("is-pulse");
        void els.combo.offsetWidth;
        els.combo.classList.add("is-pulse");
      }
      updateComboHud();
    }

    function updateCombo() {
      const combo = state.combo;
      if (combo.count && performance.now() > combo.expiresAt) cashOutCombo();
      if (combo.count && els.comboTimer) {
        els.comboTimer.style.transform = `scaleX(${THREE.MathUtils.clamp((combo.expiresAt - performance.now()) / COMBO_WINDOW_MS, 0, 1).toFixed(3)})`;
      }
    }

    function cashOutCombo() {
      const combo = state.combo;
      const value = comboValue();
      const label = combo.count > 1 ? `${combo.count} trick combo` : combo.labels[0] || "style";
      sendMessage({ type: "style-score", reason: label, points: value });
      if (combo.count >= 3) {
        callout(`+${value}`, `${combo.count} trick combo cashed`, "#59f0c2", { minor: true, duration: 900 });
      } else {
        lightweightNotice(`+${value} ${label.toLowerCase()}`);
      }
      resetCombo();
    }

    function breakCombo(reason) {
      if (!state.combo.count) return;
      if (state.combo.count >= 2) lightweightNotice(`Combo lost${reason ? `: ${reason}` : ""}.`);
      resetCombo();
    }

    function resetCombo() {
      Object.assign(state.combo, { count: 0, points: 0, multiplier: 1, expiresAt: 0, labels: [] });
      updateComboHud();
    }

    function updateComboHud() {
      if (!els.combo) return;
      const combo = state.combo;
      els.combo.classList.toggle("hidden", combo.count === 0);
      if (!combo.count) return;
      els.comboMult.textContent = `x${combo.multiplier}`;
      els.comboPoints.textContent = `${comboValue()} pts`;
      els.comboLabels.textContent = combo.labels.join(" + ");
      els.combo.style.setProperty("--combo-color", comboColor(combo.multiplier));
    }

    function callout(text, sub = "", color = "#ffcf6b", options = {}) {
      if (!els.callout) return;
      const now = performance.now();
      if (options.minor && now - state.lastCalloutAt < 450 && !els.callout.classList.contains("hidden")) return;
      state.lastCalloutAt = now;
      els.callout.style.setProperty("--callout-color", color);
      els.calloutText.textContent = text;
      els.calloutSub.textContent = sub;
      els.callout.classList.remove("hidden", "is-leaving");
      els.calloutText.style.animation = "none";
      void els.calloutText.offsetWidth;
      els.calloutText.style.animation = "";
      clearTimeout(state.calloutTimer);
      state.calloutTimer = setTimeout(() => {
        els.callout.classList.add("is-leaving");
        state.calloutTimer = setTimeout(() => els.callout.classList.add("hidden"), 260);
      }, options.duration || 1500);
      if (options.voice) speak(options.voice);
    }

    function speak(text) {
      if (!settings.announcer || !settings.sound || settings.volume <= 0 || !playTone.enabled) return;
      const synth = globalThis.speechSynthesis;
      if (!synth || typeof globalThis.SpeechSynthesisUtterance === "undefined") return;
      try {
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(String(text).toLowerCase());
        utterance.pitch = 0.4;
        utterance.rate = 1.05;
        utterance.volume = THREE.MathUtils.clamp(settings.volume * 1.4, 0, 1);
        synth.speak(utterance);
      } catch {
        settings.announcer = false;
      }
    }

    function safeColor(value, fallback = "#f5f7fb") {
      return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
    }

    function addKillfeed(msg, mine, victim, selfInflicted) {
      if (!els.killfeed) return;
      const row = document.createElement("div");
      row.className = `killfeed-row${mine || victim ? " is-you" : ""}`;
      const sourceColor = safeColor(players.get(String(msg.sourceId))?.color, "#ffcf6b");
      const targetColor = safeColor(msg.color);
      const tags = [];
      if (msg.multi >= 2) tags.push(MULTI_NAMES[Math.min(5, msg.multi)]);
      if (msg.streak >= 3) tags.push(`${msg.streak} streak`);
      if (msg.bounty) tags.push(`+${msg.bounty} bounty`);
      for (const extra of msg.callouts || []) if (extra !== "STREAK SNAPPED") tags.push(extra);
      const source = selfInflicted ? "" : `<b style="color:${sourceColor}">${escapeHtml(msg.sourceName || "???")}</b>`;
      row.innerHTML = `${source}<i>${causeGlyphs[msg.cause] || causeGlyphs.ram}</i><b style="color:${targetColor}">${escapeHtml(msg.targetName || "???")}</b>${
        tags.length ? `<em>${escapeHtml(tags.join(" · "))}</em>` : ""
      }`;
      els.killfeed.prepend(row);
      while (els.killfeed.children.length > 5) els.killfeed.lastElementChild.remove();
      setTimeout(() => row.classList.add("is-fading"), 5200);
      setTimeout(() => row.remove(), 5700);
    }

    function handleWreckMessage(msg) {
      const mine = String(msg.sourceId) === state.id;
      const victim = String(msg.targetId) === state.id;
      const selfInflicted = String(msg.sourceId) === String(msg.targetId);
      spawnCarExplosion(msg.x, msg.y || 0, msg.z, safeColor(msg.color, "#ffcf6b"));
      addKillfeed(msg, mine, victim, selfInflicted);
      const entry = players.get(String(msg.targetId));
      if (entry?.isBot) entry.wreckedUntil = getServerNow() + 1700;

      if (mine && !selfInflicted) {
        addCombo("WRECK", 10);
        triggerSlowmo(480);
        flashScreen("#ffcf6b", 0.35);
        const headlines = [];
        if (msg.multi >= 2) headlines.push(MULTI_NAMES[Math.min(5, msg.multi)]);
        if (STREAK_NAMES[msg.streak]) headlines.push(STREAK_NAMES[msg.streak]);
        for (const extra of msg.callouts || []) headlines.push(extra);
        const sub = `${msg.targetName}${msg.bounty ? ` · +${msg.bounty} bounty` : ""}`;
        callout(headlines[0] || "WRECKED 'EM", sub, "#ffcf6b", { voice: headlines[0] || null, duration: 1600 });
      } else if (victim) {
        breakCombo();
        triggerSlowmo(650);
        flashScreen("#ff2d55", 0.45);
        callout("WRECKED", selfInflicted ? "Own goal. Yikes." : `by ${msg.sourceName}`, "#ff2d55", { voice: "wrecked", duration: 1600 });
      }
    }

    function handleExplosionMessage(msg) {
      spawnExplosionFx(msg.x, msg.y || 0, msg.z, msg.radius || 9, msg.kind);
      if (msg.kind === "meteor") removeHazardNear(msg.x, msg.z);
      if (msg.kind === "shockwave" && String(msg.sourceId) === state.id) {
        callout("SHOCKWAVE", "Everyone off my lawn", "#7eb8ff", { minor: true, duration: 800 });
      }
      applyExplosionToLocalCar(msg);
    }

    function applyExplosionToLocalCar(msg) {
      if (state.mode !== "arena" || !state.joined || state.podium.active) return;
      if (msg.excludeId && String(msg.excludeId) === state.id) return;
      const car = state.car;
      const dx = car.x - msg.x;
      const dz = car.z - msg.z;
      const dy = (car.y - (msg.y || 0)) * 0.6;
      const distance = Math.sqrt(dx * dx + dz * dz + dy * dy);
      if (distance > msg.radius) return;
      const falloff = 1 - distance / msg.radius;
      const flat = Math.hypot(dx, dz) || 1;
      car.velocity.x += (dx / flat) * msg.force * falloff;
      car.velocity.y += (dz / flat) * msg.force * falloff;
      launchCar(msg.lift * (0.4 + falloff * 0.6));
      car.airPitch += (Math.random() - 0.5) * 0.9;
      car.airRoll += (Math.random() - 0.5) * 1.3;
      car.overspeedUntil = performance.now() + 900;
      car.cameraShake = Math.max(car.cameraShake, 0.4 + falloff * 0.6);
      car.damageFlash = Math.max(car.damageFlash || 0, 0.5);
    }

    function handleBombPassed(msg) {
      const event = state.room.event;
      const previous = event ? String(event.holderId) : null;
      if (event) {
        event.holderId = msg.holderId;
        if (msg.fuseEndsAt) event.fuseEndsAt = msg.fuseEndsAt;
      }
      if (String(msg.holderId) === state.id) {
        callout("YOU HAVE THE BOMB", "Ram someone. Fast.", "#ff2d55", { voice: "you have the bomb", duration: 1600 });
        flashScreen("#ff2d55", 0.4);
        playTone(220, 0.2, "square", 0.06);
      } else if (previous === state.id) {
        callout("PASSED IT!", `${msg.holderName} has the bomb now`, "#59f0c2", { minor: true });
        addCombo("BOMB PASS", 6);
      }
    }

    function handleWeaponFired(msg) {
      const position = getPlayerPosition(msg.playerId);
      const mine = String(msg.playerId) === state.id;
      const distance = position ? camera.position.distanceTo(scratch3.set(position.x, position.y, position.z)) : 999;
      const near = mine ? 1 : THREE.MathUtils.clamp(1 - distance / 160, 0, 1);
      if (mine) state.car.cameraShake = Math.max(state.car.cameraShake, 0.22);
      if (near <= 0.02) return;
      if (msg.kind === "rocket") {
        playSweep(900, 180, 0.4, "sawtooth", 0.03 * near);
        playNoise({ duration: 0.35, volume: 0.05 * near, filter: 3000, filterEnd: 400, type: "bandpass" });
      } else if (msg.kind === "mine") {
        playTone(260, 0.07, "square", 0.04 * near);
      } else if (msg.kind === "blackhole") {
        playSweep(240, 50, 1.1, "sine", 0.08 * near);
      }
    }

    function startChaosPresentation(event) {
      if (!event) return;
      const color = chaosMeta[event.kind]?.color || "#ff4f8b";
      document.body.style.setProperty("--event-color", color);
      if (els.chaosBanner && state.mode === "arena" && !state.podium.active) {
        els.chaosKicker.textContent = event.kind === "frenzy" ? "Final 30 seconds" : "Chaos Event";
        els.chaosTitle.textContent = event.name;
        els.chaosTitle.dataset.text = event.name;
        els.chaosTagline.textContent = event.tagline;
        els.chaosBanner.classList.add("hidden");
        void els.chaosBanner.offsetWidth;
        els.chaosBanner.classList.remove("hidden");
        clearTimeout(state.bannerTimer);
        state.bannerTimer = setTimeout(() => els.chaosBanner.classList.add("hidden"), 2800);
      }
      flashScreen(color, 0.32);
      playSiren();
      speak(event.name);
      toast(`${event.name}: ${event.tagline}`, "danger");
    }

    function endChaosPresentation(kind) {
      if (kind === "frenzy") return;
      lightweightNotice("Chaos event over. Back to regular mayhem.");
    }

    function clearArenaChaos() {
      for (const id of [...projectiles.keys()]) removeProjectile(id);
      for (const id of [...hazards.keys()]) removeHazard(id);
      resetCombo();
      document.body.classList.remove("is-bomb-holder");
      els.chaosBanner?.classList.add("hidden");
    }

    function getProjectileAssets() {
      if (fx.projectiles) return fx.projectiles;
      const assets = {
        rocketBody: new THREE.CylinderGeometry(0.24, 0.24, 1.8, 8),
        rocketNose: new THREE.ConeGeometry(0.24, 0.6, 8),
        rocketFin: new THREE.BoxGeometry(0.9, 0.06, 0.4),
        rocketMat: new THREE.MeshStandardMaterial({ color: "#d9dee8", metalness: 0.6, roughness: 0.3 }),
        rocketTipMat: new THREE.MeshBasicMaterial({ color: glowColor("#ff4f1f", 1.6) }),
        exhaustMat: fx.additive(glowColor("#ffb36b", 2.2), 0.95),
        mineBody: new THREE.CylinderGeometry(1.0, 1.25, 0.45, 18),
        mineMat: new THREE.MeshStandardMaterial({ color: "#1b1f27", metalness: 0.7, roughness: 0.35 }),
        mineLightMat: fx.additive(glowColor("#ff2d55", 2.4), 1),
        mineRingMat: fx.additive(glowColor("#ff2d55", 1.2), 0.45),
        holeCoreMat: new THREE.MeshBasicMaterial({ color: "#000000" }),
        holeDiskMat: fx.additive(glowColor("#c084fc", 1.8), 0.75),
        holeHaloMat: fx.additive(glowColor("#7c3aed", 1.0), 0.18),
        diskGeometry: new THREE.RingGeometry(2.0, 5.6, 64)
      };
      assets.holeDiskMat.side = THREE.DoubleSide;
      assets.mineRingMat.side = THREE.DoubleSide;
      assets.holeHaloMat.side = THREE.BackSide;
      fx.projectiles = assets;
      return assets;
    }

    function createProjectileMesh(kind) {
      const assets = getProjectileAssets();
      const group = new THREE.Group();
      if (kind === "rocket") {
        const body = new THREE.Mesh(assets.rocketBody, assets.rocketMat);
        body.rotation.x = Math.PI / 2;
        const nose = new THREE.Mesh(assets.rocketNose, assets.rocketTipMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 1.2;
        const finA = new THREE.Mesh(assets.rocketFin, assets.rocketMat);
        finA.position.z = -0.75;
        const finB = finA.clone();
        finB.rotation.z = Math.PI / 2;
        const exhaust = new THREE.Mesh(fx.sphereGeometry, assets.exhaustMat);
        exhaust.scale.set(0.35, 0.35, 0.7);
        exhaust.position.z = -1.1;
        group.add(body, nose, finA, finB, exhaust);
        group.userData.exhaust = exhaust;
      } else if (kind === "mine") {
        const body = new THREE.Mesh(assets.mineBody, assets.mineMat);
        const light = new THREE.Mesh(fx.sphereGeometry, assets.mineLightMat);
        light.scale.setScalar(0.32);
        light.position.y = 0.38;
        const ring = new THREE.Mesh(fx.ringGeometry, assets.mineRingMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.18;
        ring.scale.setScalar(4.4);
        group.add(body, light, ring);
        group.userData.light = light;
        group.userData.ring = ring;
      } else if (kind === "blackhole") {
        const core = new THREE.Mesh(fx.sphereGeometry, assets.holeCoreMat);
        core.scale.setScalar(1.7);
        const disk = new THREE.Mesh(assets.diskGeometry, assets.holeDiskMat);
        disk.rotation.x = -Math.PI / 2 + 0.35;
        const disk2 = new THREE.Mesh(assets.diskGeometry, assets.holeDiskMat);
        disk2.rotation.x = -Math.PI / 2 - 0.6;
        disk2.scale.setScalar(0.75);
        const halo = new THREE.Mesh(fx.sphereGeometry, assets.holeHaloMat);
        halo.scale.setScalar(9);
        group.add(core, disk, disk2, halo);
        Object.assign(group.userData, { disk, disk2, halo });
        group.scale.setScalar(0.35);
      }
      return group;
    }

    function upsertProjectile(data) {
      if (!data) return;
      const id = String(data.id);
      let entry = projectiles.get(id);
      if (!entry) {
        entry = { id, kind: data.kind, mesh: createProjectileMesh(data.kind), lastTrailAt: 0, bornAt: performance.now() };
        entry.mesh.position.set(data.x, data.y, data.z);
        entry.mesh.rotation.y = data.angle || 0;
        fxRoot.add(entry.mesh);
        projectiles.set(id, entry);
      }
      Object.assign(entry, {
        ownerId: data.ownerId,
        x: data.x,
        y: data.y,
        z: data.z,
        vx: data.vx || 0,
        vz: data.vz || 0,
        angle: data.angle || 0,
        phase: data.phase || "flying",
        armed: Boolean(data.armed),
        collapseAt: data.collapseAt || 0,
        syncedAt: performance.now()
      });
    }

    function syncProjectiles(list = []) {
      const seen = new Set();
      for (const data of list) {
        seen.add(String(data.id));
        upsertProjectile(data);
      }
      const now = performance.now();
      for (const [id, entry] of projectiles) {
        if (!seen.has(id) && now - entry.bornAt > 600) removeProjectile(id);
      }
    }

    function removeProjectile(id) {
      const entry = projectiles.get(String(id));
      if (!entry) return;
      fxRoot.remove(entry.mesh);
      projectiles.delete(String(id));
    }

    function updateProjectiles(dt) {
      const now = performance.now();
      const quality = settings.quality;
      for (const [id, entry] of projectiles) {
        const mesh = entry.mesh;
        const age = (now - entry.syncedAt) / 1000;
        if (entry.kind === "rocket" || (entry.kind === "blackhole" && entry.phase === "flying")) {
          if (age > 3.5) {
            removeProjectile(id);
            continue;
          }
          const k = Math.min(1, dt * 20);
          mesh.position.x += (entry.x + entry.vx * age - mesh.position.x) * k;
          mesh.position.z += (entry.z + entry.vz * age - mesh.position.z) * k;
          mesh.position.y += (entry.y - mesh.position.y) * k;
        }
        if (entry.kind === "rocket") {
          mesh.rotation.y += angleDelta(mesh.rotation.y, entry.angle) * Math.min(1, dt * 14);
          mesh.userData.exhaust.scale.z = 0.6 + Math.random() * 0.5;
          if (now - entry.lastTrailAt > (quality === "performance" ? 90 : 28)) {
            entry.lastTrailAt = now;
            const p = mesh.position;
            spawnParticle(
              p.x - Math.sin(mesh.rotation.y) * 1.3,
              p.y,
              p.z - Math.cos(mesh.rotation.y) * 1.3,
              Math.random() < 0.5 ? "#ffb36b" : "#9aa4b2",
              0.55,
              2.2,
              new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6, (Math.random() - 0.5) * 1.2),
              0.5
            );
          }
        } else if (entry.kind === "mine") {
          mesh.userData.light.visible = entry.armed ? Math.sin(now * 0.018) > 0.2 : Math.sin(now * 0.006) > 0.6;
          mesh.userData.ring.visible = entry.armed;
          mesh.userData.ring.scale.setScalar(4.4 + Math.sin(now * 0.008) * 0.3);
          mesh.rotation.y += dt * 0.8;
        } else if (entry.kind === "blackhole") {
          const targetScale = entry.phase === "pulling" ? 1 : 0.35;
          mesh.scale.setScalar(mesh.scale.x + (targetScale - mesh.scale.x) * Math.min(1, dt * 5));
          const { disk, disk2, halo } = mesh.userData;
          disk.rotation.z += dt * 4;
          disk2.rotation.z -= dt * 6.5;
          if (entry.phase !== "pulling") continue;
          const left = entry.collapseAt ? (entry.collapseAt - getServerNow()) / 1000 : 3;
          halo.scale.setScalar(9 * (1 + Math.sin(now * 0.03) * 0.04 + (left < 0.8 ? (0.8 - Math.max(0, left)) * 0.7 : 0)));
          if (quality !== "performance" && now - entry.lastTrailAt > 40) {
            entry.lastTrailAt = now;
            const angle = Math.random() * TWO_PI;
            const radius = 14 + Math.random() * 20;
            const px = mesh.position.x + Math.cos(angle) * radius;
            const pz = mesh.position.z + Math.sin(angle) * radius;
            const velocity = new THREE.Vector3(mesh.position.x - px, 0, mesh.position.z - pz).multiplyScalar(1.6);
            velocity.x += -Math.sin(angle) * 10;
            velocity.z += Math.cos(angle) * 10;
            spawnParticle(px, 0.8 + Math.random() * 3, pz, Math.random() < 0.5 ? "#c084fc" : "#e9d5ff", 0.6, -0.8, velocity, 0.7);
          }
        }
      }
    }

    function getHazardAssets() {
      if (fx.hazards) return fx.hazards;
      const assets = {
        discGeometry: new THREE.CircleGeometry(1, 40),
        warnRingMat: fx.additive(glowColor("#ff2d55", 1.6), 0.85),
        warnFillMat: fx.additive(glowColor("#ff2d55", 1.0), 0.22),
        rockMat: new THREE.MeshBasicMaterial({ color: glowColor("#ff7a1f", 1.8) }),
        rockGlowMat: fx.additive(glowColor("#ff4f1f", 1.4), 0.35)
      };
      assets.warnRingMat.side = THREE.DoubleSide;
      assets.warnFillMat.side = THREE.DoubleSide;
      fx.hazards = assets;
      return assets;
    }

    function upsertHazard(data) {
      if (!data || hazards.has(String(data.id))) return;
      const assets = getHazardAssets();
      const telegraph = new THREE.Group();
      const ring = new THREE.Mesh(fx.ringGeometry, assets.warnRingMat);
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(11);
      const fill = new THREE.Mesh(assets.discGeometry, assets.warnFillMat);
      fill.rotation.x = -Math.PI / 2;
      fill.scale.setScalar(0.01);
      telegraph.add(ring, fill);
      telegraph.position.set(data.x, ARENA.groundHeightAt(data.x, data.z) + 0.12, data.z);
      const rock = new THREE.Mesh(fx.rockGeometry, assets.rockMat);
      const glow = new THREE.Mesh(fx.sphereGeometry, assets.rockGlowMat);
      glow.scale.setScalar(1.6);
      rock.add(glow);
      rock.position.set(data.x + 46, 150, data.z - 34);
      fxRoot.add(telegraph, rock);
      hazards.set(String(data.id), { ...data, telegraph, ring, fill, rock, lastTrailAt: 0 });
    }

    function syncHazards(list = []) {
      for (const data of list) upsertHazard(data);
    }

    function removeHazard(id) {
      const hazard = hazards.get(String(id));
      if (!hazard) return;
      fxRoot.remove(hazard.telegraph, hazard.rock);
      hazards.delete(String(id));
    }

    function removeHazardNear(x, z) {
      for (const [id, hazard] of hazards) {
        if (Math.hypot(hazard.x - x, hazard.z - z) < 2) {
          removeHazard(id);
          return;
        }
      }
    }

    function updateHazards(dt) {
      const serverNow = getServerNow();
      const now = performance.now();
      for (const [id, hazard] of hazards) {
        const total = Math.max(1, hazard.impactAt - hazard.spawnedAt);
        const remaining = hazard.impactAt - serverNow;
        if (remaining < -600) {
          removeHazard(id);
          continue;
        }
        const t = THREE.MathUtils.clamp(1 - remaining / total, 0, 1);
        hazard.fill.scale.setScalar(Math.max(0.01, t * 11));
        hazard.ring.scale.setScalar(11 + Math.sin(now * 0.02) * 0.4);
        const fall = 1 - t * t;
        hazard.rock.position.set(hazard.x + 46 * fall, 0.8 + 150 * fall, hazard.z - 34 * fall);
        hazard.rock.rotation.x += dt * 3;
        hazard.rock.rotation.y += dt * 2;
        if (settings.quality !== "performance" && now - hazard.lastTrailAt > 45) {
          hazard.lastTrailAt = now;
          const p = hazard.rock.position;
          spawnParticle(p.x, p.y, p.z, Math.random() < 0.6 ? "#ff7a1f" : "#3b3f48", 0.7, 2.4, new THREE.Vector3(2, 6, -1.5), 0.6);
        }
      }
    }

    function getDebrisMaterial(color) {
      if (!fx.debrisMaterials) fx.debrisMaterials = new Map();
      if (!fx.debrisMaterials.has(color)) {
        fx.debrisMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35, emissive: color, emissiveIntensity: 0.15 }));
      }
      return fx.debrisMaterials.get(color);
    }

    function spawnFlashLight(x, y, z, color, intensity, life) {
      if (!flashLights.length || settings.quality === "performance") return;
      const slot = flashLights.reduce((a, b) => (a.life < b.life ? a : b));
      slot.light.color.set(color);
      slot.light.position.set(x, y, z);
      slot.peak = intensity * (settings.quality === "showcase" ? 1 : 0.7);
      slot.life = life;
      slot.maxLife = life;
      slot.light.intensity = slot.peak;
    }

    function spawnExplosionFx(x, y, z, radius = 9, kind = "rocket", options = {}) {
      const style = explosionStyles[kind] || explosionStyles.rocket;
      const quality = settings.quality;
      const base = Math.max(0.2, y);
      const core = new THREE.Mesh(fx.sphereGeometry, fx.additive(glowColor(style.core, 1.5), 0.8));
      core.position.set(x, base + 0.8, z);
      core.scale.setScalar(radius * 0.15);
      fxRoot.add(core);
      const coreSize = kind === "shockwave" ? Math.min(radius * 0.18, 3) : Math.min(radius * 0.55, 7);
      blasts.push({ mesh: core, life: 0.34, maxLife: 0.34, from: Math.min(radius * 0.15, coreSize * 0.4), to: coreSize, opacity: 0.8 });
      const ring = new THREE.Mesh(fx.ringGeometry, fx.additive(glowColor(style.ring, 1.3), 0.7));
      ring.material.side = THREE.DoubleSide;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, Math.max(ARENA.groundHeightAt(x, z), base - 0.6) + 0.25, z);
      ring.scale.setScalar(radius * 0.25);
      fxRoot.add(ring);
      blasts.push({ mesh: ring, life: 0.55, maxLife: 0.55, from: radius * 0.25, to: radius * 1.3, opacity: 0.7 });

      const sparks = quality === "showcase" ? 18 : quality === "balanced" ? 10 : 5;
      for (let i = 0; i < sparks; i += 1) {
        const direction = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(radius * (0.9 + Math.random() * 1.3));
        spawnParticle(x, base + 1, z, i % 2 ? style.ring : style.core, 0.45 + Math.random() * 0.35, 0.4, direction, 0.85, 0.6);
      }
      const smoke = quality === "showcase" ? style.smoke : Math.ceil(style.smoke / 2);
      for (let i = 0; i < smoke; i += 1) {
        spawnParticle(
          x + (Math.random() - 0.5) * radius * 0.5,
          base + 1 + Math.random() * 2,
          z + (Math.random() - 0.5) * radius * 0.5,
          "#2b2f38",
          1.4 + Math.random(),
          1.1,
          new THREE.Vector3((Math.random() - 0.5) * 3, 3 + Math.random() * 3, (Math.random() - 0.5) * 3),
          0.5
        );
      }
      spawnFlashLight(x, base + 3, z, style.ring, kind === "bomb" ? 260 : radius > 14 ? 150 : 90, 0.35);
      if (options.quiet) return;
      const distance = camera.position.distanceTo(scratch3.set(x, base, z));
      const near = THREE.MathUtils.clamp(1 - distance / 240, 0.12, 1);
      playBoom(near * (kind === "bomb" ? 1.4 : radius > 15 ? 1.1 : 0.8));
      if (state.mode === "arena") {
        const shake = THREE.MathUtils.clamp(1 - distance / (radius * 6), 0, 1) * (kind === "bomb" ? 1.2 : 0.8);
        state.car.cameraShake = Math.max(state.car.cameraShake, shake);
      }
    }

    function spawnCarExplosion(x, y, z, color) {
      spawnExplosionFx(x, y, z, 10, "wreck");
      if (settings.quality === "performance") return;
      const count = settings.quality === "showcase" ? 12 : 7;
      for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(fx.debrisGeometry, getDebrisMaterial(i % 3 === 0 ? "#1a1f29" : color));
        const size = 0.5 + Math.random() * 0.9;
        mesh.scale.setScalar(size);
        mesh.position.set(x + (Math.random() - 0.5) * 2, y + 1.2 + Math.random(), z + (Math.random() - 0.5) * 2);
        fxRoot.add(mesh);
        debris.push({
          mesh,
          size,
          life: 2.2 + Math.random(),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 26, 10 + Math.random() * 16, (Math.random() - 0.5) * 26),
          spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
        });
      }
      while (debris.length > 60) fxRoot.remove(debris.shift().mesh);
    }

    function updateBlasts(dt) {
      for (let i = blasts.length - 1; i >= 0; i -= 1) {
        const blast = blasts[i];
        blast.life -= dt;
        const t = THREE.MathUtils.clamp(1 - blast.life / blast.maxLife, 0, 1);
        blast.mesh.scale.setScalar(blast.from + (blast.to - blast.from) * easeOutCubic(t));
        blast.mesh.material.opacity = blast.opacity * (1 - t);
        if (blast.life <= 0) {
          fxRoot.remove(blast.mesh);
          blast.mesh.material.dispose();
          blasts.splice(i, 1);
        }
      }
      for (let i = debris.length - 1; i >= 0; i -= 1) {
        const chunk = debris[i];
        chunk.life -= dt;
        chunk.velocity.y -= 30 * dt;
        chunk.mesh.position.addScaledVector(chunk.velocity, dt);
        const ground = ARENA.groundHeightAt(chunk.mesh.position.x, chunk.mesh.position.z) + 0.25;
        if (chunk.mesh.position.y < ground) {
          chunk.mesh.position.y = ground;
          chunk.velocity.y *= -0.35;
          chunk.velocity.x *= 0.7;
          chunk.velocity.z *= 0.7;
          chunk.spin.multiplyScalar(0.7);
        }
        chunk.mesh.rotation.x += chunk.spin.x * dt;
        chunk.mesh.rotation.y += chunk.spin.y * dt;
        chunk.mesh.rotation.z += chunk.spin.z * dt;
        if (chunk.life < 0.5) chunk.mesh.scale.setScalar(Math.max(0.01, chunk.life / 0.5) * chunk.size);
        if (chunk.life <= 0) {
          fxRoot.remove(chunk.mesh);
          debris.splice(i, 1);
        }
      }
      for (const flash of flashLights) {
        if (flash.life <= 0) continue;
        flash.life -= dt;
        const k = Math.max(0, flash.life / flash.maxLife);
        flash.light.intensity = flash.life > 0 ? flash.peak * k * k : 0;
      }
    }

    function audioReady() {
      return Boolean(playTone.enabled && settings.sound && settings.volume > 0 && playTone.ctx);
    }

    function getNoiseBuffer(ctx) {
      if (getNoiseBuffer.buffer) return getNoiseBuffer.buffer;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      getNoiseBuffer.buffer = buffer;
      return buffer;
    }

    function playNoise({ duration = 0.4, volume = 0.1, filter = 900, filterEnd = 120, type = "lowpass", delay = 0, destination = null } = {}) {
      if (!audioReady()) return;
      const ctx = playTone.ctx;
      try {
        const t = ctx.currentTime + delay;
        const source = ctx.createBufferSource();
        source.buffer = getNoiseBuffer(ctx);
        const biquad = ctx.createBiquadFilter();
        biquad.type = type;
        biquad.frequency.setValueAtTime(filter, t);
        biquad.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), t + duration);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(Math.max(0.0001, volume * (destination ? 1 : settings.volume)), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        source.connect(biquad).connect(gain).connect(destination || ctx.destination);
        source.start(t);
        source.stop(t + duration + 0.05);
      } catch {
        playTone.enabled = false;
      }
    }

    function playSweep(from, to, duration, type = "sine", volume = 0.04, delay = 0, destination = null) {
      if (!audioReady()) return;
      const ctx = playTone.ctx;
      try {
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
        gain.gain.setValueAtTime(Math.max(0.0001, volume * (destination ? 1 : settings.volume)), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain).connect(destination || ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
      } catch {
        playTone.enabled = false;
      }
    }

    function playBoom(intensity = 1) {
      playNoise({ duration: 0.45 + intensity * 0.45, volume: 0.13 * intensity, filter: 1600, filterEnd: 60 });
      playSweep(130, 34, 0.4 + intensity * 0.3, "sine", 0.12 * intensity);
    }

    function playSiren() {
      for (let i = 0; i < 4; i += 1) {
        playSweep(i % 2 ? 880 : 560, i % 2 ? 560 : 880, 0.22, "square", 0.022, i * 0.24);
      }
    }

    function midiToFreq(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }

    function computeMusicIntensity() {
      if (state.podium.active || state.menuOpen) return 0;
      if (state.mode !== "arena") return 1;
      const event = state.room.phase === "live" ? state.room.event : null;
      if (event?.kind === "frenzy" || (event?.kind === "bomb" && String(event.holderId) === state.id)) return 3;
      return event ? 2 : 1;
    }

    function updateMusic() {
      const ctx = playTone.ctx;
      if (!ctx) return;
      const wanted = settings.music && settings.sound && settings.volume > 0 && playTone.enabled && state.joined;
      if (!music.gain) {
        if (!wanted) return;
        music.gain = ctx.createGain();
        music.gain.gain.value = 0.0001;
        music.gain.connect(ctx.destination);
        music.nextTime = ctx.currentTime + 0.1;
      }
      const target = wanted ? 0.42 * settings.volume * (state.menuOpen ? 0.35 : 1) : 0.0001;
      music.gain.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.25);
      if (!wanted) return;
      music.intensity = computeMusicIntensity();
      const tempo = music.intensity >= 3 ? 142 : 124;
      const stepDuration = 60 / tempo / 4;
      if (music.nextTime < ctx.currentTime - 0.3) music.nextTime = ctx.currentTime + 0.05;
      while (music.nextTime < ctx.currentTime + 0.14) {
        scheduleMusicStep(music.step, music.nextTime, stepDuration);
        music.nextTime += stepDuration;
        music.step = (music.step + 1) % 64;
      }
    }

    function scheduleMusicStep(step, time, stepDuration) {
      const ctx = playTone.ctx;
      const out = music.gain;
      const bar = Math.floor(step / 16) % 4;
      const s = step % 16;
      const roots = [45, 41, 36, 43];
      const chords = [
        [57, 60, 64],
        [53, 57, 60],
        [48, 52, 55],
        [55, 59, 62]
      ];
      const intensity = music.intensity;
      try {
        if (s % 4 === 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
          gain.gain.setValueAtTime(intensity === 0 ? 0.35 : 0.8, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
          osc.connect(gain).connect(out);
          osc.start(time);
          osc.stop(time + 0.26);
        }
        if (intensity >= 1 && (s === 4 || s === 12)) {
          playNoise({ duration: 0.16, volume: 0.32, filter: 2200, filterEnd: 900, type: "bandpass", delay: time - ctx.currentTime, destination: out });
        }
        if (intensity >= 1 && (s % 2 === 1 || intensity >= 3)) {
          playNoise({ duration: 0.04, volume: s % 2 ? 0.12 : 0.06, filter: 8000, filterEnd: 6000, type: "highpass", delay: time - ctx.currentTime, destination: out });
        }
        if (s % 2 === 0) {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(midiToFreq(roots[bar] + (s % 8 === 6 ? 12 : 0)), time);
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(intensity >= 2 ? 900 : 480, time);
          gain.gain.setValueAtTime(0.22, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + stepDuration * 1.8);
          osc.connect(filter).connect(gain).connect(out);
          osc.start(time);
          osc.stop(time + stepDuration * 1.9);
        }
        if (intensity >= 2) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(midiToFreq(chords[bar][s % 3] + (intensity >= 3 && s % 4 === 3 ? 24 : 12)), time);
          gain.gain.setValueAtTime(0.045, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + stepDuration * 0.9);
          osc.connect(gain).connect(out);
          osc.start(time);
          osc.stop(time + stepDuration);
        }
      } catch {
        playTone.enabled = false;
      }
    }

    function updateLocalCar(dt) {
      const car = state.car;
      const serverNow = getServerNow();
      const blocked =
        state.mode !== "arena" ||
        state.menuOpen ||
        !state.joined ||
        state.podium.active ||
        state.room.phase !== "live" ||
        car.wreckedUntil > serverNow;
      const event = state.room.phase === "live" ? state.room.event : null;
      const eventKind = event?.kind || null;
      const nitro = eventKind === "nitro";
      const ice = eventKind === "ice";
      const holdingBomb = eventKind === "bomb" && String(event.holderId) === state.id;
      const gravity = ARENA.GRAVITY * (eventKind === "lowgrav" ? ARENA.LOW_GRAVITY_SCALE : 1);
      const throttle = blocked ? 0 : axis("w", "arrowup") - axis("s", "arrowdown");
      const steer = blocked ? 0 : axis("d", "arrowright") - axis("a", "arrowleft");
      const boosting = !blocked && input.has("shift") && (car.boost > 3 || nitro) && (throttle > 0 || car.airborne);
      car.boosting = boosting;

      const forward = new THREE.Vector2(Math.sin(car.angle), Math.cos(car.angle));
      const right = new THREE.Vector2(Math.cos(car.angle), -Math.sin(car.angle));
      let forwardSpeed = car.velocity.dot(forward);
      let lateralSpeed = car.velocity.dot(right);
      const absForward = Math.abs(forwardSpeed);
      const speedRatio = THREE.MathUtils.clamp(absForward / 48, 0, 1);

      if (car.airborne) {
        updateAirControl(dt, steer, throttle, blocked, boosting);
      } else {
        const driftIntent = Math.abs(steer) > 0.45 && absForward > 14;
        let grip = driftIntent ? 3.4 : 8.5 + speedRatio * 5.4;
        if (ice) grip *= 0.16;

        lateralSpeed *= Math.exp(-grip * dt);
        car.velocity.copy(forward.multiplyScalar(forwardSpeed)).add(right.multiplyScalar(lateralSpeed));

        let engine = 0;
        if (throttle > 0) engine = 42 + speedRatio * 10;
        if (throttle < 0) engine = forwardSpeed > 5 ? -66 : -30;
        if (ice) engine *= 0.75;
        if (boosting) engine += 58;

        const accelForward = new THREE.Vector2(Math.sin(car.angle), Math.cos(car.angle));
        car.velocity.addScaledVector(accelForward, engine * dt);

        const drag = 1 - THREE.MathUtils.clamp((0.34 + car.velocity.length() * 0.018) * dt * (ice ? 0.45 : 1), 0, 0.12);
        car.velocity.multiplyScalar(drag);

        const speedMultiplier = (nitro ? 1.3 : 1) * (holdingBomb ? 1.12 : 1);
        const baseMax = (boosting ? 50 : 38) * speedMultiplier;
        const maxSpeed = performance.now() < car.overspeedUntil ? Math.max(baseMax, 74) : baseMax;
        const currentSpeed = car.velocity.length();
        if (currentSpeed > maxSpeed) car.velocity.setLength(Math.max(maxSpeed, currentSpeed - 46 * dt));

        const direction = forwardSpeed < -2 ? -1 : 1;
        const turnRate = (1.15 + speedRatio * 1.85) * (1 - speedRatio * 0.28);
        car.angle -= steer * turnRate * direction * dt;
      }

      if (boosting) {
        if (!nitro) car.boost = Math.max(0, car.boost - 30 * dt);
        spawnBoostTrail();
      } else {
        car.boost = Math.min(MAX_BOOST, car.boost + (absForward < 9 ? 15 : 8) * dt * (nitro ? 4 : 1));
      }

      car.prevX = car.x;
      car.prevZ = car.z;
      car.prevAngle = car.angle;
      if (!blocked) applyHazardForces(dt);
      if (car.velocity.length() > 110) car.velocity.setLength(110);
      car.x += car.velocity.x * dt;
      car.z += car.velocity.y * dt;
      handleWorldBounds();
      updateVerticalMotion(dt, gravity);
      handleStaticCollision();
      handlePlayerCollisions();
      handlePickupCollections();
      detectNearMisses();

      const driftAmount = Math.abs(lateralSpeed);
      if (!car.airborne && driftAmount > 5.8 && absForward > 13 && Math.abs(steer) > 0.2) {
        car.driftCharge += dt;
        spawnSkidSmoke(driftAmount);
        if (car.driftCharge > 1.15) {
          addCombo("DRIFT", 3);
          car.driftCharge = 0;
        }
      } else {
        car.driftCharge = Math.max(0, car.driftCharge - dt * 1.8);
      }

      car.speed = car.velocity.length();
      if (!car.airborne) {
        const ahead = ARENA.groundHeightAt(car.x + Math.sin(car.angle) * 1.8, car.z + Math.cos(car.angle) * 1.8);
        const behind = ARENA.groundHeightAt(car.x - Math.sin(car.angle) * 1.8, car.z - Math.cos(car.angle) * 1.8);
        const slopePitch = -Math.atan2(ahead - behind, 3.6);
        car.groundPitch += (slopePitch - car.groundPitch) * Math.min(1, dt * 14);
      }
      localCar.group.position.set(car.x, car.y + 0.08, car.z);
      localCar.group.rotation.set(0, car.angle, 0);
      localCar.chassis.rotation.x = car.airborne ? car.airPitch : car.groundPitch;
      localCar.chassis.rotation.z = car.airborne ? car.airRoll : -lateralSpeed * 0.018;
      if (settings.quality !== "performance") {
        for (const wheel of localCar.wheels) wheel.rotation.x += car.speed * dt * 2.8;
        localCar.label.visible = true;
        localCar.label.quaternion.copy(camera.quaternion);
      } else {
        localCar.label.visible = false;
      }
      localCar.underglow.intensity = boosting ? (settings.quality === "performance" ? 0.9 : 2.2) : (settings.quality === "performance" ? 0.35 : 1.05);
      updateCarExtras(
        localCar,
        {
          boosting,
          overspeed: performance.now() < car.overspeedUntil,
          streak: car.streak,
          shielded: car.shieldUntil > serverNow,
          slamming: car.slamUntil > serverNow,
          isLeader: getLeaderId() === state.id,
          hasBomb: holdingBomb
        },
        performance.now(),
        dt
      );
      if (els.speedLines) {
        const lines = THREE.MathUtils.clamp((car.speed - 36) / 34, 0, 0.85) + (boosting ? 0.15 : 0);
        els.speedLines.style.setProperty("--speed-line-opacity", state.mode === "arena" && !state.menuOpen ? lines.toFixed(2) : "0");
      }
      car.inZone = !car.airborne && isInCenterRing(car.x, car.z);
    }

    function updateAirControl(dt, steer, rawThrottle, blocked, boosting) {
      const car = state.car;
      // Gas/brake held at takeoff would otherwise auto-flip every jump: ignore it until released.
      if (car.flipLatch && rawThrottle !== car.flipLatch) car.flipLatch = 0;
      const throttle = car.flipLatch ? 0 : rawThrottle;
      const roll = blocked ? 0 : (input.has("e") ? 1 : 0) - (input.has("q") ? 1 : 0);
      const spin = -steer * AIR_SPIN_RATE * dt;
      car.angle += spin;
      car.airSpin += spin;
      car.airPitch += throttle * AIR_FLIP_RATE * dt;
      car.airRoll += roll * AIR_FLIP_RATE * dt;
      if (!throttle) car.airPitch = approachUpright(car.airPitch, dt * 1.5);
      if (!roll) car.airRoll = approachUpright(car.airRoll, dt * 1.5);
      car.velocity.multiplyScalar(1 - 0.06 * dt);
      if (boosting) {
        car.velocity.x += Math.sin(car.angle) * 26 * dt;
        car.velocity.y += Math.cos(car.angle) * 26 * dt;
      }
    }

    function approachUpright(angle, amount) {
      const target = Math.round(angle / TWO_PI) * TWO_PI;
      const delta = target - angle;
      return Math.abs(delta) <= amount ? target : angle + Math.sign(delta) * amount;
    }

    function updateVerticalMotion(dt, gravity) {
      const car = state.car;
      const ground = ARENA.groundHeightAt(car.x, car.z);
      if (car.airborne) {
        car.vy -= gravity * dt;
        car.y += car.vy * dt;
        car.airTime += dt;
        if (car.y <= ground) landCar(ground);
        return;
      }

      if (ground - car.y > 1.6) {
        // Drove into the tall lip of a ramp: it behaves like a wall.
        const hitSpeed = car.velocity.length();
        car.x = car.prevX;
        car.z = car.prevZ;
        car.velocity.multiplyScalar(-0.28);
        car.cameraShake = Math.max(car.cameraShake, THREE.MathUtils.clamp(hitSpeed / 40, 0.15, 0.5));
        const now = performance.now();
        if (now - state.lastWallHitAt > 160) {
          state.lastWallHitAt = now;
          spawnImpact(car.x, car.y + 1.2, car.z, "#59f0c2", 8);
          playTone(150, 0.06, "sawtooth", 0.03);
        }
        return;
      }
      if (ground < car.y - 0.25) {
        launchCar(Math.max(0, car.vy));
        car.launchSpeed = car.velocity.length();
        if (car.vy > 9) playTone(240 + car.vy * 8, 0.12, "triangle", 0.035);
        return;
      }
      car.vy = THREE.MathUtils.clamp((ground - car.y) / Math.max(dt, 0.001), 0, 45);
      car.y = ground;

      const now = performance.now();
      const pad = ARENA.jumpPadAt(car.x, car.z);
      if (pad && now > car.padCooldownUntil && state.mode === "arena") {
        car.padCooldownUntil = now + 700;
        launchCar(pad.power * (state.room.event?.kind === "lowgrav" ? 0.75 : 1));
        addCombo("LAUNCH PAD", 2);
        spawnExplosionFx(pad.x, 0.2, pad.z, 6, "shockwave", { quiet: true });
        playSweep(220, 900, 0.35, "triangle", 0.05);
      }
      const strip = ARENA.boostPadAt(car.x, car.z);
      if (strip && state.mode === "arena") {
        const dirX = Math.sin(strip.angle);
        const dirZ = Math.cos(strip.angle);
        const along = car.velocity.x * dirX + car.velocity.y * dirZ;
        if (along < strip.speed) {
          const add = strip.speed - Math.max(0, along);
          car.velocity.x += dirX * add;
          car.velocity.y += dirZ * add;
        }
        car.overspeedUntil = now + 1100;
        if (car.lastStripId !== strip.id || now - car.lastStripAt > 1500) {
          addCombo("BOOST STRIP", 1);
          playSweep(400, 1200, 0.25, "sawtooth", 0.025);
          car.cameraShake = Math.max(car.cameraShake, 0.18);
        }
        car.lastStripId = strip.id;
        car.lastStripAt = now;
      }
    }

    function launchCar(power) {
      const car = state.car;
      car.vy = Math.max(car.vy, power);
      if (!car.airborne) {
        car.airborne = true;
        car.airTime = 0;
        car.airSpin = 0;
        car.hopped = false;
        car.flipLatch = state.menuOpen ? 0 : axis("w", "arrowup") - axis("s", "arrowdown");
        car.airPitch = car.groundPitch;
        car.airRoll = 0;
      }
      car.y += 0.05;
    }

    function hopCar() {
      const car = state.car;
      if (state.mode !== "arena" || !state.joined || state.menuOpen || state.podium.active || state.room.phase !== "live") return;
      if (car.airborne || car.wreckedUntil > getServerNow()) return;
      const now = performance.now();
      if (now - car.lastHopAt < HOP_COOLDOWN_MS) return;
      car.lastHopAt = now;
      launchCar(HOP_POWER * (state.room.event?.kind === "lowgrav" ? 1.15 : 1));
      car.hopped = true;
      playTone(300, 0.08, "triangle", 0.04);
      spawnImpact(car.x, car.y + 0.3, car.z, "#d6f4ff", 5);
    }

    function landCar(ground) {
      const car = state.car;
      const impactSpeed = Math.max(0, -car.vy);
      car.y = ground;
      car.vy = 0;
      car.airborne = false;
      const flips = Math.round(car.airPitch / TWO_PI);
      const rolls = Math.round(car.airRoll / TWO_PI);
      const pitchError = Math.abs(car.airPitch - flips * TWO_PI);
      const rollError = Math.abs(car.airRoll - rolls * TWO_PI);
      const spins = Math.floor((Math.abs(car.airSpin) + 0.6) / TWO_PI);
      const clean = pitchError < 0.8 && rollError < 0.8;
      const airTime = car.airTime;
      car.airPitch = 0;
      car.airRoll = 0;
      car.groundPitch = 0;

      if (!clean) {
        car.velocity.multiplyScalar(0.35);
        car.cameraShake = Math.max(car.cameraShake, 0.7);
        spawnImpact(car.x, car.y + 0.8, car.z, "#ff4f8b", 12);
        playTone(110, 0.18, "sawtooth", 0.05);
        callout("WIPEOUT", "Land on your wheels", "#ff4f8b", { minor: true, duration: 900 });
        breakCombo("wipeout");
        return;
      }

      let tricks = 0;
      if (airTime > 0.9 && !(car.hopped && airTime < 1.4)) {
        addCombo(airTime > 2.2 ? "HANG TIME" : "BIG AIR", airTime > 2.2 ? 8 : 4);
        tricks += 1;
      }
      if (spins > 0) {
        addCombo(`${spins * 360}`, 5 * spins);
        tricks += 1;
      }
      if (flips !== 0) {
        const count = Math.abs(flips);
        addCombo(count > 1 ? `${count}X FLIP` : flips > 0 ? "FRONTFLIP" : "BACKFLIP", 7 * count);
        tricks += 1;
      }
      if (rolls !== 0) {
        addCombo(Math.abs(rolls) > 1 ? `${Math.abs(rolls)}X BARREL ROLL` : "BARREL ROLL", 6 * Math.abs(rolls));
        tricks += 1;
      }
      if (tricks >= 2 || spins + Math.abs(flips) + Math.abs(rolls) >= 2) {
        addCombo("CLEAN LANDING", 3);
      }
      if (impactSpeed > 12) {
        car.cameraShake = Math.max(car.cameraShake, THREE.MathUtils.clamp(impactSpeed / 60, 0.15, 0.6));
        spawnImpact(car.x, car.y + 0.3, car.z, "#c7d2de", Math.min(14, Math.round(impactSpeed / 3)));
        playTone(90 + impactSpeed, 0.1, "triangle", 0.045);
      }
    }

    function handleWorldBounds() {
      const car = state.car;
      const limit = WORLD_SIZE - 5;
      if (Math.abs(car.x) > limit) {
        car.x = THREE.MathUtils.clamp(car.x, -limit, limit);
        car.velocity.x *= -0.42;
        spawnImpact(car.x, car.y + 1, car.z, "#ffcf6b", 9);
      }
      if (Math.abs(car.z) > limit) {
        car.z = THREE.MathUtils.clamp(car.z, -limit, limit);
        car.velocity.y *= -0.42;
        spawnImpact(car.x, car.y + 1, car.z, "#ffcf6b", 9);
      }
    }

    function handleStaticCollision() {
      const car = state.car;
      for (const collider of colliders) {
        if (car.y > collider.h) continue;
        const dx = car.x - collider.x;
        const dz = car.z - collider.z;
        const dist = Math.hypot(dx, dz);
        const min = collider.r + 2.4;
        if (dist > 0.001 && dist < min) {
          const nx = dx / dist;
          const nz = dz / dist;
          car.x = collider.x + nx * min;
          car.z = collider.z + nz * min;
          const normal = scratch2.set(nx, nz);
          const hitSpeed = car.velocity.dot(normal);
          if (hitSpeed < 0) car.velocity.addScaledVector(normal, -hitSpeed * 1.45);
          car.velocity.multiplyScalar(0.62);
          const now = performance.now();
          if (now - state.lastWallHitAt > 160) {
            state.lastWallHitAt = now;
            car.cameraShake = Math.max(car.cameraShake, THREE.MathUtils.clamp(Math.abs(hitSpeed) / 34, 0.1, 0.46));
            spawnImpact(car.x, car.y + 1.1, car.z, "#d6f4ff", 7);
            if (car.airborne && Math.abs(hitSpeed) > 30) {
              callout("SPLAT", "Buildings are solid", "#d6f4ff", { minor: true, duration: 800 });
            }
          }
        }
      }
    }

    function handlePlayerCollisions() {
      const car = state.car;
      const now = performance.now();
      const serverNow = getServerNow();
      const slamming = state.car.slamUntil > serverNow;
      for (const [id, entry] of players) {
        if (id === state.id) continue;
        if (entry.mode !== "arena" || entry.wreckedUntil > serverNow) continue;
        const other = getRemoteCollisionBody(entry);
        const dy = car.y - other.y;
        if (Math.abs(dy) > 6) continue;
        const collision = getCarCapsuleCollision(car, other) || (Math.abs(dy) < 2.6 ? getSweptCarCollision(car, other) : null);
        if (!collision) continue;

        if (car.airborne && car.vy < -5 && dy > 0.7) {
          if (now - state.lastHitAt > HIT_COOLDOWN_MS) {
            state.lastHitAt = now;
            sendMessage({
              type: "hit",
              targetId: id,
              impulse: 1.4,
              stomp: true,
              contactX: collision.contactX,
              contactZ: collision.contactZ
            });
            callout("DEATH FROM ABOVE", entry.name || "", "#ff4f8b", { voice: "Death from above", duration: 1200 });
            triggerSlowmo(420);
            flashScreen("#ff4f8b", 0.3);
            spawnImpact(other.x, other.y + 2, other.z, "#ff4f8b", 18);
            playBoom(0.55);
          }
          car.vy = 17;
          car.y = Math.max(car.y, other.y + 2.8);
          continue;
        }
        if (Math.abs(dy) > 2.6) continue;

        const remoteVelocity = getRemoteVelocity(entry);
        const relativeX = car.velocity.x - remoteVelocity.x;
        const relativeZ = car.velocity.y - remoteVelocity.z;
        const closingSpeed = -(relativeX * collision.nx + relativeZ * collision.nz);
        const impactSpeed = Math.max(0, closingSpeed, car.speed * (collision.swept ? 0.42 : 0.25));
        const push = Math.min(collision.swept ? 1.35 : 2.25, collision.penetration * 0.72 + (collision.swept ? 0.28 : 0.08));
        car.x += collision.nx * push;
        car.z += collision.nz * push;

        if (closingSpeed > 0.1) {
          const bounce = Math.min(24, closingSpeed * (slamming ? 0.82 : 0.62) + 4);
          car.velocity.x += collision.nx * bounce;
          car.velocity.y += collision.nz * bounce;
        } else {
          car.velocity.x += collision.nx * Math.min(6, collision.penetration * 2.4);
          car.velocity.y += collision.nz * Math.min(6, collision.penetration * 2.4);
        }
        car.velocity.multiplyScalar(collision.swept ? 0.88 : 0.82);
        car.cameraShake = Math.max(car.cameraShake, THREE.MathUtils.clamp(impactSpeed / 36, 0.18, slamming ? 0.78 : 0.52));

        if (now - (entry.lastContactFxAt || 0) > 150) {
          entry.lastContactFxAt = now;
          spawnImpact(collision.contactX, car.y + 1.4, collision.contactZ, slamming ? "#ff4f8b" : "#ffcf6b", 9);
        }

        if (now - state.lastHitAt > HIT_COOLDOWN_MS && impactSpeed > 7.5) {
          state.lastHitAt = now;
          sendMessage({
            type: "hit",
            targetId: id,
            impulse: THREE.MathUtils.clamp(impactSpeed / 34, 0.22, 1.65),
            contactX: collision.contactX,
            contactZ: collision.contactZ
          });
        }
      }
    }

    function detectNearMisses() {
      const car = state.car;
      if (car.speed < 28 || state.room.phase !== "live") return;
      const now = performance.now();
      const serverNow = getServerNow();
      for (const [id, entry] of players) {
        if (id === state.id || entry.mode !== "arena" || entry.wreckedUntil > serverNow) continue;
        const body = entry.mesh.group.position;
        if (Math.abs(body.y - car.y) > 3) {
          entry.nearPrevDist = Infinity;
          continue;
        }
        const distance = Math.hypot(body.x - car.x, body.z - car.z);
        const previous = entry.nearPrevDist ?? Infinity;
        entry.nearPrevDist = distance;
        if (!(distance > previous && previous > 4.9 && previous < 7.5)) continue;
        if (now - (entry.nearMissAt || 0) < 2500 || now - (entry.lastContactFxAt || 0) < 900) continue;
        const remote = getRemoteVelocity(entry);
        if (Math.hypot(car.velocity.x - remote.x, car.velocity.y - remote.y) < 34) continue;
        entry.nearMissAt = now;
        addCombo("NEAR MISS", 2);
      }
    }

    function applyHazardForces(dt) {
      const car = state.car;
      for (const entry of projectiles.values()) {
        if (entry.kind !== "blackhole" || entry.phase !== "pulling" || String(entry.ownerId) === state.id) continue;
        const dx = entry.x - car.x;
        const dz = entry.z - car.z;
        const distance = Math.hypot(dx, dz);
        if (distance > BLACKHOLE_PULL_RADIUS || distance < 0.5) continue;
        const strength = 1 - distance / BLACKHOLE_PULL_RADIUS;
        car.velocity.x += (dx / distance) * strength * 70 * dt;
        car.velocity.y += (dz / distance) * strength * 70 * dt;
        car.overspeedUntil = performance.now() + 300;
        car.cameraShake = Math.max(car.cameraShake, strength * 0.3);
      }
    }

    function getRemoteCollisionBody(entry) {
      const group = entry.mesh?.group;
      return {
        x: group ? group.position.x : entry.x,
        y: group ? group.position.y - 0.08 : entry.y || 0,
        z: group ? group.position.z : entry.z,
        angle: group ? group.rotation.y : entry.angle || 0
      };
    }

    function getRemoteVelocity(entry) {
      if (Number.isFinite(entry.vx) && Number.isFinite(entry.vz)) {
        return scratch2.set(entry.vx, entry.vz);
      }
      return scratch2.set(Math.sin(entry.angle || 0) * (entry.speed || 0), Math.cos(entry.angle || 0) * (entry.speed || 0));
    }

    function getCarAxis(x, z, angle) {
      const fx = Math.sin(angle || 0) * CAR_COLLISION_AXIS_HALF;
      const fz = Math.cos(angle || 0) * CAR_COLLISION_AXIS_HALF;
      return { ax: x - fx, az: z - fz, bx: x + fx, bz: z + fz };
    }

    function getCarCapsuleCollision(car, other) {
      const localAxis = getCarAxis(car.x, car.z, car.angle);
      const otherAxis = getCarAxis(other.x, other.z, other.angle);
      const closest = closestSegments2D(localAxis.ax, localAxis.az, localAxis.bx, localAxis.bz, otherAxis.ax, otherAxis.az, otherAxis.bx, otherAxis.bz);
      return buildCapsuleCollision(car.x, car.z, other.x, other.z, closest, CAR_COLLISION_RANGE, false);
    }

    function getSweptCarCollision(car, other) {
      if (!Number.isFinite(car.prevX) || !Number.isFinite(car.prevZ)) return null;
      const moveDistance = Math.hypot(car.x - car.prevX, car.z - car.prevZ);
      if (moveDistance < 0.45) return null;

      const previousAxis = getCarAxis(car.prevX, car.prevZ, car.prevAngle ?? car.angle);
      const currentAxis = getCarAxis(car.x, car.z, car.angle);
      const otherAxis = getCarAxis(other.x, other.z, other.angle);
      const tracks = [
        [car.prevX, car.prevZ, car.x, car.z],
        [previousAxis.ax, previousAxis.az, currentAxis.ax, currentAxis.az],
        [previousAxis.bx, previousAxis.bz, currentAxis.bx, currentAxis.bz]
      ];
      let best = null;
      for (const track of tracks) {
        const closest = closestSegments2D(track[0], track[1], track[2], track[3], otherAxis.ax, otherAxis.az, otherAxis.bx, otherAxis.bz);
        if (!best || closest.distanceSq < best.distanceSq) best = closest;
      }
      return buildCapsuleCollision(car.x, car.z, other.x, other.z, best, CAR_COLLISION_RANGE + CAR_SWEEP_MARGIN, true);
    }

    function buildCapsuleCollision(localX, localZ, otherX, otherZ, closest, range, swept) {
      const distance = Math.sqrt(closest.distanceSq);
      if (distance >= range) return null;
      let nx = distance > 0.0001 ? (closest.ax - closest.bx) / distance : localX - otherX;
      let nz = distance > 0.0001 ? (closest.az - closest.bz) / distance : localZ - otherZ;
      const centerDistance = Math.hypot(nx, nz);
      if (centerDistance < 0.0001 || !Number.isFinite(centerDistance)) {
        nx = 1;
        nz = 0;
      } else if (distance <= 0.0001) {
        nx /= centerDistance;
        nz /= centerDistance;
      }
      return {
        nx,
        nz,
        penetration: range - distance,
        contactX: (closest.ax + closest.bx) * 0.5,
        contactZ: (closest.az + closest.bz) * 0.5,
        swept
      };
    }

    function closestPointOnSegment2D(px, pz, ax, az, bx, bz) {
      const sx = bx - ax;
      const sz = bz - az;
      const lengthSq = sx * sx + sz * sz;
      if (lengthSq <= 0.000001) return { x: ax, z: az };
      const t = THREE.MathUtils.clamp(((px - ax) * sx + (pz - az) * sz) / lengthSq, 0, 1);
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
        if (candidate.distanceSq < best.distanceSq) best = candidate;
      }
      return best;
    }

    function segmentsIntersect2D(a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z) {
      const d1 = cross2D(a2x - a1x, a2z - a1z, b1x - a1x, b1z - a1z);
      const d2 = cross2D(a2x - a1x, a2z - a1z, b2x - a1x, b2z - a1z);
      const d3 = cross2D(b2x - b1x, b2z - b1z, a1x - b1x, a1z - b1z);
      const d4 = cross2D(b2x - b1x, b2z - b1z, a2x - b1x, a2z - b1z);
      return d1 * d2 < 0 && d3 * d4 < 0;
    }

    function cross2D(ax, az, bx, bz) {
      return ax * bz - az * bx;
    }

    function distanceSq2D(ax, az, bx, bz) {
      const dx = ax - bx;
      const dz = az - bz;
      return dx * dx + dz * dz;
    }

    function handlePickupCollections() {
      if (!state.joined || state.room.phase !== "live") return;
      const now = performance.now();
      const checkInterval = settings.quality === "performance" ? 80 : 35;
      if (now - state.lastPickupCheckAt < checkInterval) return;
      state.lastPickupCheckAt = now;
      const car = state.car;
      if (car.y > 8) return;
      for (const pickup of pickups.values()) {
        if (!pickup.active) continue;
        if (Math.hypot(car.x - pickup.x, car.z - pickup.z) < 4.7) {
          pickup.active = false;
          pickup.mesh.visible = false;
          sendMessage({ type: "pickup-collected", pickupId: pickup.id });
          break;
        }
      }
    }

    function updateRemoteCars(dt) {
      const now = performance.now();
      const serverNow = getServerNow();
      const leaderId = getLeaderId();
      const event = state.room.phase === "live" ? state.room.event : null;
      const bombHolder = event?.kind === "bomb" ? String(event.holderId) : null;
      const blend = 1 - Math.pow(0.002, dt);
      for (const [id, entry] of players) {
        if (id === state.id) continue;
        const mesh = entry.mesh;
        if (entry.mode !== "arena" || entry.wreckedUntil > serverNow) {
          mesh.group.visible = false;
          entry.hiddenLastFrame = true;
          continue;
        }
        mesh.group.visible = true;
        mesh.target.set(entry.x, (entry.y ?? 0) + 0.08, entry.z);
        if (entry.hiddenLastFrame || mesh.group.position.distanceToSquared(mesh.target) > 40 * 40) {
          mesh.group.position.copy(mesh.target);
          mesh.group.rotation.y = entry.angle || 0;
        } else {
          mesh.group.position.lerp(mesh.target, blend);
        }
        entry.hiddenLastFrame = false;
        mesh.group.rotation.y += angleDelta(mesh.group.rotation.y, entry.angle || 0) * (1 - Math.pow(0.001, dt));
        const wobble = settings.quality === "performance" || entry.airborne ? 0 : Math.sin(now * 0.008 + stableSeed(id)) * 0.025;
        mesh.chassis.rotation.x += angleDelta(mesh.chassis.rotation.x, entry.pitch || 0) * Math.min(1, dt * 12);
        mesh.chassis.rotation.z += angleDelta(mesh.chassis.rotation.z, (entry.roll || 0) + wobble) * Math.min(1, dt * 12);
        if (settings.quality === "performance") {
          mesh.label.visible = false;
        } else {
          mesh.label.visible = true;
          for (const wheel of mesh.wheels) wheel.rotation.x += Math.abs(entry.speed || 0) * dt * 2.4;
          mesh.label.quaternion.copy(camera.quaternion);
        }
        mesh.underglow.intensity = entry.shieldUntil > serverNow ? (settings.quality === "performance" ? 0.65 : 1.5) : (settings.quality === "performance" ? 0.22 : 0.6);
        updateCarExtras(
          mesh,
          {
            boosting: entry.boosting,
            overspeed: (entry.speed || 0) > 52,
            streak: entry.streak,
            shielded: entry.shieldUntil > serverNow,
            slamming: entry.slamUntil > serverNow,
            isLeader: leaderId === id,
            hasBomb: bombHolder === id
          },
          now,
          dt
        );
        if ((entry.streak || 0) >= 3 && settings.quality === "showcase" && now - (entry.lastFireFxAt || 0) > 90) {
          entry.lastFireFxAt = now;
          const p = mesh.group.position;
          spawnParticle(p.x + (Math.random() - 0.5) * 2.5, p.y + 2, p.z + (Math.random() - 0.5) * 2.5, "#ff7a1f", 0.5, 1.6, new THREE.Vector3(0, 4, 0), 0.6);
        }
      }
      updateBountyBeam(event, serverNow);
    }

    function getLeaderId() {
      let best = null;
      for (const entry of players.values()) {
        if ((entry.score || 0) <= 0) continue;
        if (!best || entry.score > best.score) best = entry;
      }
      return best ? best.id : null;
    }

    function updateBountyBeam(event, serverNow) {
      if (!fx.bountyBeam) {
        fx.bountyBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 3.2, 90, 16, 1, true),
          fx.additive(glowColor("#ffd166", 1.4), 0.22)
        );
        fx.bountyBeam.material.side = THREE.DoubleSide;
        fx.bountyBeam.visible = false;
        fxRoot.add(fx.bountyBeam);
      }
      const targetId = event?.kind === "bounty" ? String(event.targetId) : null;
      const target = targetId ? (targetId === state.id ? { mode: state.mode } : players.get(targetId)) : null;
      const visible = Boolean(target && target.mode === "arena" && !(target.wreckedUntil > serverNow));
      fx.bountyBeam.visible = visible;
      if (!visible) return;
      const position = targetId === state.id ? localCar.group.position : target.mesh.group.position;
      fx.bountyBeam.position.set(position.x, position.y + 45, position.z);
      fx.bountyBeam.material.opacity = 0.16 + Math.sin(performance.now() * 0.006) * 0.06;
    }

    function updatePickups(dt) {
      const frameNow = performance.now();
      const animate = settings.quality !== "performance" || frameNow - state.lastPickupVisualAt >= 90;
      if (animate) state.lastPickupVisualAt = frameNow;
      const now = frameNow * 0.001;
      for (const pickup of pickups.values()) {
        pickup.mesh.visible = pickup.active;
        if (!pickup.active) continue;
        if (!animate) continue;
        pickup.mesh.rotation.y += dt * 2.8;
        pickup.mesh.position.y = 1.4 + Math.sin(now * 3 + pickup.x) * 0.28;
      }
    }

    function updateEffects(dt) {
      for (let i = effects.length - 1; i >= 0; i -= 1) {
        const effect = effects[i];
        effect.life -= dt;
        effect.mesh.position.addScaledVector(effect.velocity, dt);
        effect.mesh.scale.multiplyScalar(1 + dt * effect.grow);
        if (effect.mesh.material.opacity !== undefined) {
          effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife) * effect.opacity;
        }
        if (effect.life <= 0) {
          scene.remove(effect.mesh);
          effect.mesh.material.dispose();
          effects.splice(i, 1);
        }
      }

      state.car.damageFlash = Math.max(0, (state.car.damageFlash || 0) - dt * 1.7);
      state.gulag.muzzleFlash = Math.max(0, (state.gulag.muzzleFlash || 0) - dt * 9);
      state.gulag.enemyMuzzleFlash = Math.max(0, (state.gulag.enemyMuzzleFlash || 0) - dt * 8);
      if (els.damage) {
        const maxDamageOpacity = state.mode === "gulag" ? 0.28 : 0.56;
        els.damage.style.opacity = String(Math.min(maxDamageOpacity, state.car.damageFlash || 0));
      }
    }

    function startGulag(msg) {
      state.mode = "gulag";
      state.menuOpen = false;
      state.gulag.active = true;
      state.gulag.resultSent = false;
      state.gulag.health = 100;
      state.gulag.enemyHealth = GULAG_ENEMY_MAX_HEALTH;
      state.gulag.enemyFireAt = performance.now() + 900;
      state.gulag.playerFireAt = 0;
      state.gulag.firing = false;
      state.gulag.hitFlash = 0;
      state.gulag.muzzleFlash = 0;
      state.gulag.enemyMuzzleFlash = 0;
      state.gulag.enemyDodgeUntil = 0;
      state.gulag.opponentName = msg.opponentName || "Warden";
      state.gulag.endsAt = msg.endsAt || getServerNow() + 45000;
      state.gulag.position.set(0, 2.35, 267);
      state.gulag.velocity.set(0, 0, 0);
      state.gulag.enemyPosition.set(0, 0, 309);
      state.gulag.enemyVelocity.set(0, 0, 0);
      state.gulag.yaw = Math.PI;
      state.gulag.pitch = 0;
      clearInput();
      els.chaosBanner?.classList.add("hidden");
      gulagWorld.group.visible = true;
      gulagWorld.enemy.visible = true;
      setArenaWorldVisible(false);
      scene.background = new THREE.Color("#110b17");
      scene.fog = new THREE.FogExp2("#241020", 0.014);
      if (gulagWorld.enemy.userData.label) {
        updateNameLabel(gulagWorld.enemy.userData.label, state.gulag.opponentName, "#ffcf6b");
      }
      weapon.visible = true;
      localCar.group.visible = false;
      setMenu(false);
      setStatus("Gulag duel: win to redeploy.", "offline");
      showModeOverlay("GULAG", "Win your 1v1 or spectate.", "WASD move. Mouse aim. Click or Space shoots.", { combatHud: true });
      document.body.requestPointerLock?.();
    }

    function endGulag() {
      state.gulag.active = false;
      state.gulag.firing = false;
      clearInput();
      gulagWorld.group.visible = false;
      weapon.visible = false;
      modeOverlay.root.classList.add("hidden");
      setArenaWorldVisible(true);
      scene.background = arenaBackground;
      scene.fog = arenaFog;
      localCar.group.visible = true;
      document.exitPointerLock?.();
    }

    function setArenaWorldVisible(visible) {
      for (const child of scene.children) {
        if (child === camera || child === gulagWorld.group || child === podiumShowcase.group || child.isLight) continue;
        child.visible = visible;
      }
      for (const entry of players.values()) {
        if (entry.mesh?.group) entry.mesh.group.visible = visible && entry.mode === "arena";
      }
      for (const pickup of pickups.values()) {
        if (pickup.mesh) pickup.mesh.visible = visible && pickup.active;
      }
    }

    function syncRoundPresentation() {
      if (state.room.phase === "intermission") {
        startPodiumShow(state.room.standings);
      } else if (state.podium.active) {
        endPodiumShow();
      }
    }

    function getCurrentStandings() {
      return [...players.values()]
        .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.wrecks || 0) - (a.wrecks || 0))
        .slice(0, 3)
        .map((player) => ({
          id: player.id,
          name: player.name || "Driver",
          color: player.color || "#7eb8ff",
          score: player.score || 0,
          wrecks: player.wrecks || 0,
          isBot: Boolean(player.isBot)
        }));
    }

    function startPodiumShow(standings = []) {
      const entrants = (Array.isArray(standings) && standings.length ? standings : getCurrentStandings()).slice(0, 3);
      if (!entrants.length) return;
      if (state.podium.active && state.podium.round === state.room.round) return;

      endGulag();
      state.mode = "arena";
      document.exitPointerLock?.();
      clearInput();
      setMenu(false);
      state.podium.active = true;
      state.podium.round = state.room.round;
      state.podium.startedAt = performance.now();
      state.podium.lastConfettiAt = 0;
      state.podium.entrants = entrants;
      state.podium.confetti = [];
      state.car.velocity.set(0, 0);
      localCar.group.visible = false;
      setArenaWorldVisible(false);
      podiumShowcase.group.visible = true;
      scene.background = new THREE.Color("#120d18");
      scene.fog = new THREE.FogExp2("#170d18", 0.018);

      clearPodiumCars();
      entrants.forEach((entrant, index) => {
        const slot = podiumShowcase.slots[index];
        const car = createCarMesh(entrant.color || "#7eb8ff", false, entrant.name || `Driver ${index + 1}`, Boolean(entrant.isBot));
        car.group.scale.setScalar(index === 0 ? 0.84 : 0.76);
        car.group.position.set(slot.x, slot.y + 7.5, slot.z);
        car.group.rotation.y = slot.angle;
        car.group.userData.slot = slot;
        car.group.userData.index = index;
        podiumShowcase.group.add(car.group);
        state.podium.cars.push(car);
      });

      spawnPodiumConfetti(72);
      const winner = entrants[0];
      showBanner("Podium", `${winner.name || "The winner"} takes round ${state.room.round} with ${Math.round(winner.score || 0)} points.`);
      setStatus("Podium ceremony. Next round is loading.", "online");
      playTone(660, 0.12, "triangle", 0.05);
      setTimeout(() => playTone(880, 0.14, "triangle", 0.05), 120);
      setTimeout(() => playTone(1100, 0.18, "triangle", 0.04), 260);
    }

    function endPodiumShow() {
      if (!state.podium.active && !podiumShowcase.group.visible) return;
      clearPodiumCars();
      clearPodiumConfetti();
      state.podium.active = false;
      state.podium.entrants = [];
      podiumShowcase.group.visible = false;
      setArenaWorldVisible(true);
      scene.background = arenaBackground;
      scene.fog = arenaFog;
      localCar.group.visible = state.mode === "arena";
    }

    function clearPodiumCars() {
      for (const car of state.podium.cars) {
        podiumShowcase.group.remove(car.group);
      }
      state.podium.cars = [];
    }

    function clearPodiumConfetti() {
      for (const confetti of state.podium.confetti) {
        podiumShowcase.group.remove(confetti.mesh);
      }
      state.podium.confetti = [];
    }

    function updatePodium(dt) {
      const elapsed = (performance.now() - state.podium.startedAt) / 1000;
      const orbit = -0.32 + Math.sin(elapsed * 0.38) * 0.18;
      const radius = 27 - easeOutCubic(THREE.MathUtils.clamp(elapsed / 2.2, 0, 1)) * 4;
      camera.position.lerp(
        scratch3.set(Math.sin(orbit) * 18, 10.5 + Math.sin(elapsed * 0.8) * 0.45, Math.cos(orbit) * radius),
        1 - Math.pow(0.001, dt)
      );
      camera.lookAt(0, 3.7, -0.2);
      const targetFov = 51;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.001, dt));
        camera.updateProjectionMatrix();
      }

      state.podium.cars.forEach((car, index) => {
        const slot = car.group.userData.slot;
        const intro = easeOutCubic(THREE.MathUtils.clamp((elapsed - index * 0.22) / 1.05, 0, 1));
        car.group.position.x = slot.x;
        car.group.position.y = slot.y + (1 - intro) * 7.5 + Math.sin(elapsed * 3.6 + index) * 0.05;
        car.group.position.z = slot.z;
        car.group.rotation.y = slot.angle + Math.sin(elapsed * 1.2 + index) * 0.08;
        car.group.rotation.z = Math.sin(elapsed * 2.4 + index) * 0.035 * intro;
        for (const wheel of car.wheels) wheel.rotation.x += dt * (8 + index * 2);
        car.label.quaternion.copy(camera.quaternion);
        car.underglow.intensity = 1.2 + Math.sin(elapsed * 5 + index) * 0.25;
      });

      if (elapsed - state.podium.lastConfettiAt > 0.24 && state.podium.confetti.length < 160) {
        state.podium.lastConfettiAt = elapsed;
        spawnPodiumConfetti(12);
      }
      updatePodiumConfetti(dt);
    }

    function spawnPodiumConfetti(count) {
      const { confettiGeometry, confettiMaterials } = podiumShowcase;
      for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(confettiGeometry, confettiMaterials[Math.floor(Math.random() * confettiMaterials.length)]);
        mesh.position.set((Math.random() - 0.5) * 34, 13 + Math.random() * 10, -7 + Math.random() * 13);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        podiumShowcase.group.add(mesh);
        state.podium.confetti.push({
          mesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 4.5, -2.2 - Math.random() * 4.2, (Math.random() - 0.5) * 3.2),
          spin: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 9),
          life: 4.8 + Math.random() * 2.8
        });
      }
    }

    function updatePodiumConfetti(dt) {
      for (let i = state.podium.confetti.length - 1; i >= 0; i -= 1) {
        const confetti = state.podium.confetti[i];
        confetti.life -= dt;
        confetti.velocity.y -= dt * 1.4;
        confetti.mesh.position.addScaledVector(confetti.velocity, dt);
        confetti.mesh.rotation.x += confetti.spin.x * dt;
        confetti.mesh.rotation.y += confetti.spin.y * dt;
        confetti.mesh.rotation.z += confetti.spin.z * dt;
        if (confetti.life <= 0 || confetti.mesh.position.y < -1) {
          podiumShowcase.group.remove(confetti.mesh);
          state.podium.confetti.splice(i, 1);
        }
      }
    }

    function easeOutCubic(value) {
      return 1 - Math.pow(1 - value, 3);
    }

    function startSpectator(reason) {
      state.mode = "spectator";
      state.menuOpen = false;
      endGulag();
      clearInput();
      localCar.group.visible = false;
      state.spectator.position.set(state.car.x || 0, 58, (state.car.z || 0) + 76);
      state.spectator.velocity.set(0, 0, 0);
      showModeOverlay("SPECTATOR", "Free cam enabled.", `${reason}. WASD + mouse to fly around. You redeploy automatically when the timer hits zero.`);
      setStatus("Spectating the arena in free cam.", "offline");
      document.body.requestPointerLock?.();
    }

    function updateGulag(dt) {
      const gulag = state.gulag;
      const forward = scratch3.set(-Math.sin(gulag.yaw), 0, -Math.cos(gulag.yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(gulag.yaw), 0, -Math.sin(gulag.yaw));
      const moveX = signedAxis(["d", "arrowright"], ["a", "arrowleft"]);
      const moveZ = signedAxis(["w", "arrowup"], ["s", "arrowdown"]);
      const move = new THREE.Vector3();
      move.addScaledVector(forward, moveZ);
      move.addScaledVector(right, moveX);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(input.has("shift") ? 17 : 11.5);
      gulag.velocity.lerp(move, 1 - Math.pow(0.001, dt));
      const previous = gulag.position.clone();
      gulag.position.addScaledVector(gulag.velocity, dt);
      resolveGulagCover(gulag.position, previous);
      gulag.position.x = THREE.MathUtils.clamp(gulag.position.x, GULAG_BOUNDS.minX, GULAG_BOUNDS.maxX);
      gulag.position.z = THREE.MathUtils.clamp(gulag.position.z, GULAG_BOUNDS.minZ, GULAG_BOUNDS.maxZ);

      updateGulagEnemy(dt);
      if (gulag.firing) fireGulagShot();
      camera.position.copy(gulag.position);
      camera.rotation.order = "YXZ";
      camera.rotation.y = gulag.yaw;
      camera.rotation.x = gulag.pitch;
      camera.rotation.z = 0;
      if (state.car.cameraShake > 0.001) {
        const shake = state.car.cameraShake;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake * 0.35;
        camera.position.z += (Math.random() - 0.5) * shake;
        state.car.cameraShake = Math.max(0, state.car.cameraShake - dt * 3.6);
      }
      updateGulagWeapon(dt);
      const targetFov = 62 + THREE.MathUtils.clamp(gulag.velocity.length() / 18, 0, 1) * 2.5;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.002, dt));
        camera.updateProjectionMatrix();
      }

      if (getServerNow() >= gulag.endsAt && !gulag.resultSent) {
        finishGulag("timeout");
      }
      updateModeOverlay();
    }

    function resolveGulagCover(position, previous) {
      for (const cover of gulagWorld.coverAreas || []) {
        const insideX = Math.abs(position.x - cover.x) < cover.hx;
        const insideZ = Math.abs(position.z - cover.z) < cover.hz;
        if (!insideX || !insideZ) continue;
        if (Math.abs(previous.x - cover.x) >= cover.hx) position.x = previous.x;
        if (Math.abs(previous.z - cover.z) >= cover.hz) position.z = previous.z;
        if (Math.abs(previous.x - cover.x) < cover.hx && Math.abs(previous.z - cover.z) < cover.hz) {
          const pushX = cover.hx - Math.abs(position.x - cover.x);
          const pushZ = cover.hz - Math.abs(position.z - cover.z);
          if (pushX < pushZ) position.x = cover.x + Math.sign(position.x - cover.x || 1) * cover.hx;
          else position.z = cover.z + Math.sign(position.z - cover.z || 1) * cover.hz;
        }
      }
    }

    function updateGulagEnemy(dt) {
      const gulag = state.gulag;
      const toPlayer = scratch3.copy(gulag.position).sub(gulag.enemyPosition);
      toPlayer.y = 0;
      const distance = Math.max(0.001, toPlayer.length());
      const desired = toPlayer.normalize();
      const now = performance.now();
      const tangent = new THREE.Vector3(desired.z, 0, -desired.x);
      const tacticalDistance = distance > 23 ? 7.5 : distance < 13 ? -6 : 1.2;
      const dodge = now < gulag.enemyDodgeUntil ? gulag.enemyDodgeSide * 9 : Math.sin(now * 0.0021) * 5.6;
      const enemyMove = desired.clone().multiplyScalar(tacticalDistance).addScaledVector(tangent, dodge);
      gulag.enemyVelocity.lerp(enemyMove, 1 - Math.pow(0.006, dt));
      const previous = gulag.enemyPosition.clone();
      gulag.enemyPosition.addScaledVector(gulag.enemyVelocity, dt);
      resolveGulagCover(gulag.enemyPosition, previous);
      gulag.enemyPosition.x = THREE.MathUtils.clamp(gulag.enemyPosition.x, GULAG_BOUNDS.minX + 1, GULAG_BOUNDS.maxX - 1);
      gulag.enemyPosition.z = THREE.MathUtils.clamp(gulag.enemyPosition.z, GULAG_BOUNDS.minZ + 2, GULAG_BOUNDS.maxZ - 2);
      gulagWorld.enemy.position.copy(gulag.enemyPosition);
      gulagWorld.enemy.lookAt(gulag.position.x, 1.7, gulag.position.z);
      const runCycle = performance.now() * 0.009;
      for (const [index, leg] of gulagWorld.enemy.userData.legs.entries()) {
        leg.rotation.x = Math.sin(runCycle + index * Math.PI) * THREE.MathUtils.clamp(gulag.enemyVelocity.length() / 15, 0.08, 0.42);
      }
      for (const [index, arm] of gulagWorld.enemy.userData.arms.entries()) {
        arm.rotation.x = 0.82 + Math.sin(runCycle + index * Math.PI) * 0.07;
      }
      gulagWorld.enemy.userData.gun.rotation.x = -0.06 + Math.sin(performance.now() * 0.012) * 0.018;
      if (gulagWorld.enemy.userData.torsoHalo) {
        gulagWorld.enemy.userData.torsoHalo.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.04);
      }
      gulag.hitFlash = Math.max(0, gulag.hitFlash - dt * 5);
      const flash = gulag.hitFlash;
      gulagWorld.enemy.userData.armorMat.emissiveIntensity = 0.5 + flash * 1.8;
      gulagWorld.enemy.userData.suitMat.emissiveIntensity = 0.22 + flash * 0.7;
      gulagWorld.enemy.userData.muzzle.visible = gulag.enemyMuzzleFlash > 0;
      if (gulagWorld.enemy.userData.muzzle.visible) {
        gulagWorld.enemy.userData.muzzle.scale.setScalar(1 + gulag.enemyMuzzleFlash * 5);
      }

      if (now > gulag.enemyFireAt && distance < 58) {
        const aimPressure = THREE.MathUtils.clamp(1 - distance / 62, 0.22, 0.76);
        if (Math.random() < aimPressure) {
          const damage = 8 + Math.round(Math.random() * 8);
          gulag.health = Math.max(0, gulag.health - damage);
          state.car.damageFlash = 0.72;
          state.car.cameraShake = Math.max(state.car.cameraShake, 0.55);
          gulag.enemyMuzzleFlash = 0.16;
          playTone(132, 0.055, "sawtooth", 0.04);
          spawnImpact(gulag.position.x, gulag.position.y - 0.45, gulag.position.z, "#ff4f8b", 6);
        }
        gulag.enemyFireAt = now + 690 + Math.random() * 560;
      }
      if (gulag.health <= 0 && !gulag.resultSent) {
        finishGulag("loss");
      }
    }

    function updateGulagWeapon(dt) {
      const flash = state.gulag.muzzleFlash || 0;
      const moveSway = THREE.MathUtils.clamp(state.gulag.velocity.length() / 18, 0, 1);
      const cycle = performance.now() * 0.009;
      weapon.position.set(
        0.48 + Math.sin(cycle) * 0.012 * moveSway,
        -0.48 - Math.abs(Math.cos(cycle)) * 0.014 * moveSway,
        -0.08 + flash * 0.075
      );
      weapon.rotation.x = -flash * 0.08 + Math.sin(cycle * 0.7) * 0.006 * moveSway;
      weapon.rotation.y = Math.sin(cycle * 0.55) * 0.012 * moveSway;
      weapon.rotation.z = THREE.MathUtils.lerp(weapon.rotation.z, 0, 1 - Math.pow(0.0005, dt));
      weapon.userData.muzzle.visible = flash > 0;
      weapon.userData.muzzleLight.intensity = flash * 8;
      if (weapon.userData.muzzle.visible) {
        weapon.userData.muzzle.scale.setScalar(1 + flash * 4);
      }
    }

    function fireGulagShot() {
      if (state.mode !== "gulag") return;
      const gulag = state.gulag;
      const now = performance.now();
      if (now < gulag.playerFireAt) return;
      gulag.playerFireAt = now + 245;
      gulag.muzzleFlash = 0.18;
      state.car.cameraShake = Math.max(state.car.cameraShake, 0.25);
      playTone(520, 0.038, "square", 0.05);
      weapon.rotation.z = (Math.random() - 0.5) * 0.055;

      const aim = new THREE.Vector3(-Math.sin(gulag.yaw) * Math.cos(gulag.pitch), Math.sin(gulag.pitch), -Math.cos(gulag.yaw) * Math.cos(gulag.pitch)).normalize();
      const ray = new THREE.Ray(gulag.position.clone(), aim);
      const headPoint = gulag.enemyPosition.clone().setY(2.96);
      const chestPoint = gulag.enemyPosition.clone().setY(2.02);
      const headClosest = new THREE.Vector3();
      const chestClosest = new THREE.Vector3();
      ray.closestPointToPoint(headPoint, headClosest);
      ray.closestPointToPoint(chestPoint, chestClosest);
      const headDistance = headClosest.distanceTo(headPoint);
      const chestDistance = chestClosest.distanceTo(chestPoint);
      const travel = headClosest.distanceTo(gulag.position);
      if (travel < 68 && (headDistance < 0.58 || chestDistance < 0.98)) {
        const headshot = headDistance < 0.58;
        const damage = headshot ? GULAG_HEADSHOT_DAMAGE : GULAG_BODY_DAMAGE;
        gulag.enemyHealth = Math.max(0, gulag.enemyHealth - damage);
        gulag.hitFlash = 1;
        gulag.enemyDodgeUntil = now + 420;
        gulag.enemyDodgeSide = Math.random() < 0.5 ? -1 : 1;
        spawnImpact(gulag.enemyPosition.x, headshot ? 2.95 : 2.15, gulag.enemyPosition.z, headshot ? "#ffcf6b" : "#59f0c2", headshot ? 18 : 11);
        lightweightNotice(headshot ? "Gulag headshot. Keep pressure." : "Gulag hit. Stay on target.");
        playTone(headshot ? 980 : 700, 0.055, "triangle", 0.055);
        if (gulag.enemyHealth <= 0 && !gulag.resultSent) {
          finishGulag("win");
        }
      } else {
        spawnImpact(gulag.position.x + aim.x * 18, 1.8 + aim.y * 7, gulag.position.z + aim.z * 18, "#d6f4ff", 3);
      }
      updateModeOverlay();
    }

    function finishGulag(result) {
      state.gulag.resultSent = true;
      sendMessage({ type: "gulag-result", result });
      if (result === "win") {
        showModeOverlay("GULAG WON", "Redeploying...", "Server is dropping you back into the arena.");
      } else {
        showModeOverlay("GULAG LOST", "Spectator incoming.", "You are moving to free cam.");
      }
    }

    function updateSpectator(dt) {
      const spectator = state.spectator;
      const forward = scratch3.set(-Math.sin(spectator.yaw), 0, -Math.cos(spectator.yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(spectator.yaw), 0, -Math.sin(spectator.yaw));
      const vertical = (input.has("e") ? 1 : 0) - (input.has("q") ? 1 : 0);
      const moveX = signedAxis(["d", "arrowright"], ["a", "arrowleft"]);
      const moveZ = signedAxis(["w", "arrowup"], ["s", "arrowdown"]);
      const move = new THREE.Vector3(0, vertical, 0);
      move.addScaledVector(forward, moveZ);
      move.addScaledVector(right, moveX);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(input.has("shift") ? 82 : 42);
      spectator.velocity.lerp(move, 1 - Math.pow(0.002, dt));
      spectator.position.addScaledVector(spectator.velocity, dt);
      spectator.position.x = THREE.MathUtils.clamp(spectator.position.x, -190, 190);
      spectator.position.y = THREE.MathUtils.clamp(spectator.position.y, 8, 115);
      spectator.position.z = THREE.MathUtils.clamp(spectator.position.z, -190, 190);
      camera.position.copy(spectator.position);
      camera.rotation.order = "YXZ";
      camera.rotation.y = spectator.yaw;
      camera.rotation.x = spectator.pitch;
      camera.rotation.z = 0;
      updateModeOverlay();
    }

    function showModeOverlay(kicker, title, copy, options = {}) {
      modeOverlay.kicker.textContent = kicker;
      modeOverlay.title.textContent = title;
      modeOverlay.copy.textContent = copy;
      modeOverlay.root.classList.toggle("combat-hud", options.combatHud === true);
      modeOverlay.root.classList.remove("hidden");
      updateModeOverlay();
    }

    function updateModeOverlay() {
      if (state.mode === "gulag") {
        modeOverlay.health.textContent = String(Math.round(state.gulag.health));
        modeOverlay.enemy.textContent = String(Math.round(state.gulag.enemyHealth));
        modeOverlay.time.textContent = String(Math.max(0, Math.ceil((state.gulag.endsAt - getServerNow()) / 1000)));
      } else if (state.mode === "spectator") {
        modeOverlay.health.textContent = "FREE";
        modeOverlay.enemy.textContent = "CAM";
        const redeployIn = Math.ceil(((state.spectator.redeployAt || 0) - getServerNow()) / 1000);
        modeOverlay.time.textContent = redeployIn > 0 ? `${redeployIn}s` : "LIVE";
      }
    }

    function updateCamera(dt, rawDt = dt) {
      const car = state.car;
      const speedPull = THREE.MathUtils.clamp(car.speed / 50, 0, 1);
      const boostPull = car.boosting ? 1 : 0;
      const airPull = car.airborne ? THREE.MathUtils.clamp(car.airTime / 0.6, 0, 1) : 0;
      const velocityYaw = car.speed > 6 ? Math.atan2(car.velocity.x, car.velocity.y) : car.angle;
      const yawTarget = car.airborne ? velocityYaw : car.angle;
      if (!Number.isFinite(state.cameraYaw)) state.cameraYaw = car.angle;
      state.cameraYaw += angleDelta(state.cameraYaw, yawTarget) * (1 - Math.pow(car.airborne ? 0.08 : 0.0004, rawDt));
      const yaw = state.cameraYaw;
      const back = 13 + speedPull * 7 + boostPull * 2.2 + airPull * 5;
      const height = 7.5 + speedPull * 2.5 + boostPull * 0.8 + airPull * 3;
      const desired = scratch3.set(car.x - Math.sin(yaw) * back, car.y + height, car.z - Math.cos(yaw) * back);
      camera.position.lerp(desired, 1 - Math.pow(0.0009, rawDt));
      if (car.cameraShake > 0.001) {
        const shake = car.cameraShake;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake * 0.45;
        camera.position.z += (Math.random() - 0.5) * shake;
        car.cameraShake = Math.max(0, car.cameraShake - rawDt * 2.4);
      }
      const overspeed = performance.now() < car.overspeedUntil ? 6 : 0;
      const slowmo = state.timeScale < 0.9 ? -9 : 0;
      const targetFov = 62 + speedPull * 4 + boostPull * 3 + overspeed + slowmo;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.002, rawDt));
        camera.updateProjectionMatrix();
      }
      camera.lookAt(car.x, car.y + 2.2, car.z);
    }

    function updateHud() {
      const now = performance.now();
      const car = state.car;
      const all = [...players.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
      if (els.count) els.count.textContent = String(players.size || 1);
      if (els.streak) els.streak.textContent = car.streak >= 3 ? `${car.streak} \u{1F525}` : String(car.streak || 0);
      if (els.speed) els.speed.textContent = String(Math.round(car.speed * 2.25));
      if (els.boost) els.boost.textContent = String(Math.round(car.boost));
      if (els.score) els.score.textContent = String(Math.round(car.score || 0));
      if (els.health) els.health.textContent = String(Math.round(car.health || 0));
      if (els.round) els.round.textContent = String(state.room.round || 1);
      if (els.healthBar) els.healthBar.style.width = `${THREE.MathUtils.clamp(car.health || 0, 0, 100)}%`;
      if (els.boostBar) els.boostBar.style.width = `${THREE.MathUtils.clamp(car.boost, 0, 100)}%`;
      if (els.power) els.power.textContent = getPowerText();
      if (els.timer) els.timer.textContent = formatTimer();
      if (els.leader) {
        const leader = all[0] || { name: "You", score: car.score || 0 };
        els.leader.textContent = `${leader.name} - ${Math.round(leader.score || 0)}`;
      }
      if (els.objective) {
        if (state.podium.active) {
          els.objective.textContent = "Podium ceremony: top 3 drivers are flexing before the next round.";
        } else if (state.mode === "gulag") {
          els.objective.textContent = `Gulag: eliminate ${state.gulag.opponentName} to redeploy.`;
        } else if (state.mode === "spectator") {
          els.objective.textContent = "Spectator free cam: WASD to fly, mouse to look, Q/E for height.";
        } else {
          els.objective.textContent = getObjectiveText();
        }
      }
      updateChaosHud();
      updateWeaponHud();
      updateComboHud();
      if (now - state.lastLeaderboardDrawAt >= (settings.quality === "performance" ? 900 : 450)) {
        state.lastLeaderboardDrawAt = now;
        drawLeaderboard(all);
      }
      if (now - state.lastRadarDrawAt >= (settings.quality === "performance" ? 550 : 220)) {
        state.lastRadarDrawAt = now;
        drawRadar(all);
      }
    }

    function sendLocalState() {
      if (state.mode !== "arena" || state.podium.active || !state.joined || !state.socket || state.socket.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (now - state.lastStateAt < STATE_SEND_MS) return;
      state.lastStateAt = now;
      sendMessage({
        type: "state",
        x: state.car.x,
        y: state.car.y,
        z: state.car.z,
        angle: state.car.angle,
        speed: state.car.speed,
        vx: state.car.velocity.x,
        vz: state.car.velocity.y,
        pitch: localCar.chassis.rotation.x,
        roll: localCar.chassis.rotation.z,
        boosting: state.car.boosting,
        airborne: state.car.airborne,
        inZone: state.car.inZone
      });
    }

    function setPlayers(list) {
      const seen = new Set();
      for (const player of list) {
        seen.add(String(player.id));
        upsertPlayer(player);
      }
      for (const id of [...players.keys()]) {
        if (!seen.has(id)) removeRemotePlayer(id);
      }
    }

    function upsertPlayer(player, hardSync = false) {
      const id = String(player.id);
      if (id === state.id) {
        state.car.name = player.name || state.car.name;
        state.car.color = player.color || state.car.color;
        state.mode = player.mode || state.mode;
        state.car.health = player.health ?? state.car.health;
        state.car.score = player.score ?? state.car.score;
        state.car.roundWins = player.roundWins ?? state.car.roundWins;
        state.car.shieldUntil = player.shieldUntil || 0;
        state.car.slamUntil = player.slamUntil || 0;
        state.car.wreckedUntil = player.wreckedUntil || 0;
        state.car.gulagUntil = player.gulagUntil || 0;
        state.car.streak = player.streak || 0;
        state.car.weapon = player.weapon || null;
        state.car.weaponCharges = player.weaponCharges || 0;
        if (hardSync) syncLocalTransform(player);
      }

      let entry = players.get(id);
        if (!entry) {
          entry = {
            id,
          mesh: id === state.id ? localCar : createCarMesh(player.color || "#7eb8ff", false, player.name, Boolean(player.isBot)),
          x: player.x || 0,
          y: player.y ?? 0.08,
          z: player.z || 0,
          angle: player.angle || 0,
          speed: player.speed || 0,
          vx: player.vx || 0,
          vz: player.vz || 0
          };
          entry.mesh.group.position.set(entry.x, entry.y, entry.z);
          entry.mesh.group.rotation.y = entry.angle;
          if (id !== state.id) scene.add(entry.mesh.group);
          players.set(id, entry);
        }

      Object.assign(entry, {
        name: player.name,
        color: player.color,
        x: player.x ?? entry.x,
        y: player.y ?? entry.y,
        z: player.z ?? entry.z,
        angle: player.angle ?? entry.angle,
        speed: player.speed ?? entry.speed,
        vx: player.vx ?? entry.vx ?? 0,
        vz: player.vz ?? entry.vz ?? 0,
        mode: player.mode || "arena",
        score: player.score || 0,
        health: player.health ?? 100,
        roundWins: player.roundWins || 0,
        shieldUntil: player.shieldUntil || 0,
        slamUntil: player.slamUntil || 0,
        wreckedUntil: player.wreckedUntil || 0,
        pitch: player.pitch || 0,
        roll: player.roll || 0,
        boosting: Boolean(player.boosting),
        airborne: Boolean(player.airborne),
        streak: player.streak || 0,
        weapon: player.weapon || null,
        isBot: Boolean(player.isBot)
      });
      entry.mesh.group.visible = entry.mode === "arena";

      if (id === state.id && hardSync) {
        entry.mesh.group.position.set(state.car.x, state.car.y + 0.08, state.car.z);
        entry.mesh.group.rotation.y = state.car.angle;
      }
    }

    function syncLocalTransform(player) {
      state.car.x = player.x ?? state.car.x;
      state.car.y = player.y ?? 0;
      state.car.z = player.z ?? state.car.z;
      state.car.angle = player.angle ?? state.car.angle;
      state.car.speed = player.speed ?? state.car.speed;
      state.car.vy = 0;
      state.car.airborne = false;
      state.car.airPitch = 0;
      state.car.airRoll = 0;
      state.car.groundPitch = 0;
      state.cameraYaw = state.car.angle;
    }

    function removeRemotePlayer(id) {
      const entry = players.get(id);
      if (!entry) return;
      if (id !== state.id) scene.remove(entry.mesh.group);
      players.delete(id);
    }

    function setPickups(list) {
      for (const pickup of list) {
        let entry = pickups.get(pickup.id);
        if (!entry) {
          entry = {
            id: pickup.id,
            type: pickup.type,
            x: pickup.x,
            z: pickup.z,
            active: pickup.active,
            mesh: createPickupMesh(pickup)
          };
          scene.add(entry.mesh);
          pickups.set(pickup.id, entry);
        }
        entry.active = Boolean(pickup.active);
        entry.mesh.visible = entry.active;
      }
    }

    function makeCrateTexture() {
      if (makeCrateTexture.texture) return makeCrateTexture.texture;
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#2a0f45";
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "#e9d5ff";
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, 112, 112);
      ctx.fillStyle = "#f5e9ff";
      ctx.font = "900 86px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", 64, 70);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      makeCrateTexture.texture = texture;
      return texture;
    }

    function createPickupMesh(pickup) {
      const meta = pickupMeta[pickup.type] || pickupMeta.boost;
      const group = new THREE.Group();
      if (pickup.type === "crate") {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 2.3, 2.3),
          new THREE.MeshBasicMaterial({ map: makeCrateTexture(), color: glowColor("#ffffff", 1.25) })
        );
        crate.rotation.set(0.5, 0, 0.35);
        const crateHalo = new THREE.Mesh(
          new THREE.TorusGeometry(2.4, 0.1, 8, 40),
          new THREE.MeshBasicMaterial({ color: glowColor(meta.color, 1.5), transparent: true, opacity: 0.8 })
        );
        crateHalo.rotation.x = Math.PI / 2;
        group.add(crate, crateHalo);
        group.position.set(pickup.x, 1.4, pickup.z);
        return group;
      }
      const detail = settings.quality === "performance" ? 0 : 1;
      const haloSegments = settings.quality === "performance" ? 20 : 48;
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.45, detail),
        new THREE.MeshBasicMaterial({
          color: meta.color,
          transparent: true,
          opacity: 0.96
        })
      );
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(2.25, 0.12, settings.quality === "performance" ? 6 : 10, haloSegments),
        new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: 0.75 })
      );
      halo.rotation.x = Math.PI / 2;
      const outerHalo = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.08, settings.quality === "performance" ? 5 : 8, settings.quality === "performance" ? 18 : 42),
        new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: 0.35 })
      );
      outerHalo.rotation.x = Math.PI / 2;
      group.add(core, halo, outerHalo);
      group.position.set(pickup.x, 1.4, pickup.z);
      return group;
    }

    function applyRoom(room) {
      if (!room) return;
      Object.assign(state.room, room);
      if (Number.isFinite(room.now)) {
        const offset = room.now - Date.now();
        state.serverOffset = state.serverOffsetReady ? state.serverOffset * 0.9 + offset * 0.1 : offset;
        state.serverOffsetReady = true;
      }
      if (els.room) els.room.textContent = state.room.code || roomCode;
    }

    function drawLeaderboard(all) {
      if (!els.leaderboard) return;
      els.leaderboard.innerHTML = "";
      for (const [index, player] of all.slice(0, 5).entries()) {
        const row = document.createElement("div");
        row.className = `leaderboard-row ${player.id === state.id ? "is-you" : ""}`;
        row.innerHTML = `
          <span class="leaderboard-rank">${index + 1}</span>
          <strong>${escapeHtml(player.name || "Driver")}${player.isBot ? " [BOT]" : ""}</strong>
          <span>${Math.round(player.score || 0)}</span>
        `;
        els.leaderboard.appendChild(row);
      }
    }

    function drawRadar(all) {
      if (!radarCtx || !els.radar) return;
      const size = els.radar.width;
      const now = performance.now();
      const serverNow = getServerNow();
      const event = state.room.phase === "live" ? state.room.event : null;
      radarCtx.clearRect(0, 0, size, size);
      radarCtx.fillStyle = "rgba(3, 8, 14, 0.72)";
      radarCtx.fillRect(0, 0, size, size);
      const ringPoint = radarPoint(state.ring.x, state.ring.z, size);
      radarCtx.strokeStyle = state.ring.mult > 1 ? "rgba(255, 207, 107, 0.95)" : "rgba(255, 207, 107, 0.38)";
      radarCtx.lineWidth = state.ring.mult > 1 ? 3 : 2;
      radarCtx.beginPath();
      radarCtx.arc(ringPoint.x, ringPoint.y, (CENTER_MAX / WORLD_SIZE) * size * 0.5, 0, Math.PI * 2);
      radarCtx.stroke();

      for (const pickup of pickups.values()) {
        if (!pickup.active) continue;
        const p = radarPoint(pickup.x, pickup.z, size);
        radarCtx.fillStyle = pickupMeta[pickup.type]?.color || "#ffffff";
        radarCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }

      for (const hazard of hazards.values()) {
        const p = radarPoint(hazard.x, hazard.z, size);
        radarCtx.strokeStyle = "rgba(255, 45, 85, 0.9)";
        radarCtx.lineWidth = 1.5;
        radarCtx.beginPath();
        radarCtx.arc(p.x, p.y, (11 / WORLD_SIZE) * size * 0.48, 0, Math.PI * 2);
        radarCtx.stroke();
      }

      for (const projectile of projectiles.values()) {
        const p = radarPoint(projectile.mesh.position.x, projectile.mesh.position.z, size);
        if (projectile.kind === "blackhole") {
          radarCtx.strokeStyle = "rgba(192, 132, 252, 0.9)";
          radarCtx.lineWidth = 1.5;
          radarCtx.beginPath();
          radarCtx.arc(p.x, p.y, projectile.phase === "pulling" ? (BLACKHOLE_PULL_RADIUS / WORLD_SIZE) * size * 0.48 : 3, 0, Math.PI * 2);
          radarCtx.stroke();
        } else {
          radarCtx.fillStyle = projectile.kind === "mine" ? "#ffcf6b" : "#ffffff";
          radarCtx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
      }

      const leaderId = getLeaderId();
      const bombHolder = event?.kind === "bomb" ? String(event.holderId) : null;
      for (const player of all) {
        if (player.mode && player.mode !== "arena") continue;
        if (player.id !== state.id && player.wreckedUntil > serverNow) continue;
        const x = player.id === state.id ? state.car.x : player.x;
        const z = player.id === state.id ? state.car.z : player.z;
        const p = radarPoint(x, z, size);
        if (player.id === bombHolder) {
          radarCtx.fillStyle = Math.sin(now * 0.02) > 0 ? "#ff2d55" : "#ffffff";
          radarCtx.beginPath();
          radarCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          radarCtx.fill();
        }
        if (player.id === leaderId) {
          radarCtx.strokeStyle = "#ffcf6b";
          radarCtx.lineWidth = 2;
          radarCtx.beginPath();
          radarCtx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          radarCtx.stroke();
        }
        radarCtx.fillStyle = player.id === state.id ? "#59f0c2" : player.isBot ? "#ffcf6b" : "#ff4f8b";
        radarCtx.beginPath();
        radarCtx.arc(p.x, p.y, player.id === state.id ? 4 : 3, 0, Math.PI * 2);
        radarCtx.fill();
      }
    }

    function radarPoint(x, z, size) {
      return {
        x: size / 2 + (x / WORLD_SIZE) * size * 0.48,
        y: size / 2 + (z / WORLD_SIZE) * size * 0.48
      };
    }

    function setMenu(open) {
      state.menuOpen = open;
      document.body.classList.toggle("is-menu-open", open);
      document.body.classList.toggle("is-driving", !open);
      els.release?.classList.toggle("hidden", !open);
    }

    function copyInvite() {
      const invite = roomShareUrl(state.room.code || roomCode);
      navigator.clipboard?.writeText(invite).then(
        () => toast("Invite copied.", "info"),
        () => toast(invite, "info")
      );
    }

    function setStatus(text, mode) {
      if (!els.connection) return;
      els.connection.textContent = text;
      els.connection.classList.toggle("online", mode === "online");
      els.connection.classList.toggle("offline", mode === "offline");
    }

    function toast(text, tone = "info") {
      if (!els.toast || !text) return;
      const now = performance.now();
      const key = `${tone}:${text}`;
      if (state.lastToastText === key && now - state.lastToastAt < 2500) return;
      state.lastToastText = key;
      state.lastToastAt = now;
      const node = document.createElement("div");
      node.className = `toast ${tone}`;
      node.textContent = text;
      els.toast.prepend(node);
      setTimeout(() => node.remove(), 3600);
    }

    function lightweightNotice(text) {
      if (!els.objective || !text) return;
      const now = performance.now();
      if (settings.quality === "performance" && now - state.lastNoticeAt < 280) return;
      state.lastNoticeAt = now;
      els.objective.textContent = text;
      clearTimeout(lightweightNoticeTimer);
      lightweightNoticeTimer = setTimeout(() => {
        if (els.objective) {
          els.objective.textContent = getObjectiveText();
        }
      }, 950);
    }

    function showBanner(kicker, message) {
      if (!els.banner) return;
      els.bannerKicker.textContent = kicker;
      els.bannerMessage.textContent = message;
      els.banner.classList.remove("hidden");
      clearTimeout(showBanner.timeout);
      showBanner.timeout = setTimeout(() => els.banner.classList.add("hidden"), 1800);
    }

    function sendMessage(message) {
      if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify(message));
      }
    }

    function spawnBoostTrail() {
      const car = state.car;
      const now = performance.now();
      if (now - car.lastBoostTrailAt < (settings.quality === "performance" ? 145 : 42)) return;
      car.lastBoostTrailAt = now;
      const sides = settings.quality === "performance" ? [0] : [-1, 1];
      for (const side of sides) {
        const x = car.x - Math.sin(car.angle) * 3.5 + Math.cos(car.angle) * side * 1.25;
        const z = car.z - Math.cos(car.angle) * 3.5 - Math.sin(car.angle) * side * 1.25;
        spawnParticle(x, car.y + 0.55, z, "#59f0c2", 0.32, 3.4, new THREE.Vector3(0, 1.1, 0));
      }
    }

    function spawnSkidSmoke(amount) {
      const car = state.car;
      const now = performance.now();
      if (now - car.lastSkidSmokeAt < (settings.quality === "performance" ? 180 : 55)) return;
      car.lastSkidSmokeAt = now;
      const x = car.x - Math.sin(car.angle) * 3.2;
      const z = car.z - Math.cos(car.angle) * 3.2;
      for (const side of [-2.35, 2.35]) {
        addSkidMark(
          car.x - Math.sin(car.angle) * 2.55 + Math.cos(car.angle) * side,
          car.z - Math.cos(car.angle) * 2.55 - Math.sin(car.angle) * side,
          car.angle
        );
      }
      spawnParticle(
        x,
        car.y + 0.45,
        z,
        "#c7d2de",
        0.42,
        2.6 + amount * 0.12,
        new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8, (Math.random() - 0.5) * 1.4),
        0.28
      );
    }

    function spawnImpact(x, y, z, color, count = 10) {
      const impactCount = settings.quality === "performance" ? Math.min(count, 4) : settings.quality === "balanced" ? Math.min(count, 8) : count;
      for (let i = 0; i < impactCount; i += 1) {
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 13, Math.random() * 7 + 1, (Math.random() - 0.5) * 13);
        spawnParticle(x, y, z, color, 0.46, 2.6, velocity, 0.68);
      }
    }

    function spawnParticle(x, y, z, color, life, grow, velocity, opacity = 0.5, sizeScale = 1) {
      const maxEffects = getMaxEffects();
      if (settings.quality === "performance" && effects.length >= maxEffects) return;
      while (effects.length >= maxEffects) {
        const oldest = effects.shift();
        if (!oldest) break;
        scene.remove(oldest.mesh);
        oldest.mesh.material.dispose();
      }
      const mesh = new THREE.Mesh(
        particleGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      );
      mesh.position.set(x, y, z);
      const size = (0.18 + Math.random() * 0.18) * sizeScale;
      mesh.scale.setScalar(size);
      scene.add(mesh);
      effects.push({ mesh, life, maxLife: life, grow, velocity, opacity });
    }

    function getPowerText() {
      const now = getServerNow();
      if (state.car.slamUntil > now) return `Slam ${Math.ceil((state.car.slamUntil - now) / 1000)}s`;
      if (state.car.shieldUntil > now) return `Shield ${Math.ceil((state.car.shieldUntil - now) / 1000)}s`;
      if (state.car.airborne) return "Airborne";
      return state.car.inZone ? (state.ring.mult > 1 ? `Ring x${state.ring.mult}` : "Ring") : "None";
    }

    function formatTimer() {
      const now = getServerNow();
      const target = state.room.phase === "intermission" ? state.room.nextRoundAt : state.room.endsAt;
      const remaining = Math.max(0, Math.ceil((target - now) / 1000));
      const min = Math.floor(remaining / 60);
      const sec = String(remaining % 60).padStart(2, "0");
      return `${min}:${sec}`;
    }

    function getPlayerPosition(id) {
      if (String(id) === state.id) return state.mode === "arena" ? { x: state.car.x, y: state.car.y, z: state.car.z } : null;
      const entry = players.get(String(id));
      return entry && entry.mode === "arena" ? { x: entry.x, y: entry.y ?? 0.08, z: entry.z } : null;
    }

    function isInCenterRing(x, z) {
      const dist = Math.hypot(x - state.ring.x, z - state.ring.z);
      return dist >= state.ring.min && dist <= state.ring.max;
    }

    function axis(positive, altPositive) {
      return input.has(positive) || input.has(altPositive) ? 1 : 0;
    }

    function signedAxis(positiveKeys, negativeKeys) {
      const positive = positiveKeys.some((key) => input.has(key)) ? 1 : 0;
      const negative = negativeKeys.some((key) => input.has(key)) ? 1 : 0;
      return positive - negative;
    }

    function clearInput() {
      input.clear();
      state.gulag.firing = false;
    }

    function normalizeKey(key) {
      return String(key || "").toLowerCase();
    }

    function sanitizeRoom(value) {
      return String(value || "main").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16) || "main";
    }

    function loadName() {
      return localStorage.getItem("crash-club-name") || `Driver ${Math.floor(Math.random() * 900 + 100)}`;
    }

    function loadColor() {
      let color = localStorage.getItem("crash-club-color");
      if (!color) {
        const colors = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#a78bfa", "#f97316"];
        color = colors[Math.floor(Math.random() * colors.length)];
        localStorage.setItem("crash-club-color", color);
      }
      return color;
    }

    function makeGroundTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#173127";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i += 1) {
        const shade = 28 + Math.floor(Math.random() * 34);
        ctx.fillStyle = `rgba(${shade}, ${70 + Math.random() * 28}, ${54 + Math.random() * 20}, 0.24)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(18, 18);
      return texture;
    }

    function playTone(frequency, duration, type = "sine", volume = 0.04) {
      if (!playTone.enabled || !settings.sound || settings.volume <= 0) return;
      if (!playTone.ctx) {
        const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioCtx) return;
        playTone.ctx = new AudioCtx();
      }
      const ctx = playTone.ctx;
      try {
        ctx.resume?.();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume * settings.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        playTone.enabled = false;
      }
    }

    function updateEngineAudio() {
      if (!playTone.enabled || !settings.sound || settings.volume <= 0 || state.mode !== "arena" || state.menuOpen) {
        if (updateEngineAudio.gain && playTone.ctx) {
          updateEngineAudio.gain.gain.setTargetAtTime(0.0001, playTone.ctx.currentTime, 0.08);
        }
        return;
      }
      warmAudio();
      const ctx = playTone.ctx;
      if (!ctx) return;
      if (!updateEngineAudio.osc) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        gain.gain.value = 0.0001;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        updateEngineAudio.osc = osc;
        updateEngineAudio.gain = gain;
      }
      const speed = THREE.MathUtils.clamp(state.car.speed / 52, 0, 1);
      const targetFreq = 48 + speed * 96 + (state.car.boosting ? 28 : 0);
      const targetGain = (0.008 + speed * 0.022 + (state.car.boosting ? 0.008 : 0)) * settings.volume;
      updateEngineAudio.osc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.05);
      updateEngineAudio.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
    }

    function warmAudio() {
      if (playTone.ctx) return;
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        playTone.ctx = new AudioCtx();
        playTone.ctx.resume?.();
      } catch {
        playTone.enabled = false;
      }
    }

    function onResize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(getRenderPixelRatio());
      if (composer) {
        composer.setPixelRatio(getRenderPixelRatio());
        composer.setSize(innerWidth, innerHeight);
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function angleDelta(from, to) {
      return Math.atan2(Math.sin(to - from), Math.cos(to - from));
    }

    function stableSeed(value) {
      return String(value)
        .split("")
        .reduce((total, char) => total + char.charCodeAt(0), 0);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
      });
    }
  })
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client.";
    const start = document.getElementById("start-button");
    if (start) {
      start.textContent = "Reload Game";
      start.onclick = () => location.reload();
    }
  });
