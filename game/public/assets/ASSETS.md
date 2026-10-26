# Crash Club asset reference

Developer reference for everything under `public/assets/` and the three.js addons under `public/vendor/jsm/`.
All models and sounds are by Kenney (www.kenney.nl) and are CC0. See `../../CREDITS.md`.

Machine-readable companion: **`assets/manifest.json`**. It lists every file with its size in metres, bounding box,
triangle count, byte size, node names, wheel hub positions, paint swatch cells, a `recenter` offset for props, and
the audio groups. Prefer reading values from it over hard-coding numbers from this page.

Contact sheets of every model (rendered with the vendored three.js) live outside the repo, in the stage-1 scratch
folder `asset-previews/` (`cars.png`, `cars-recolor.png`, `cars-material-check.png`, `debris.png`, `props-1..3.png`).

## Layout and budget

| Folder | Files | Bytes | What |
| --- | ---: | ---: | --- |
| `cars/` | 16 GLB | 2,354,204 | 12 playable car bodies (wheels included in each GLB) + 4 standalone wheels |
| `cars/Textures/` | 3 PNG | 14,996 | `colormap.png` (referenced by the GLBs) + derived `colormap-pbr.png`, `colormap-emissive.png` |
| `debris/` | 17 GLB + `Textures/colormap.png` | 199,408 + 12,371 | crash parts (doors, plates, spoilers, bumper, tire, drivetrain, bolt, nut) + cone, flat cone, box |
| `props/` | 51 GLB | 845,164 | Racing Kit arena dressing (stands, barriers, fences, lights, billboards, flags, tents, pits, trees, ramp) |
| `audio/impact/` | 65 MP3 | 446,290 | crash and impact sounds, 13 groups x 5 variants |
| `audio/ui/` | 95 MP3 | 425,339 | interface sounds, 19 groups |
| `manifest.json` | 1 | ~58 KB | generated metadata |

Everything under `assets/` is about 4.4 MB; the newly vendored addons add about 0.4 MB (41 modules in `vendor/jsm/`
total 425 KB). File names are Kenney's originals.

## Conventions

