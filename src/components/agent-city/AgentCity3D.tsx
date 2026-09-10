import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RoomCluster } from '../../types/probe';
import { generateCityLayout, type BuildingLayout } from './cityLayout';
import { createCityMaterials, disposeCityMaterials, type CityMaterials } from './cityMaterials';
import { CityBuilding } from './CityBuilding';
import { CityDistrictManager } from './CityDistrict';
import { CityRoads } from './CityRoads';
import { CitySkyline } from './CitySkyline';
import { CityEnvironment } from './CityEnvironment';
import { CityRoutes } from './CityRoutes';
import { AgentParticles } from './AgentParticles';
import { ProbePulseSystem } from './ProbePulseSystem';
import { CityTransportManager } from './CityTransport';
import { CityPedestrians } from './CityPedestrians';
import { CityLODManager, type CameraViewLevel } from './CityLODManager';
import { Radio, Sparkles } from 'lucide-react';

interface AgentCity3DProps {
  activeRoomClusters: RoomCluster[];
  selectedRoom: RoomCluster;
  onSelectRoom: (room: RoomCluster) => void;
  onOpenBuildingSheet?: (room: RoomCluster) => void;
  isSimulatingPulse?: boolean;
  onPulseComplete?: () => void;
  viewLevel?: CameraViewLevel;
  onViewLevelChange?: (level: CameraViewLevel) => void;
  theme?: 'dark' | 'light';
  cameraPerspective?: 'orbit' | 'drone' | 'plaza';
  onPerspectiveChange?: (persp: 'orbit' | 'drone' | 'plaza') => void;
  isShowcase?: boolean;
  onExitShowcase?: () => void;
}

const DEFAULT_FALLBACK_ROOM: RoomCluster = {
  id: 'live-room-technocore',
  name: 'technocore',
  displayName: '#technocore',
  category: 'unclassified',
  visualDistrict: 'coordination',
  signedIdentitiesObserved: null,
  activeAgentsCount: null,
  totalProbesReceived: 0,
  medianSubsequentLatencySeconds: null,
  averageResponseLatency: null,
  status: 'active',
  color: '#36D7E7',
  coordinates: [0, 0, 0]
};

