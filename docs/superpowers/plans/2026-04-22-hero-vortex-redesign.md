# Hero Vortex Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el fondo VJ canvas de `home.html` por una escena Three.js con vórtice de partículas espiral + wireframe grids deformados + post-processing (bloom, glitch, vignette).

**Architecture:** Un archivo `assets/js/hero-vortex.js` (ES module) contiene toda la lógica Three.js. `home.html` se modifica mínimamente: se añade el importmap de Three.js, se reemplaza `<canvas id="vjLoop">` por `<div id="heroVortexMount">`, y se elimina el IIFE del VJ canvas anterior (líneas ~3732–3950). El texto, botones y countdown del hero no se tocan.

**Tech Stack:** Three.js 0.163 (CDN via importmap), EffectComposer, UnrealBloomPass, GlitchPass, ShaderPass + RGBShiftShader + VignetteShader, vanilla JS ES modules.

---

## Mapa de archivos

| Acción | Archivo | Qué hace |
|---|---|---|
| CREAR | `assets/js/hero-vortex.js` | Toda la escena Three.js: renderer, partículas, grids, post-processing, loop |
| MODIFICAR | `home.html` línea 56 (head) | Añadir `<script type="importmap">` + `<script type="module" src="assets/js/hero-vortex.js">` |
| MODIFICAR | `home.html` línea 120 | Eliminar regla CSS `#vjLoop { ... }` |
| MODIFICAR | `home.html` línea 805 | Cambiar `<canvas id="vjLoop">` → `<div id="heroVortexMount" style="position:absolute;inset:0;z-index:1;">` |
| MODIFICAR | `home.html` líneas 3732–3950 | Eliminar IIFE del VJ canvas anterior |

---

## Task 1: Scaffold del módulo + renderer básico

**Files:**
- Create: `assets/js/hero-vortex.js`
- Modify: `home.html` (importmap + mount div + remove old canvas CSS + remove IIFE)

- [ ] **Step 1.1: Añadir importmap en home.html**

Abre `home.html`. Localiza la línea que contiene `<link rel="preconnect" href="https://fonts.googleapis.com">` (aprox. línea 56). Inserta ANTES de esa línea:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.163/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163/examples/jsm/"
  }
}
</script>
<script type="module" src="assets/js/hero-vortex.js"></script>
```

- [ ] **Step 1.2: Reemplazar canvas vjLoop por mount div**

En `home.html` línea ~805, cambia:
```html
<canvas id="vjLoop"></canvas>
```
por:
```html
<div id="heroVortexMount" style="position:absolute;inset:0;z-index:1;"></div>
```

- [ ] **Step 1.3: Eliminar CSS de #vjLoop**

En `home.html` línea ~120, elimina esta línea completa:
```css
#vjLoop { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; display: block; }
```

- [ ] **Step 1.4: Eliminar el IIFE del VJ canvas anterior**

En `home.html`, busca el comentario `/* VJ CANVAS LOOP */` (línea ~3720). Elimina desde esa línea hasta `})();` al final del bloque (línea ~3950). El bloque empieza con `(function(){` y termina con `})();`. El comentario anterior al bloque también se puede eliminar.

Para identificarlo: busca `const canvas=document.getElementById('vjLoop');` — elimina desde el `(function(){` anterior hasta el `})();` siguiente.

- [ ] **Step 1.5: Crear assets/js/hero-vortex.js con scaffold básico**

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

const MOBILE = window.innerWidth < 768;
const N_PARTICLES = MOBILE ? 2500 : 5000;
const N_GRIDS = MOBILE ? 5 : 7;

let renderer, scene, camera, composer;
let particleGeo, particleMat, particleMesh;
let gridMeshes = [];
let rafId = null;
let clock = 0;

// Particle state (CPU)
const px = new Float32Array(N_PARTICLES);
const py = new Float32Array(N_PARTICLES);
const pvx = new Float32Array(N_PARTICLES);
const pvy = new Float32Array(N_PARTICLES);
const pci = new Uint8Array(N_PARTICLES); // 0=cyan 1=blue 2=purple

// Glitch timer
let glitchTimer = 0;
let glitchPass;

export function initHeroVortex(container) {
  if (!container) return;
  try {
    setupRenderer(container);
    setupScene();
    setupParticles();
    setupGrids();
    setupPostProcessing();
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    animate();
  } catch (e) {
    // WebGL not available — silent fallback, dark background remains
    console.warn('hero-vortex: WebGL unavailable, using fallback', e);
  }
}

function setupRenderer(container) {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(renderer.domElement);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030807);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 400;
}

function setupParticles() { /* Task 2 */ }
function setupGrids()     { /* Task 3 */ }
function setupPostProcessing() { /* Task 4 */ }

function animate() {
  rafId = requestAnimationFrame(animate);
  clock += 0.011;
  renderer.render(scene, camera); // plain render until composer ready
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function handleVisibility() {
  if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
  else if (!rafId) animate();
}

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initHeroVortex(document.getElementById('heroVortexMount'));
});
```

