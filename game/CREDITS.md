# Credits

Crash Club is built with the following third-party assets and libraries. Thank you to their authors.

## 3D models and textures: Kenney (CC0)

Created and distributed by **Kenney** (https://www.kenney.nl), released under
**Creative Commons Zero (CC0 1.0)** (https://creativecommons.org/publicdomain/zero/1.0/).
Crediting is not required, but we gladly do.

- **Car Kit** (version 3.1): car bodies and wheels in `public/assets/cars/`, crash debris, cones and box in
  `public/assets/debris/`, and the shared `colormap.png` texture. `colormap-pbr.png` and `colormap-emissive.png` are
  material maps we derived from that palette.
  https://kenney.nl/assets/car-kit
- **Racing Kit** (version 2.0): stadium and trackside props in `public/assets/props/` (grandstands, barriers, rails,
  fences, light posts, gantries, billboards, banner towers, flags, tents, pit buildings, trees, ramp). The material
  colour factors were converted from sRGB to linear for correct rendering. "TANKCO" is Kenney's fictional brand.
  https://kenney.nl/assets/racing-kit
- **Impact Sounds** (version 1.0): `public/assets/audio/impact/`, converted from OGG to mono MP3.
  https://kenney.nl/assets/impact-sounds
- **Interface Sounds** (version 1.0): `public/assets/audio/ui/`, converted from OGG to mono MP3.
  https://kenney.nl/assets/interface-sounds

Support Kenney: https://www.kenney.nl/donate

## three.js (MIT)

`public/vendor/three.module.js` and the addons in `public/vendor/jsm/` (loaders, post-processing passes, shaders,
utilities, controls) are from **three.js r164.1** (https://threejs.org), Copyright © 2010-2024 three.js authors,
released under the **MIT License**.
Several addons implement published techniques credited in their source headers, including SMAA (Jorge Jimenez et al.),
FXAA (Timothy Lottes, NVIDIA), GTAO, the Preetham sky model, and Stefan Gustavson's simplex noise.

```
The MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## ws (MIT)

The multiplayer server uses **ws** (https://github.com/websockets/ws), released under the MIT License.
