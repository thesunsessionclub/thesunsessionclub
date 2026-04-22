# Hero Vortex Redesign — The Sun Session Club

**Date:** 2026-04-22  
**Status:** Approved  
**Scope:** `home.html` — sección hero (inicio de página)

---

## Resumen

Rediseño visual del hero de `home.html`. Se reemplaza el fondo VJ canvas actual (`#vjLoop`) por una escena **Three.js** que combina un vórtice de partículas espiral (Spiral Collapse) con planos de wireframe 4D deformados, más post-processing con bloom, glitch y aberración cromática. El resto del hero (texto, botones, countdown, panel de conversión) permanece sin cambios estructurales.

---

## Estilo Visual Elegido

**Spiral Collapse** — combinación de:

1. **Particle Vortex** — 5 000 partículas que giran en espiral hacia un punto central que deriva lentamente por la pantalla (nunca fijo). Colores: cyan `#00ffb2`, azul `#0099ff`, morado `#a000ff`.
2. **Warped Wireframe Grids** — 7 planos de malla que se deforman con funciones wave/ripple/funnel/twist:
   - Funnel central (26×26 segmentos, tamaño ~520px)
   - Pared izquierda (YZ, twist warp)
   - Pared derecha (YZ, wave warp)
   - Slab superior (XZ, ripple warp)
   - Slab inferior (XZ, saddle warp)
   - Plano flotante A (orbita arriba-izquierda)
   - Plano flotante B (orbita abajo-derecha)
3. **Post-processing** (Three.js EffectComposer):
   - `UnrealBloomPass` — glow que se derrama sobre el texto
   - `GlitchPass` — glitch de shader activado aleatoriamente
   - `ChromaticAberrationShader` — split RGB en bordes
   - `VignetteShader` — oscurecimiento perimetral

---

## Arquitectura

### Archivos nuevos

| Archivo | Propósito |
|---|---|
| `assets/js/hero-vortex.js` | Toda la lógica Three.js (partículas + grids + post-processing) |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `home.html` | Añadir imports CDN de Three.js + EffectComposer; sustituir `#vjLoop` canvas por el renderer Three.js; llamar a `initHeroVortex()` |

### CDN dependencies (añadir en `<head>` de home.html)

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.163/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163/examples/jsm/"
  }
}
</script>
```

---

## hero-vortex.js — Estructura interna

```
initHeroVortex(container)
  ├── setupRenderer()       — WebGLRenderer, tamaño, pixel ratio
  ├── setupScene()          — Scene, PerspectiveCamera, fija en z=400
  ├── setupParticles()      — BufferGeometry 5k puntos, ShaderMaterial custom
  ├── setupGrids()          — 7x LineSegments con vertices recomputados en animate()
  ├── setupPostProcessing() — EffectComposer → RenderPass → UnrealBloom → Glitch → Vignette
  ├── animate()             — rAF loop: actualiza física partículas, rewarp grids, render
  └── handleResize()        — resize renderer + camera aspect
```

### Física de partículas (CPU, Float32Array)

Cada partícula tiene posición `(x, y)` y velocidad `(vx, vy)` en espacio 2D de pantalla.

En cada frame:
1. Calcular vector hacia el **attractor** (centro deriva: `cx = sin(t·0.17)·60`, `cy = cos(t·0.13)·50`)
2. Fuerza tangencial (espiral): perpendicular al vector radial, intensidad ∝ `1/dist`
3. Fuerza de colapso: suave inward pull `∝ dist · 0.0006`
4. Damping: `vx *= 0.97`
5. Reset si `dist > 400`

### Grids (CPU, recomputados cada frame)

Cada grid es un `LineSegments` cuyo `BufferAttribute` de posiciones se reescribe en `animate()`:

```
for each vertex (col, row):
  u = (col/cols - 0.5) * size
  v = (row/rows - 0.5) * size
  dz = warpFn(u, v, t)           // wave / ripple / funnel / twist / saddle
  pos = rotateXYZ(u, v, dz, rx, ry, rz)
  project to screen via camera matrices  // Three.js se encarga
```

Los grids son `Line` objects de Three.js en el mismo Scene — se benefician del bloom del EffectComposer automáticamente.

### Post-processing config

```js
// Bloom
bloomPass.threshold = 0.2
bloomPass.strength  = 1.4
bloomPass.radius    = 0.8

// Glitch — disparo aleatorio cada ~3-8s, duración 200-500ms
glitchPass.goWild = false   // controlado manualmente

// Vignette
vignetteShader.uniforms.offset.value = 0.85
vignetteShader.uniforms.darkness.value = 1.4
```

---

## Performance

| Condición | Comportamiento |
|---|---|
| Desktop | 5 000 partículas, todos los grids, bloom strength 1.4 |
| Móvil (`window.innerWidth < 768`) | 2 500 partículas, grids reducidos a 5, bloom strength 0.8 |
| Tab oculto (`visibilitychange`) | `cancelAnimationFrame` — pausa completa |
| WebGL no disponible | `try/catch` en renderer — fallback al fondo `#030807` actual |

---

## Integración en home.html

El canvas del renderer Three.js reemplaza el elemento `#vjLoop` actual:

```html
<!-- ANTES -->
<canvas id="vjLoop" ...></canvas>

<!-- DESPUÉS -->
<div id="heroVortexMount" style="position:absolute;inset:0;z-index:1;"></div>
```

`initHeroVortex` recibe `document.getElementById('heroVortexMount')` y monta el renderer dentro. El resto del hero (`hero-content`, textos, botones, countdown) permanece con `z-index: 5` igual que hoy — no se toca.

---

## Criterios de éxito

- [ ] El vórtice es visible en desktop y móvil
- [ ] El bloom se derrama sobre las letras del título
- [ ] El glitch se activa al menos una vez cada 5-10 segundos
- [ ] Los grids se deforman continuamente sin stuttering
- [ ] La página carga en < 3s adicionales (Three.js CDN ~160KB gzip)
- [ ] El texto del hero, botones y countdown funcionan igual que antes
- [ ] Fallback silencioso si WebGL falla