- **Units:** 1 glTF unit = 1 metre as authored. The Car Kit is a chunky toy scale (a sedan is 1.5 m wide and 2.55 m
  long). The Racing Kit uses "1 unit = 1 road tile" and is roughly half the Car Kit's scale (its own race car is 1.35
  long). See [Scaling](#scaling-to-the-game).
- **Axes (both kits):** +Y up, **forward = +Z**, so for a car the **vehicle's left = +X** and right = -X.
  Headlights (yellow swatch) sit at +Z and tail lights at -Z on every car. Grandstand seats, billboard faces, pit
  garage fronts, office windows and light trees all face +Z.
- **Pivots:** Car Kit models sit on the ground at y = 0 and are centred in X/Z. The standalone wheel and
  `debris-tire` GLBs are centred on their hub, so they span y -0.3..0.3. **Racing Kit props are not centred:** the root
  node carries a stray export translation of (-0.35, -0.01, -0.65), so a 1x1 tile spans x -0.35..0.65 and
  z -1.65..-0.65. Apply `manifest.props[i].recenter` as the position of the loaded scene inside your own group to put
  the footprint centre at the origin and the base at y = 0.
- **Materials as authored:** Car Kit GLBs (UnityGLTF) use one material named `colormap` with `metallicFactor` 0,
  roughness 1, `doubleSided: true`, and an **external** texture `Textures/colormap.png` (it is not embedded, so it
  must stay next to the GLB, which is why `debris/` has its own copy). Racing Kit GLBs (UniGLTF) use flat-colour
  materials named by colour, plus three embedded PNG textures (`tankco` logo, `net` fence mesh, `checkers`).
- **Racing Kit colour fix (already applied):** the original Racing Kit files stored sRGB numbers in
  `baseColorFactor`, which glTF defines as linear, so three.js rendered them washed out (red came out salmon and the
  dark road grey came out mid grey). The vendored props have the factors converted sRGB to linear. Patched files are
  marked with `asset.extras.crashClubSrgbFactorFix` (visible as `gltf.asset.extras`). Do not convert them again.

## Loading

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('/assets/cars/sedan-sports.glb');
const template = gltf.scene;            // load each file once, then clone per player
const car = template.clone(true);       // no skinning, so a plain clone is enough (SkeletonUtils.clone also works)
```

- GLTFLoader gives the car textures `flipY = false` and `colorSpace = SRGBColorSpace`. Any replacement texture you
  apply to these UVs (canvas recolour, PBR map, emissive map) **must also use `flipY = false`**, or the swatches will
  be mirrored vertically and sample the wrong colours.
- Every GLB load creates its own `colormap` Texture. Swap in shared materials (see below) so the GPU holds one copy.
- `FrontSide` is safe for the car meshes even though the GLB says `doubleSided` (verified in the renders: no holes).
  It halves overdraw.
- The two fence props use `alphaMode: BLEND` for the `net` texture. Use `alphaTest = 0.5`, `transparent = false` and
  `depthWrite = true` instead, so you avoid sorting problems.
- Server note for whoever owns `server.js`: its MIME table has no `.glb` or `.mp3` entries, so they are served as
  `application/octet-stream`. That works because GLTFLoader and `decodeAudioData` both use fetch. Everything is also
  served `Cache-Control: no-store`, so the 4.4 MB of assets downloads again on every page load. Adding
  `.glb: model/gltf-binary`, `.mp3: audio/mpeg` and a long cache for `/assets/` and `/vendor/` would fix both.

## Cars (`cars/`)

All 12 playable bodies share the same node layout: a `body` mesh plus four sibling wheel meshes named
`wheel-front-left`, `wheel-front-right`, `wheel-back-left` and `wheel-back-right`. The wheels are **not** children of
the body, so the body can pitch, roll and bounce on its own while the wheels stay planted. Extra nodes:
`sedan-sports` has `body/spoiler`, `police` has `body/grill` (push bar), `suv` has `body/wheel-back` (spare tyre on
the tailgate, not a road wheel), and `delivery` has a separate `door` (the rear cargo door, pivoted on its top edge at y = 1.5, so rotate it about X to
swing it open).

| file | W x H x L (m) | wheelbase | track (hub to hub) | wheel r / width | front / rear hub z | extra nodes | paint cell | tris | KB |
| --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: |
| delivery.glb | 1.50 x 1.65 x 3.25 | 1.62 | 0.90 | 0.30 / 0.30 | 1.01 / -0.61 | door | [7,1] (cargo box) | 2476 | 235 |
| hatchback-sports.glb | 1.30 x 1.10 x 2.85 | 1.62 | 0.85 | 0.30 / 0.35 | 0.81 / -0.81 | - | [7,1] | 2088 | 193 |
| police.glb | 1.50 x 1.30 x 3.10 | 1.62 | 0.90 | 0.30 / 0.30 | 0.81 / -0.81 | body/grill | [13,2] (white panels) | 2304 | 191 |
| race-future.glb | 1.20 x 0.83 x 2.66 | 1.52 | 0.90 | 0.30 / 0.30 | 0.59 / -0.93 | - | [15,1] | 2068 | 169 |
| race.glb | 1.30 x 0.73 x 2.56 | 1.52 | 1.00 | 0.30 / 0.30 | 0.64 / -0.88 | - | [13,1] | 1952 | 163 |
| sedan-sports.glb | 1.30 x 1.10 x 2.55 | 1.32 | 0.85 | 0.30 / 0.35 | 0.66 / -0.66 | body/spoiler | [13,1] | 2088 | 174 |
| sedan.glb | 1.50 x 1.30 x 2.55 | 1.32 | 0.85 | 0.30 / 0.35 | 0.66 / -0.66 | - | [13,1] | 2032 | 168 |
| suv-luxury.glb | 1.50 x 1.30 x 2.85 | 1.52 | 0.85 | 0.30 / 0.35 | 0.81 / -0.71 | - | [9,1] | 2086 | 172 |
| suv.glb | 1.50 x 1.30 x 2.70 | 1.32 | 0.85 | 0.30 / 0.35 | 0.76 / -0.56 | body/wheel-back | [7,1] | 2474 | 203 |
| taxi.glb | 1.50 x 1.50 x 2.75 | 1.52 | 0.90 | 0.30 / 0.30 | 0.76 / -0.76 | - | [9,1] | 2072 | 171 |
| truck.glb | 1.50 x 1.30 x 2.95 | 1.62 | 0.85 | 0.30 / 0.35 | 0.86 / -0.76 | - | [7,1] | 2082 | 172 |
| van.glb | 1.50 x 1.35 x 2.75 | 1.52 | 0.85 | 0.30 / 0.35 | 0.76 / -0.76 | - | [15,1] | 2082 | 172 |

Measured with every node transform applied. The heights include the roof details. All wheels have a radius of 0.30
with the hub at y = 0.30, so the tyres touch y = 0.

**Wheel pivots.** Each wheel node sits at x = +-0.30 (+-0.35 on `race`) at hub height and hub z. The mesh extends
outward from the node, so the node is on the wheel's inner face and the hub centre is 0.125 to 0.15 m further out
(`manifest.cars[i].wheels[name].hub`). The mesh is centred on the node in Y and Z, so:

- **Spin:** rotate the wheel node about its local X axis. Driving forward (+Z) needs `rotation.x += distance / 0.30`
  (a positive angle moves the top of the tyre toward +Z).
- **Steer:** rotating the node about Y swings the wheel around its inner face. For correct steering, insert a pivot
  `Object3D` at the hub position, re-parent the wheel under it with a local offset of `node - hub`, steer the pivot
  about Y, and spin the wheel about X.
- Standalone wheels (`wheel-default`, `wheel-dark`, `wheel-racing`, `wheel-truck`) are centred on the hub with the
  axle along X and the rim facing +X (the left-side orientation). Rotate them by PI about Y to mount on the right.
  Use them for wheel swaps or wheels that fly off; `debris-tire` is a bare tyre with no rim.

## Colormap palette and recolouring

`colormap.png` (512 x 512) is a grid of **16 x 4 swatches, each 32 px wide and 128 px tall**. Even columns are flat
colours and odd columns are vertical gradients. Cell `[c, r]` covers pixels `x = 32c .. 32c+31`, `y = 128r .. 128r+127`
(glTF v = 0 is the top row of the image). Every triangle's UVs sit on the centre line of one swatch column
(u = 32c + 16), and v runs inside that swatch to pick a shade from the gradient. The only exceptions are about 20
triangles on `hatchback-sports` and 2 on `delivery` that blend from the paint swatch [7,1] into the grey [7,2] below
it. **So you recolour by editing texture pixels, not by splitting geometry**: those blending triangles stay correct,
and a split by triangle would leave green slivers on them.

Swatch roles used by the vendored models (also in `colormap-pbr.png` / `colormap-emissive.png`, see below):

| cell(s) | colour (mid) | role on the cars |
| --- | --- | --- |
| [7,1] green, [9,1] orange-yellow, [13,1] red, [15,1] blue | #3da679, #ffb349, #e76047, #5f74ca | **body paint** (one per model; [9,1] is also the orange rims of `race`, `race-future` and `wheel-racing`; [13,1] is also the paint on the debris doors, plates and spoilers) |
| [13,2] white gradient | #dcdce9 | licence plates and small trim; **police** livery panels; **delivery** cab |
| [7,2] grey gradient | #73768b | bumpers, sills, underbody, mirrors (also the police's dark panels) |
| [5,2] near-black | #3e3e44 | tyres, grilles, interior |
| [11,2] steel | #9da4c4 | rims, chrome, axles |
| [1,3] pale blue-white | #e7f5ff | **windows** |
| [3,3] yellow | #ffd534 | **headlights** (at +Z) |
| [5,3] red | #e74e3e | **tail lights** (at -Z); police roof light bar (red half) |
| [7,3] blue | #4e6dcd | police light bar (blue half) |
| [11,1] orange | #ff8744 | traffic cones |
| [15,2] and [3,1] | #d07b56, #dd9f79 | cardboard box and its tape |

### Per-player paint: recommended approach

1. Draw the base `colormap.png` into a 512 x 512 canvas.
2. For each paint cell of the model (`manifest.cars[i].paintCells`), rewrite its 32 x 128 pixels with the player's
   colour multiplied by the **luminance ratio** of the original gradient row to its middle row (in linear space).
   The middle of the body then shows the exact player colour, with Kenney's top-light / bottom-dark shading kept.
3. Optional premium look: also recolour the window cells [1,3] and [0,3] to a dark tint (for example `#1c2430`).
   With clearcoat and environment reflections this reads as real tinted glass instead of toy-white windows; compare
   the columns in `cars-material-check.png`.
4. Use the canvas as `map` on a `MeshPhysicalMaterial` with the two derived maps. Cache the texture per
   (model, colour) and dispose of it when the player leaves.

To use **one texture per player for every model and all debris**, recolour `manifest.sharedPaintCells`
([7,1], [9,1], [13,1], [15,1]) at once. Each car uses only one of them, the debris parts use [13,1], and the orange rims
then pick up the player colour too, which looks intentional. The **police** is the exception: its paint is [13,2],
which on other cars is the licence plates. Give it its own texture, or keep it black-and-white as a "special" car.
On the police the player colour covers only the door panels (33% of the body), so its team identity is weaker.
The **delivery** cab is also [13,2], so recolouring it there gives a two-tone livery.

```js
// Tested in the preview renders (r164.1). Base image: '/assets/cars/Textures/colormap.png'.
const s2l = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const l2s = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function makePlayerColormap(baseImg, paintCells, hex, { glass = null } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(baseImg, 0, 0);
  const jobs = paintCells.map(c => [c, new THREE.Color(hex)]);           // THREE.Color stores linear RGB
  if (glass) jobs.push([[1, 3], new THREE.Color(glass)], [[0, 3], new THREE.Color(glass)]);
  for (const [[cx, cy], target] of jobs) {
    const id = g.getImageData(cx * 32, cy * 128, 32, 128), d = id.data;
    const lum = row => { const i = (row * 32 + 16) * 4; return 0.2126 * s2l(d[i] / 255) + 0.7152 * s2l(d[i + 1] / 255) + 0.0722 * s2l(d[i + 2] / 255); };
    const ref = lum(64), k = [];
    for (let row = 0; row < 128; row++) k.push(lum(row) / ref);
    for (let row = 0; row < 128; row++) {
      const rgb = [target.r, target.g, target.b].map(v => Math.round(255 * l2s(Math.min(1, v * k[row]))));
      for (let col = 0; col < 32; col++) { const i = (row * 32 + col) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; }
    }
    g.putImageData(id, cx * 32, cy * 128);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;                       // glTF UV convention
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Shared, loaded once (flipY = false is required for both).
const pbr = await new THREE.TextureLoader().loadAsync('/assets/cars/Textures/colormap-pbr.png');
const emi = await new THREE.TextureLoader().loadAsync('/assets/cars/Textures/colormap-emissive.png');
pbr.flipY = false; emi.flipY = false; emi.colorSpace = THREE.SRGBColorSpace;

function carPaintMaterial(map) {
  return new THREE.MeshPhysicalMaterial({
    map,
    roughnessMap: pbr, metalnessMap: pbr, clearcoatMap: pbr,   // G = roughness, B = metalness, R = clearcoat
    roughness: 1, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.06,
    emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 1.0,
  });
}
car.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = true; } });
```

### Derived maps (`cars/Textures/`, aligned with the swatch grid, 512 x 512)

- **`colormap-pbr.png`**: R = clearcoat, G = roughness, B = metalness, one constant value per swatch. This matches
  three.js channel use (`roughnessMap.g`, `metalnessMap.b`, `clearcoatMap.r`), so set the scalar factors to 1. Do not
  also use it as `clearcoatRoughnessMap`, which reads G. Values: paint swatches 1 / 0.40 / 0.10;
  trim [6-7,2] 0.25 / 0.55 / 0.10; rubber [2-5,2], [8-9,2] 0 / 0.88 / 0; chrome [10-11,2] 0.5 / 0.28 / 0.90;
  glass [0-1,3], [0-1,0] 1 / 0.05 / 0; lights 1 / 0.15 / 0; cone plastic 0 / 0.62 / 0; cardboard and other matte
  colours 0 / 0.80 / 0.
- **`colormap-emissive.png`**: black except the headlights [2-3,3] (#fff2cc), tail lights [4-5,3] (#ff2a22) and the
  blue light bar [6-7,3] (#3d6bff). A single `emissiveIntensity` drives all three. For separate brake lights or a
  flashing light bar, draw your own emissive canvas the same way (cells are listed above), or make one map per state.

## Debris (`debris/`)

Same atlas, axes and units as the cars. Most parts sit on y = 0; `debris-tire` is centred on its hub. Parts with
paint cells use [13,1], so use the player's shared-paint material and they come off the car in its colour.

| file | W x H x L (m) | paint cell | tris | KB | use |
| --- | --- | --- | ---: | ---: | --- |
| debris-door.glb / debris-door-window.glb | 0.19 x 0.90 x 0.80 | [13,1] | 68 / 74 | 7 / 7 | doors ripped off in big hits (the window variant has glass) |
| debris-bumper.glb | 1.30 x 0.40 x 0.45 | - (grey) | 116 | 11 | bumper knocked off front or rear |
| debris-plate-a.glb / -b | 0.90 x 0.10 / 0.20 x 0.90 | [13,1] | 40 / 44 | 5 / 5 | bonnet or roof panels |
| debris-plate-small-a.glb / -b | 0.45 x 0.10 / 0.20 x 0.45 | - (dark) | 28 / 44 | 4 / 5 | small dark panels |
| debris-spoiler-a.glb / -b | 1.10 x 0.30 x 0.24 / 1.00 x 0.35 x 0.34 | [13,1] | 48 / 88 | 5 / 8 | spoilers |
| debris-tire.glb | 0.35 x 0.60 x 0.60 | - | 288 | 26 | loose tyre (hub-centred, axle along X) |
| debris-drivetrain.glb / -axle | 1.20 x 0.30 x 1.92 / 1.20 x 0.30 x 0.35 | - | 412 / 200 | 36 / 18 | chassis or axle for wrecks |
| debris-bolt.glb / debris-nut.glb | 0.17 x 0.26 x 0.20 / 0.17 x 0.10 x 0.20 | - | 36 / 40 | 5 / 5 | sparks of hardware; scale down for small bits |
| cone.glb / cone-flat.glb | 0.48 x 0.59 x 0.48 / 0.48 x 0.28 x 0.48 | - | 172 | 16 | knock-over traffic cones (and a squashed one) |
| box.glb | 0.71 x 0.71 x 0.71 | - | 124 | 14 | cardboard box to smash |

## Props (`props/`, Racing Kit)

Use `manifest.props[i].recenter` (see Conventions). Materials are named by colour, so you can override them by name
for higher quality, for example `glass` to a dark reflective `MeshPhysicalMaterial`, `road` to asphalt, or `grey` with
a little roughness variation. Intended sRGB colours: `grey` #f1f2f6 (off-white structure), `red` #e85553, `road`
#444444, `glass` #4c6077, `grass` #4d8f6e (green canvas, foliage), `bark` #d4a76c (wood), `pylon` #f5b942 (amber),
`_defaultMat` #ffffff, and the textured `tankco`, `net` and `checkers`. All have roughness 1 and metalness 0.

| file | W x H x L | tris | KB | notes |
| --- | --- | ---: | ---: | --- |
| grandStand.glb | 1.00 x 0.90 x 1.00 | 128 | 12 | open stand, seats face +Z; tiles side by side along X |
| grandStandAwning.glb | 1.00 x 1.39 x 1.00 | 280 | 20 | stand with red sun awnings |
| grandStandCovered.glb | 1.00 x 1.19 x 1.02 | 168 | 15 | stand with roof and press box |
| grandStandRound.glb / grandStandCoveredRound.glb | 1.64 x 0.90 / 1.19 x 1.64 | 1022 / 1302 | 70 / 90 | quarter-circle corner stands; seats face the arc centre at (-X, +Z) |
| barrierRed.glb / barrierWhite.glb | 0.25 x 0.13 x 0.12 | 28 | 3 | jersey-barrier blocks (alternate red and white), long axis X |
| barrierWall.glb | 1.00 x 0.13 x 0.12 | 76 | 6 | one-tile red/white barrier wall |
| rail.glb / railDouble.glb | 1.00 x 0.16 / 0.28 x 0.05 | 68 / 112 | 6 / 9 | Armco guard rail |
| fenceStraight.glb / fenceCurved.glb | 1.00 x 0.50 x 0.03 / 1.00 x 0.82 x 0.32 | 36 / 352 | 8 / 24 | catch fence with a transparent net texture (see the alphaTest note) |
| lightPostLarge.glb / lightPost_exclusive.glb | 0.38 / 0.20 x 0.80 x 0.10 | 340 / 228 | 23 / 17 | floodlight poles with 4 or 2 lamps facing +Z |
| lightPostModern.glb | 0.05 x 0.78 x 0.18 | 198 | 16 | single street lamp |
| lightRed.glb / lightRedDouble.glb / lightColored.glb | ~0.07-0.14 x 0.65-0.71 x 0.11 | 308 / 560 / 268 | 19 / 31 / 18 | start-light trees (red, double red, red-amber-green) facing +Z; good for a countdown |
| overhead.glb / overheadLights.glb | 1.26 x 0.67-0.69 x 0.19 | 124 / 432 | 9 / 26 | start gantry (plain or with a red light panel) |
| overheadRound.glb / overheadRoundColored.glb | 1.87 x 0.93 x 0.33 | 132 / 100 | 9 / 8 | arch gantry (dark, or red and white) |
| billboard.glb / billboardLow.glb | 1.00 x 1.00 / 0.69 x 0.48 | 136 | 14 | logo board on a frame, face +Z (texture: the fictional "TANKCO" logo) |
| billboardDouble_exclusive.glb | 1.00 x 1.00 x 0.36 | 126 | 14 | V-shaped double billboard |
| billboardLower.glb | 0.50 x 0.28 x 0.07 | 72 | 12 | trackside ad board |
| bannerTowerGreen.glb / bannerTowerRed.glb | 0.39 x 1.25 x 0.39 | 426 | 33 | scaffold tower with banners |
| flagCheckers.glb / flagGreen.glb / flagRed.glb / flagTankco.glb | 0.20 x 1.25 x 0.04 | 184 | 15-18 | tall banner flags on poles |
| flagCheckersSmall.glb | 0.19 x 0.30 x 0.04 | 132 | 10 | small chequered flag |
| tent.glb / tentLong.glb | 1.00 / 2.00 x 0.70 x 1.00 | 86 | 7 | open red gazebo |
| tentClosed.glb / tentClosedLong.glb | 1.00 / 2.00 x 0.70 x 1.00 | 110 | 8 | green closed marquee |
| tentRoof.glb / tentRoofDouble.glb | 0.56 / 1.12 x 0.63 x 0.99 | 132 / 236 | 10 / 16 | green canopy roofs |
| pitsGarage.glb / pitsGarageClosed.glb | 1.00 x 0.70 x 1.09 | 96 / 162 | 13 / 16 | pit garage, open or with shutters, front faces +Z |
| pitsGarageCorner.glb | 1.05 x 0.70 x 1.00 | 109 | 10 | corner garage block |
| pitsOffice.glb / pitsOfficeCorner.glb / pitsOfficeRoof.glb | ~1.0 x 0.51-0.85 x 1.04 | 88 / 126 / 142 | 8 / 10 / 11 | race-control offices with red trim |
| radarEquipment.glb | 0.59 x 0.54 x 0.41 | 292 | 20 | satellite dish on a box (broadcast compound) |
| camera_exclusive.glb | 0.11 x 0.41 x 0.26 | 136 | 11 | TV camera on a tripod |
| pylon.glb | 0.12 x 0.13 x 0.12 | 108 | 8 | small amber cone |
| treeLarge.glb / treeSmall.glb | 0.36 x 1.51 x 0.41 / 0.25 x 1.07 x 0.29 | 72 | 7 | low-poly cypress trees for outside the stadium |
| ramp.glb | 0.55 x 0.33 x 0.73 | 94 | 7 | wooden kicker ramp; the high end is at -Z, so cars approach from +Z driving toward -Z |

The road, kerb, sand and grass tiles, the Racing Kit's own race cars and the karts were intentionally not vendored.
The unused Car Kit vehicles (ambulance, firetruck, garbage truck, tractors, flatbeds) were not vendored either.

## Scaling to the game

The current gameplay car (the box car in `app.js`) is about 4.4 m wide and 7.2 m long, and the server's collision
capsule is radius 2.35 with half-axis 2.65. Two options:

- **Uniform scale about 2.8** for all Car Kit models, which keeps their relative sizes (sedan becomes 4.2 x 3.6 x 7.1 m,
  delivery becomes 9.1 m long, wheel radius becomes 0.84 m). Hitboxes then differ per car.
- **Normalise each car to the hitbox**, for example `scale = 7.2 / size[2]` (sedan 2.82, delivery 2.22, race 2.81),
  so every car fits the same collision shape.

The Racing Kit is about half the Car Kit's scale. Multiply props by about **5.5** to look human-scale next to cars
scaled by 2.8 (barrier block 1.4 x 0.7 m, pylon 0.7 m, tent 5.5 m, grandstand section 5.5 m wide). Scale stadium
architecture well beyond that: grandstands x10-14 so each section is 10-14 m wide, and floodlight poles x15-20 so they
stand 12-16 m tall. Trees work at x6-8.

## Audio (`audio/`)

Converted from Kenney's OGG originals: MP3, 44.1 kHz, **mono** (ready for `PannerNode` / `THREE.PositionalAudio`),
128 kbps for impacts and 96 kbps for UI. Each file is peak-normalised to -2 dBFS, which leaves headroom for MP3
overshoot (no clipping, measured). Chrome's `decodeAudioData` trims the encoder priming, so the MP3s add no start latency: 158 of
160 onsets match the OGG originals within 2 ms (the two slow fade-in whooshes differ by up to 13 ms only because
their level changed), and durations match within one MP3 frame (23 ms). All 160 files decode without errors.

`audio/impact/` (5 variants each, `_000` to `_004`; each one is 0.1 to 0.65 s):

| group | suggested use |
| --- | --- |
| impactMetal_heavy / _medium / _light | car-to-car hits by impulse strength (bright metal clank) |
| impactPlate_heavy / _medium / _light | body-panel thuds and crunches; layer with metal on big hits |
| impactPunch_heavy | low-end "body blow" layer for the biggest crashes |
| impactGeneric_light | scrapes, tiny taps, UI-adjacent knocks |
| impactGlass_heavy / _medium / _light | glass shatter on knockouts or big hits |
| impactTin_medium | debris bouncing (bolts, plates, cones) |
| impactSoft_heavy | landings after jumps, hits on soft barriers |

Pick a random variant, randomise `playbackRate` between 0.92 and 1.08, and scale gain with the impulse.

`audio/ui/`: click x5, select x8, confirmation x4, back x4, open x4, close x4, toggle x4, switch x7, error x8, tick x3
(countdown), bong x1 (round start or end), drop x4, glitch x4 (eliminations, glitches), pluck x2, question x4,
glass x6 (soft pings), scroll x5, maximize x9 and minimize x9 (panel whooshes). The exact file names are in
`manifest.json` under `audio.ui`.

## three.js addons (`vendor/jsm/`, three r164.1)

These are byte-identical copies from `three/examples/jsm`, with the same relative paths, so
`import { X } from 'three/addons/<path>'` resolves through the page's importmap (`"three/addons/": "/vendor/jsm/"`).
Each module imports `three` as a bare specifier and its siblings by relative path. Every module was dynamically
imported in Chromium with zero errors, and each pass below was constructed and rendered through an `EffectComposer`.

- Requested: `loaders/GLTFLoader.js`, `utils/SkeletonUtils.js`, `utils/BufferGeometryUtils.js`,
  `geometries/RoundedBoxGeometry.js`, `objects/Sky.js`, `objects/Lensflare.js`, `environments/RoomEnvironment.js`,
  `postprocessing/SMAAPass.js`, `postprocessing/GTAOPass.js`, `postprocessing/SSAOPass.js`,
  `postprocessing/OutlinePass.js`, `postprocessing/AfterimagePass.js`, `postprocessing/FilmPass.js`,
  `shaders/FXAAShader.js`, `shaders/VignetteShader.js`, `shaders/ColorCorrectionShader.js`,
  `shaders/RGBShiftShader.js`, `math/SimplexNoise.js`.
- Pulled in as dependencies: `shaders/SMAAShader.js`, `shaders/GTAOShader.js`, `shaders/PoissonDenoiseShader.js`,
  `shaders/SSAOShader.js`, `shaders/AfterimageShader.js`, `shaders/FilmShader.js`, `shaders/BokehShader.js`. GLTFLoader
  pulls in `utils/BufferGeometryUtils.js`, and the passes use `postprocessing/Pass.js` and `shaders/CopyShader.js`, which
  were already vendored. `curves/NURBSCurve.js` is not needed by anything here, so it was not added.
- Optional extras for the rebuild: `textures/FlakesTexture.js` (metallic-flake normal map for car paint),
  `geometries/DecalGeometry.js` (skid marks, scorch and dent decals), `objects/Reflector.js` (showroom or garage
  floor), `controls/OrbitControls.js` (menu turntable and debugging), `postprocessing/BokehPass.js` (menu depth of
  field), `renderers/CSS2DRenderer.js` (name tags).
- Already present and unchanged: `EffectComposer`, `RenderPass`, `ShaderPass`, `MaskPass`, `Pass`, `OutputPass`,
  `UnrealBloomPass`, `CopyShader`, `LuminosityHighPassShader`, `OutputShader`.

Rendering tips that came out of the preview work: `THREE.NeutralToneMapping` keeps Kenney's palette true, where ACES
washes it out. Use `RoomEnvironment` through `PMREMGenerator` (`pmrem.fromScene(new RoomEnvironment(renderer), 0.04)`)
with `scene.environmentIntensity` around 0.5 for clearcoat reflections. GTAO and SSAO are expensive on software GL,
so keep them for the high quality tier.
