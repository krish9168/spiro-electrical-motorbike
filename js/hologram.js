/*
  SPIRO ELECTRIC MOTORBIKES — Nairobi, Westlands
  Three.js Holographic 3D Interactive Scene
*/

// Global variables for Three.js setup
let scene, camera, renderer, controls;
let container, hologramGroup;
let bikeMesh, particleSystem, lightCone, bottomGlow;
let outerRing, innerRing, verticalRing1, verticalRing2;
let clock = null; // Initialized inside initHologram() after THREE.js loads

// State control
let currentModel = 'ekon';
let autoSpin = true;
let isInteracting = false;
let rotationSpeed = 0.008;

// Texture assets dictionary
const textures = {
  ekon: 'images/m1_spiro_nobg.png',
  thorn: 'images/m2_spiro_nobg.png',
  kili: 'images/m3_spiro_nobg.png'
};

// Model Theme Colors
const themeColors = {
  ekon: {
    primary: 0x22C55E, // Green theme — M1 black bike
    glow: 0x00FF88,
    intensity: 1.8
  },
  thorn: {
    primary: 0xFF2020, // Red theme — M2 red bike
    glow: 0xFF6060,
    intensity: 2.2
  },
  kili: {
    primary: 0x2244FF, // Blue theme — M3 blue Ekon
    glow: 0x4488FF,
    intensity: 2.5
  }
};

const loadedTextures = {};

/**
 * Initializes the Three.js 3D hologram scene.
 */
function initHologram() {
  container = document.getElementById('hologram-scene');
  if (!container) return;

  // Initialize clock since THREE is now loaded
  clock = new THREE.Clock();

  // 1. Create Scene
  scene = new THREE.Scene();

  // 2. Setup Camera
  let initialWidth = container.clientWidth || 800;
  let initialHeight = container.clientHeight || 450;
  let initialAspect = initialWidth / initialHeight;
  if (isNaN(initialAspect) || !isFinite(initialAspect)) {
    initialAspect = 16 / 9;
  }

  camera = new THREE.PerspectiveCamera(
    45, 
    initialAspect, 
    0.1, 
    100
  );
  camera.position.set(0, 2.5, 11);

  // 3. Setup WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(initialWidth, initialHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  
  // Append canvas to container
  container.appendChild(renderer.domElement);

  // 4. Setup Orbit Controls — target the bike center so zoom stays centered
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0); // Aim at bike center
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableRotate = false; // Disable manual rotation dragging
  controls.enableZoom = false; // Disable scroll-wheel zooming
  
  // Set initial responsive camera distance
  updateCameraDistance();
  // Limit rotation angle so user doesn't look under the base
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minPolarAngle = 0.3; // Prevent looking straight down
  controls.enablePan = false;

  // Notify when dragging starts
  controls.addEventListener('start', () => {
    isInteracting = true;
    toggleAutoSpinState(false);
  });
  
  controls.addEventListener('end', () => {
    isInteracting = false;
  });

  // 5. Create Main Hologram Group (helps in rotating everything together if needed)
  hologramGroup = new THREE.Group();
  scene.add(hologramGroup);

  // 6. Setup Lighting
  const ambientLight = new THREE.AmbientLight(0x0a122c, 1.2);
  scene.add(ambientLight);

  bottomGlow = new THREE.PointLight(0x00E5FF, 3, 8);
  bottomGlow.position.set(0, 0.1, 0);
  scene.add(bottomGlow);

  const directionLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionLight.position.set(5, 8, 5);
  scene.add(directionLight);

  // 7. Load Textures
  const textureLoader = new THREE.TextureLoader();
  Object.keys(textures).forEach(key => {
    textureLoader.load(textures[key], (txt) => {
      txt.minFilter = THREE.LinearFilter;
      loadedTextures[key] = txt;
      
      // If default is loaded, create the mesh
      if (key === currentModel) {
        createBikeMesh(txt);
      }
    });
  });

  // 8. Create Holographic Base & Emitter Stage
  createEmitterPodium();
  createFloorGlow(); // Soft cyan glow under wheels

  // 9. Create Cybernetic Rings
  createGimbalRings();

  // 10. Create Particles System
  createParticles();

  // 11. Create Projector Beam Cone
  createProjectorBeam();

  // 12. Handle window resize and layout changes via ResizeObserver
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      onWindowResize();
    });
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', onWindowResize);
  }

  // Start rendering loop
  animate();
}

