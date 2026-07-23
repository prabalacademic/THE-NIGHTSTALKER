import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameState, GameSettings, PlayerStats, MonsterState, ObjectiveItem } from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  settings: GameSettings;
  onUpdatePlayerStats: (stats: PlayerStats) => void;
  onUpdateMonsterStats: (state: MonsterState, distance: number) => void;
  onGameOver: () => void;
  onWin: () => void;
  onTrackCompletionTime: (secs: number) => void;
  joystickVector: { x: number; y: number };
  jumpTriggered: boolean;
  onResetJump: () => void;
  flashlightOn: boolean;
  onToggleFlashlight: () => void;
  wrongCount?: number;
  correctCount?: number;
  speedBoost?: boolean;
  adminSpeed?: number;
}

const TILE_SIZE = 8;
const GRID_ROWS = 16;
const GRID_COLS = 16;

// Hands-on layout of the facility.
// 1 = Wall, 0 = Floor, 2 = Low Obstacle Crate, 3 = Column/Pillar, 4 = Lockers (Hiding spot)
const LEVEL_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 4, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 4, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 4, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 4, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Coordinate conversion helpers
const gridToWorldX = (col: number) => (col - GRID_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
const gridToWorldZ = (row: number) => (row - GRID_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;

const worldXToGrid = (x: number) => Math.floor((x + (GRID_COLS * TILE_SIZE) / 2) / TILE_SIZE);
const worldZToGrid = (z: number) => Math.floor((z + (GRID_ROWS * TILE_SIZE) / 2) / TILE_SIZE);

export default function GameCanvas({
  gameState,
  settings,
  onUpdatePlayerStats,
  onUpdateMonsterStats,
  onGameOver,
  onWin,
  onTrackCompletionTime,
  joystickVector,
  jumpTriggered,
  onResetJump,
  flashlightOn,
  onToggleFlashlight,
  wrongCount = 0,
  correctCount = 0,
  speedBoost = false,
  adminSpeed = 1.0,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  const settingsRef = useRef(settings);
  const joystickVectorRef = useRef(joystickVector);
  const jumpTriggeredRef = useRef(jumpTriggered);
  const speedBoostRef = useRef(speedBoost);
  const flashlightRef = useRef<THREE.SpotLight | null>(null);
  const flashFlareRef = useRef<THREE.PointLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const encounterSunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const monsterEyesRef = useRef<{ left: THREE.Mesh; right: THREE.Mesh } | null>(null);
  const resetGameRef = useRef<(() => void) | null>(null);

  // References for game loop parameters
  const playerRef = useRef<{
    mesh: THREE.Group;
    x: number;
    z: number;
    y: number;
    vy: number;
    rotationY: number;
    stamina: number;
    fusesCollected: number;
    totalFuses: number;
    flashlightOn: boolean;
    isInsideHidingSpot: boolean;
    velocity: { x: number; z: number };
  }>({
    mesh: new THREE.Group(),
    x: gridToWorldX(1),
    z: gridToWorldZ(1),
    y: 0,
    vy: 0,
    rotationY: 0,
    stamina: 100,
    fusesCollected: 0,
    totalFuses: 3,
    flashlightOn: true,
    isInsideHidingSpot: false,
    velocity: { x: 0, z: 0 },
  });

  const monsterRef = useRef<{
    mesh: THREE.Group;
    x: number;
    z: number;
    state: MonsterState;
    speed: number;
    targetX: number;
    targetZ: number;
    patrolIndex: number;
    investigateX: number;
    investigateZ: number;
    searchTimer: number;
    patrolWaitTimer: number;
    screechPlayed: boolean;
    headLight: THREE.PointLight;
  }>({
    mesh: new THREE.Group(),
    x: gridToWorldX(14),
    z: gridToWorldZ(14),
    state: 'PATROL',
    speed: 3.2,
    targetX: gridToWorldX(14),
    targetZ: gridToWorldZ(14),
    patrolIndex: 0,
    investigateX: 0,
    investigateZ: 0,
    searchTimer: 0,
    patrolWaitTimer: 0,
    screechPlayed: false,
    headLight: new THREE.PointLight(0xff0000, 1, 10),
  });

  const fusesRef = useRef<{
    mesh: THREE.Group;
    collected: boolean;
    pulseOffset: number;
    col: number;
    row: number;
  }[]>([]);

  const hidingSpotsRef = useRef<{
    mesh: THREE.Group;
    col: number;
    row: number;
  }[]>([]);

  const exitPortalRef = useRef<{
    mesh: THREE.Group;
    glowLight: THREE.PointLight;
    particleSystem: THREE.Points;
  } | null>(null);

  const gameTimerRef = useRef<{
    startTime: number;
    elapsedSeconds: number;
    lastTick: number;
  }>({ startTime: 0, elapsedSeconds: 0, lastTick: 0 });

  // Update refs on prop changes
  useEffect(() => {
    stateRef.current = gameState;
    const scene = sceneRef.current;
    const ambientLight = ambientLightRef.current;
    const sunLight = encounterSunLightRef.current;
    const eyes = monsterEyesRef.current;
    const headLight = monsterRef.current ? monsterRef.current.headLight : null;

    if (gameState === 'ENCOUNTER') {
      if (resetGameRef.current) {
        resetGameRef.current();
      }
      
      const pState = playerRef.current;
      pState.x = gridToWorldX(1);
      pState.z = gridToWorldZ(1);
      pState.rotationY = 0; // look straight forward at the monster
      pState.mesh.position.set(pState.x, pState.y + 0.1, pState.z);
      pState.mesh.visible = false; // Hide player mesh so they don't block the view of the staring monster!

      const mState = monsterRef.current;
      mState.x = gridToWorldX(1);
      mState.z = gridToWorldZ(2.3); // standing closer in the corridor
      mState.mesh.position.set(mState.x, 0, mState.z);
      mState.mesh.rotation.y = Math.PI; // facing the player!
      mState.state = 'PATROL'; // Avoid chase logic in tick

      if (flashlightRef.current) flashlightRef.current.visible = false;
      if (flashFlareRef.current) flashFlareRef.current.visible = false;

      // Update lighting based on wrongCount in ENCOUNTER phase
      if (scene && ambientLight && sunLight) {
        sunLight.visible = true;
        if (wrongCount === 0) {
          scene.background = new THREE.Color(0x3e3025); // Warm ambient back
          scene.fog = new THREE.FogExp2(0x3e3025, 0.015); // Warm sparse fog
          ambientLight.color.setHex(0xffe0b2); // Warm gold
          ambientLight.intensity = 1.8;
          sunLight.color.setHex(0xfffaf0);
          sunLight.intensity = 1.5;

          if (eyes) {
            const leftMat = eyes.left.material as THREE.MeshStandardMaterial;
            const rightMat = eyes.right.material as THREE.MeshStandardMaterial;
            if (leftMat && leftMat.color) leftMat.color.setHex(0x00ffd8);
            if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0x00a0ee);
            if (rightMat && rightMat.color) rightMat.color.setHex(0x00ffd8);
            if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0x00a0ee);
          }
          if (headLight) {
            headLight.color.setHex(0x00ffd8);
            headLight.intensity = 3.0;
          }
        } else if (wrongCount === 1) {
          scene.background = new THREE.Color(0x221a15);
          scene.fog = new THREE.FogExp2(0x221a15, 0.03);
          ambientLight.color.setHex(0xb08a70); // Dimmer amber
          ambientLight.intensity = 1.2;
          sunLight.intensity = 0.8;

          if (eyes) {
            const leftMat = eyes.left.material as THREE.MeshStandardMaterial;
            const rightMat = eyes.right.material as THREE.MeshStandardMaterial;
            if (leftMat && leftMat.color) leftMat.color.setHex(0xffaa00);
            if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0xcc6600);
            if (rightMat && rightMat.color) rightMat.color.setHex(0xffaa00);
            if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0xcc6600);
          }
          if (headLight) {
            headLight.color.setHex(0xffaa00);
            headLight.intensity = 4.5;
          }
        } else if (wrongCount === 2) {
          scene.background = new THREE.Color(0x100808);
          scene.fog = new THREE.FogExp2(0x100808, 0.045);
          ambientLight.color.setHex(0x602020); // Angry red dark
          ambientLight.intensity = 0.65;
          sunLight.intensity = 0.2;

          if (eyes) {
            const leftMat = eyes.left.material as THREE.MeshStandardMaterial;
            const rightMat = eyes.right.material as THREE.MeshStandardMaterial;
            if (leftMat && leftMat.color) leftMat.color.setHex(0xff0000);
            if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0x990000);
            if (rightMat && rightMat.color) rightMat.color.setHex(0xff0000);
            if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0x990000);
          }
          if (headLight) {
            headLight.color.setHex(0xff0000);
            headLight.intensity = 7.0;
          }
        }
      }
      audio.resume();
    } else if (gameState === 'PLAYING') {
      // Transition from Encounter to playing:
      // Make sure we set the game timers to start NOW
      gameTimerRef.current.startTime = Date.now();
      gameTimerRef.current.elapsedSeconds = 0;

      // Restore player mesh visibility
      const pState = playerRef.current;
      pState.mesh.visible = true;

      // Set monster to start chasing from its close-up encounter position
      const mState = monsterRef.current;
      mState.state = 'CHASE';
      mState.x = gridToWorldX(1);
      mState.z = gridToWorldZ(2.3);
      mState.mesh.position.set(mState.x, 0, mState.z);

      // Restore standard dark Backrooms horror fog and lights
      if (scene) {
        scene.background = new THREE.Color(0x0c0b08); // Very dark yellowish black
        scene.fog = new THREE.FogExp2(0x0c0b08, 0.05);
      }
      if (ambientLight) {
        ambientLight.color.setHex(0x12110c);
        ambientLight.intensity = 0.35;
      }
      if (sunLight) {
        sunLight.visible = false;
      }
      if (eyes) {
        const leftMat = eyes.left.material as THREE.MeshStandardMaterial;
        const rightMat = eyes.right.material as THREE.MeshStandardMaterial;
        if (leftMat && leftMat.color) leftMat.color.setHex(0xff0000);
        if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0x990000);
        if (rightMat && rightMat.color) rightMat.color.setHex(0xff0000);
        if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0x990000);
      }
      if (headLight) {
        headLight.color.setHex(0xff0000);
        headLight.intensity = 4.0;
      }

      // Flashlight visibility
      if (flashlightRef.current) {
        flashlightRef.current.visible = playerRef.current.flashlightOn;
      }
      if (flashFlareRef.current) {
        flashFlareRef.current.visible = playerRef.current.flashlightOn;
      }

      audio.resume();
    }
  }, [gameState, wrongCount]);

  useEffect(() => {
    settingsRef.current = settings;
    audio.setVolume(settings.volume);
    audio.setEnabled(settings.soundEnabled);
  }, [settings]);

  useEffect(() => {
    joystickVectorRef.current = joystickVector;
  }, [joystickVector]);

  useEffect(() => {
    jumpTriggeredRef.current = jumpTriggered;
    speedBoostRef.current = speedBoost;
  }, [jumpTriggered, speedBoost]);

  useEffect(() => {
    playerRef.current.flashlightOn = flashlightOn;
    if (flashlightRef.current) {
      flashlightRef.current.visible = flashlightOn;
    }
    if (flashFlareRef.current) {
      flashFlareRef.current.visible = flashlightOn;
    }
  }, [flashlightOn]);

  // Initial Three.js setup & Level building
  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.05);

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // High DPI
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap; // Very soft realistic shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic realistic lighting
    renderer.toneMappingExposure = 0.9;
    mountRef.current.appendChild(renderer.domElement);

    // AMBIENT LIGHT
    const ambientLight = new THREE.AmbientLight(0x040410, 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // SUNLIGHT FOR ENCOUNTER
    const encounterSunLight = new THREE.DirectionalLight(0xfffaf0, 1.5);
    encounterSunLight.position.set(5, 10, 5);
    encounterSunLight.castShadow = true;
    scene.add(encounterSunLight);
    encounterSunLightRef.current = encounterSunLight;

    // BACKROOMS CEILING FLICKERING FLUORESCENT LIGHT PANELS
    const lightLocs = [
      { col: 4, row: 5 },
      { col: 11, row: 11 },
      { col: 7, row: 7 },
      { col: 1, row: 1 },
      { col: 14, row: 14 }
    ];
    const emergencyLights: { light: THREE.PointLight; mesh: THREE.Mesh; baseIntensity: number }[] = [];

    lightLocs.forEach((loc) => {
      const wx = gridToWorldX(loc.col);
      const wz = gridToWorldZ(loc.row);

      // Elongated fluorescent light panel visual right under the ceiling
      const panelGeo = new THREE.BoxGeometry(2.0, 0.08, 0.8);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffee0 });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(wx, 4.92, wz);
      scene.add(panel);

      const pLight = new THREE.PointLight(0xfffeda, 1.8, 18);
      pLight.position.set(wx, 4.6, wz);
      pLight.castShadow = true;
      scene.add(pLight);

      emergencyLights.push({ light: pLight, mesh: panel, baseIntensity: 1.8 });
    });

    // FLOOR PLAN
    const floorGeo = new THREE.PlaneGeometry(GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);
    
    // Procedural Damp Tan Carpet Floor Texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base damp carpet tan-yellowish brown
      ctx.fillStyle = '#a6905d';
      ctx.fillRect(0, 0, 128, 128);
      
      // Fine carpet grain
      for (let i = 0; i < 3500; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const lum = Math.random() * 12 - 6;
        ctx.fillStyle = `rgba(${166 + lum}, ${144 + lum}, ${93 + lum}, 0.28)`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      
      // Organic water mold stains (classic Backrooms damp carpet vibe)
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(80, 68, 40, ${Math.random() * 0.22})`;
        ctx.beginPath();
        ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 16 + 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(GRID_COLS, GRID_ROWS);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // BUILDING WALLS, CEILINGS & OBSTACLES FROM GRID
    // Procedural striped yellow-beige Backrooms wallpaper texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 64;
    wallCanvas.height = 128;
    const wallCtx = wallCanvas.getContext('2d');
    if (wallCtx) {
      // Classic mono-yellow wallpaper base
      wallCtx.fillStyle = '#d5c289';
      wallCtx.fillRect(0, 0, 64, 128);

      // Fine plaster noise
      for (let i = 0; i < 1200; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 128;
        const lum = Math.random() * 8 - 4;
        wallCtx.fillStyle = `rgba(${213 + lum}, ${194 + lum}, ${137 + lum}, 0.25)`;
        wallCtx.fillRect(x, y, 1, 1);
      }

      // Wallpaper stripes
      wallCtx.strokeStyle = 'rgba(175, 155, 105, 0.4)';
      wallCtx.lineWidth = 1.5;
      wallCtx.beginPath();
      wallCtx.moveTo(16, 0); wallCtx.lineTo(16, 128);
      wallCtx.moveTo(32, 0); wallCtx.lineTo(32, 128);
      wallCtx.moveTo(48, 0); wallCtx.lineTo(48, 128);
      wallCtx.stroke();
    }
    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(1, 1);

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, 5.0, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.05,
    });

    // ACOUSTIC CEILING PANEL PLANE
    const ceilingGeo = new THREE.PlaneGeometry(GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);
    const ceilCanvas = document.createElement('canvas');
    ceilCanvas.width = 128;
    ceilCanvas.height = 128;
    const ceilCtx = ceilCanvas.getContext('2d');
    if (ceilCtx) {
      // Off-white/light beige acoustic ceiling panels
      ceilCtx.fillStyle = '#bfbaa0';
      ceilCtx.fillRect(0, 0, 128, 128);
      
      // Panel borders
      ceilCtx.strokeStyle = '#8c8872';
      ceilCtx.lineWidth = 3;
      ceilCtx.strokeRect(0, 0, 128, 128);
      
      // Noise
      for (let i = 0; i < 1500; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const lum = Math.random() * 10 - 5;
        ceilCtx.fillStyle = `rgba(${191 + lum}, ${186 + lum}, ${160 + lum}, 0.25)`;
        ceilCtx.fillRect(x, y, 1, 1);
      }
    }
    const ceilTex = new THREE.CanvasTexture(ceilCanvas);
    ceilTex.wrapS = THREE.RepeatWrapping;
    ceilTex.wrapT = THREE.RepeatWrapping;
    ceilTex.repeat.set(GRID_COLS, GRID_ROWS);

    const ceilMat = new THREE.MeshStandardMaterial({
      map: ceilTex,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2; // face down
    ceiling.position.y = 5.0; // ceiling height
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    const crateGeo = new THREE.BoxGeometry(TILE_SIZE * 0.75, 2.5, TILE_SIZE * 0.75);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355, // cardboard box brown
      roughness: 0.9,
    });

    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 5.0, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xd5c289, // columns matching walls
      roughness: 0.85,
    });

    const hidingGeo = new THREE.BoxGeometry(2, 4.2, 2.5);
    const hidingMat = new THREE.MeshStandardMaterial({
      color: 0x90835f, // Office filing cabinet beige
      roughness: 0.6,
      metalness: 0.5,
    });

    // Populate Level objects
    const walls: THREE.Box3[] = [];
    const crates: THREE.Box3[] = [];
    const hidingSpots: { mesh: THREE.Group; col: number; row: number }[] = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const type = LEVEL_GRID[r][c];
        const wx = gridToWorldX(c);
        const wz = gridToWorldZ(r);

        if (type === 1) {
          // Normal wall
          const wallMesh = new THREE.Mesh(wallGeo, wallMat);
          wallMesh.position.set(wx, 2.5, wz);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          scene.add(wallMesh);

          const bbox = new THREE.Box3().setFromObject(wallMesh);
          walls.push(bbox);
        } else if (type === 2) {
          // Low crate obstacle
          const crateMesh = new THREE.Mesh(crateGeo, crateMat);
          crateMesh.position.set(wx, 1.25, wz);
          crateMesh.castShadow = true;
          crateMesh.receiveShadow = true;
          scene.add(crateMesh);

          const bbox = new THREE.Box3().setFromObject(crateMesh);
          crates.push(bbox);
        } else if (type === 3) {
          // Support Column
          const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
          pillarMesh.position.set(wx, 2.5, wz);
          pillarMesh.castShadow = true;
          pillarMesh.receiveShadow = true;
          scene.add(pillarMesh);

          const bbox = new THREE.Box3().setFromObject(pillarMesh);
          walls.push(bbox);
        } else if (type === 4) {
          // Interactive Hiding Spot
          const lockerGrp = new THREE.Group();
          const lockerMesh = new THREE.Mesh(hidingGeo, hidingMat);
          lockerMesh.position.set(0, 2.1, 0);
          lockerMesh.castShadow = true;
          lockerGrp.add(lockerMesh);

          // Handle yellow glowing accent stripe
          const accentGeo = new THREE.BoxGeometry(0.1, 3.8, 0.1);
          const accentMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const accent = new THREE.Mesh(accentGeo, accentMat);
          accent.position.set(1.05, 2.1, 0);
          lockerGrp.add(accent);

          lockerGrp.position.set(wx, 0, wz);
          scene.add(lockerGrp);

          hidingSpots.push({ mesh: lockerGrp, col: c, row: r });
        }
      }
    }
    hidingSpotsRef.current = hidingSpots;

    // ESCAPE PORTAL (SPATIAL JUMP-GATE AT ROW 15, COL 14)
    const portalGroup = new THREE.Group();
    const outerGateGeo = new THREE.TorusGeometry(3.5, 0.4, 8, 32);
    const innerGateGeo = new THREE.TorusGeometry(2.8, 0.2, 8, 32);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.9 });

    const outerRing = new THREE.Mesh(outerGateGeo, gateMat);
    const innerRing = new THREE.Mesh(innerGateGeo, gateMat);
    portalGroup.add(outerRing);
    portalGroup.add(innerRing);

    // Glowing energy core sphere
    const coreGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.65 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    portalGroup.add(coreMesh);

    // Unlocked beacon point light
    const portalLight = new THREE.PointLight(0x00ff88, 0, 15);
    portalLight.position.set(0, 0, 1);
    portalGroup.add(portalLight);

    // Spark particle effect inside core
    const pCount = 40;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 3;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.12, transparent: true });
    const pSystem = new THREE.Points(pGeo, pMat);
    portalGroup.add(pSystem);

    const portalWX = gridToWorldX(14);
    const portalWZ = gridToWorldZ(15) - 3.2; // Keep slightly into the level map
    portalGroup.position.set(portalWX, 3.5, portalWZ);
    scene.add(portalGroup);

    exitPortalRef.current = {
      mesh: portalGroup,
      glowLight: portalLight,
      particleSystem: pSystem,
    };

    // GENERATING COLLECTIBLE FUSES
    // Placing 3 fuses in isolated corners of the grid
    const fuseLocations = [
      { col: 14, row: 1 },
      { col: 1, row: 10 },
      { col: 13, row: 13 },
    ];
    const fuses: typeof fusesRef.current = [];

    const fuseBodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12);
    const fuseBodyMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, roughness: 0.2, metalness: 0.8 });
    const ringGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 12);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });

    fuseLocations.forEach((loc, index) => {
      const fuseGrp = new THREE.Group();
      const body = new THREE.Mesh(fuseBodyGeo, fuseBodyMat);
      body.rotation.x = Math.PI / 2;
      fuseGrp.add(body);

      const r1 = new THREE.Mesh(ringGeo, ringMat);
      r1.position.z = 0.45;
      r1.rotation.x = Math.PI / 2;
      fuseGrp.add(r1);

      const r2 = new THREE.Mesh(ringGeo, ringMat);
      r2.position.z = -0.45;
      r2.rotation.x = Math.PI / 2;
      fuseGrp.add(r2);

      // floating point light to attract player
      const fl = new THREE.PointLight(0xffdd33, 1.2, 5);
      fl.position.set(0, 0, 0);
      fuseGrp.add(fl);

      const wx = gridToWorldX(loc.col);
      const wz = gridToWorldZ(loc.row);
      fuseGrp.position.set(wx, 1.0, wz);
      scene.add(fuseGrp);

      fuses.push({
        mesh: fuseGrp,
        collected: false,
        pulseOffset: index * Math.PI * 0.5,
        col: loc.col,
        row: loc.row,
      });
    });
    fusesRef.current = fuses;

    // BUILD PLAYER REPRESENTATION (Roblox Bacon Hair Avatar)
    const playerGroup = new THREE.Group();
    playerGroup.name = "player_group";
    
    const pBody = new THREE.Group(); // Inner group for walk cycle animation
    pBody.position.y = 1.3;
    playerGroup.add(pBody);
    
    // Materials
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xffdbb8, roughness: 0.6, metalness: 0.0 });
    const shirtMat = new THREE.MeshPhysicalMaterial({ color: 0x0077b6, roughness: 0.8, metalness: 0.0 }); // Blue shirt
    const jacketMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 }); // Dark jacket
    const pantsMat = new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.0 }); // Dark pants
    const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x4a2a18, roughness: 0.7, metalness: 0.1 }); // Brown bacon hair

    // Head
    const pHeadGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const pHead = new THREE.Mesh(pHeadGeo, skinMat);
    pHead.position.set(0, 1.5, 0); // Relative to pBody (y=1.3)
    pHead.castShadow = true;
    pBody.add(pHead);

    // Bacon Hair (Approximated with curved spikes/blocks)
    const hairGeo = new THREE.BoxGeometry(0.85, 0.3, 0.85);
    const hairBase = new THREE.Mesh(hairGeo, hairMat);
    hairBase.position.set(0, 1.9, 0);
    pBody.add(hairBase);
    
    // Hair spikes
    const spike1Geo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const spike1 = new THREE.Mesh(spike1Geo, hairMat);
    spike1.position.set(-0.2, 2.1, 0.1);
    spike1.rotation.set(0.1, 0, 0.3);
    pBody.add(spike1);
    
    const spike2Geo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const spike2 = new THREE.Mesh(spike2Geo, hairMat);
    spike2.position.set(0.2, 2.1, -0.1);
    spike2.rotation.set(-0.2, 0, -0.4);
    pBody.add(spike2);

    // Torso (Shirt with jacket overlay)
    const pTorsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.6);
    const pTorso = new THREE.Mesh(pTorsoGeo, shirtMat);
    pTorso.position.set(0, 0.4, 0);
    pTorso.castShadow = true;
    pBody.add(pTorso);

    // Jacket sides
    const jacketLGeo = new THREE.BoxGeometry(0.2, 1.4, 0.65);
    const jacketL = new THREE.Mesh(jacketLGeo, jacketMat);
    jacketL.position.set(-0.55, 0.4, 0);
    pBody.add(jacketL);
    
    const jacketRGeo = new THREE.BoxGeometry(0.2, 1.4, 0.65);
    const jacketR = new THREE.Mesh(jacketRGeo, jacketMat);
    jacketR.position.set(0.55, 0.4, 0);
    pBody.add(jacketR);

    // Arms
    const pArmGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
    
    const pLeftArm = new THREE.Mesh(pArmGeo, skinMat);
    pLeftArm.name = "left_arm";
    pLeftArm.position.set(-0.85, 0.4, 0);
    pLeftArm.castShadow = true;
    pBody.add(pLeftArm);
    
    const pRightArm = new THREE.Mesh(pArmGeo, skinMat);
    pRightArm.name = "right_arm";
    pRightArm.position.set(0.85, 0.4, 0);
    pRightArm.castShadow = true;
    pBody.add(pRightArm);

    // Legs
    const pLegGeo = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    
    const pLeftLeg = new THREE.Mesh(pLegGeo, pantsMat);
    pLeftLeg.name = "left_leg";
    pLeftLeg.position.set(-0.3, -0.6, 0);
    pLeftLeg.castShadow = true;
    pBody.add(pLeftLeg);

    const pRightLeg = new THREE.Mesh(pLegGeo, pantsMat);
    pRightLeg.name = "right_leg";
    pRightLeg.position.set(0.3, -0.6, 0);
    pRightLeg.castShadow = true;
    pBody.add(pRightLeg);
    
    // Flashlight object mounted on shoulder/chest
    const flashGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8);
    const flashMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const flashObj = new THREE.Mesh(flashGeom, flashMat);
    flashObj.position.set(0.4, 0.7, 0.3); // Relative to pBody
    flashObj.rotation.x = Math.PI / 2;
    pBody.add(flashObj);

    // FLASHLIGHT REAL POINT & SPOTLIGHT SOURCES
    const flashlight = new THREE.SpotLight(0xffffff, 8.0, 40, Math.PI / 5, 0.8, 1.2);
    flashlight.position.set(0.4, 0.7, 0.3);
    flashlight.target.position.set(0, 0.3, 10);
    flashlight.visible = playerRef.current.flashlightOn;
    flashlight.castShadow = true;
    flashlight.shadow.bias = -0.001;
    pBody.add(flashlight);
    pBody.add(flashlight.target);

    // Add small point light at source for flashlight glowing flare
    const flashFlare = new THREE.PointLight(0xeeffff, 1.5, 1.5);
    flashFlare.position.set(0.4, 0.7, 0.35);
    flashFlare.visible = playerRef.current.flashlightOn;
    pBody.add(flashFlare);

    flashlightRef.current = flashlight;
    flashFlareRef.current = flashFlare;

    playerGroup.position.set(gridToWorldX(1), 0, gridToWorldZ(1));
    scene.add(playerGroup);

    playerRef.current.mesh = playerGroup;

    // BUILD MONSTER REPRESENTATION (THE NIGHTSTALKER)
    const monsterGroup = new THREE.Group();

    // Towering hunched skeleton torso
    const mTorsoGeo = new THREE.SphereGeometry(1.6, 12, 12);
    mTorsoGeo.scale(0.8, 1.8, 1.1);
    const mTorsoMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.95 });
    const mTorso = new THREE.Mesh(mTorsoGeo, mTorsoMat);
    mTorso.position.y = 2.4;
    mTorso.castShadow = true;
    monsterGroup.add(mTorso);

    // Beast head with red/teal eyes (redesigned as wide sphere with spikes & large mouth like image)
    const mHeadGeo = new THREE.SphereGeometry(1.0, 16, 16);
    mHeadGeo.scale(1.3, 1.0, 1.0); // wide head like image
    const mHeadMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const mHead = new THREE.Mesh(mHeadGeo, mHeadMat);
    mHead.position.set(0, 3.3, 0.7);
    monsterGroup.add(mHead);

    // Conical spikes framing the head & face
    const spikeGeo = new THREE.ConeGeometry(0.12, 0.6, 5);
    spikeGeo.translate(0, 0.3, 0); // origin at base
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.95 });
    
    const spikeConfigs = [
      // Top crown spikes
      { pos: [-0.6, 4.0, 0.7], rot: [0, 0, -Math.PI / 4] },
      { pos: [0.6, 4.0, 0.7], rot: [0, 0, Math.PI / 4] },
      { pos: [-0.3, 4.2, 0.7], rot: [0, 0, -Math.PI / 8] },
      { pos: [0.3, 4.2, 0.7], rot: [0, 0, Math.PI / 8] },
      { pos: [0.0, 4.25, 0.7], rot: [0, 0, 0] },
      // Cheek/jaw spikes pointing outwards & downwards
      { pos: [-1.1, 3.2, 0.7], rot: [0, 0, -Math.PI * 0.6] },
      { pos: [1.1, 3.2, 0.7], rot: [0, 0, Math.PI * 0.6] },
      { pos: [-1.2, 3.5, 0.7], rot: [0, 0, -Math.PI * 0.45] },
      { pos: [1.2, 3.5, 0.7], rot: [0, 0, Math.PI * 0.45] },
    ];

    spikeConfigs.forEach((cfg) => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      spike.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      monsterGroup.add(spike);
    });

    // Dark deep mouth backplane
    const mouthGeo = new THREE.BoxGeometry(1.6, 0.45, 0.2);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x060202 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 2.7, 1.45);
    monsterGroup.add(mouth);

    // Jagged rows of sharp white teeth (cones)
    const toothGeo = new THREE.ConeGeometry(0.045, 0.25, 4);
    toothGeo.translate(0, -0.125, 0); // origin at base
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.1 });
    
    // Top row teeth
    for (let i = 0; i < 11; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      const xOffset = -0.7 + (i * 1.4) / 10;
      const randH = 0.8 + Math.random() * 0.4;
      tooth.scale.set(1.0, randH, 1.0);
      tooth.position.set(xOffset, 2.9, 1.55);
      tooth.rotation.x = Math.PI;
      monsterGroup.add(tooth);
    }

    // Bottom row teeth
    const bottomToothGeo = new THREE.ConeGeometry(0.045, 0.25, 4);
    bottomToothGeo.translate(0, 0.125, 0);
    for (let i = 0; i < 10; i++) {
      const tooth = new THREE.Mesh(bottomToothGeo, toothMat);
      const xOffset = -0.63 + (i * 1.26) / 9;
      const randH = 0.8 + Math.random() * 0.4;
      tooth.scale.set(1.0, randH, 1.0);
      tooth.position.set(xOffset, 2.5, 1.55);
      monsterGroup.add(tooth);
    }

    // Glowing eyes (giant round turquoise eyes matching the image perfectly)
    const eyeGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00ffd8,
      emissive: 0x00a0ee,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.48, 3.3, 1.4);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.48, 3.3, 1.4);
    monsterGroup.add(leftEye);
    monsterGroup.add(rightEye);
    monsterEyesRef.current = { left: leftEye, right: rightEye };

    // Dual eye-glow point lights to cast eerie turquoise illumination
    const leftEyeLight = new THREE.PointLight(0x00ffd8, 2.5, 8);
    leftEyeLight.position.set(-0.48, 3.3, 1.6);
    monsterGroup.add(leftEyeLight);

    const rightEyeLight = new THREE.PointLight(0x00ffd8, 2.5, 8);
    rightEyeLight.position.set(0.48, 3.3, 1.6);
    monsterGroup.add(rightEyeLight);

    // Menacing aura glow attached to face
    const monsterRedLight = new THREE.PointLight(0x00ffd8, 3.0, 12);
    monsterRedLight.position.set(0, 3.3, 1.2);
    monsterGroup.add(monsterRedLight);
    monsterRef.current.headLight = monsterRedLight;

    // Creepy spindly segmented limbs (4 legs)
    const thighGeo = new THREE.CylinderGeometry(0.22, 0.16, 2.0);
    const calfGeo = new THREE.CylinderGeometry(0.14, 0.08, 2.2);
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 });

    const legs: THREE.Group[] = [];
    const legPlacements = [
      { x: -1.2, z: 0.8, rotY: Math.PI / 4, phase: 0 },
      { x: 1.2, z: 0.8, rotY: -Math.PI / 4, phase: Math.PI },
      { x: -1.2, z: -0.8, rotY: Math.PI * 0.75, phase: Math.PI },
      { x: 1.2, z: -0.8, rotY: -Math.PI * 0.75, phase: 0 },
    ];

    legPlacements.forEach((cfg) => {
      const legGrp = new THREE.Group();
      legGrp.position.set(cfg.x, 2.2, cfg.z);

      const thigh = new THREE.Mesh(thighGeo, limbMat);
      thigh.position.y = -0.9;
      thigh.rotation.z = cfg.x < 0 ? -Math.PI / 6 : Math.PI / 6;
      legGrp.add(thigh);

      const calf = new THREE.Mesh(calfGeo, limbMat);
      calf.position.set(cfg.x < 0 ? -0.45 : 0.45, -2.1, 0);
      calf.rotation.z = cfg.x < 0 ? Math.PI / 5 : -Math.PI / 5;
      legGrp.add(calf);

      monsterGroup.add(legGrp);
      legs.push(legGrp);
    });

    monsterGroup.position.set(gridToWorldX(14), 0, gridToWorldZ(14));
    scene.add(monsterGroup);

    monsterRef.current.mesh = monsterGroup;

    // RESIZE EVENT
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // GRID PATHFINDING FOR MONSTER (BFS)

    // ==========================================
    const findShortestGridPath = (
      startR: number,
      startC: number,
      endR: number,
      endC: number
    ): { r: number; c: number }[] | null => {
      // Bounds check
      if (
        startR < 0 ||
        startR >= GRID_ROWS ||
        startC < 0 ||
        startC >= GRID_COLS ||
        endR < 0 ||
        endR >= GRID_ROWS ||
        endC < 0 ||
        endC >= GRID_COLS
      ) {
        return null;
      }

      const queue: [number, number, { r: number; c: number }[]][] = [[startR, startC, []]];
      const visited = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false));
      visited[startR][startC] = true;

      const dirs = [
        [-1, 0], // Up
        [1, 0],  // Down
        [0, -1], // Left
        [0, 1],  // Right
      ];

      while (queue.length > 0) {
        const [currR, currC, path] = queue.shift()!;

        if (currR === endR && currC === endC) {
          return path;
        }

        for (const [dr, dc] of dirs) {
          const nr = currR + dr;
          const nc = currC + dc;

          if (
            nr >= 0 &&
            nr < GRID_ROWS &&
            nc >= 0 &&
            nc < GRID_COLS &&
            !visited[nr][nc] &&
            LEVEL_GRID[nr][nc] !== 1 && // Not a wall
            LEVEL_GRID[nr][nc] !== 3    // Not a pillar
          ) {
            visited[nr][nc] = true;
            queue.push([nr, nc, [...path, { r: nr, c: nc }]]);
          }
        }
      }

      return null;
    };

    // ==========================================
    // KEYBOARD CAPTURES (DESKTOP TESTING)
    // ==========================================
    const keysPressed: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'f') {
        onToggleFlashlight();
        audio.triggerClick();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ==========================================
    // MAIN RENDERING / GAME TICK LOOP
    // ==========================================
    let animationId: number;
    let clock = new THREE.Clock();

    const resetGameParameters = () => {
      // Reset player
      const pState = playerRef.current;
      pState.x = gridToWorldX(1);
      pState.z = gridToWorldZ(1);
      pState.y = 0;
      pState.vy = 0;
      pState.stamina = 100;
      pState.fusesCollected = 0;
      pState.isInsideHidingSpot = false;
      pState.mesh.position.set(pState.x, pState.y, pState.z);
      pState.mesh.visible = (stateRef.current !== 'MENU' && stateRef.current !== 'ENCOUNTER');

      // Reset monster
      const mState = monsterRef.current;
      if (stateRef.current === 'ENCOUNTER') {
        mState.x = gridToWorldX(1);
        mState.z = gridToWorldZ(2.3); // standing closer in the corridor
      } else {
        mState.x = gridToWorldX(14);
        mState.z = gridToWorldZ(14);
      }
      mState.state = 'PATROL';
      mState.patrolIndex = 0;
      if (stateRef.current === 'ENCOUNTER') {
        mState.targetX = mState.x;
        mState.targetZ = mState.z;
      } else {
        mState.targetX = gridToWorldX(14);
        mState.targetZ = gridToWorldZ(14);
      }
      mState.screechPlayed = false;
      mState.searchTimer = 0;
      mState.patrolWaitTimer = 0;
      mState.mesh.position.set(mState.x, 0, mState.z);
      if (stateRef.current === 'ENCOUNTER') {
        mState.mesh.rotation.y = Math.PI; // Face player
      }

      // Reset fuses
      fusesRef.current.forEach((f) => {
        f.collected = false;
        f.mesh.visible = true;
      });

      // Reset Exit portal
      if (exitPortalRef.current) {
        exitPortalRef.current.glowLight.intensity = 0;
      }

      // Reset timers
      gameTimerRef.current.startTime = Date.now();
      gameTimerRef.current.elapsedSeconds = 0;
      gameTimerRef.current.lastTick = 0;
    };

    resetGameRef.current = resetGameParameters;
    resetGameParameters();
    audio.startAmbient();

    const tick = () => {
      const dt = Math.min(0.03, clock.getDelta()); // Cap delta to avoid physics explosion
      const time = clock.getElapsedTime();
      
      const pState = playerRef.current;
      const mState = monsterRef.current;

      // Ensure Backrooms fluorescent lights pulse and flicker realistically
      emergencyLights.forEach((el) => {
        let flicker = 1.0;
        const rand = Math.random();
        const isChasing = mState && mState.state === 'CHASE' && stateRef.current === 'PLAYING';

        if (isChasing) {
          // Intense horror flickering during a chase!
          if (rand < 0.16) {
            flicker = 0.01; // frequent heavy blackouts
          } else if (rand < 0.35) {
            flicker = 0.3; // rapid heavy dimming
          } else {
            flicker = 0.82 + Math.sin(time * 30) * 0.18; // fast vibrating pulse
          }
        } else {
          // Normal ambient flickering
          if (rand < 0.04) {
            flicker = 0.08; // sudden rapid blackout
          } else if (rand < 0.07) {
            flicker = 0.45; // quick dim flicker
          } else {
            // slight standard humming micro-fluctuation
            flicker = 0.96 + Math.sin(time * 15) * 0.04;
          }
        }

        const pulse = el.baseIntensity * flicker * (isChasing ? 0.65 : 1.0); // Slightly dimmer during chase
        el.light.intensity = pulse;

        const meshMat = el.mesh.material as THREE.MeshBasicMaterial;
        if (meshMat && meshMat.color) {
          if (isChasing) {
            // Glow a haunting blood-red during chase!
            meshMat.color.setRGB(0.95 * flicker, 0.12 * flicker, 0.04 * flicker);
            el.light.color.setHex(0xff1100);
          } else {
            meshMat.color.setRGB(0.98 * flicker, 0.97 * flicker, 0.88 * flicker);
            el.light.color.setHex(0xfffeda);
          }
        }
      });

      if (stateRef.current === 'PLAYING') {
        const timeNow = Date.now();
        const totalElapsed = (timeNow - gameTimerRef.current.startTime) / 1000;
        gameTimerRef.current.elapsedSeconds = totalElapsed;
        onTrackCompletionTime(totalElapsed);

        // 1. UPDATE TIMER-BASED AUDIO (Heartbeat & Music)
        const monsterDist = Math.sqrt(
          (pState.x - mState.x) * (pState.x - mState.x) +
          (pState.z - mState.z) * (pState.z - mState.z)
        );

        // Pulse heartbeat sound procedurally based on proximity
        if (timeNow - gameTimerRef.current.lastTick > Math.max(280, Math.min(1800, monsterDist * 40))) {
          const beatIntensity = Math.max(0, Math.min(1, (35 - monsterDist) / 28));
          if (beatIntensity > 0) {
            audio.triggerHeartbeat(beatIntensity);
          }
          gameTimerRef.current.lastTick = timeNow;
        }

        // ==========================================
        // 2. PLAYER INPUT & PHYSICS (SLIDING COLLISIONS)
        // ==========================================
        const joystickTilt = Math.sqrt(joystickVectorRef.current.x * joystickVectorRef.current.x + joystickVectorRef.current.y * joystickVectorRef.current.y);
        const wantsSprint = keysPressed['shift'] || joystickTilt > 0.85;

        if (!pState.isInsideHidingSpot) {
          let moveX = 0;
          let moveZ = 0;

          // Keyboard input
          if (keysPressed['w'] || keysPressed['arrowup']) moveZ += 1;
          if (keysPressed['s'] || keysPressed['arrowdown']) moveZ -= 1;
          if (keysPressed['a'] || keysPressed['arrowleft']) moveX += 1;
          if (keysPressed['d'] || keysPressed['arrowright']) moveX -= 1;

          // Merge joystick vector if active
          if (Math.abs(joystickVectorRef.current.x) > 0.05 || Math.abs(joystickVectorRef.current.y) > 0.05) {
            // Translate joystick screen axes relative to default camera angle
            moveX = -joystickVectorRef.current.x;
            moveZ = joystickVectorRef.current.y;
          }

          // Sprint logic: shift key or high joystick tilt
          const hasStamina = pState.stamina > 2;

          let currentSpeed = 3.6 * adminSpeed; // Walking base
          pState.isSprinting = false;

          if (wantsSprint && hasStamina && (moveX !== 0 || moveZ !== 0)) {
            currentSpeed = 8.5 * adminSpeed; // Sprint speed
            pState.isSprinting = true;
            pState.stamina = Math.max(0, pState.stamina - dt * 25); // Exhaust stamina
          } else {
            pState.stamina = Math.min(100, pState.stamina + dt * 10); // Recover stamina
          }

          // Normalize horizontal inputs to avoid diagonal speed multiplying
          const inputMag = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (inputMag > 0.01) {
            const dirX = moveX / inputMag;
            const dirZ = moveZ / inputMag;

            // Camera looking direction transforms movement coordinates smoothly
            // Standard camera follows player from behind with offset.
            // Vector pointing from player towards camera projected horizontally:
            pState.velocity.x = dirX * currentSpeed;
            pState.velocity.z = dirZ * currentSpeed;

            // Rotate player mesh slowly to face current movement vector
            const targetRotation = Math.atan2(dirX, dirZ);
            pState.rotationY = targetRotation;

            // Play procedural thud sound for footsteps while moving on floor
            if (pState.y === 0 && Math.sin(time * 12) > 0.98) {
              const footstepOsc = scene.getObjectByName('f_step_osc');
              if (!footstepOsc) {
                // simple procedural walk hum
              }
            }
          } else {
            pState.velocity.x = 0;
            pState.velocity.z = 0;
          }

          // JUMP PHYSICS
          if (jumpTriggeredRef.current && pState.y === 0) {
            pState.vy = 8.0; // Initial vertical upward force
            audio.triggerJump();
            onResetJump();
          }

          pState.y += pState.vy * dt;
          pState.vy -= 22.0 * dt; // Gravity pull

          if (pState.y <= 0) {
            pState.y = 0;
            pState.vy = 0;
          }

          // APPLY DELTA MOVEMENT & WALL BOUNDS COLLISIONS AXIS SEPARATELY
          const nextX = pState.x + pState.velocity.x * dt;
          const nextZ = pState.z + pState.velocity.z * dt;

          const playerRadius = 0.8;

          // Check X Axis Slide
          let collidesX = false;
          const pBoxX = new THREE.Box3(
            new THREE.Vector3(nextX - playerRadius, pState.y, pState.z - playerRadius),
            new THREE.Vector3(nextX + playerRadius, pState.y + 2.0, pState.z + playerRadius)
          );

          for (const wallB of walls) {
            if (pBoxX.intersectsBox(wallB)) {
              collidesX = true;
              break;
            }
          }
          
          // Check X Obstacle Jump Vaulting
          for (const crateB of crates) {
            if (pBoxX.intersectsBox(crateB)) {
              if (pState.y > 0.4) {
                // Vault/hop over obstacle
                pState.y = Math.max(pState.y, 1.4);
              } else {
                collidesX = true;
              }
              break;
            }
          }

          if (!collidesX) {
            pState.x = nextX;
          }

          // Check Z Axis Slide
          let collidesZ = false;
          const pBoxZ = new THREE.Box3(
            new THREE.Vector3(pState.x - playerRadius, pState.y, nextZ - playerRadius),
            new THREE.Vector3(pState.x + playerRadius, pState.y + 2.0, nextZ + playerRadius)
          );

          for (const wallB of walls) {
            if (pBoxZ.intersectsBox(wallB)) {
              collidesZ = true;
              break;
            }
          }

          for (const crateB of crates) {
            if (pBoxZ.intersectsBox(crateB)) {
              if (pState.y > 0.4) {
                pState.y = Math.max(pState.y, 1.4);
              } else {
                collidesZ = true;
              }
              break;
            }
          }

          if (!collidesZ) {
            pState.z = nextZ;
          }

          // Sync visual transformation
          pState.mesh.position.set(pState.x, pState.y + 0.1, pState.z);
          pState.mesh.rotation.y = pState.rotationY;

          // Tilt body mesh on walk cycle
          pBody.rotation.z = Math.sin(time * 10) * 0.05 * (inputMag > 0 ? 1 : 0);
          pBody.position.y = 1.3 + Math.abs(Math.sin(time * 10)) * 0.1 * (inputMag > 0 ? 1 : 0);
          
          const lArm = playerRef.current.mesh.getObjectByName("left_arm");
          const rArm = playerRef.current.mesh.getObjectByName("right_arm");
          const lLeg = playerRef.current.mesh.getObjectByName("left_leg");
          const rLeg = playerRef.current.mesh.getObjectByName("right_leg");
          if (lArm && rArm && lLeg && rLeg) {
            const swing = Math.sin(time * 10) * 0.6 * (inputMag > 0 ? 1 : 0);
            lArm.rotation.x = swing;
            rArm.rotation.x = -swing;
            lLeg.rotation.x = -swing;
            rLeg.rotation.x = swing;
          }
        }

        // ==========================================
        // 3. INTERACTIVE ITEMS & FUSES PICKUPS
        // ==========================================
        fusesRef.current.forEach((fuse) => {
          if (fuse.collected) return;

          // Animation hover rotating
          fuse.mesh.rotation.y += 0.02;
          fuse.mesh.position.y = 1.0 + Math.sin(time * 3 + fuse.pulseOffset) * 0.15;

          const fuseDist = Math.sqrt(
            (pState.x - fuse.mesh.position.x) * (pState.x - fuse.mesh.position.x) +
            (pState.z - fuse.mesh.position.z) * (pState.z - fuse.mesh.position.z)
          );

          if (fuseDist < 1.8 && !pState.isInsideHidingSpot) {
            fuse.collected = true;
            fuse.mesh.visible = false;
            pState.fusesCollected += 1;
            audio.triggerPickup();

            // Check if portal is now powered on
            if (pState.fusesCollected >= pState.totalFuses && exitPortalRef.current) {
              exitPortalRef.current.glowLight.intensity = 5.0;
            }
          }
        });

        // Hiding Spot Trigger check
        // If nearby a cabinet, player can press inside. Let's make it automatic if they collide
        let nearHidingSpot = false;
        hidingSpotsRef.current.forEach((spot) => {
          const spotDist = Math.sqrt(
            (pState.x - spot.mesh.position.x) * (pState.x - spot.mesh.position.x) +
            (pState.z - spot.mesh.position.z) * (pState.z - spot.mesh.position.z)
          );

          if (spotDist < 2.0) {
            nearHidingSpot = true;
            // Auto hide for touch accessibility convenience, or on interaction
            if (!pState.isInsideHidingSpot && joystickTilt > 0.01 && wantsSprint === false) {
              pState.isInsideHidingSpot = true;
              pState.velocity.x = 0;
              pState.velocity.z = 0;
              pState.mesh.visible = false;
              // Snap to locker position
              pState.x = spot.mesh.position.x;
              pState.z = spot.mesh.position.z;
              pState.mesh.position.set(pState.x, pState.y, pState.z);
            }
          }
        });

        // If player pushes joystick heavily or presses keyboard keys, they exit hiding spot
        const wantsExitHiding = 
          (pState.isInsideHidingSpot && joystickTilt > 0.5) ||
          (pState.isInsideHidingSpot && (
            keysPressed['w'] || keysPressed['arrowup'] ||
            keysPressed['s'] || keysPressed['arrowdown'] ||
            keysPressed['a'] || keysPressed['arrowleft'] ||
            keysPressed['d'] || keysPressed['arrowright'] ||
            keysPressed['space'] || keysPressed['shift']
          ));

        if (wantsExitHiding) {
          pState.isInsideHidingSpot = false;
          pState.mesh.visible = true;
          // Step out of locker slightly
          pState.z += 2.0;
        }

        // ==========================================
        // 4. MONSTER AI INTELLIGENT NAVIGATION
        // ==========================================
        // Monster state switching
        const isPlayerSpotted = () => {
          if (pState.isInsideHidingSpot) return false;

          // Checks line of sight + distance
          const maxLookDistance = mState.state === 'CHASE' ? 36.0 : 20.0;
          if (monsterDist > maxLookDistance) return false;

          // Flashlight increases detectability
          let detectAngleThreshold = Math.PI / 3; // Peripheral vision index
          if (pState.flashlightOn) detectAngleThreshold = Math.PI / 1.8; // Broader spotting angle

          // Vector pointing from monster to player
          const dx = pState.x - mState.x;
          const dz = pState.z - mState.z;
          const angleToPlayer = Math.atan2(dx, dz);

          // Monster face angle (look rotation)
          const mRotY = mState.mesh.rotation.y;
          let diffAngle = Math.abs(angleToPlayer - mRotY);
          while (diffAngle > Math.PI) diffAngle = Math.abs(diffAngle - Math.PI * 2);

          // If inside look cone or extremely close (hearing footsteps)
          if (diffAngle < detectAngleThreshold) {
            // Raycast on the LEVEL_GRID cells to ensure no wall block intercepts
            const mCol = worldXToGrid(mState.x);
            const mRow = worldZToGrid(mState.z);
            const pCol = worldXToGrid(pState.x);
            const pRow = worldZToGrid(pState.z);

            // Simple incremental grid raycaster
            let gridIntersect = false;
            const steps = Math.max(Math.abs(pCol - mCol), Math.abs(pRow - mRow)) * 2;
            for (let i = 1; i < steps; i++) {
              const t = i / steps;
              const testCol = Math.round(mCol + (pCol - mCol) * t);
              const testRow = Math.round(mRow + (pRow - mRow) * t);
              if (
                testRow >= 0 &&
                testRow < GRID_ROWS &&
                testCol >= 0 &&
                testCol < GRID_COLS &&
                (LEVEL_GRID[testRow][testCol] === 1 || LEVEL_GRID[testRow][testCol] === 3)
              ) {
                gridIntersect = true;
                break;
              }
            }
            if (!gridIntersect) return true;
          }

          // Hearing: if sprinting/jumping nearby
          if (monsterDist < 12.0 && (pState.isSprinting || pState.y > 0.1)) {
            return true;
          }

          return false;
        };

        // State Machine Transition
        if (isPlayerSpotted()) {
          if (mState.state !== 'CHASE') {
            mState.state = 'CHASE';
            mState.screechPlayed = false;
          }
        } else if (mState.state === 'CHASE') {
          // Lost player: enter SEARCH state at last seen coordinate
          mState.state = 'SEARCH';
          mState.investigateX = pState.x;
          mState.investigateZ = pState.z;
          mState.searchTimer = 5.0; // Search for 5 seconds
        }

        // TRIGGER CHASE SCREECH ONCE
        if (mState.state === 'CHASE' && !mState.screechPlayed) {
          audio.triggerChaseScreech();
          mState.screechPlayed = true;
        }

        // State Action Implementation
        let moveSpeed = mState.speed;
        if (mState.state === 'CHASE') {
          // Scale difficulty chase speed
          moveSpeed = settingsRef.current.difficulty === 'HARD' ? 5.5 : settingsRef.current.difficulty === 'EASY' ? 3.5 : 4.5;
          moveSpeed *= (1.15 * adminSpeed);
          mState.targetX = pState.x;
          mState.targetZ = pState.z;
        } else if (mState.state === 'INVESTIGATE') {
          moveSpeed = 3.6;
          mState.targetX = mState.investigateX;
          mState.targetZ = mState.investigateZ;

          // If reached sound source, look around then return to patrol
          const distToSnd = Math.sqrt(
            (mState.x - mState.investigateX) * (mState.x - mState.investigateX) +
            (mState.z - mState.investigateZ) * (mState.z - mState.investigateZ)
          );
          if (distToSnd < 2.0) {
            mState.state = 'SEARCH';
            mState.searchTimer = 3.0;
          }
        } else if (mState.state === 'SEARCH') {
          moveSpeed = 2.0;
          mState.targetX = mState.investigateX;
          mState.targetZ = mState.investigateZ;

          mState.searchTimer -= dt;
          if (mState.searchTimer <= 0) {
            mState.state = 'PATROL';
          }
        } else {
          // PATROL
          moveSpeed = 2.4;
          const patrolPoints = [
            { col: 14, row: 1 },
            { col: 1, row: 13 },
            { col: 13, row: 13 },
            { col: 1, row: 1 },
          ];
          const currPt = patrolPoints[mState.patrolIndex];
          mState.targetX = gridToWorldX(currPt.col);
          mState.targetZ = gridToWorldZ(currPt.row);

          const distToPat = Math.sqrt(
            (mState.x - mState.targetX) * (mState.x - mState.targetX) +
            (mState.z - mState.targetZ) * (mState.z - mState.targetZ)
          );

          if (distToPat < 2.0) {
            mState.patrolWaitTimer += dt;
            if (mState.patrolWaitTimer > 2.0) {
              mState.patrolIndex = (mState.patrolIndex + 1) % patrolPoints.length;
              mState.patrolWaitTimer = 0;
            }
          }
        }

        // MONSTER PATHFINDING STEERING FORCE (BFS Corridors sliding)
        const mGridCol = worldXToGrid(mState.x);
        const mGridRow = worldZToGrid(mState.z);
        const tGridCol = worldXToGrid(mState.targetX);
        const tGridRow = worldZToGrid(mState.targetZ);

        let nextStepX = mState.targetX;
        let nextStepZ = mState.targetZ;

        // Run pathfinding if targeted cell is different
        if (mGridCol !== tGridCol || mGridRow !== tGridRow) {
          const path = findShortestGridPath(mGridRow, mGridCol, tGridRow, tGridCol);
          if (path && path.length > 0) {
            // Head towards the next tile in the path
            nextStepX = gridToWorldX(path[0].c);
            nextStepZ = gridToWorldZ(path[0].r);
          }
        }

        // Steer towards targeted step position
        const steerX = nextStepX - mState.x;
        const steerZ = nextStepZ - mState.z;
        const steerMag = Math.sqrt(steerX * steerX + steerZ * steerZ);

        if (steerMag > 0.05) {
          mState.x += (steerX / steerMag) * moveSpeed * dt;
          mState.z += (steerZ / steerMag) * moveSpeed * dt;

          const targetRot = Math.atan2(steerX, steerZ);
          // Smooth rotation lerping
          let diffRot = targetRot - mState.mesh.rotation.y;
          while (diffRot < -Math.PI) diffRot += Math.PI * 2;
          while (diffRot > Math.PI) diffRot -= Math.PI * 2;
          mState.mesh.rotation.y += diffRot * 0.1;
        }

        mState.mesh.position.set(mState.x, 0, mState.z);

        // Limbs Sine waves wiggle animation
        legs.forEach((lg, idx) => {
          const phase = legPlacements[idx].phase;
          const speedFactor = mState.state === 'CHASE' ? 18.0 : 8.0;
          lg.rotation.x = Math.sin(time * speedFactor + phase) * 0.45;
        });

        // Dynamic Eye and Headlight colors based on Monster state in PLAYING mode
        const leftMat = monsterEyesRef.current ? monsterEyesRef.current.left.material as THREE.MeshStandardMaterial : null;
        const rightMat = monsterEyesRef.current ? monsterEyesRef.current.right.material as THREE.MeshStandardMaterial : null;
        const headLight = mState.headLight;

        if (mState.state === 'CHASE') {
          // Intense pulsing red eyes and headlight during CHASE!
          const pulseInt = 4.0 + Math.sin(time * 20) * 1.5;
          if (leftMat && leftMat.color) leftMat.color.setHex(0xff0000);
          if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0xcc0000);
          if (rightMat && rightMat.color) rightMat.color.setHex(0xff0000);
          if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0xcc0000);
          if (headLight) {
            headLight.color.setHex(0xff0000);
            headLight.intensity = pulseInt;
            headLight.distance = 15;
          }
        } else if (mState.state === 'SEARCH' || mState.state === 'INVESTIGATE') {
          // Curious/investigating amber color
          if (leftMat && leftMat.color) leftMat.color.setHex(0xffaa00);
          if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0x663300);
          if (rightMat && rightMat.color) rightMat.color.setHex(0xffaa00);
          if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0x663300);
          if (headLight) {
            headLight.color.setHex(0xffaa00);
            headLight.intensity = 2.0;
            headLight.distance = 10;
          }
        } else {
          // Standard patrol yellow/white light
          if (leftMat && leftMat.color) leftMat.color.setHex(0xfffeda);
          if (leftMat && leftMat.emissive) leftMat.emissive.setHex(0x444422);
          if (rightMat && rightMat.color) rightMat.color.setHex(0xfffeda);
          if (rightMat && rightMat.emissive) rightMat.emissive.setHex(0x444422);
          if (headLight) {
            headLight.color.setHex(0xfffeda);
            headLight.intensity = 1.2;
            headLight.distance = 10;
          }
        }

        // Dynamic fog density and color shift as the monster draws closer during chase
        if (sceneRef.current && sceneRef.current.fog && sceneRef.current.fog instanceof THREE.FogExp2) {
          const s = sceneRef.current;
          const fog = s.fog as THREE.FogExp2;
          if (mState.state === 'CHASE') {
            const proximity = Math.max(0, 1.0 - (monsterDist / 25.0)); // 0 to 1
            const fogColor = new THREE.Color().lerpColors(
              new THREE.Color(0x0c0b08), // Normal yellowish-black Backrooms
              new THREE.Color(0x1a0202), // Ominous deep horror crimson-black
              proximity
            );
            s.background = fogColor;
            fog.color = fogColor;
            fog.density = 0.05 + proximity * 0.06; // Dense cloying fog closes in
          } else {
            const fogColor = new THREE.Color(0x0c0b08);
            s.background = fogColor;
            fog.color = fogColor;
            fog.density = 0.05;
          }
        }

        // ==========================================
        // 5. ESCAPE WIN CONDITIONS / DEATH JUMP SCARE
        // ==========================================
        // Lose detection: Monster touches player
        if (monsterDist < 2.0 && !pState.isInsideHidingSpot) {
          audio.triggerScareScream();
          onGameOver();
        }

        // Win detection: Reach Green portal unlocked
        const portalWX = gridToWorldX(14);
        const portalWZ = gridToWorldZ(15) - 3.2;
        const portalDist = Math.sqrt(
          (pState.x - portalWX) * (pState.x - portalWX) +
          (pState.z - portalWZ) * (pState.z - portalWZ)
        );

        if (portalDist < 2.5 && pState.fusesCollected >= pState.totalFuses) {
          audio.triggerPickup(); // success ding
          onWin();
        }

        // Rotate Portal Visual Rings
        if (exitPortalRef.current) {
          const ep = exitPortalRef.current;
          ep.mesh.children[0].rotation.z += 0.015;
          ep.mesh.children[1].rotation.y -= 0.02;

          // Pulse glow light intensities
          if (pState.fusesCollected >= pState.totalFuses) {
            ep.glowLight.intensity = 5.0 + Math.sin(time * 6) * 1.5;
          }
        }

        // Export data updates to React HUD
        onUpdatePlayerStats({
          stamina: pState.stamina,
          maxStamina: 100,
          isSprinting: pState.isSprinting,
          score: pState.fusesCollected * 100,
          fusesCollected: pState.fusesCollected,
          totalFuses: pState.totalFuses,
          flashlightOn: pState.flashlightOn,
          isInsideHidingSpot: pState.isInsideHidingSpot,
        });

        onUpdateMonsterStats(mState.state, monsterDist);
      } else if (stateRef.current === 'ENCOUNTER') {
        // Creepy heavy-breathing idle animation
        // Bobbing body up and down slowly like it is breathing heavily
        mState.mesh.position.set(mState.x, Math.sin(time * 3.5) * 0.15, mState.z);
        // Subtle creepy head/body tilting side to side
        mState.mesh.rotation.z = Math.sin(time * 1.5) * 0.06;
        // Breathing movement on the limbs
        legs.forEach((lg, idx) => {
          const phase = legPlacements[idx].phase;
          lg.rotation.x = Math.sin(time * 3.5 + phase) * 0.15;
          lg.rotation.z = Math.sin(time * 1.5 + phase) * 0.08;
        });

        // Ensure the monster always faces the player exactly
        mState.mesh.rotation.y = Math.PI;
      }

      // ==========================================
      // 6. CAMERA SMOOTH THIRD-PERSON LERP FOLLOW / CINEMATIC VIEW
      // ==========================================
      let targetCamX = pState.x - Math.sin(pState.rotationY) * 6.5;
      let targetCamZ = pState.z - Math.cos(pState.rotationY) * 6.5;
      let targetCamY = pState.y + 4.2;

      let lookTarget = new THREE.Vector3(pState.x, pState.y + 1.2, pState.z);

      if (stateRef.current === 'ENCOUNTER') {
        // Look directly at the monster staring at us in the encounter
        targetCamX = pState.x;
        targetCamZ = pState.z - 2.5; // Closer view for a direct staring face-off
        targetCamY = pState.y + 2.4; // Perfect eye-to-eye height

        lookTarget.set(mState.x, 3.2, mState.z);
      }

      // Smooth camera interpolation
      camera.position.x += (targetCamX - camera.position.x) * 0.12;
      camera.position.z += (targetCamZ - camera.position.z) * 0.12;
      camera.position.y += (targetCamY - camera.position.y) * 0.12;

      camera.lookAt(lookTarget);

      // Horror Chase camera shaking/rumble effect (scales with monster proximity!)
      if (mState.state === 'CHASE' && stateRef.current === 'PLAYING') {
        const monsterDist = Math.sqrt(
          (pState.x - mState.x) * (pState.x - mState.x) +
          (pState.z - mState.z) * (pState.z - mState.z)
        );
        const proximity = Math.max(0, 1.0 - (monsterDist / 25.0)); // 0 to 1
        const shakePower = 0.015 + proximity * 0.11; // scales from minor vibration to heavy camera rattle
        camera.position.x += (Math.random() - 0.5) * shakePower;
        camera.position.y += (Math.random() - 0.5) * shakePower;
        camera.position.z += (Math.random() - 0.5) * shakePower;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    // CLEANUPS
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      audio.cleanup();

      if (mountRef.current && renderer.domElement) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {}
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full cursor-none overflow-hidden" />;
}
