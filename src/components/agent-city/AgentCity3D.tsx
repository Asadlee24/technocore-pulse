import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RoomCluster, SignedRecord } from '../../types/probe';
import { generateCityLayout, type BuildingLayout } from './cityLayout';
import { createCityMaterials, type CityMaterials } from './cityMaterials';
import { CityBuilding } from './CityBuilding';
import { CityEnvironment } from './CityEnvironment';
import { ObservedCitizens } from './ObservedCitizens';
import { CameraDirector } from './CameraDirector';
import type { CameraViewLevel } from './CityLODManager';
import type { ObservedIdentity } from '../../context/DataContext';

interface AgentCity3DProps {
  activeRoomClusters: RoomCluster[];
  selectedRoom: RoomCluster;
  onSelectRoom: (room: RoomCluster) => void;
  onOpenBuildingSheet?: (room: RoomCluster) => void;
  isSimulatingPulse?: boolean;
  onPulseComplete?: () => void;
  viewLevel?: CameraViewLevel;
  onViewLevelChange?: (level: CameraViewLevel) => void;
  focusedFloor?: 1 | 2 | 3 | 'all';
  onFloorChange?: (floor: 1 | 2 | 3 | 'all') => void;
  theme?: 'dark' | 'light';
  isTourActive?: boolean;
  onTourStepChange?: (caption: string, shotName: string, progress: number) => void;
  onExitTour?: () => void;
  onSimulationEvent?: (eventText: string) => void;
  onCitizensUpdate?: (renderedCount: number, totalCount: number) => void;
  followedAgentId?: string | null;
  observedIdentities?: ObservedIdentity[];
  latestSignedRecord?: SignedRecord;
}

