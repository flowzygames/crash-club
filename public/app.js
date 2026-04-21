import("three")
  .then((THREE) => {
    const VERSION = "1.3.0";
    const WORLD_SIZE = 180;
    const STATE_SEND_MS = 50;
    const HIT_COOLDOWN_MS = 520;
    const STYLE_COOLDOWN_MS = 1350;
    const MAX_BOOST = 100;
    const CENTER_MIN = 8;
    const CENTER_MAX = 19;
    const MAX_EFFECTS = 110;
    const GULAG_ENEMY_MAX_HEALTH = 180;
    const GULAG_BODY_DAMAGE = 20;
    const GULAG_HEADSHOT_DAMAGE = 42;
    const GULAG_BOUNDS = { minX: -30, maxX: 30, minZ: 256, maxZ: 328 };

    const pickupMeta = {
      boost: { label: "Boost", color: "#ffcf6b", emissive: "#8a5c00" },
      repair: { label: "Repair", color: "#59f0c2", emissive: "#0f6b56" },
      shield: { label: "Shield", color: "#7eb8ff", emissive: "#204a82" },
      slam: { label: "Slam", color: "#ff4f8b", emissive: "#7e173b" }
    };

    const els = {
      app: document.getElementById("app"),
      release: document.getElementById("release-screen"),
      name: document.getElementById("name-input"),
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
      speedLines: document.getElementById("speed-lines")
    };
    const modeOverlay = createModeOverlay();

    const url = new URL(location.href);
    const roomCode = sanitizeRoom(url.searchParams.get("room") || "main");
    const input = new Set();
    const players = new Map();
    const pickups = new Map();
    const effects = [];
    const colliders = [];
    const scratch2 = new THREE.Vector2();
    const scratch3 = new THREE.Vector3();
    const radarCtx = els.radar?.getContext("2d");

    const state = {
      id: null,
      socket: null,
      joined: false,
      mode: "arena",
      menuOpen: true,
      lastStateAt: 0,
      lastHitAt: 0,
      lastStyleAt: 0,
      lastWallHitAt: 0,
      mouseLook: false,
      room: {
        code: roomCode,
        phase: "live",
        round: 1,
        endsAt: Date.now() + 180000,
        nextRoundAt: 0,
        winner: null,
        standings: [],
        now: Date.now(),
        targetScore: 75
      },
      car: {
        x: 0,
        y: 0.08,
        z: 34,
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09131f");
    scene.fog = new THREE.FogExp2("#0d1724", 0.009);
    const arenaBackground = scene.background.clone();
    const arenaFog = scene.fog;

    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    els.app.appendChild(renderer.domElement);
    const particleGeometry = new THREE.SphereGeometry(1, 8, 6);

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
    showBanner("Garage Open", "Pick a name and start driving.");

    const clock = new THREE.Clock();
    requestAnimationFrame(loop);

    function loop() {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (state.podium.active) {
        updatePodium(dt);
      } else if (state.mode === "gulag") {
        updateGulag(dt);
      } else if (state.mode === "spectator") {
        updateSpectator(dt);
      } else {
        updateLocalCar(dt);
      }
      if (!state.podium.active) updateRemoteCars(dt);
      if (!state.podium.active) updatePickups(dt);
      updateEffects(dt);
      if (state.mode === "arena" && !state.podium.active) updateCamera(dt);
      updateHud();
      sendLocalState();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    function setupLights() {
      const hemi = new THREE.HemisphereLight("#bde9ff", "#17202b", 1.35);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight("#fff2d0", 4.4);
      sun.position.set(-55, 82, 35);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -150;
      sun.shadow.camera.right = 150;
      sun.shadow.camera.top = 150;
      sun.shadow.camera.bottom = -150;
      scene.add(sun);

      const arenaGlow = new THREE.PointLight("#59f0c2", 2.4, 120);
      arenaGlow.position.set(0, 16, 0);
      scene.add(arenaGlow);
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
      addSkyDetails();
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
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(CENTER_MIN, CENTER_MAX, 96),
        new THREE.MeshBasicMaterial({
          color: "#ffcf6b",
          transparent: true,
          opacity: 0.36,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      scene.add(ring);

      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(CENTER_MAX, 0.32, 10, 96),
        new THREE.MeshStandardMaterial({ color: "#ffcf6b", emissive: "#5d3b00", emissiveIntensity: 0.8 })
      );
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.22;
      scene.add(torus);

      const beacon = new THREE.PointLight("#ffcf6b", 1.2, 52);
      beacon.position.set(0, 9, 0);
      scene.add(beacon);
    }

    function addGuardRails() {
      const railMat = new THREE.MeshStandardMaterial({ color: "#87a1b8", roughness: 0.45, metalness: 0.45 });
      const postMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.55, metalness: 0.35 });

      for (let i = -6; i <= 6; i += 1) {
        addRail(i * 24, -94, 18, 2, railMat, postMat);
        addRail(i * 24, 94, 18, 2, railMat, postMat);
        addRail(-94, i * 24, 2, 18, railMat, postMat);
        addRail(94, i * 24, 2, 18, railMat, postMat);
      }
    }

    function addRail(x, z, sx, sz, railMat, postMat) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 1.2, sz), railMat);
      rail.position.set(x, 1.6, z);
      rail.castShadow = true;
      rail.receiveShadow = true;
      scene.add(rail);
      colliders.push({ x, z, r: Math.max(sx, sz) * 0.42 });

      const post = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.2, 1.7), postMat);
      post.position.set(x, 1.6, z);
      post.castShadow = true;
      scene.add(post);
    }

    function addProps() {
      const colors = ["#31465e", "#203244", "#415067", "#26384c"];
      for (let i = 0; i < 28; i += 1) {
        const side = i % 4;
        const offset = -140 + (i % 7) * 46;
        const x = side < 2 ? offset : side === 2 ? -138 : 138;
        const z = side < 2 ? (side === 0 ? -138 : 138) : offset;
        const h = 12 + ((i * 17) % 28);
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(18 + (i % 3) * 6, h, 18 + (i % 4) * 5),
          new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7, metalness: 0.05 })
        );
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        colliders.push({ x, z, r: 15 });
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

    function addTrackChevron(x, z, rotation, color) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 2.9);
      shape.lineTo(3.2, 0);
      shape.lineTo(1.35, 0);
      shape.lineTo(0, 1.08);
      shape.lineTo(-1.35, 0);
      shape.lineTo(-3.2, 0);
      shape.closePath();
      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
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

    function createCarMesh(color, isLocal, name, isBot = false) {
      const group = new THREE.Group();
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

      group.add(body, nose, cabin, spoiler, underglow, leftHead, rightHead, leftTail, rightTail, label, botMarker, ...wheels);
      return { group, wheels, label, bodyMat, underglow, target: new THREE.Vector3(), targetAngle: 0 };
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

      return {
        group,
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
        }
      });
      addEventListener("pointerup", () => {
        state.mouseLook = false;
        state.gulag.firing = false;
      });

      addEventListener("keydown", (event) => {
        if (document.activeElement === els.name && event.key !== "Escape") return;
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
      saveName({ silent: true });
      setStatus("Connecting to Crash Club...", "offline");
      if (!state.socket || state.socket.readyState > WebSocket.OPEN) {
        connectSocket();
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

    function connectSocket() {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${location.host}`);
      state.socket = socket;
      socket.addEventListener("open", joinRoom);
      socket.addEventListener("message", (event) => {
        try {
          handleMessage(JSON.parse(event.data));
        } catch (error) {
          console.warn("Bad server message", error);
        }
      });
      socket.addEventListener("close", () => {
        state.joined = false;
        setStatus("Disconnected. Start again to reconnect.", "offline");
      });
      socket.addEventListener("error", () => setStatus("Connection error. Is the server running?", "offline"));
    }

    function joinRoom() {
      sendMessage({ type: "join", room: roomCode, name: state.car.name, color: state.car.color });
    }

    function handleMessage(msg) {
      if (msg.type === "hello") return;

      if (msg.type === "joined") {
        state.id = String(msg.id);
        state.joined = true;
        state.mode = "arena";
        state.room.code = msg.room || roomCode;
        applyRoom(msg.roomState);
        setPlayers(msg.players || []);
        setPickups(msg.pickups || []);
        syncRoundPresentation();
        setMenu(false);
        setStatus(`Online in room ${state.room.code}`, "online");
        playTone(360, 0.08, "triangle", 0.05);
        return;
      }

      if (msg.type === "snapshot") {
        applyRoom(msg.room);
        setPlayers(msg.players || []);
        syncRoundPresentation();
        return;
      }

      if (msg.type === "round-started") {
        endPodiumShow();
        applyRoom(msg.room);
        setPlayers(msg.players || []);
        setPickups(msg.pickups || []);
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
        const meta = msg.pickup ? pickupMeta[msg.pickup.type] : null;
        if (meta) {
          lightweightNotice(`Picked up ${meta.label}.`);
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
          showBanner("Redeployed", "You are back in the arena.");
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
        startSpectator(msg.reason || "lost the Gulag");
        return;
      }

      if (msg.type === "player-damaged") {
        if (msg.player) upsertPlayer(msg.player);
        if (msg.source) upsertPlayer(msg.source);
        if (String(msg.targetId) === state.id) {
          state.car.health = msg.player?.health ?? state.car.health;
          state.car.damageFlash = 0.9;
        }
        return;
      }

      if (msg.type === "impact") {
        const source = getPlayerPosition(msg.sourceId);
        const target = getPlayerPosition(msg.targetId);
        if (source && target) spawnImpact(target.x, target.y + 1.2, target.z, msg.slam ? "#ff4f8b" : "#ffcf6b");
        playTone(msg.slam ? 150 : 190, 0.08, "sawtooth", 0.035);
        return;
      }

      if (msg.type === "event") {
        if (pickupMeta[msg.tone]) {
          lightweightNotice(msg.text);
          return;
        }
        toast(msg.text, msg.tone || "info");
        if (msg.tone === "win") showBanner("Round Over", msg.text);
      }
    }

    function updateLocalCar(dt) {
      const car = state.car;
      const blocked =
        state.mode !== "arena" ||
        state.menuOpen ||
        !state.joined ||
        state.podium.active ||
        state.room.phase !== "live" ||
        car.wreckedUntil > Date.now();
      const throttle = blocked ? 0 : axis("w", "arrowup") - axis("s", "arrowdown");
      const steer = blocked ? 0 : axis("d", "arrowright") - axis("a", "arrowleft");
      const boosting = !blocked && input.has("shift") && car.boost > 3 && throttle > 0;
      car.boosting = boosting;

      const forward = new THREE.Vector2(Math.sin(car.angle), Math.cos(car.angle));
      const right = new THREE.Vector2(Math.cos(car.angle), -Math.sin(car.angle));
      let forwardSpeed = car.velocity.dot(forward);
      let lateralSpeed = car.velocity.dot(right);
      const absForward = Math.abs(forwardSpeed);
      const speedRatio = THREE.MathUtils.clamp(absForward / 48, 0, 1);
      const driftIntent = Math.abs(steer) > 0.45 && absForward > 14;
      const grip = driftIntent ? 3.4 : 8.5 + speedRatio * 5.4;

      lateralSpeed *= Math.exp(-grip * dt);
      car.velocity.copy(forward.multiplyScalar(forwardSpeed)).add(right.multiplyScalar(lateralSpeed));

      let engine = 0;
      if (throttle > 0) engine = 48 + speedRatio * 12;
      if (throttle < 0) engine = forwardSpeed > 5 ? -72 : -34;
      if (boosting) {
        engine += 72;
        car.boost = Math.max(0, car.boost - 34 * dt);
        spawnBoostTrail();
      } else {
        car.boost = Math.min(MAX_BOOST, car.boost + (absForward < 9 ? 13 : 7) * dt);
      }

      const accelForward = new THREE.Vector2(Math.sin(car.angle), Math.cos(car.angle));
      car.velocity.addScaledVector(accelForward, engine * dt);

      const drag = 1 - THREE.MathUtils.clamp((0.34 + car.velocity.length() * 0.018) * dt, 0, 0.12);
      car.velocity.multiplyScalar(drag);

      const maxSpeed = boosting ? 58 : 43;
      if (car.velocity.length() > maxSpeed) car.velocity.setLength(maxSpeed);

      const direction = forwardSpeed < -2 ? -1 : 1;
      const turnRate = (1.15 + speedRatio * 1.85) * (1 - speedRatio * 0.28);
      car.angle -= steer * turnRate * direction * dt;

      car.x += car.velocity.x * dt;
      car.z += car.velocity.y * dt;
      handleWorldBounds();
      handleStaticCollision();
      handlePlayerCollisions();
      handlePickupCollections();

      car.y = 0.08;

      const driftAmount = Math.abs(lateralSpeed);
      if (driftAmount > 5.8 && absForward > 13 && Math.abs(steer) > 0.2) {
        car.driftCharge += dt;
        spawnSkidSmoke(driftAmount);
        if (car.driftCharge > 1.15) {
          awardStyle("drift chain", 3);
          car.driftCharge = 0;
        }
      } else {
        car.driftCharge = Math.max(0, car.driftCharge - dt * 1.8);
      }

      car.speed = car.velocity.length();
      localCar.group.position.set(car.x, car.y, car.z);
      localCar.group.rotation.set(0, car.angle, -lateralSpeed * 0.018);
      for (const wheel of localCar.wheels) wheel.rotation.x += car.speed * dt * 2.8;
      localCar.label.quaternion.copy(camera.quaternion);
      localCar.underglow.intensity = boosting ? 2.2 : 1.05;
      if (els.speedLines) els.speedLines.style.setProperty("--speed-line-opacity", "0");
      car.inZone = isInCenterRing(car.x, car.z);
    }

    function handleWorldBounds() {
      const car = state.car;
      const limit = WORLD_SIZE - 5;
      if (Math.abs(car.x) > limit) {
        car.x = THREE.MathUtils.clamp(car.x, -limit, limit);
        car.velocity.x *= -0.42;
        spawnImpact(car.x, 1, car.z, "#ffcf6b", 9);
      }
      if (Math.abs(car.z) > limit) {
        car.z = THREE.MathUtils.clamp(car.z, -limit, limit);
        car.velocity.y *= -0.42;
        spawnImpact(car.x, 1, car.z, "#ffcf6b", 9);
      }
    }

    function handleStaticCollision() {
      const car = state.car;
      for (const collider of colliders) {
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
            spawnImpact(car.x, 1.1, car.z, "#d6f4ff", 7);
          }
        }
      }
    }

    function handlePlayerCollisions() {
      const car = state.car;
      const now = performance.now();
      for (const [id, entry] of players) {
        if (id === state.id) continue;
        if (entry.mode !== "arena") continue;
        const dx = car.x - entry.x;
        const dz = car.z - entry.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001 && dist < 4.4) {
          const nx = dx / dist;
          const nz = dz / dist;
          const normal = scratch2.set(nx, nz);
          car.x = entry.x + nx * 4.4;
          car.z = entry.z + nz * 4.4;
          car.velocity.addScaledVector(normal, 12);
          car.velocity.multiplyScalar(0.82);
          car.cameraShake = Math.max(car.cameraShake, state.car.slamUntil > Date.now() ? 0.72 : 0.46);
          spawnImpact(entry.x, 1.4, entry.z, state.car.slamUntil > Date.now() ? "#ff4f8b" : "#ffcf6b", 12);

          if (now - state.lastHitAt > HIT_COOLDOWN_MS && car.speed > 8.5) {
            state.lastHitAt = now;
            sendMessage({
              type: "hit",
              targetId: id,
              impulse: THREE.MathUtils.clamp(car.speed / 36, 0.2, 1.55)
            });
          }
        }
      }
    }

    function handlePickupCollections() {
      if (!state.joined || state.room.phase !== "live") return;
      const car = state.car;
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
      for (const [id, entry] of players) {
        if (id === state.id) continue;
        if (entry.mode !== "arena") {
          entry.mesh.group.visible = false;
          continue;
        }
        entry.mesh.group.visible = true;
        const mesh = entry.mesh;
        mesh.target.set(entry.x, entry.y ?? 0.08, entry.z);
        mesh.group.position.lerp(mesh.target, 1 - Math.pow(0.002, dt));
        mesh.group.rotation.y += angleDelta(mesh.group.rotation.y, entry.angle || 0) * (1 - Math.pow(0.001, dt));
        mesh.group.rotation.z = Math.sin(performance.now() * 0.008 + stableSeed(id)) * 0.025;
        for (const wheel of mesh.wheels) wheel.rotation.x += Math.abs(entry.speed || 0) * dt * 2.4;
        mesh.label.quaternion.copy(camera.quaternion);
        mesh.underglow.intensity = entry.shieldUntil > Date.now() ? 1.5 : 0.6;
      }
    }

    function updatePickups(dt) {
      const now = performance.now() * 0.001;
      for (const pickup of pickups.values()) {
        pickup.mesh.visible = pickup.active;
        if (!pickup.active) continue;
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
      state.gulag.endsAt = msg.endsAt || Date.now() + 45000;
      state.gulag.position.set(0, 2.35, 267);
      state.gulag.velocity.set(0, 0, 0);
      state.gulag.enemyPosition.set(0, 0, 309);
      state.gulag.enemyVelocity.set(0, 0, 0);
      state.gulag.yaw = Math.PI;
      state.gulag.pitch = 0;
      clearInput();
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

      spawnPodiumConfetti(180);
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
        confetti.mesh.geometry.dispose();
        confetti.mesh.material.dispose();
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

      if (elapsed - state.podium.lastConfettiAt > 0.32 && state.podium.confetti.length < 260) {
        state.podium.lastConfettiAt = elapsed;
        spawnPodiumConfetti(22);
      }
      updatePodiumConfetti(dt);
    }

    function spawnPodiumConfetti(count) {
      const colors = ["#ffcf6b", "#59f0c2", "#ff4f8b", "#7eb8ff", "#f8fbff", "#ff8a4c"];
      for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.035, 0.34),
          new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 0.95 })
        );
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
          confetti.mesh.geometry.dispose();
          confetti.mesh.material.dispose();
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
      showModeOverlay("SPECTATOR", "Free cam enabled.", `${reason}. WASD + mouse to fly around the match.`);
      setStatus("Spectating the arena in free cam.", "offline");
      showBanner("Spectator", "You lost the Gulag. Fly around and watch the chaos.");
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

      if (Date.now() >= gulag.endsAt && !gulag.resultSent) {
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
        modeOverlay.time.textContent = String(Math.max(0, Math.ceil((state.gulag.endsAt - Date.now()) / 1000)));
      } else if (state.mode === "spectator") {
        modeOverlay.health.textContent = "FREE";
        modeOverlay.enemy.textContent = "CAM";
        modeOverlay.time.textContent = "LIVE";
      }
    }

    function updateCamera(dt) {
      const car = state.car;
      const speedPull = THREE.MathUtils.clamp(car.speed / 50, 0, 1);
      const boostPull = car.boosting ? 1 : 0;
      const back = 13 + speedPull * 7 + boostPull * 2.2;
      const height = 7.5 + speedPull * 2.5 + boostPull * 0.8;
      const desired = scratch3.set(
        car.x - Math.sin(car.angle) * back,
        car.y + height,
        car.z - Math.cos(car.angle) * back
      );
      camera.position.lerp(desired, 1 - Math.pow(0.0009, dt));
      if (car.cameraShake > 0.001) {
        const shake = car.cameraShake;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake * 0.45;
        camera.position.z += (Math.random() - 0.5) * shake;
        car.cameraShake = Math.max(0, car.cameraShake - dt * 2.4);
      }
      const targetFov = 62 + speedPull * 4 + boostPull * 3;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.002, dt));
        camera.updateProjectionMatrix();
      }
      camera.lookAt(car.x, car.y + 2.2, car.z);
    }

    function updateHud() {
      const car = state.car;
      const all = [...players.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
      if (els.count) els.count.textContent = String(players.size || 1);
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
          els.objective.textContent = car.inZone
            ? "Scoring zone active. Hold the ring or ram anyone trying to steal it."
            : "Chase the gold ring, grab glowing pickups, drift for style, and wreck rivals.";
        }
      }
      drawLeaderboard(all);
      drawRadar(all);
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
        inZone: state.car.inZone
      });
    }

    function awardStyle(reason, points) {
      const now = performance.now();
      if (now - state.lastStyleAt < STYLE_COOLDOWN_MS || !state.joined) return;
      state.lastStyleAt = now;
      sendMessage({ type: "style-score", reason, points });
      toast(`+${points} style: ${reason}`, "boost");
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
          speed: player.speed || 0
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
        mode: player.mode || "arena",
        score: player.score || 0,
        health: player.health ?? 100,
        roundWins: player.roundWins || 0,
        shieldUntil: player.shieldUntil || 0,
        slamUntil: player.slamUntil || 0,
        isBot: Boolean(player.isBot)
      });
      entry.mesh.group.visible = entry.mode === "arena";

      if (id === state.id && hardSync) {
        entry.mesh.group.position.set(state.car.x, state.car.y, state.car.z);
        entry.mesh.group.rotation.y = state.car.angle;
      }
    }

    function syncLocalTransform(player) {
      state.car.x = player.x ?? state.car.x;
      state.car.y = 0.08;
      state.car.z = player.z ?? state.car.z;
      state.car.angle = player.angle ?? state.car.angle;
      state.car.speed = player.speed ?? state.car.speed;
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

    function createPickupMesh(pickup) {
      const meta = pickupMeta[pickup.type] || pickupMeta.boost;
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.45, 1),
        new THREE.MeshBasicMaterial({
          color: meta.color,
          transparent: true,
          opacity: 0.96
        })
      );
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(2.25, 0.12, 10, 48),
        new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: 0.75 })
      );
      halo.rotation.x = Math.PI / 2;
      const outerHalo = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.08, 8, 42),
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
      radarCtx.clearRect(0, 0, size, size);
      radarCtx.fillStyle = "rgba(3, 8, 14, 0.72)";
      radarCtx.fillRect(0, 0, size, size);
      radarCtx.strokeStyle = "rgba(255, 207, 107, 0.38)";
      radarCtx.lineWidth = 2;
      radarCtx.beginPath();
      radarCtx.arc(size / 2, size / 2, (CENTER_MAX / WORLD_SIZE) * size * 0.5, 0, Math.PI * 2);
      radarCtx.stroke();

      for (const pickup of pickups.values()) {
        if (!pickup.active) continue;
        const p = radarPoint(pickup.x, pickup.z, size);
        radarCtx.fillStyle = pickupMeta[pickup.type]?.color || "#ffffff";
        radarCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }

      for (const player of all) {
        if (player.mode && player.mode !== "arena") continue;
        const x = player.id === state.id ? state.car.x : player.x;
        const z = player.id === state.id ? state.car.z : player.z;
        const p = radarPoint(x, z, size);
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
      const invite = `${location.origin}${location.pathname}?room=${state.room.code || roomCode}`;
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
      const node = document.createElement("div");
      node.className = `toast ${tone}`;
      node.textContent = text;
      els.toast.prepend(node);
      setTimeout(() => node.remove(), 3600);
    }

    function lightweightNotice(text) {
      if (!els.objective || !text) return;
      els.objective.textContent = text;
      clearTimeout(lightweightNoticeTimer);
      lightweightNoticeTimer = setTimeout(() => {
        if (els.objective) {
          els.objective.textContent = state.car.inZone
            ? "Scoring zone active. Hold the ring or ram anyone trying to steal it."
            : "Chase the gold ring, grab glowing pickups, drift for style, and wreck rivals.";
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
      if (now - car.lastBoostTrailAt < 42) return;
      car.lastBoostTrailAt = now;
      for (const side of [-1, 1]) {
        const x = car.x - Math.sin(car.angle) * 3.5 + Math.cos(car.angle) * side * 1.25;
        const z = car.z - Math.cos(car.angle) * 3.5 - Math.sin(car.angle) * side * 1.25;
        spawnParticle(x, car.y + 0.55, z, "#59f0c2", 0.32, 3.4, new THREE.Vector3(0, 1.1, 0));
      }
    }

    function spawnSkidSmoke(amount) {
      const car = state.car;
      const now = performance.now();
      if (now - car.lastSkidSmokeAt < 55) return;
      car.lastSkidSmokeAt = now;
      const x = car.x - Math.sin(car.angle) * 3.2;
      const z = car.z - Math.cos(car.angle) * 3.2;
      spawnParticle(
        x,
        0.45,
        z,
        "#c7d2de",
        0.42,
        2.6 + amount * 0.12,
        new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8, (Math.random() - 0.5) * 1.4),
        0.28
      );
    }

    function spawnImpact(x, y, z, color, count = 10) {
      for (let i = 0; i < count; i += 1) {
        const velocity = new THREE.Vector3((Math.random() - 0.5) * 13, Math.random() * 7 + 1, (Math.random() - 0.5) * 13);
        spawnParticle(x, y, z, color, 0.46, 2.6, velocity, 0.68);
      }
    }

    function spawnParticle(x, y, z, color, life, grow, velocity, opacity = 0.5) {
      while (effects.length >= MAX_EFFECTS) {
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
      const size = 0.18 + Math.random() * 0.18;
      mesh.scale.setScalar(size);
      scene.add(mesh);
      effects.push({ mesh, life, maxLife: life, grow, velocity, opacity });
    }

    function getPowerText() {
      const now = Date.now();
      if (state.car.slamUntil > now) return `Slam ${Math.ceil((state.car.slamUntil - now) / 1000)}s`;
      if (state.car.shieldUntil > now) return `Shield ${Math.ceil((state.car.shieldUntil - now) / 1000)}s`;
      return state.car.inZone ? "Ring" : "None";
    }

    function formatTimer() {
      const now = Date.now();
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
      const dist = Math.hypot(x, z);
      return dist >= CENTER_MIN && dist <= CENTER_MAX;
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
      if (!playTone.enabled) return;
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
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        playTone.enabled = false;
      }
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
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
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