- [ ] **Step 1.6: Verificar que la página carga sin errores**

Abre `home.html` en el servidor local (`http://localhost:4000` o `http://localhost:5500`).

Esperado en DevTools console:
- Sin errores rojos
- El fondo del hero es negro/dark `#030807`
- El texto del hero, botones y countdown son visibles

- [ ] **Step 1.7: Commit**

```bash
git add assets/js/hero-vortex.js home.html
git commit -m "feat: scaffold Three.js hero mount, remove vjLoop canvas"
```

---

## Task 2: Sistema de partículas — vórtice espiral

**Files:**
- Modify: `assets/js/hero-vortex.js` — implementar `setupParticles()` + lógica de física en `animate()`

- [ ] **Step 2.1: Reemplazar `setupParticles()` stub**

En `hero-vortex.js`, reemplaza la función `setupParticles()` vacía con:

```js
function setupParticles() {
  // Init positions — distribuir en esfera 2D inicial
  for (let i = 0; i < N_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 80 + Math.random() * 250;
    px[i]  = Math.cos(a) * r;
    py[i]  = Math.sin(a) * r;
    pvx[i] = (Math.random() - 0.5) * 0.3;
    pvy[i] = (Math.random() - 0.5) * 0.3;
    pci[i] = Math.floor(Math.random() * 3);
  }

  // BufferGeometry con posiciones 3D (z=0 siempre — partículas en plano XY)
  particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(N_PARTICLES * 3);
  const colors    = new Float32Array(N_PARTICLES * 3);

  // Paleta: 0=cyan(0,255,180) 1=blue(0,153,255) 2=purple(160,0,255)
  const PALETTE = [
    [0, 1.0, 0.706],
    [0, 0.6, 1.0],
    [0.627, 0, 1.0],
  ];

  for (let i = 0; i < N_PARTICLES; i++) {
    positions[i * 3]     = px[i];
    positions[i * 3 + 1] = py[i];
    positions[i * 3 + 2] = 0;
    const c = PALETTE[pci[i]];
    colors[i * 3]     = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  particleMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  particleMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particleMesh);
}
```

- [ ] **Step 2.2: Añadir física de vórtice en animate()**

Reemplaza la función `animate()` completa con:

