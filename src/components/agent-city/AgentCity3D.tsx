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
import { CityLODManager, type CameraViewLevel } from './CityLODManager';
import { Radio, Sparkles } from 'lucide-react';

interface AgentCity3DProps {
  activeRoomClusters: RoomCluster[];
  selectedRoom: RoomCluster;
  onSelectRoom: (room: RoomCluster) => void;
  isSimulatingPulse?: boolean;
  onPulseComplete?: () => void;
  viewLevel?: CameraViewLevel;
  onViewLevelChange?: (level: CameraViewLevel) => void;
  theme?: 'dark' | 'light';
  cameraPerspective?: 'orbit' | 'drone' | 'plaza';
  onPerspectiveChange?: (persp: 'orbit' | 'drone' | 'plaza') => void;
}

const DEFAULT_FALLBACK_ROOM: RoomCluster = {
  id: 'live-room-technocore',
  name: 'technocore',
  displayName: '#technocore',
  category: 'coordination',
  activeAgentsCount: 16,
  totalProbesReceived: 8,
  averageResponseLatency: 1.8,
  status: 'active',
  color: '#36D7E7',
  coordinates: [0, 0, 0],
  lastProbeArm: 'question'
};

export const AgentCity3D: React.FC<AgentCity3DProps> = ({
  activeRoomClusters,
  selectedRoom,
  onSelectRoom,
  isSimulatingPulse = false,
  onPulseComplete,
  viewLevel: controlledViewLevel,
  onViewLevelChange,
  theme = 'dark',
  cameraPerspective = 'orbit',
  onPerspectiveChange
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
  const buildingsMapRef = useRef<Map<string, CityBuilding>>(new Map());
  const cityGroupRef = useRef<THREE.Group | null>(null);
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);
  const lodManagerRef = useRef<CityLODManager>(new CityLODManager());

  // Cinematic Intro & Perspective references
  const isIntroRef = useRef<boolean>(true);
  const introProgressRef = useRef<number>(0);
  const INTRO_START_POS = useRef<THREE.Vector3>(new THREE.Vector3(56, 46, 58));
  const INTRO_END_POS = useRef<THREE.Vector3>(new THREE.Vector3(34, 24, 36));
  const INTRO_START_LOOK = useRef<THREE.Vector3>(new THREE.Vector3(0, 10, 0));
  const INTRO_END_LOOK = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 0));

  const cameraPerspectiveRef = useRef<'orbit' | 'drone' | 'plaza'>(cameraPerspective);
  cameraPerspectiveRef.current = cameraPerspective;

  const onPerspectiveChangeRef = useRef(onPerspectiveChange);
  onPerspectiveChangeRef.current = onPerspectiveChange;

  // Animation & Camera targets
  const controlsRef = useRef<OrbitControls | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(34, 24, 36));
  const cameraTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 0));

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

    cameraTargetPos.current.set(34, 24, 36);
    cameraTargetLookAt.current.set(0, 5, 0);
    setPulseLog('Camera returned to Agent City metropolitan overview.');
  }, []);

  const switchCameraToBuilding = useCallback((building: BuildingLayout) => {
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

    const offsetDist = 13;
    const angle = Math.atan2(bZ, bX) + 0.35;
    cameraTargetPos.current.set(
      bX + Math.cos(angle) * offsetDist,
      Math.max(6, bY + 4),
      bZ + Math.sin(angle) * offsetDist
    );
    cameraTargetLookAt.current.set(bX, bY, bZ);
    setPulseLog(`Focusing optical sensor on #${building.room.name}. Office cutaway active.`);
  }, []);

  const switchCameraToInterior = useCallback((building: BuildingLayout) => {
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
    // Focus close on Floor 1/2 office workstations
    const bY = 2.4;

    const angle = Math.atan2(bZ, bX) + 0.2;
    cameraTargetPos.current.set(
      bX + Math.cos(angle) * 7.5,
      bY + 2.2,
      bZ + Math.sin(angle) * 7.5
    );
    cameraTargetLookAt.current.set(bX, bY + 1.2, bZ);
    setPulseLog(`Entering #${building.room.name} office interior. Autonomous agent workers online.`);
  }, []);

  // Sync view scale with controlled prop from parent
  useEffect(() => {
    if (!controlledViewLevel) return;
    if (controlledViewLevel === 'city') {
      switchCameraToCity();
    } else if (controlledViewLevel === 'building') {
      const bObj = buildingsMapRef.current.get(activeRoom.id);
      if (bObj) switchCameraToBuilding(bObj.layout);
    } else if (controlledViewLevel === 'interior') {
      const bObj = buildingsMapRef.current.get(activeRoom.id);
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
        cameraTargetPos.current.set(34, 24, 36);
        cameraTargetLookAt.current.set(0, 5, 0);
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

      setPulseLog(`Live probe v1 wave dispatched to #${activeRoom.name}. Observing 120s activity window.`);
      
      const timer = setTimeout(() => {
        setPulseLog(`Subsequent agent activity recorded in #${activeRoom.name}.`);
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

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(isLight ? 0xE8EEF5 : 0x050A12, 0.012);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.copy(INTRO_START_POS.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(isLight ? 0xE8EEF5 : 0x050A12, 1);
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

      // Collect meshes for raycasting
      bObj.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData.room) {
          interactiveMeshesRef.current.push(child as THREE.Mesh);
        }
      });
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

    // 10. Ambient & Key Lighting
    const ambientLight = new THREE.AmbientLight(
      isLight ? 0xFFFFFF : 0x0E1724,
      isLight ? 1.9 : 1.5
    );
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(
      isLight ? 0x0284C7 : 0x36D7E7,
      isLight ? 4.5 : 3.8,
      55,
      1.2
    );
    coreLight.position.set(0, 18, 0);
    scene.add(coreLight);

    const dirLight = new THREE.DirectionalLight(
      isLight ? 0x38BDF8 : 0x4DA3FF,
      isLight ? 1.8 : 1.3
    );
    dirLight.position.set(25, 45, 20);
    scene.add(dirLight);

    // 11. OrbitControls & User Interaction (Smooth Damping, Pan, Orbit, Wheel Zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.target.copy(INTRO_START_LOOK.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep camera above ground
    controls.minDistance = 4;
    controls.maxDistance = 115;
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

    const handlePointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      if (isIntroRef.current) {
        isIntroRef.current = false;
        setShowIntroBadge(false);
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownTime;

      // Pure click if user moved mouse < 6px and held for < 350ms
      if (dist < 6 && elapsed < 350) {
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
            const bObj = buildingsMapRef.current.get(room.id);
            if (bObj) {
              switchCameraToBuilding(bObj.layout);
            }
          }
        }
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
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

      // Intro descent interpolation
      if (isIntroRef.current) {
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

      {/* City Legend & Protocol Disclaimer (Safely placed at top-20 left-4 below header) */}
      <div className={`absolute top-20 left-4 z-10 hidden md:flex flex-col space-y-1.5 p-3 rounded-xl backdrop-blur-md border text-[10px] font-mono max-w-xs shadow-xl pointer-events-none transition-colors ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-600 shadow-slate-300/40'
          : 'bg-[#0B1320]/85 border-[#1B2A3D] text-[#95A4B8]'
      }`}>
        <div className={`flex items-center space-x-2 font-semibold uppercase tracking-wider ${
          isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'
        }`}>
          <Sparkles className="w-3 h-3" />
          <span>Agent City Legend</span>
        </div>
        <div className="flex flex-col space-y-1 pt-1 text-[10px]">
          <div>🏢 <strong className={isLight ? 'text-slate-900' : 'text-white'}>Building</strong> = Room</div>
          <div>💻 <strong className={isLight ? 'text-slate-900' : 'text-white'}>Interior</strong> = Agent Desks & Laptops</div>
          <div>📡 <strong className={isLight ? 'text-slate-900' : 'text-white'}>Beacon</strong> = Probe state</div>
          <div>⚡ <strong className={isLight ? 'text-slate-900' : 'text-white'}>Pulse</strong> = 120s observation event</div>
          <div>🌐 <strong className={isLight ? 'text-slate-900' : 'text-white'}>Routes</strong> = Network topology</div>
        </div>
        <div className={`text-[9px] pt-1.5 border-t leading-tight ${
          isLight ? 'border-slate-200 text-slate-500' : 'border-[#1B2A3D] text-[#6F8096]'
        }`}>
          City geometry is a visualization of observed public activity, not a literal physical network.
        </div>
      </div>

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