/**
 * Creates the base podium elements (Grid & Concentric Circles).
 */
function createEmitterPodium() {
  // Base Grid
  const gridHelper = new THREE.GridHelper(5, 16, 0x0052FF, 0x002c99);
  gridHelper.position.y = 0;
  // Make the lines semi-transparent
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.45;
  hologramGroup.add(gridHelper);
}

/**
 * Creates the soft cyan glow under the bike wheels.
 */
function createFloorGlow() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
  gradient.addColorStop(0.3, 'rgba(0, 229, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  
  // Elongated glow geometry under the wheels
  const floorGlowGeo = new THREE.PlaneGeometry(3.6, 1.2); 
  const floorGlowMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  
  const floorGlowMesh = new THREE.Mesh(floorGlowGeo, floorGlowMat);
  floorGlowMesh.rotation.x = -Math.PI / 2;
  floorGlowMesh.position.set(0, 0.05, 0); // Positioned slightly above the base podium
  hologramGroup.add(floorGlowMesh);
}

/**
 * Creates the high-tech gimbal containment rings rotating around the bike.
 */
function createGimbalRings() {
  // Removed per user request: "REMOVE CIRCULES AND KEEP ONLY BIKE"
}

/**
 * Creates the glowing projection light beam cylinder.
 */
function createProjectorBeam() {
  // Transparent open-ended cone
  const coneGeo = new THREE.CylinderGeometry(0.2, 2.1, 3.2, 32, 1, true);
  
  // Custom material mimicking a volumetric scan beam
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  lightCone = new THREE.Mesh(coneGeo, coneMat);
  lightCone.position.y = 1.6;
  hologramGroup.add(lightCone);
}

function getBikeTargetScale() {
  if (!camera || !container) return 1.0;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) {
    return (window.innerWidth < 480) ? 1.55 : 2.2; // Safe fallbacks
  }
  const aspect = width / height;
  const dist = (controls && controls.minDistance) ? controls.minDistance : 8.5;
  const fovRad = (camera.fov || 45) * Math.PI / 360; // half fov in radians
  const frustumHeight = 2 * dist * Math.tan(fovRad);
  const frustumWidth = frustumHeight * aspect;
  
  // Sizing constraints:
  // 1. Occupy 82% of viewer width (horizontal target)
  const targetScaleWidth = (frustumWidth * 0.82) / 3.1;
  // 2. Occupy at most 80% of viewer height (to avoid vertical cropping)
  const targetScaleHeight = (frustumHeight * 0.80) / 1.9;
  
  let scale = Math.min(targetScaleWidth, targetScaleHeight);
  
  if (isNaN(scale) || !isFinite(scale) || scale <= 0) {
    return (width < 480) ? 1.55 : 2.2;
  }
  return scale;
}

/**
 * Creates the motorbike floating display mesh.
 */
function createBikeMesh(texture) {
  if (bikeMesh) {
    hologramGroup.remove(bikeMesh);
  }

  // Adjust display plane size based on image aspects (typically ~1.6:1 ratio)
  const geometry = new THREE.PlaneGeometry(3.1, 1.9);
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.6, // Hologram opacity 60%
    depthWrite: false
  });

  bikeMesh = new THREE.Mesh(geometry, material);
  bikeMesh.position.y = 1.5; // Float in the center of the beam
  hologramGroup.add(bikeMesh);
  
  // Initial animation entry
  const targetScale = getBikeTargetScale();
  bikeMesh.scale.set(0.1, 0.1, 0.1);
  new TWEEN.Tween(bikeMesh.scale)
    .to({ x: targetScale, y: targetScale, z: targetScale }, 800)
    .easing(TWEEN.Easing.Back.Out)
    .start();
}