```js
function animate() {
  rafId = requestAnimationFrame(animate);
  clock += 0.011;

  updateParticles();

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function updateParticles() {
  if (!particleGeo) return;
  const posAttr = particleGeo.attributes.position;

  // Attractor drifts — never fixed
  const acx = Math.sin(clock * 0.17) * 60;
  const acy = Math.cos(clock * 0.13) * 50;

  for (let i = 0; i < N_PARTICLES; i++) {
    const dx   = px[i] - acx;
    const dy   = py[i] - acy;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const ang  = Math.atan2(dy, dx);

    // 1. Tangential spin force (spiral)
    const tang  = ang + Math.PI / 2 + Math.sin(clock * 0.4 + dist * 0.005) * 0.5;
    const spinF = (0.9 / (dist * 0.012 + 0.1)) * 0.14;

    // 2. Inward collapse
    const inF = dist * 0.0006;

    // 3. Outward burst when too close
    const burst = Math.max(0, (25 - dist) * 0.002) * Math.sin(clock * 3 + i * 0.01);

    pvx[i] += Math.cos(tang) * spinF - dx * inF + burst * dx / dist;
    pvy[i] += Math.sin(tang) * spinF - dy * inF + burst * dy / dist;

    pvx[i] *= 0.97;
    pvy[i] *= 0.97;
    px[i]  += pvx[i];
    py[i]  += pvy[i];

    // Reset if escaped
    if (dist > 400) {
      const a2 = Math.random() * Math.PI * 2;
      const r2 = 150 + Math.random() * 100;
      px[i] = Math.cos(a2) * r2;
      py[i] = Math.sin(a2) * r2;
      pvx[i] = 0; pvy[i] = 0;
    }

    posAttr.array[i * 3]     = px[i];
    posAttr.array[i * 3 + 1] = py[i];
    posAttr.array[i * 3 + 2] = 0;
  }

  posAttr.needsUpdate = true;
}
```

- [ ] **Step 2.3: Verificar partículas visibles**

Recarga `home.html`. Esperado:
- Partículas cyan/azul/morado girando en espiral sobre el fondo oscuro
- El centro del vórtice se mueve suavemente
- Sin caída de framerate notable en desktop

- [ ] **Step 2.4: Commit**

```bash
git add assets/js/hero-vortex.js
git commit -m "feat: add spiral vortex particle system to hero"
```

---

## Task 3: Wireframe grids deformados

**Files:**
- Modify: `assets/js/hero-vortex.js` — implementar `setupGrids()` + `updateGrids()` en `animate()`

- [ ] **Step 3.1: Añadir funciones de warp y helpers de rotación**

Al inicio de `hero-vortex.js`, después de las declaraciones de variables, añade:

```js
// ── Warp functions ────────────────────────────────────────────────────────────
const warpFunnel = (u, v, t) => {
  const d = Math.sqrt(u * u + v * v);
  return -d * 0.32 + Math.sin(d * 0.07 - t * 2) * 12;
};
const warpWave = (u, v, t) =>
  Math.sin(u * 0.038 + t * 1.1) * 22 + Math.cos(v * 0.032 + t * 0.85) * 14;
const warpRipple = (u, v, t) =>
  Math.sin(Math.sqrt(u * u + v * v) * 0.055 - t * 1.7) * 25;
const warpTwist = (u, v, t) =>
  Math.sin(v * 0.045 + t * 0.9) * u * 0.14 + Math.cos(u * 0.03 + t) * 8;
const warpSaddle = (u, v, t) =>
  (u * u - v * v) * 0.0035 + Math.sin(t * 1.2) * 12;

// ── 3D rotation helpers ───────────────────────────────────────────────────────
function rotX(p, a) {
  return [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
}
function rotY(p, a) {
  return [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
}
function rotZ(p, a) {
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
}
```

- [ ] **Step 3.2: Añadir helper buildGridGeometry**

```js
/**
 * Crea un BufferGeometry de líneas para un grid deformado.
 * @param {number} cols  — subdivisiones horizontales
 * @param {number} rows  — subdivisiones verticales
 * @param {number} size  — tamaño en unidades de escena
 * @param {Function} warpFn — (u, v, t) => dz
 * @param {number} rx, ry, rz — rotaciones iniciales en radianes
 * @param {number} ox, oy, oz — offset de posición
 * @param {number} t  — tiempo actual
 */
function buildGridGeometry(cols, rows, size, warpFn, rx, ry, rz, ox, oy, oz, t) {
  // Compute 2D array of 3D points
  const pts = [];
  for (let row = 0; row <= rows; row++) {
    pts.push([]);
    for (let col = 0; col <= cols; col++) {
      const u  = (col / cols - 0.5) * size;
      const v  = (row / rows - 0.5) * size;
      const dz = warpFn(u, v, t);
      let p = [ox + u, oy + v, oz + dz];
      p = rotX(p, rx);
      p = rotY(p, ry);
      p = rotZ(p, rz);
      pts[row].push(p);
    }
  }

  // Build index buffer for line segments
  const verts = [];
  // Horizontal lines
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = pts[row][col], b = pts[row][col + 1];
      verts.push(...a, ...b);
    }
  }
  // Vertical lines
  for (let col = 0; col <= cols; col++) {
    for (let row = 0; row < rows; row++) {
      const a = pts[row][col], b = pts[row + 1][col];
      verts.push(...a, ...b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  return geo;
}
```