export const AgentCity3D: React.FC<AgentCity3DProps> = ({
  activeRoomClusters,
  selectedRoom,
  onSelectRoom,
  onOpenBuildingSheet,
  isSimulatingPulse = false,
  onPulseComplete,
  viewLevel: controlledViewLevel,
  onViewLevelChange,
  theme = 'dark',
  cameraPerspective = 'orbit',
  onPerspectiveChange,
  isShowcase = false,
  onExitShowcase
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Visual scale state: 'city' | 'building' | 'interior'
  const [internalViewLevel, setInternalViewLevel] = useState<CameraViewLevel>('city');
  const viewLevel = controlledViewLevel !== undefined ? controlledViewLevel : internalViewLevel;
  
  const setViewLevel = useCallback((level: CameraViewLevel) => {
    setInternalViewLevel(level);
    if (onViewLevelChange) onViewLevelChange(level);
  }, [onViewLevelChange]);

  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [hoveredRoom, setHoveredRoom] = useState<{ room: RoomCluster; x: number; y: number } | null>(null);
  const [pulseLog, setPulseLog] = useState<string>('Technocore Metropolis online. Autonomous agent districts active.');
  const [showIntroBadge, setShowIntroBadge] = useState<boolean>(true);

  // Persistent Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialsRef = useRef<CityMaterials | null>(null);
  const pulseSystemRef = useRef<ProbePulseSystem | null>(null);
  const districtMgrRef = useRef<CityDistrictManager | null>(null);
  const transportMgrRef = useRef<CityTransportManager | null>(null);
  const routesRef = useRef<CityRoutes | null>(null);
  const agentParticlesRef = useRef<AgentParticles | null>(null);
  const pedestriansRef = useRef<CityPedestrians | null>(null);
  const buildingsMapRef = useRef<Map<string, CityBuilding>>(new Map());
  const cityGroupRef = useRef<THREE.Group | null>(null);
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);
  const lodManagerRef = useRef<CityLODManager>(new CityLODManager());

  // Cinematic Intro & Perspective references
  const isIntroRef = useRef<boolean>(true);
  const introProgressRef = useRef<number>(0);
  const INTRO_START_POS = useRef<THREE.Vector3>(new THREE.Vector3(78, 52, 84));
  const INTRO_END_POS = useRef<THREE.Vector3>(new THREE.Vector3(56, 36, 62));
  const INTRO_START_LOOK = useRef<THREE.Vector3>(new THREE.Vector3(0, 10, 0));
  const INTRO_END_LOOK = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));

  const cameraPerspectiveRef = useRef<'orbit' | 'drone' | 'plaza'>(cameraPerspective);
  cameraPerspectiveRef.current = cameraPerspective;

  const onPerspectiveChangeRef = useRef(onPerspectiveChange);
  onPerspectiveChangeRef.current = onPerspectiveChange;

  // Animation & Camera targets
  const controlsRef = useRef<OrbitControls | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(56, 36, 62));
  const cameraTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));

  // Refs for animation loop (prevents scene destruction on state changes)
  const isAutoRotateRef = useRef<boolean>(isAutoRotate);
  isAutoRotateRef.current = isAutoRotate;

  const viewLevelRef = useRef<CameraViewLevel>(viewLevel);
  viewLevelRef.current = viewLevel;

  const safeClusters = activeRoomClusters.length > 0 ? activeRoomClusters : [DEFAULT_FALLBACK_ROOM];
  const activeRoom = selectedRoom || safeClusters[0] || DEFAULT_FALLBACK_ROOM;
  const activeRoomRef = useRef<RoomCluster>(activeRoom);
  activeRoomRef.current = activeRoom;

  const onSelectRoomRef = useRef(onSelectRoom);
  onSelectRoomRef.current = onSelectRoom;

  const onOpenBuildingSheetRef = useRef(onOpenBuildingSheet);
  onOpenBuildingSheetRef.current = onOpenBuildingSheet;

  const isShowcaseRef = useRef(isShowcase);
  isShowcaseRef.current = isShowcase;

  const onExitShowcaseRef = useRef(onExitShowcase);
  onExitShowcaseRef.current = onExitShowcase;

  const showcaseTimerRef = useRef<number>(0);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Reset showcase timer when showcase mode changes
  useEffect(() => {
    if (isShowcase) {
      showcaseTimerRef.current = 0;
      isIntroRef.current = false;
      setShowIntroBadge(false);
    }
  }, [isShowcase]);

  // WASD Keyboard Exploration Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysPressedRef.current[k] = true;
        if (isAutoRotateRef.current) setIsAutoRotate(false);
        isTransitioningRef.current = false;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressedRef.current[k] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const skipIntro = useCallback(() => {
    isIntroRef.current = false;
    setShowIntroBadge(false);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.copy(INTRO_END_POS.current);
      controlsRef.current.target.copy(INTRO_END_LOOK.current);
      cameraTargetPos.current.copy(INTRO_END_POS.current);
      cameraTargetLookAt.current.copy(INTRO_END_LOOK.current);
    }
  }, []);

  // -------------------------------------------------------------
  // CAMERA VIEW SCALE CONTROLLERS
  // -------------------------------------------------------------

  const switchCameraToCity = useCallback(() => {
    setViewLevel('city');
    setIsAutoRotate(true);
    isTransitioningRef.current = true;
    lodManagerRef.current.setViewLevel('city', null);

    // Close all cutaways
    buildingsMapRef.current.forEach(b => b.setCutaway(false));

    cameraTargetPos.current.set(56, 36, 62);
    cameraTargetLookAt.current.set(0, 6, 0);
    setPulseLog('Camera returned to Agent City metropolitan overview.');
  }, []);

  const switchCameraToBuilding = useCallback((building: BuildingLayout) => {
    isIntroRef.current = false;
    setShowIntroBadge(false);
    setViewLevel('building');
    setIsAutoRotate(false);
    isTransitioningRef.current = true;
    lodManagerRef.current.setViewLevel('building', building.room.id);

    // Open cutaway for selected building, close others
    buildingsMapRef.current.forEach((b) => {
      b.setCutaway(b.layout.room.id === building.room.id);
    });

    const bX = building.position[0];
    const bZ = building.position[2];
    const bY = Math.min(building.height * 0.5, 12);

    const isMobilePortrait = typeof window !== 'undefined' && window.innerWidth < 640 && window.innerHeight > window.innerWidth;
    const offsetDist = isMobilePortrait ? 16 : 13;
    const angle = Math.atan2(bZ, bX) + 0.35;
    cameraTargetPos.current.set(
      bX + Math.cos(angle) * offsetDist,
      Math.max(6, bY + (isMobilePortrait ? 5 : 4)),
      bZ + Math.sin(angle) * offsetDist
    );
    cameraTargetLookAt.current.set(bX, bY, bZ);
    setPulseLog(`Focusing optical sensor on #${building.room.name}. Office cutaway active.`);
  }, []);

  const switchCameraToInterior = useCallback((building: BuildingLayout) => {
    isIntroRef.current = false;
    setShowIntroBadge(false);
    setViewLevel('interior');
    setIsAutoRotate(false);
    isTransitioningRef.current = true;
    lodManagerRef.current.setViewLevel('interior', building.room.id);

    // Ensure cutaway is open
    buildingsMapRef.current.forEach((b) => {
      b.setCutaway(b.layout.room.id === building.room.id);
    });

    const bX = building.position[0];
    const bZ = building.position[2];
    // Focus close on active office workstations with clear view of laptops and agents
    const bY = 0.85;

    const angle = Math.atan2(bZ, bX) + 0.25;
    cameraTargetPos.current.set(
      bX + Math.cos(angle) * 5.2,
      bY + 1.25,
      bZ + Math.sin(angle) * 5.2
    );
    cameraTargetLookAt.current.set(bX, bY + 0.45, bZ);
    setPulseLog(`Entering #${building.room.name} office interior. Autonomous agent workers online.`);
  }, []);

  // Sync view scale with controlled prop from parent
  useEffect(() => {
    if (!controlledViewLevel) return;
    if (controlledViewLevel === 'city') {
      switchCameraToCity();
    } else if (controlledViewLevel === 'building') {
      const bObj = buildingsMapRef.current.get(activeRoom.id) || Array.from(buildingsMapRef.current.values())[0];
      if (bObj) switchCameraToBuilding(bObj.layout);
    } else if (controlledViewLevel === 'interior') {
      const bObj = buildingsMapRef.current.get(activeRoom.id) || Array.from(buildingsMapRef.current.values())[0];
      if (bObj) switchCameraToInterior(bObj.layout);
    }
  }, [controlledViewLevel, activeRoom.id, switchCameraToCity, switchCameraToBuilding, switchCameraToInterior]);

  // Sync camera perspective (orbit | drone | plaza)
  useEffect(() => {
    if (cameraPerspective === 'plaza') {
      isTransitioningRef.current = true;
      cameraTargetPos.current.set(13, 2.4, 13);
      cameraTargetLookAt.current.set(0, 14, 0);
      setPulseLog('Camera switched to Plaza ground view.');
    } else if (cameraPerspective === 'orbit') {
      if (viewLevelRef.current === 'city') {
        isTransitioningRef.current = true;
        cameraTargetPos.current.set(56, 36, 62);
        cameraTargetLookAt.current.set(0, 6, 0);
      }
      setPulseLog('Camera switched to Free Orbit mode.');
    } else if (cameraPerspective === 'drone') {
      isTransitioningRef.current = false;
      setPulseLog('Autonomous Drone Flythrough Tour initiated.');
    }
  }, [cameraPerspective]);

  // -------------------------------------------------------------
  // SIMULATED / LIVE PROBE EFFECT TRIGGER
  // -------------------------------------------------------------
  useEffect(() => {
    if (isSimulatingPulse && pulseSystemRef.current && activeRoom) {
      const bObj = buildingsMapRef.current.get(activeRoom.id);
      const pos: [number, number, number] = bObj 
        ? bObj.layout.position 
        : [0, 0, 0];

      pulseSystemRef.current.triggerPulse(pos);
      if (bObj) bObj.triggerProbeEffect();

      setPulseLog(`Visual demonstration signal emitted across #${activeRoom.name}.`);
      
      const timer = setTimeout(() => {
        setPulseLog(`Visual demonstration pulse complete. (No protocol write performed).`);
        if (onPulseComplete) onPulseComplete();
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [isSimulatingPulse, activeRoom, onPulseComplete]);

  // -------------------------------------------------------------
  // SEPARATE EFFECT: DATA RECONCILIATION
  // (Updates buildings & room data without rebuilding the scene)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!cityGroupRef.current || !materialsRef.current) return;

    safeClusters.forEach((cluster) => {
      const existingBuilding = buildingsMapRef.current.get(cluster.id);
      if (existingBuilding) {
        existingBuilding.updateRoomData(cluster);
      }
    });
  }, [safeClusters]);

  // -------------------------------------------------------------
  // PRIMARY SCENE INITIALIZATION (Runs ONCE on mount)
  // -------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isLight = theme === 'light';

    // 1. Scene & Atmospheric Fog (Target: 10-15% sky readability, softened fog so buildings don't vanish)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(isLight ? 0xE8EEF5 : 0x0A1320, 0.0072);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.copy(INTRO_START_POS.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer (Mobile optimized, no preserveDrawingBuffer to maximize framerate)
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.35 : 1.75));
    renderer.setClearColor(isLight ? 0xE8EEF5 : 0x0A1320, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Shared Materials & Pulse System
    const materials = createCityMaterials(theme);
    materialsRef.current = materials;

    const pulseSystem = new ProbePulseSystem();
    pulseSystemRef.current = pulseSystem;
    scene.add(pulseSystem.group);

    // 5. Foundational Digital Platform & Cyber Flora
    const environment = new CityEnvironment(theme);
    scene.add(environment.group);

    // 6. Central Technocore Core Landmark & 8 District Bridges
    const districtMgr = new CityDistrictManager(materials);
    districtMgrRef.current = districtMgr;
    scene.add(districtMgr.group);

    // 7. Full 8-District Layout & Metropolitan Road Network
    const { buildings, roadWaypoints } = generateCityLayout(safeClusters);

    const roads = new CityRoads(roadWaypoints, theme);
    scene.add(roads.group);

    const skyline = new CitySkyline(theme);
    scene.add(skyline.group);

    // 8. Elevated Autonomous Sky Transport, Rails & Aerial Drones
    const transportMgr = new CityTransportManager();
    transportMgrRef.current = transportMgr;
    scene.add(transportMgr.group);

    // 9. Procedural District Buildings & Cutaway Interiors
    buildingsMapRef.current.clear();
    interactiveMeshesRef.current = [];

    const cityGroup = new THREE.Group();
    cityGroup.name = 'city-buildings-group';
    cityGroupRef.current = cityGroup;

    buildings.forEach((bLayout) => {
      const bObj = new CityBuilding(bLayout, materials);
      buildingsMapRef.current.set(bLayout.room.id, bObj);
      cityGroup.add(bObj.group);

      // Register dedicated full-volume building collider for 100% reliable raycasting
      interactiveMeshesRef.current.push(bObj.hitMesh);
    });
    scene.add(cityGroup);

    // 8. Elevated Network Routes & Moving Data Packets
    const routes = new CityRoutes(buildings, materials);
    routesRef.current = routes;
    scene.add(routes.group);

    // 9. Autonomous Drone Particles
    const agentParticles = new AgentParticles(buildings);
    agentParticlesRef.current = agentParticles;
    scene.add(agentParticles.group);

    // 10. Ground Street Pedestrians & Sidewalk Life
    const pedestrians = new CityPedestrians(buildings, roadWaypoints);
    pedestriansRef.current = pedestrians;
    scene.add(pedestrians.group);

    // 10. Balanced Night Lighting (Readable graphite facades without daytime wash)
    const ambientLight = new THREE.AmbientLight(
      isLight ? 0xFFFFFF : 0x2A3E5B,
      isLight ? 2.2 : 2.5
    );
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      isLight ? 0xF0F9FF : 0x60A5FA,
      isLight ? 0xE2E8F0 : 0x0F1A2B,
      2.0
    );
    scene.add(hemiLight);

    const coreLight = new THREE.PointLight(
      isLight ? 0x0284C7 : 0x36D7E7,
      isLight ? 5.5 : 5.0,
      170,
      1.1
    );
    coreLight.position.set(0, 26, 0);
    scene.add(coreLight);

    // Cool Moonlight Directional Key Light (gives crisp architectural edge definition)
    const moonLight = new THREE.DirectionalLight(
      isLight ? 0x38BDF8 : 0x93C5FD,
      isLight ? 2.2 : 2.2
    );
    moonLight.position.set(50, 75, 45);
    scene.add(moonLight);

    const fillLight = new THREE.DirectionalLight(
      isLight ? 0x60A5FA : 0x475569,
      isLight ? 1.6 : 1.5
    );
    fillLight.position.set(-50, 60, -45);
    scene.add(fillLight);

    // 11. OrbitControls & User Interaction (Smooth Damping, Pan, Orbit, Wheel Zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.target.copy(INTRO_START_LOOK.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep camera above ground
    controls.minDistance = 4;
    controls.maxDistance = 145;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 1.15;
    controls.panSpeed = 0.8;
    controls.autoRotateSpeed = 0.6;

    // Interrupt any automated sweep or intro when the user touches controls
    controls.addEventListener('start', () => {
      if (isIntroRef.current) {
        isIntroRef.current = false;
        setShowIntroBadge(false);
      }
      if (cameraPerspectiveRef.current === 'drone') {
        if (onPerspectiveChangeRef.current) {
          onPerspectiveChangeRef.current('orbit');
        }
      }
      isTransitioningRef.current = false;
      if (isAutoRotateRef.current) {
        setIsAutoRotate(false);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      if (isIntroRef.current) {
        isIntroRef.current = false;
        setShowIntroBadge(false);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownTime;

      // Relax tap tolerance on touch screens (fingers jitter slightly on glass)
      const isTouch = e.pointerType === 'touch';
      const maxDist = isTouch ? 18 : 6;
      const maxElapsed = isTouch ? 480 : 350;

      // Pure click/tap if movement < maxDist and held for < maxElapsed
      if (dist < maxDist && elapsed < maxElapsed) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const room: RoomCluster = hit.userData.room;
          if (room) {
            onSelectRoomRef.current(room);
            if (onOpenBuildingSheetRef.current) {
              onOpenBuildingSheetRef.current(room);
            }
            const bObj = buildingsMapRef.current.get(room.id);
            if (bObj) {
              const currentActiveId = activeRoomRef.current?.id;
              const currentLevel = viewLevelRef.current;

              if (currentActiveId === room.id && currentLevel === 'building') {
                // Clicking on the currently focused building again steps inside its office interior
                switchCameraToInterior(bObj.layout);
              } else if (currentActiveId === room.id && currentLevel === 'interior') {
                // Already inside office interior, trigger probe pulse highlight
                bObj.triggerProbeEffect();
              } else {
                // Focus on this building
                switchCameraToBuilding(bObj.layout);
              }
            }
          }
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Don't calculate hover states on touch events
      if (e.pointerType === 'touch') return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const room: RoomCluster = hit.userData.room;
        if (room) {
          setHoveredRoom({ room, x: e.clientX, y: e.clientY });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredRoom(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointermove', handlePointerMove);

    // 12. Animation Loop (60 FPS)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Showcase tour sequence (18 seconds)
      if (isShowcaseRef.current) {
        showcaseTimerRef.current += delta;
        const t = showcaseTimerRef.current;
        if (t < 5) {
          // 1. Orbit kinetic central landmark
          const ang = t * 0.45;
          camera.position.set(Math.cos(ang) * 44, 22 + Math.sin(t * 0.4) * 3, Math.sin(ang) * 44);
          controlsRef.current?.target.set(0, 10, 0);
        } else if (t < 10) {
          // 2. Fly low through district towards first building
          const b = Array.from(buildingsMapRef.current.values())[0];
          const bPos = b ? b.layout.position : [20, 0, 20];
          const pT = Math.min(1, (t - 5) / 5);
          const ease = pT * (2 - pT);
          camera.position.lerpVectors(new THREE.Vector3(38, 18, 38), new THREE.Vector3(bPos[0] + 8, 5.5, bPos[2] + 8), ease);
          controlsRef.current?.target.lerpVectors(new THREE.Vector3(0, 8, 0), new THREE.Vector3(bPos[0], 2.2, bPos[2]), ease);
        } else if (t < 14) {
          // 3. Open cutaway interior and zoom on workers
          const b = Array.from(buildingsMapRef.current.values())[0];
          if (b) {
            b.setCutaway(true);
            const bPos = b.layout.position;
            camera.position.set(bPos[0] + 4.6, 2.1, bPos[2] + 4.6);
            controlsRef.current?.target.set(bPos[0], 1.1, bPos[2]);
          }
        } else if (t < 18) {
          // 4. Hero skyline pull-back
          camera.position.lerp(new THREE.Vector3(56, 36, 62), 0.05);
          controlsRef.current?.target.lerp(new THREE.Vector3(0, 6, 0), 0.05);
        } else {
          // End showcase
          if (onExitShowcaseRef.current) onExitShowcaseRef.current();
        }
        controlsRef.current?.update();
      } else if (isIntroRef.current) {
        introProgressRef.current += delta;
        const t = Math.min(1, introProgressRef.current / 4.2);
        const ease = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(INTRO_START_POS.current, INTRO_END_POS.current, ease);
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(INTRO_START_LOOK.current, INTRO_END_LOOK.current, ease);
          controlsRef.current.update();
        }
        if (t >= 1) {
          isIntroRef.current = false;
          setShowIntroBadge(false);
          cameraTargetPos.current.copy(INTRO_END_POS.current);
          cameraTargetLookAt.current.copy(INTRO_END_LOOK.current);
        }
      } else if (cameraPerspectiveRef.current === 'drone') {
        // Continuous aerial drone flythrough tour
        const droneAngle = time * 0.16;
        const droneRadius = 31;
        const droneHeight = 12.5 + Math.sin(time * 0.35) * 3.5;
        camera.position.x = Math.cos(droneAngle) * droneRadius;
        camera.position.z = Math.sin(droneAngle) * droneRadius;
        camera.position.y = droneHeight;
        const lookAngle = droneAngle + 0.35;
        if (controlsRef.current) {
          controlsRef.current.target.set(Math.cos(lookAngle) * 4, 7 + Math.sin(time * 0.25) * 2, Math.sin(lookAngle) * 4);
          controlsRef.current.update();
        }
      } else {
        // WASD / Arrow Keys Keyboard Exploration
        const keys = keysPressedRef.current;
        if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright']) {
          const fwd = new THREE.Vector3();
          camera.getWorldDirection(fwd);
          fwd.y = 0;
          fwd.normalize();
          const rgt = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
          const moveSpeed = 24 * delta;
          const move = new THREE.Vector3();
          if (keys['w'] || keys['arrowup']) move.add(fwd);
          if (keys['s'] || keys['arrowdown']) move.sub(fwd);
          if (keys['d'] || keys['arrowright']) move.add(rgt);
          if (keys['a'] || keys['arrowleft']) move.sub(rgt);

          if (move.lengthSq() > 0) {
            move.normalize().multiplyScalar(moveSpeed);
            camera.position.add(move);
            if (controlsRef.current) {
              controlsRef.current.target.add(move);
            }
            camera.position.x = Math.max(-85, Math.min(85, camera.position.x));
            camera.position.z = Math.max(-85, Math.min(85, camera.position.z));
            camera.position.y = Math.max(1.8, Math.min(65, camera.position.y));
          }
        }

        // Smooth camera interpolation towards target when transitioning
        if (isTransitioningRef.current && controlsRef.current) {
          camera.position.lerp(cameraTargetPos.current, 0.08);
          controlsRef.current.target.lerp(cameraTargetLookAt.current, 0.08);

          if (
            camera.position.distanceTo(cameraTargetPos.current) < 0.25 &&
            controlsRef.current.target.distanceTo(cameraTargetLookAt.current) < 0.25
          ) {
            camera.position.copy(cameraTargetPos.current);
            controlsRef.current.target.copy(cameraTargetLookAt.current);
            isTransitioningRef.current = false;
          }
        }

        // Update OrbitControls with damping and auto-rotate
        if (controlsRef.current) {
          controlsRef.current.autoRotate = isAutoRotateRef.current && viewLevelRef.current === 'city' && cameraPerspectiveRef.current === 'orbit';
          controlsRef.current.update();
        }
      }

      // Update Sub-systems
      districtMgr.update(time);
      transportMgr.update(delta, time);
      pedestrians.update(time);
      routes.update(time);
      agentParticles.update(time);
      pulseSystem.update(delta);

      // Update individual buildings & interiors
      const currentActiveId = activeRoomRef.current.id;
      buildingsMapRef.current.forEach((bObj) => {
        bObj.update(time, bObj.layout.room.id === currentActiveId);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 13. Responsive Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 540;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointermove', handlePointerMove);

      controls.dispose();

      pulseSystem.dispose();
      districtMgr.dispose();
      transportMgr.dispose();
      pedestrians.dispose();
      roads.dispose();
      skyline.dispose();
      environment.dispose();
      disposeCityMaterials(materials);

      buildingsMapRef.current.forEach(b => b.dispose());
      buildingsMapRef.current.clear();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [switchCameraToBuilding, theme]);

  const isLight = theme === 'light';

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Cinematic Intro Skip Badge */}
      {showIntroBadge && (
        <button
          onClick={skipIntro}
          className={`absolute top-20 right-4 z-20 flex items-center space-x-2 px-3.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono font-bold transition-all shadow-xl hover:scale-105 active:scale-95 ${
            isLight
              ? 'bg-white/95 border-[#0284C7]/40 text-[#0284C7] shadow-slate-300/60'
              : 'bg-[#0B1320]/90 border-[#36D7E7]/60 text-[#36D7E7] shadow-[#36D7E7]/20'
          }`}
          title="Skip cinematic fly-in"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Cinematic Descent</span>
          <span className="text-[10px] uppercase ml-1 px-1.5 py-0.5 rounded bg-white/10 underline">Skip</span>
        </button>
      )}



      {/* Showcase Tour Overlay */}
      {isShowcase && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 px-4 py-2 rounded-full bg-[#0B1320]/95 border border-[#36D7E7]/60 text-[#36D7E7] font-mono text-xs backdrop-blur-xl shadow-2xl shadow-[#36D7E7]/20">
          <span className="w-2.5 h-2.5 rounded-full bg-[#36D7E7] animate-ping" />
          <span className="font-bold tracking-wider uppercase text-white">SHOWCASE DEMONSTRATION</span>
          <span className="text-[#95A4B8] text-[11px] hidden sm:inline">(Automated 18s Tour)</span>
          {onExitShowcase && (
            <button
              onClick={onExitShowcase}
              className="ml-2 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-bold transition-all"
            >
              Exit
            </button>
          )}
        </div>
      )}

      {/* WASD Desktop Exploration Control Prompt */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:flex items-center space-x-2 text-[10px] font-mono backdrop-blur-md px-2.5 py-1.5 rounded-lg border bg-[#0B1320]/80 border-[#1B2A3D] text-[#6F8096]">
        <span className="px-1.5 py-0.5 rounded bg-[#101A2A] border border-[#1B2A3D] text-[#36D7E7] font-bold">W A S D</span>
        <span>Walk & Explore Streets</span>
      </div>

      {/* Floating Status Ticker */}
      <div className={`absolute bottom-4 right-4 z-10 hidden sm:flex items-center space-x-2 text-[11px] font-mono backdrop-blur-md px-3 py-1.5 rounded-lg border transition-colors ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-700 shadow-lg'
          : 'bg-[#0B1320]/80 border-[#1B2A3D] text-[#95A4B8]'
      }`}>
        <Radio className={`w-3 h-3 animate-pulse flex-shrink-0 ${isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'}`} />
        <span className="truncate max-w-xs">{pulseLog}</span>
      </div>

      {/* Hovered Room Tooltip */}
      {hoveredRoom && (
        <div
          className={`fixed pointer-events-none z-30 px-2.5 py-1 rounded shadow-lg text-[11px] font-mono -translate-x-1/2 -translate-y-full mb-2 ${
            isLight
              ? 'bg-white border border-[#0284C7]/60 text-[#0284C7] shadow-md'
              : 'bg-[#0B1320]/90 border border-[#36D7E7]/50 text-[#36D7E7]'
          }`}
          style={{ left: hoveredRoom.x, top: hoveredRoom.y - 10 }}
        >
          #{hoveredRoom.room.id}
        </div>
      )}
    </div>
  );
};