function createParticles() {
  const particleCount = 100;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    // Distribute particles in a half-cylinder behind the bike plane (z < -0.1)
    const angle = Math.PI + Math.random() * Math.PI; // Back half
    const radius = Math.random() * 2.0;
    
    const x = Math.cos(angle) * radius;
    const y = Math.random() * 3.2; // vertical spread
    const z = -Math.abs(Math.sin(angle) * radius) - 0.1;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Upward velocity and drifting speed
    velocities.push({
      y: 0.01 + Math.random() * 0.015,
      driftX: (Math.random() - 0.5) * 0.005,
      driftZ: -Math.random() * 0.005 // always drift backwards/neutral
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Glowing point markers
  const material = new THREE.PointsMaterial({
    color: 0x00E5FF,
    size: 0.08,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.userData = { velocities: velocities };
  hologramGroup.add(particleSystem);
}

/**
 * Updates positions of floating particles inside the rendering loop.
 */
function updateParticles() {
  if (!particleSystem) return;

  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.userData.velocities;
  const count = positions.length / 3;

  for (let i = 0; i < count; i++) {
    // Move particle upwards
    positions[i * 3 + 1] += velocities[i].y;
    positions[i * 3] += velocities[i].driftX;
    positions[i * 3 + 2] += velocities[i].driftZ;

    // Reset if it passes the height limits, drifts forward, or drifts too wide
    if (positions[i * 3 + 1] > 3.2 || positions[i * 3 + 2] >= -0.1 || Math.abs(positions[i * 3]) > 2.2) {
      positions[i * 3 + 1] = 0.05; // Reset back to base
      
      const angle = Math.PI + Math.random() * Math.PI; // Back half only
      const radius = Math.random() * 1.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 2] = -Math.abs(Math.sin(angle) * radius) - 0.1;
    }
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;
}

/**
 * Triggers switching motorbike models in the 3D hologram container.
 * @param {string} modelName - 'ekon', 'thorn', or 'kili'
 */
let currentSpeed = 0;

function switchHologramModel(modelName) {
  if (modelName === currentModel || !loadedTextures[modelName]) return;
  
  currentModel = modelName;
  const theme = themeColors[modelName];

  // Switch materials/colors in Three.js
  if (bikeMesh) {
    // Fade out and scale down animation
    new TWEEN.Tween(bikeMesh.scale)
      .to({ x: 0.01, y: 0.01, z: 0.01 }, 300)
      .easing(TWEEN.Easing.Quadratic.In)
      .onComplete(() => {
        // Swap mapping and color tone
        bikeMesh.material.map = loadedTextures[modelName];
        bikeMesh.material.needsUpdate = true;
        
        // Scale back up with spring elastic motion
        const targetScale = getBikeTargetScale();
        new TWEEN.Tween(bikeMesh.scale)
          .to({ x: targetScale, y: targetScale, z: targetScale }, 700)
          .easing(TWEEN.Easing.Back.Out)
          .start();
      })
      .start();
  }

  // Update theme colors
  const targetColor = new THREE.Color(theme.primary);
  const targetGlow = new THREE.Color(theme.glow);
  
  // Transition light colors
  if (bottomGlow) {
    new TWEEN.Tween(bottomGlow.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, 500)
      .start();
    
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: theme.intensity }, 500)
      .start();
  }

  if (lightCone) {
    new TWEEN.Tween(lightCone.material.color)
      .to({ r: targetGlow.r, g: targetGlow.g, b: targetGlow.b }, 500)
      .start();
  }

  if (particleSystem) {
    new TWEEN.Tween(particleSystem.material.color)
      .to({ r: targetGlow.r, g: targetGlow.g, b: targetGlow.b }, 500)
      .start();
  }

  if (outerRing) {
    new TWEEN.Tween(outerRing.material.color)
      .to({ r: targetGlow.r, g: targetGlow.g, b: targetGlow.b }, 500)
      .start();
  }
}

/**
 * Sync choose model logic, cards, title overlay, and telemetry stats
 */
function selectConfigModel(modelName) {
  selectConfigModelRaw(modelName);
}

function selectConfigModelRaw(modelName) {
  switchHologramModel(modelName);
  
  // Model large title overlay update
  const largeTitle = document.getElementById('model-large-title');
  if (largeTitle) {
    largeTitle.textContent = modelName === 'ekon' ? 'SPIRO M1' : modelName === 'thorn' ? 'SPIRO M2' : 'SPIRO M3';
  }
  
  // Sync choosing cards
  const cards = document.querySelectorAll('.model-card');
  cards.forEach(card => {
    if (card.getAttribute('data-model') === modelName) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  // Telemetry stats updates
  const batteryLabel = document.getElementById('tel-battery');
  const batteryBar = document.getElementById('tel-battery-bar');
  const rangeLabel = document.getElementById('tel-range');
  const modeLabel = document.getElementById('tel-mode');
  
  if (modelName === 'ekon') {
    if (batteryLabel) batteryLabel.textContent = '92%';
    if (batteryBar) batteryBar.style.width = '92%';
    if (rangeLabel) rangeLabel.textContent = '80 KM';
    if (modeLabel) {
      modeLabel.textContent = 'ECO';
      modeLabel.style.color = '#00FF88';
    }
    setConfigColor('#00FF88'); // Green accent — Spiro M1
  } else if (modelName === 'thorn') {
    if (batteryLabel) batteryLabel.textContent = '88%';
    if (batteryBar) batteryBar.style.width = '88%';
    if (rangeLabel) rangeLabel.textContent = '100 KM';
    if (modeLabel) {
      modeLabel.textContent = 'SPORT';
      modeLabel.style.color = '#FF4040';
    }
    setConfigColor('#FF4040'); // Red accent — Spiro M2
  } else if (modelName === 'kili') {
    if (batteryLabel) batteryLabel.textContent = '95%';
    if (batteryBar) batteryBar.style.width = '95%';
    if (rangeLabel) rangeLabel.textContent = '100 KM';
    if (modeLabel) {
      modeLabel.textContent = 'HYPER';
      modeLabel.style.color = '#4488FF';
    }
    setConfigColor('#4488FF'); // Blue accent — Spiro M3 Ekon
  }
}

/**
 * Configure Spin Mode Toggle
 */
function setConfigSpin(enable) {
  autoSpin = enable;
  
  const autoBtn = document.getElementById('mode-auto');
  const manualBtn = document.getElementById('mode-manual');
  
  if (autoBtn && manualBtn) {
    if (enable) {
      autoBtn.classList.add('active');
      manualBtn.classList.remove('active');
    } else {
      autoBtn.classList.remove('active');
      manualBtn.classList.add('active');
    }
  }
}

/**
 * Toggles spin automation (legacy helper)
 */
function toggleAutoSpinState(enable) {
  setConfigSpin(enable);
}

/**
 * Calculates viewpoint angle and rotates dashboard telemetry dial (compass)
 */
function updateHUDTelemetry() {
  if (!camera || !bikeMesh) return;

  // Relative rotation angle on Y-axis
  const bikeRotationY = bikeMesh.rotation.y;
  const camAngleRad = Math.atan2(camera.position.x, camera.position.z);
  
  let relativeRad = camAngleRad - bikeRotationY;
  
  // Convert radians to positive 0-360 degrees
  let degrees = Math.round(relativeRad * (180 / Math.PI));
  degrees = (degrees % 360 + 360) % 360;

  // Update telemetry angle text
  const gaugeAngle = document.getElementById('gauge-angle');
  const telemetryDial = document.getElementById('telemetry-dial');

  if (gaugeAngle) {
    gaugeAngle.textContent = `${degrees}°`;
  }
  if (telemetryDial) {
    // Rotate dial opposite to camera movement to represent heading orientation
    telemetryDial.style.transform = `rotate(${-degrees}deg)`;
  }
}

/**
 * Camera Zoom controls — zoom along the camera→target vector
 * so the bike stays centered at all zoom levels
 */
function zoomConfig(zoomIn) {
  if (!camera || !controls) return;
  const zoomStep = 0.8;
  const target = controls.target;
  
  // Get horizontal distance only (XZ plane) so Y stays fixed
  const dx = camera.position.x - target.x;
  const dz = camera.position.z - target.z;
  const currentHorizDist = Math.sqrt(dx * dx + dz * dz);
  
  let newHorizDist = zoomIn ? currentHorizDist - zoomStep : currentHorizDist + zoomStep;
  // Clamp: min 4 (so bike stays fully visible), max 11
  newHorizDist = Math.max(11, Math.min(11, newHorizDist));
  
  // Scale only X and Z, keep Y fixed at camera's current height
  const scale = newHorizDist / currentHorizDist;
  
  new TWEEN.Tween(camera.position)
    .to({
      x: target.x + dx * scale,
      y: camera.position.y,  // Keep Y fixed — bike won't move up
      z: target.z + dz * scale
    }, 400)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}

/**
 * Reset Camera Zoom & rotation angle
 */
function resetConfigRotation() {
  if (!camera || !controls || !bikeMesh) return;
  
  const width = container.clientWidth;
  let dist = 8.5;
  if (width < 480) dist = 5.8;
  else if (width < 768) dist = 7.0;

  new TWEEN.Tween(camera.position)
    .to({ x: 0, y: 2.5, z: dist }, 600)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();
    
  new TWEEN.Tween(controls.target)
    .to({ x: 0, y: 1.5, z: 0 }, 600)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();
    
  new TWEEN.Tween(bikeMesh.rotation)
    .to({ y: 0 }, 600)
    .easing(TWEEN.Easing.Cubic.Out)
    .start();

  // Restore auto spin
  setConfigSpin(true);
}

/**
 * Configure lighting presets
 */
function setConfigLighting(presetName) {
  if (!scene || !bottomGlow || !lightCone) return;
  
  // Sync buttons
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    if (btn.id === `light-${presetName === 'cyberpunk' ? 'cyber' : presetName}`) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const duration = 600;
  
  if (presetName === 'studio') {
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: 2.2 }, duration)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0.08 }, duration)
      .start();
    const ambient = scene.children.find(c => c instanceof THREE.AmbientLight);
    if (ambient) {
      new TWEEN.Tween(ambient)
        .to({ intensity: 1.2 }, duration)
        .start();
    }
  } else if (presetName === 'cyberpunk') {
    const pink = new THREE.Color(0xff0055);
    new TWEEN.Tween(bottomGlow.color)
      .to({ r: pink.r, g: pink.g, b: pink.b }, duration)
      .start();
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: 3.5 }, duration)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0.18 }, duration)
      .start();
    const ambient = scene.children.find(c => c instanceof THREE.AmbientLight);
    if (ambient) {
      new TWEEN.Tween(ambient)
        .to({ intensity: 0.4 }, duration)
        .start();
    }
  } else if (presetName === 'neon') {
    const cyan = new THREE.Color(0x00ffff);
    new TWEEN.Tween(bottomGlow.color)
      .to({ r: cyan.r, g: cyan.g, b: cyan.b }, duration)
      .start();
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: 2.8 }, duration)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0.25 }, duration)
      .start();
    const ambient = scene.children.find(c => c instanceof THREE.AmbientLight);
    if (ambient) {
      new TWEEN.Tween(ambient)
        .to({ intensity: 0.3 }, duration)
        .start();
    }
  } else if (presetName === 'dark') {
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: 3.0 }, duration)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0.02 }, duration)
      .start();
    const ambient = scene.children.find(c => c instanceof THREE.AmbientLight);
    if (ambient) {
      new TWEEN.Tween(ambient)
        .to({ intensity: 0.08 }, duration)
        .start();
    }
  }
}