- [ ] **Step 3.3: Implementar setupGrids()**

Reemplaza la función `setupGrids()` stub:

```js
// Grid config: [cols, rows, size, warpFn, rx0, ry0, rz0, ox, oy, oz, color, opacity]
// rx0/ry0/rz0 son los offsets de rotación base (se suman al valor dinámico en animate)
const GRID_CONFIGS = [
  // 0: Central funnel
  [26, 26, 520, warpFunnel,  -0.3,  0,    0,      0,      -15,  0,   0x00ffb2, 0.65],
  // 1: Left wall (YZ plane)
  [18, 18, 330, warpTwist,    0,    Math.PI / 2, 0, -window.innerWidth * 0.42, 0, 0, 0x0099ff, 0.50],
  // 2: Right wall (YZ plane)
  [18, 18, 330, warpWave,     0,   -Math.PI / 2, 0,  window.innerWidth * 0.42, 0, 0, 0xa000ff, 0.50],
  // 3: Top slab (XZ plane)
  [18, 18, 400, warpRipple,   Math.PI * 0.35,  0, 0,  0, -window.innerHeight * 0.37, -55, 0x00ffb2, 0.45],
  // 4: Bottom slab (XZ plane)
  [18, 18, 400, warpSaddle,  -Math.PI * 0.35,  0, 0,  0,  window.innerHeight * 0.37, -55, 0x0099ff, 0.45],
  // 5: Floating plane A (orbits top-left)
  [11, 11, 190, warpWave,    -0.65, 0,    0,     -window.innerWidth * 0.27, -window.innerHeight * 0.23, -35, 0x00ffb2, 0.42],
  // 6: Floating plane B (orbits bottom-right)
  [11, 11, 190, warpRipple,   0.65, 0,    0,      window.innerWidth * 0.27,  window.innerHeight * 0.23, -35, 0xa000ff, 0.42],
];

function setupGrids() {
  const activeConfigs = GRID_CONFIGS.slice(0, N_GRIDS);
  activeConfigs.forEach(([cols, rows, size, warpFn, rx, ry, rz, ox, oy, oz, color, opacity]) => {
    const geo = buildGridGeometry(cols, rows, size, warpFn, rx, ry, rz, ox, oy, oz, 0);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const mesh = new THREE.LineSegments(geo, mat);
    scene.add(mesh);
    gridMeshes.push({ mesh, cols, rows, size, warpFn, baseRx: rx, baseRy: ry, baseRz: rz, ox, oy, oz });
  });
}
```

- [ ] **Step 3.4: Añadir updateGrids() y llamarlo en animate()**

Añade la función `updateGrids()`:

```js
function updateGrids() {
  const s  = Math.sin(clock * 0.18);
  const c2 = Math.cos(clock * 0.12);

  gridMeshes.forEach((g, i) => {
    let rx = g.baseRx, ry = g.baseRy, rz = g.baseRz;

    // Dynamic rotation offsets per grid
    if (i === 0) { rx += s * 0.08; ry = clock * 0.065; rz = c2 * 0.15; }
    else if (i === 1) { ry = Math.PI / 2 + clock * 0.045; }
    else if (i === 2) { ry = -Math.PI / 2 - clock * 0.045; }
    else if (i === 3) { ry = clock * 0.055; }
    else if (i === 4) { ry = clock * 0.055; }
    else if (i === 5) {
      const ox = Math.cos(clock * 0.22) * window.innerWidth  * 0.27;
      const oy = Math.sin(clock * 0.17) * window.innerHeight * 0.23;
      g.ox = -ox; g.oy = -oy;
      rx = g.baseRx + s; ry = clock * 0.18; rz = clock * 0.09;
    } else if (i === 6) {
      const ox = Math.cos(clock * 0.22 + Math.PI) * window.innerWidth  * 0.27;
      const oy = Math.sin(clock * 0.17 + Math.PI) * window.innerHeight * 0.23;
      g.ox = ox; g.oy = oy;
      rx = g.baseRx + c2; ry = -clock * 0.18; rz = -clock * 0.09;
    }

    const newGeo = buildGridGeometry(
      g.cols, g.rows, g.size, g.warpFn,
      rx, ry, rz, g.ox, g.oy, g.oz, clock
    );
    g.mesh.geometry.dispose();
    g.mesh.geometry = newGeo;
  });
}
```

En `animate()`, añade `updateGrids()` antes del render:

```js
function animate() {
  rafId = requestAnimationFrame(animate);
  clock += 0.011;
  updateParticles();
  updateGrids();
  if (composer) composer.render();
  else renderer.render(scene, camera);
}
```

- [ ] **Step 3.5: Verificar grids visibles**

Recarga `home.html`. Esperado:
- 7 planos de malla cyan/azul/morado deformándose sobre las partículas
- Planos flotantes orbitan visiblemente
- Sin errores en consola

- [ ] **Step 3.6: Commit**

```bash
git add assets/js/hero-vortex.js
git commit -m "feat: add 7 warped wireframe grids to hero vortex"
```

---

## Task 4: Post-processing — bloom, glitch, vignette

**Files:**
- Modify: `assets/js/hero-vortex.js` — implementar `setupPostProcessing()`

- [ ] **Step 4.1: Implementar setupPostProcessing()**

Reemplaza el stub `setupPostProcessing()`:

```js
function setupPostProcessing() {
  composer = new EffectComposer(renderer);

  // 1. Base render
  composer.addPass(new RenderPass(scene, camera));

  // 2. Bloom — glow que se derrama sobre el texto HTML encima
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    MOBILE ? 0.8 : 1.4,   // strength
    0.8,                    // radius
    0.2                     // threshold
  );
  composer.addPass(bloomPass);

  // 3. Glitch — disparado manualmente cada 3-8s
  glitchPass = new GlitchPass();
  glitchPass.goWild = false;
  glitchPass.enabled = false; // off por defecto, se activa en pulsos
  composer.addPass(glitchPass);

  // 4. RGB Shift (chromatic aberration)
  const rgbShift = new ShaderPass(RGBShiftShader);
  rgbShift.uniforms['amount'].value = 0.0012;
  composer.addPass(rgbShift);

  // 5. Vignette
  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms['offset'].value  = 0.85;
  vignette.uniforms['darkness'].value = 1.4;
  composer.addPass(vignette);
}
```

- [ ] **Step 4.2: Añadir control del glitch en animate()**

Añade dentro de `animate()`, antes del render:

```js
// Glitch pulse: activa ~cada 4-9s, dura 200-500ms
glitchTimer += 0.011;
if (glitchPass) {
  if (!glitchPass.enabled && glitchTimer > 4 + Math.random() * 5) {
    glitchPass.enabled = true;
    glitchTimer = 0;
    setTimeout(() => {
      if (glitchPass) glitchPass.enabled = false;
    }, 200 + Math.random() * 300);
  }
}
```

La función `animate()` completa queda:

```js
function animate() {
  rafId = requestAnimationFrame(animate);
  clock += 0.011;

  updateParticles();
  updateGrids();

  // Glitch pulse
  glitchTimer += 0.011;
  if (glitchPass && !glitchPass.enabled && glitchTimer > 4 + Math.random() * 5) {
    glitchPass.enabled = true;
    glitchTimer = 0;
    setTimeout(() => { if (glitchPass) glitchPass.enabled = false; }, 200 + Math.random() * 300);
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}
```

