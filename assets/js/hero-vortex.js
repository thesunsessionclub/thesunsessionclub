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