const DEFAULT_FALLBACK_ROOM: RoomCluster = {
  id: 'lot-technocore-tower',
  name: 'Main Tower',
  displayName: '#main-tower',
  category: 'unclassified',
  visualDistrict: 'coordination',
  signedIdentitiesObserved: null,
  activeAgentsCount: null,
  totalProbesReceived: 0,
  medianSubsequentLatencySeconds: null,
  averageResponseLatency: null,
  status: 'active',
  color: '#E11D48',
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
  focusedFloor = 'all',
  theme = 'dark',
  isTourActive = false,
  onTourStepChange,
  onExitTour,
  onSimulationEvent: _onSimulationEvent,
  onCitizensUpdate,
  followedAgentId,
  observedIdentities = [],
  latestSignedRecord
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredRoom, setHoveredRoom] = useState<{ room: RoomCluster; x: number; y: number } | null>(null);

  const safeClusters = activeRoomClusters.length > 0 ? activeRoomClusters : [DEFAULT_FALLBACK_ROOM];
  const activeRoom = selectedRoom || safeClusters[0] || DEFAULT_FALLBACK_ROOM;

  const [internalViewLevel, setInternalViewLevel] = useState<CameraViewLevel>('city');
  const viewLevel = controlledViewLevel || internalViewLevel;
  const setViewLevel = useCallback((level: CameraViewLevel) => {
    setInternalViewLevel(level);
    if (onViewLevelChange) onViewLevelChange(level);
  }, [onViewLevelChange]);

  const activeRoomRef = useRef(activeRoom);
  activeRoomRef.current = activeRoom;

  // Pulse effect handling
  useEffect(() => {
    if (isSimulatingPulse) {
      const bObj = buildingsMapRef.current.get(activeRoom.id);
      if (bObj && bObj.beaconMesh) {
        bObj.beaconMesh.scale.set(2.2, 2.2, 2.2);
      }
      const timer = setTimeout(() => {
        if (onPulseComplete) onPulseComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isSimulatingPulse, activeRoom.id, onPulseComplete]);

  // Persistent Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraDirectorRef = useRef<CameraDirector | null>(null);
  const observedCitizensRef = useRef<ObservedCitizens | null>(null);
  const buildingsMapRef = useRef<Map<string, CityBuilding>>(new Map());
  const interactiveMeshesRef = useRef<THREE.Mesh[]>([]);

  const onSelectRoomRef = useRef(onSelectRoom);
  onSelectRoomRef.current = onSelectRoom;

  const onOpenBuildingSheetRef = useRef(onOpenBuildingSheet);
  onOpenBuildingSheetRef.current = onOpenBuildingSheet;

  const onTourStepChangeRef = useRef(onTourStepChange);
  onTourStepChangeRef.current = onTourStepChange;

  const onExitTourRef = useRef(onExitTour);
  onExitTourRef.current = onExitTour;

  const onCitizensUpdateRef = useRef(onCitizensUpdate);
  onCitizensUpdateRef.current = onCitizensUpdate;

  // -------------------------------------------------------------
  // TOUR TRIGGER
  // -------------------------------------------------------------
  useEffect(() => {
    if (cameraDirectorRef.current) {
      if (isTourActive) {
        cameraDirectorRef.current.startTour();
      } else if (cameraDirectorRef.current.mode === 'tour') {
        cameraDirectorRef.current.exitTour();
      }
    }
  }, [isTourActive]);

  // -------------------------------------------------------------
  // FOLLOW AGENT TRIGGER
  // -------------------------------------------------------------
  useEffect(() => {
    if (followedAgentId && observedCitizensRef.current && cameraDirectorRef.current) {
      const mesh = observedCitizensRef.current.getCitizenMesh(followedAgentId);
      if (mesh) {
        cameraDirectorRef.current.followAgent(mesh);
      }
    }
  }, [followedAgentId]);

  // -------------------------------------------------------------
  // VIEW SCALE SYNC (overview / building / interior) & FLOOR FOCUS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!cameraDirectorRef.current) return;
    const currentTargetBuilding = buildingsMapRef.current.get(activeRoom.id) || Array.from(buildingsMapRef.current.values())[0];

    if (controlledViewLevel === 'city') {
      cameraDirectorRef.current.setMode('overview');
      buildingsMapRef.current.forEach(b => b.setCutaway(false));
    } else if (controlledViewLevel === 'building' && currentTargetBuilding) {
      cameraDirectorRef.current.focusBuilding(currentTargetBuilding.layout.id);
      buildingsMapRef.current.forEach(b => b.setCutaway(b.layout.id === currentTargetBuilding.layout.id));
    } else if (controlledViewLevel === 'interior' && currentTargetBuilding) {
      cameraDirectorRef.current.enterBuildingInterior(currentTargetBuilding.layout.id, focusedFloor);
      buildingsMapRef.current.forEach(b => b.setCutaway(b.layout.id === currentTargetBuilding.layout.id));
    }
  }, [controlledViewLevel, activeRoom.id, focusedFloor]);

  // -------------------------------------------------------------
  // OBSERVED IDENTITIES SYNC (Updates Citizens & Multi-Floor Desks)
  // -------------------------------------------------------------
  useEffect(() => {
    if (observedCitizensRef.current) {
      observedCitizensRef.current.updateIdentities(observedIdentities, safeClusters);
      if (onCitizensUpdateRef.current) {
        onCitizensUpdateRef.current(
          observedCitizensRef.current.renderedCount,
          observedCitizensRef.current.totalObservedCount
        );
      }
    }

    // Distribute observed identities into the active building interior desks
    buildingsMapRef.current.forEach(b => {
      b.interior.bindRealObservedIdentities(observedIdentities);
    });
  }, [observedIdentities, safeClusters]);

  // -------------------------------------------------------------
  // REAL OBSERVED MESSAGE PULSE
  // -------------------------------------------------------------
  useEffect(() => {
    if (latestSignedRecord && observedCitizensRef.current) {
      observedCitizensRef.current.triggerEventForIdentity(latestSignedRecord.did, {
        text: latestSignedRecord.message,
        room: latestSignedRecord.room,
        sequence: latestSignedRecord.sequence
      });

      const bObj = buildingsMapRef.current.get(latestSignedRecord.room) || 
        Array.from(buildingsMapRef.current.values()).find(b => b.layout.room.name === latestSignedRecord.room);
      if (bObj) {
        if (bObj.beaconMesh) {
          bObj.beaconMesh.scale.set(1.8, 1.8, 1.8);
          setTimeout(() => bObj.beaconMesh?.scale.set(1, 1, 1), 800);
        }
        bObj.interior.triggerMessageActivity(latestSignedRecord.did);
      }
    }
  }, [latestSignedRecord]);

  // -------------------------------------------------------------
  // ROOM DATA SYNC
  // -------------------------------------------------------------
  useEffect(() => {
    safeClusters.forEach(cluster => {
      const existing = buildingsMapRef.current.get(cluster.id);
      if (existing) {
        existing.updateRoomData(cluster);
      }
    });
  }, [safeClusters]);

  // -------------------------------------------------------------
  // PRIMARY SCENE INITIALIZATION (Runs ONCE on mount)
  // -------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060B18);
    scene.fog = new THREE.FogExp2(0x060B18, 0.0075);

    // 2. Camera Setup (Isometric 45° azimuth angle)
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 420);
    camera.position.set(56, 44, 56);
    cameraRef.current = camera;

    // 3. WebGL Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setClearColor(0x060B18, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls: High-responsiveness, smooth damping, desktop & mobile touch support
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.target.set(0, 4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minPolarAngle = 0.15;
    controls.minDistance = 6;
    controls.maxDistance = 150;
    controls.zoomSpeed = 1.2;
    controls.rotateSpeed = 0.9;
    controls.panSpeed = 1.0;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // 5. Materials
    const materials: CityMaterials = createCityMaterials(theme);

    // 6. Environment: Diamond Grid Ground & Digital Flora
    const environment = new CityEnvironment('dark');
    scene.add(environment.group);

    // 7. Procedural 22-Lot Rectilinear Diamond Layout
    const { buildings, roadWaypoints } = generateCityLayout(safeClusters);

    buildingsMapRef.current.clear();
    interactiveMeshesRef.current = [];

    const cityGroup = new THREE.Group();
    cityGroup.name = 'city-buildings-group';

    buildings.forEach((bLayout) => {
      const bObj = new CityBuilding(bLayout, materials);
      buildingsMapRef.current.set(bLayout.id, bObj);
      buildingsMapRef.current.set(bLayout.room.id, bObj);
      cityGroup.add(bObj.group);
      interactiveMeshesRef.current.push(bObj.hitMesh);
    });
    scene.add(cityGroup);

    // 8. Observed Citizens Engine (renders real observed identities)
    const observedCitizens = new ObservedCitizens(roadWaypoints, buildings);
    observedCitizensRef.current = observedCitizens;
    scene.add(observedCitizens.group);

    // Initial population update
    observedCitizens.updateIdentities(observedIdentities, safeClusters);
    if (onCitizensUpdateRef.current) {
      onCitizensUpdateRef.current(observedCitizens.renderedCount, observedCitizens.totalObservedCount);
    }

    // 9. Unified Camera Director
    const director = new CameraDirector(camera, controls, buildings);
    cameraDirectorRef.current = director;

    director.onRequestCutaway = (buildingId) => {
      buildingsMapRef.current.forEach((b) => {
        b.setCutaway(buildingId !== null && (b.layout.id === buildingId || b.layout.room.id === buildingId));
      });
    };

    director.onTourStepChange = (caption, shotName, progress) => {
      if (onTourStepChangeRef.current) {
        onTourStepChangeRef.current(caption, shotName, progress);
      }
    };

    director.onTourEnd = () => {
      if (onExitTourRef.current) {
        onExitTourRef.current();
      }
    };

    // 10. Ambient and Directional Key Lighting
    const ambientLight = new THREE.AmbientLight(0x1B2C46, 2.8);
    scene.add(ambientLight);

    const keyMoonLight = new THREE.DirectionalLight(0x38BDF8, 2.6);
    keyMoonLight.position.set(70, 85, 70);
    keyMoonLight.castShadow = true;
    scene.add(keyMoonLight);

    const fillWarmLight = new THREE.DirectionalLight(0xF43F5E, 1.5);
    fillWarmLight.position.set(-70, 50, -70);
    scene.add(fillWarmLight);

    // 11. Raycast Selection Interaction (Distinguishes clicks from orbit drags)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      director.handleUserInteraction();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = performance.now() - pointerDownTime;

      // Click threshold: only trigger selection if pointer moved less than 6 pixels
      if (dist < 6 && elapsed < 400) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const bLayout: BuildingLayout = hit.userData.buildingLayout;
          const room: RoomCluster = hit.userData.room;

          if (bLayout && room) {
            onSelectRoomRef.current(room);
            if (onOpenBuildingSheetRef.current) {
              onOpenBuildingSheetRef.current(room);
            }

            const currentActiveId = activeRoomRef.current?.id;
            const bObj = buildingsMapRef.current.get(bLayout.id);

            if (bObj) {
              if (currentActiveId === room.id && director.mode === 'building') {
                director.enterBuildingInterior(bLayout.id);
                setViewLevel('interior');
              } else {
                director.focusBuilding(bLayout.id);
                setViewLevel('building');
              }
            }
          }
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshesRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const room: RoomCluster = hit.userData.room;
        if (room) {
          setHoveredRoom({
            room,
            x: e.clientX,
            y: e.clientY
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredRoom(null);
      renderer.domElement.style.cursor = 'default';
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointermove', handlePointerMove);

    // 12. Main Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const time = now * 0.001;

      // Controls damping update
      controls.update();

      // Camera Director smooth damping
      director.update(delta);

      // Real Observed Citizens animation
      observedCitizens.update(delta, now);

      // Building animations (multi-floor interiors, beacons, server LEDs)
      buildingsMapRef.current.forEach((b) => {
        b.update(time);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 13. Resize Handler
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

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointermove', handlePointerMove);

      director.exitTour();
      observedCitizens.dispose();
      environment.dispose();
      buildingsMapRef.current.forEach(b => b.dispose());
      buildingsMapRef.current.clear();
      renderer.dispose();
    };
  }, [theme, setViewLevel]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden touch-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hovered Room Tooltip */}
      {hoveredRoom && viewLevel === 'city' && !isTourActive && (
        <div
          className="fixed pointer-events-none z-50 px-2.5 py-1.5 rounded-xl bg-[#0A1128]/95 border border-[#00B4D8]/50 shadow-2xl backdrop-blur-md text-xs font-mono text-white animate-in fade-in"
          style={{
            left: `${hoveredRoom.x + 14}px`,
            top: `${hoveredRoom.y + 14}px`
          }}
        >
          <div className="font-bold text-[#00B4D8] text-[11px]">{hoveredRoom.room.displayName}</div>
          <div className="text-[10px] text-[#6F8096]">Click to inspect building</div>
        </div>
      )}
    </div>
  );
};