- [ ] **Step 4.3: Verificar post-processing**

Recarga `home.html`. Esperado:
- Las partículas y grids tienen glow (bloom) visible
- Cada ~5-8 segundos ocurre un parpadeo de glitch breve
- Hay un leve split RGB en los bordes de las luces brillantes
- Vignetted en los bordes de pantalla (más oscuro)
- El texto del hero está encima y es legible

- [ ] **Step 4.4: Commit**

```bash
git add assets/js/hero-vortex.js
git commit -m "feat: add bloom, glitch, rgb-shift and vignette post-processing"
```

---

## Task 5: Performance y pulido final

**Files:**
- Modify: `assets/js/hero-vortex.js` — optimizaciones finales y limpieza

- [ ] **Step 5.1: Verificar fallback WebGL**

Abre DevTools → Application → Override `WebGLRenderingContext` a `null` temporalmente, o simplemente verifica que el bloque `try/catch` en `initHeroVortex` existe:

```js
export function initHeroVortex(container) {
  if (!container) return;
  try {
    setupRenderer(container);
    // ...
  } catch (e) {
    console.warn('hero-vortex: WebGL unavailable, using fallback', e);
    // El fondo #030807 del CSS de .hero-bg ya está visible — no se hace nada
  }
}
```

Si el try/catch no está presente, añádelo.

- [ ] **Step 5.2: Verificar pausa en tab oculto**

Con la página cargada, abre otra pestaña. Abre DevTools → Performance. Vuelve a la pestaña de home. El loop debe haberse pausado (no se generan frames). Verifica que `handleVisibility` está registrado:

```js
document.addEventListener('visibilitychange', handleVisibility);
```

Y que `handleVisibility` hace:
```js
function handleVisibility() {
  if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
  else if (!rafId) animate();
}
```

Si falta, añádelo.

- [ ] **Step 5.3: Verificar en viewport móvil**

En DevTools → Device toolbar, selecciona iPhone 12 (390px). Recarga. Esperado:
- Partículas visibles (2 500 en lugar de 5 000)
- 5 grids en lugar de 7
- Bloom strength reducido (menos pesado en GPU móvil)
- Sin errores en consola

- [ ] **Step 5.4: Verificar que el resto del hero funciona**

Con la página cargada en desktop:
- El botón **COMPRAR BOLETOS** es clickeable
- El botón **ENTRAR AL MERCH** navega a merch.html
- El countdown (si hay evento activo) sigue actualizándose
- El panel de conversión muestra datos del evento

- [ ] **Step 5.5: Verificar carga < 3s de overhead**

En DevTools → Network, filtra por `three`. Verifica que Three.js CDN carga (aprox. 160KB gzip). La página no debe tardar más de 3s adicionales respecto al baseline.

- [ ] **Step 5.6: Commit final**

```bash
git add assets/js/hero-vortex.js home.html
git commit -m "feat: hero vortex Three.js complete — spiral collapse + grids + bloom/glitch

- 5k particles spiral vortex with drifting attractor
- 7 warped wireframe grids (funnel, walls, slabs, floaters)
- UnrealBloom + GlitchPass + RGBShift + Vignette post-processing
- Mobile optimization (2.5k particles, 5 grids, reduced bloom)
- WebGL fallback, visibility pause

Co-Authored-By: Claude Sonnet 4-6 <noreply@anthropic.com>"
```

---

## Criterios de éxito finales

- [ ] El vórtice espiral es visible en desktop y móvil
- [ ] El bloom se derrama visiblemente sobre las letras del título
- [ ] El glitch ocurre al menos una vez cada 5-10 segundos
- [ ] Los 7 grids se deforman sin stuttering (60fps desktop)
- [ ] Three.js CDN añade < 3s de carga adicional
- [ ] Texto, botones y countdown del hero funcionan igual que antes
- [ ] No hay errores en consola
- [ ] Fallback silencioso si WebGL no disponible
- [ ] El loop se pausa al cambiar de pestaña