/**
 * Toggle light emitting
 */
let lightsOn = true;
function toggleConfigLights() {
  const btn = document.getElementById('btn-light-toggle');
  if (!btn || !bottomGlow || !lightCone) return;
  
  lightsOn = !lightsOn;
  
  if (lightsOn) {
    btn.style.color = 'var(--accent)';
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: themeColors[currentModel].intensity }, 400)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0.08 }, 400)
      .start();
  } else {
    btn.style.color = 'var(--text-muted)';
    new TWEEN.Tween(bottomGlow)
      .to({ intensity: 0 }, 400)
      .start();
    new TWEEN.Tween(lightCone.material)
      .to({ opacity: 0 }, 400)
      .start();
  }
}

/**
 * Config Color swatches triggers
 */
function setConfigColor(hexColor) {
  // Sync swatches UI active state
  const swatchBtns = document.querySelectorAll('.swatch-btn');
  swatchBtns.forEach(btn => {
    const bg = btn.style.backgroundColor;
    if (hexToHex(bg) === hexColor.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Set CSS accent variables
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const glowColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
  
  // Keep website styling single-color (do not change website colors when selecting bikes)
  // document.documentElement.style.setProperty('--accent', hexColor);
  // document.documentElement.style.setProperty('--accent-glow', glowColor);

  // Transition Three.js lights
  const targetColor = new THREE.Color(hexColor);
  const duration = 500;
  
  if (bottomGlow) {
    new TWEEN.Tween(bottomGlow.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
      .start();
  }
  if (lightCone) {
    new TWEEN.Tween(lightCone.material.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
      .start();
  }
  if (particleSystem) {
    new TWEEN.Tween(particleSystem.material.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
      .start();
  }
  if (outerRing) {
    new TWEEN.Tween(outerRing.material.color)
      .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
      .start();
  }
}

function hexToHex(rgbStr) {
  if (!rgbStr.startsWith('rgb')) return rgbStr.toLowerCase();
  const match = rgbStr.match(/\d+/g);
  if (!match) return rgbStr;
  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase();
}

/**
 * Animation loop driving rendering and physical rotations.
 */
function animate(time) {
  requestAnimationFrame(animate);
  
  // Update Tween transitions
  TWEEN.update(time);

  // Update controls if manual interaction is happening
  if (controls) {
    controls.update();
  }

  // Auto-spin rotation logic — rotates continuously completing a full rotation every 8 seconds
  const delta = clock ? clock.getDelta() : 0.016;
  if (bikeMesh) {
    if (autoSpin) {
      bikeMesh.rotation.y += (2 * Math.PI / 8) * delta;
    }
    
    // Slight floating animation: smooth vertical oscillation (up/down float)
    bikeMesh.position.y = 1.45 + Math.sin(Date.now() * 0.0015) * 0.06;
  }

  // Rotate gimbal containment rings
  if (outerRing) outerRing.rotation.z -= 0.002;
  if (innerRing) innerRing.rotation.z += 0.004;
  if (verticalRing1) {
    verticalRing1.rotation.y += 0.005;
    verticalRing1.rotation.x += 0.002;
  }
  if (verticalRing2) {
    verticalRing2.rotation.y -= 0.004;
    verticalRing2.rotation.z += 0.003;
  }

  // Animate light cone pulsing scale
  if (lightCone) {
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.0025) * 0.03;
    lightCone.scale.set(pulseScale, 1.0, pulseScale);
  }

  // Update particle positions
  updateParticles();

  // Sync HUD statistics
  updateHUDTelemetry();

  // Speedometer live dial speed progression simulation
  let targetSpeed = 0;
  if (autoSpin) {
    targetSpeed = (currentModel === 'ekon') ? 60 : (currentModel === 'thorn') ? 80 : 100;
  } else {
    targetSpeed = 0;
  }
  currentSpeed += (targetSpeed - currentSpeed) * 0.05;
  const displaySpeed = Math.round(currentSpeed);
  const speedLabel = document.getElementById('tel-speed');
  if (speedLabel) {
    speedLabel.textContent = `${displaySpeed} KM/H`;
  }
  
  // Modulate sound hum pitch based on simulated speed
  if (typeof updateConfigSoundPitch === 'function') {
    const maxSpeed = (currentModel === 'ekon') ? 60 : (currentModel === 'thorn') ? 80 : 100;
    updateConfigSoundPitch(currentSpeed / maxSpeed);
  }

  // Render Scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/**
 * Dynamically updates camera distance based on screen width
 * to keep the bike visual at a medium/suitable size on all devices.
 */
function updateCameraDistance() {
  if (!camera || !controls || !container) return;
  
  const width = container.clientWidth;
  let dist = 8.5; // Default desktop size
  
  if (width > 0 && width < 480) {
    dist = 5.8; // Mobile / Android — closer so bike is readable
  } else if (width > 0 && width < 768) {
    dist = 7.0; // Tablet
  }
  
  const target = controls.target;
  const dx = camera.position.x - target.x;
  const dz = camera.position.z - target.z;
  let angle = Math.atan2(dx, dz);
  if (isNaN(angle)) {
    angle = 0;
  }
  
  camera.position.x = target.x + Math.sin(angle) * dist;
  camera.position.z = target.z + Math.cos(angle) * dist;
  
  controls.minDistance = dist;
  controls.maxDistance = dist;
  controls.update();
}

/**
 * Handles container resizing events to retain layout aspects.
 */
function onWindowResize() {
  if (!container || !camera || !renderer) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width <= 0 || height <= 0) return;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
  updateCameraDistance();
  
  if (bikeMesh) {
    const targetScale = getBikeTargetScale();
    bikeMesh.scale.set(targetScale, targetScale, targetScale);
  }
}

// Start simulation on load
document.addEventListener('DOMContentLoaded', () => {
  // Load TweenJS and start Three.js once ready
  if (typeof TWEEN === 'undefined') {
    const tweenScript = document.createElement('script');
    tweenScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js';
    tweenScript.onload = () => {
      initHologram();
      // Setup default active model config UI
      setTimeout(() => {
        selectConfigModelRaw('ekon');
      }, 500);
    };
    document.head.appendChild(tweenScript);
  } else {
    initHologram();
    setTimeout(() => {
      selectConfigModelRaw('ekon');
    }, 500);
  }
  
  // Align start event listener to manual control
  setTimeout(() => {
    if (controls) {
      controls.addEventListener('start', () => {
        isInteracting = true;
        setConfigSpin(false);
      });
    }
  }, 1000);
});
