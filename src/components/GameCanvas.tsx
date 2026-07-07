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
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  const settingsRef = useRef(settings);
  const joystickVectorRef = useRef(joystickVector);
  const jumpTriggeredRef = useRef(jumpTriggered);
  const flashlightRef = useRef<THREE.SpotLight | null>(null);
  const flashFlareRef = useRef<THREE.PointLight | null>(null);

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
    if (gameState === 'PLAYING') {
      gameTimerRef.current.startTime = Date.now() - (gameTimerRef.current.elapsedSeconds * 1000);
      audio.resume();
    }
  }, [gameState]);

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
  }, [jumpTriggered]);

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
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.05);

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // AMBIENT LIGHT
    const ambientLight = new THREE.AmbientLight(0x040410, 0.45);
    scene.add(ambientLight);

    // RED CORRIDOR FLICKERING LIGHTS
    const redLightLocs = [
      { col: 4, row: 5 },
      { col: 11, row: 11 },
      { col: 7, row: 7 }
    ];
    const emergencyLights: { light: THREE.PointLight; mesh: THREE.Mesh; baseIntensity: number }[] = [];

    redLightLocs.forEach((loc) => {
      const wx = gridToWorldX(loc.col);
      const wz = gridToWorldZ(loc.row);

      // Light bulb visual mesh
      const bulbGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(wx, 4.5, wz);
      scene.add(bulb);

      const pLight = new THREE.PointLight(0xff2200, 2.0, 16);
      pLight.position.set(wx, 4.2, wz);
      scene.add(pLight);

      emergencyLights.push({ light: pLight, mesh: bulb, baseIntensity: 2.0 });
    });

    // FLOOR PLAN
    const floorGeo = new THREE.PlaneGeometry(GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);
    
    // Procedural Floor Texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#111116';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#222230';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 128, 128);
      // Rust spots
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(139, 69, 19, ${Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 20 + 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(GRID_COLS, GRID_ROWS);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.8,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // BUILDING WALLS & OBSTACLES FROM GRID
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, 6, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x181820,
      roughness: 0.9,
      metalness: 0.2,
    });

    const crateGeo = new THREE.BoxGeometry(TILE_SIZE * 0.75, 2.5, TILE_SIZE * 0.75);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.9,
    });

    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 6, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x22222a,
      roughness: 0.7,
      metalness: 0.4,
    });

    const hidingGeo = new THREE.BoxGeometry(2, 4.5, 2.5);
    const hidingMat = new THREE.MeshStandardMaterial({
      color: 0x1e351d, // Army green industrial locker
      roughness: 0.5,
      metalness: 0.8,
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
          wallMesh.position.set(wx, 3, wz);
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
          pillarMesh.position.set(wx, 3, wz);
          pillarMesh.castShadow = true;
          pillarMesh.receiveShadow = true;
          scene.add(pillarMesh);

          const bbox = new THREE.Box3().setFromObject(pillarMesh);
          walls.push(bbox);
        } else if (type === 4) {
          // Interactive Hiding Spot
          const lockerGrp = new THREE.Group();
          const lockerMesh = new THREE.Mesh(hidingGeo, hidingMat);
          lockerMesh.position.set(0, 2.25, 0);
          lockerMesh.castShadow = true;
          lockerGrp.add(lockerMesh);

          // Handle yellow glowing accent stripe
          const accentGeo = new THREE.BoxGeometry(0.1, 4.0, 0.1);
          const accentMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const accent = new THREE.Mesh(accentGeo, accentMat);
          accent.position.set(1.05, 2.25, 0);
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

    // BUILD PLAYER REPRESENTATION
    const playerGroup = new THREE.Group();
    // Survivor hazmat/spacesuit body
    const pBodyGeo = new THREE.SphereGeometry(1.1, 16, 16);
    pBodyGeo.scale(1.0, 1.3, 1.0);
    const pBodyMat = new THREE.MeshStandardMaterial({ color: 0xd84315, roughness: 0.6 }); // Dark tactical orange
    const pBody = new THREE.Mesh(pBodyGeo, pBodyMat);
    pBody.position.y = 1.3;
    pBody.castShadow = true;
    playerGroup.add(pBody);

    // Survivor helmet visors
    const visorGeo = new THREE.SphereGeometry(0.75, 12, 12);
    visorGeo.scale(1.0, 0.5, 1.0);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.8, 0.6);
    playerGroup.add(visor);

    // Flashlight object mounted on shoulder
    const flashGeom = new THREE.CylinderGeometry(0.18, 0.25, 0.7, 8);
    const flashMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const flashObj = new THREE.Mesh(flashGeom, flashMat);
    flashObj.position.set(0.7, 1.6, 0.4);
    flashObj.rotation.x = Math.PI / 2;
    playerGroup.add(flashObj);

    // FLASHLIGHT REAL POINT & SPOTLIGHT SOURCES
    const flashlight = new THREE.SpotLight(0xffffff, 5.0, 30, Math.PI / 6, 0.5, 1.5);
    flashlight.position.set(0.7, 1.6, 0.55);
    flashlight.target.position.set(0, 1.6, 10);
    flashlight.visible = playerRef.current.flashlightOn;
    playerGroup.add(flashlight);
    playerGroup.add(flashlight.target);

    // Add small point light at source for flashlight glowing flare
    const flashFlare = new THREE.PointLight(0xeeffff, 1.2, 1.5);
    flashFlare.position.set(0.7, 1.6, 0.6);
    flashFlare.visible = playerRef.current.flashlightOn;
    playerGroup.add(flashFlare);

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

    // Beast head with red eyes
    const mHeadGeo = new THREE.BoxGeometry(1.1, 1.1, 1.8);
    const mHead = new THREE.Mesh(mHeadGeo, mTorsoMat);
    mHead.position.set(0, 3.8, 0.7);
    monsterGroup.add(mHead);

    // Glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.4, 3.8, 1.5);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.4, 3.8, 1.5);
    monsterGroup.add(leftEye);
    monsterGroup.add(rightEye);

    // Menacing red aura glow attached to face
    const monsterRedLight = new THREE.PointLight(0xff0000, 3.0, 12);
    monsterRedLight.position.set(0, 3.8, 1.2);
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

    // ==========================================
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

      // Reset monster
      const mState = monsterRef.current;
      mState.x = gridToWorldX(14);
      mState.z = gridToWorldZ(14);
      mState.state = 'PATROL';
      mState.patrolIndex = 0;
      mState.targetX = gridToWorldX(14);
      mState.targetZ = gridToWorldZ(14);
      mState.screechPlayed = false;
      mState.searchTimer = 0;
      mState.patrolWaitTimer = 0;
      mState.mesh.position.set(mState.x, 0, mState.z);

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

    resetGameParameters();
    audio.startAmbient();

    const tick = () => {
      const dt = Math.min(0.03, clock.getDelta()); // Cap delta to avoid physics explosion
      const time = clock.getElapsedTime();

      // Ensure emergency red lights pulse
      emergencyLights.forEach((el) => {
        const pulse = el.baseIntensity + Math.sin(time * 5) * 1.2;
        el.light.intensity = pulse;
        (el.mesh.material as THREE.MeshBasicMaterial).color.setHSL(0.01, 1, 0.3 + Math.sin(time * 5) * 0.1);
      });

      const pState = playerRef.current;
      const mState = monsterRef.current;

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

          let currentSpeed = 3.6; // Walking base
          pState.isSprinting = false;

          if (wantsSprint && hasStamina && (moveX !== 0 || moveZ !== 0)) {
            currentSpeed = 7.8; // Sprint speed
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

        // If player pushes joystick heavily out of locker, they break exit hiding spot
        if (pState.isInsideHidingSpot && joystickTilt > 0.5) {
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
          moveSpeed = settingsRef.current.difficulty === 'HARD' ? 6.2 : settingsRef.current.difficulty === 'EASY' ? 4.2 : 5.2;
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
      }

      // ==========================================
      // 6. CAMERA SMOOTH THIRD-PERSON LERP FOLLOW
      // ==========================================
      const targetCamX = pState.x - Math.sin(pState.rotationY) * 6.5;
      const targetCamZ = pState.z - Math.cos(pState.rotationY) * 6.5;
      const targetCamY = pState.y + 4.2;

      // Smooth camera interpolation
      camera.position.x += (targetCamX - camera.position.x) * 0.12;
      camera.position.z += (targetCamZ - camera.position.z) * 0.12;
      camera.position.y += (targetCamY - camera.position.y) * 0.12;

      // Look slightly above the player head
      const lookTarget = new THREE.Vector3(pState.x, pState.y + 1.2, pState.z);
      camera.lookAt(lookTarget);

      // Horror Chase camera shaking/rumble effect
      if (mState.state === 'CHASE' && stateRef.current === 'PLAYING') {
        const shakePower = 0.035;
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
