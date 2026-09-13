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
  color: '#00B4D8',
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
  isTourActive = false,
  onTourStepChange,
  onExitTour,
  onSimulationEvent,
  onCitizensUpdate,
  followedAgentId,
  observedIdentities = [],
  latestSignedRecord
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [_internalViewLevel, setInternalViewLevel] = useState<CameraViewLevel>('city');
  void _internalViewLevel;

  const setViewLevel = useCallback((level: CameraViewLevel) => {
    setInternalViewLevel(level);
    if (onViewLevelChange) onViewLevelChange(level);
  }, [onViewLevelChange]);

  const [hoveredRoom, setHoveredRoom] = useState<{ room: RoomCluster; x: number; y: number } | null>(null);

  const safeClusters = activeRoomClusters.length > 0 ? activeRoomClusters : [DEFAULT_FALLBACK_ROOM];
  const activeRoom = selectedRoom || safeClusters[0] || DEFAULT_FALLBACK_ROOM;
  const activeRoomRef = useRef<RoomCluster>(activeRoom);
  activeRoomRef.current = activeRoom;

  // Pulse effect simulation
  useEffect(() => {
    if (isSimulatingPulse) {
      const bObj = buildingsMapRef.current.get(activeRoom.id);
      if (bObj && bObj.beaconMesh) {
        bObj.beaconMesh.scale.set(2.0, 2.0, 2.0);
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

  const onSimulationEventRef = useRef(onSimulationEvent);
  onSimulationEventRef.current = onSimulationEvent;

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
  // VIEW SCALE SYNC (overview / building / interior)
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
      cameraDirectorRef.current.enterBuildingInterior(currentTargetBuilding.layout.id);
      buildingsMapRef.current.forEach(b => b.setCutaway(b.layout.id === currentTargetBuilding.layout.id));
    }
  }, [controlledViewLevel, activeRoom.id]);

  // -------------------------------------------------------------
  // OBSERVED IDENTITIES SYNC
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
    // Update interiors with room-specific identities
    buildingsMapRef.current.forEach((b) => {
      const roomIdentities = observedIdentities.filter(id => id.roomsSeen.includes(b.layout.room.name));
      b.interior.updateRoomIdentities(roomIdentities);
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
  // DATA RECONCILIATION
  // -------------------------------------------------------------
  useEffect(() => {
    safeClusters.forEach((cluster) => {
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
    scene.background = new THREE.Color(0x0A1128);
    scene.fog = new THREE.FogExp2(0x0A1128, 0.009);

    // 2. Camera Setup (Isometric Angle)
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 380);
    camera.position.set(55, 42, 55);
    cameraRef.current = camera;

    // 3. WebGL Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x0A1128, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.target.set(0, 4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 160;

    // 5. Materials
    const materials: CityMaterials = createCityMaterials(theme);

    // 6. Continuous Dark Diamond Grid Ground & Digital Flora
    const environment = new CityEnvironment('dark');
    scene.add(environment.group);

    // 7. Procedural 13-Lot Rectilinear Diamond Layout
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

    // 8. Observed Citizens Engine (renders actual observed identities from real messages)
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
    const ambientLight = new THREE.AmbientLight(0x1B2C46, 2.6);
    scene.add(ambientLight);

    const keyMoonLight = new THREE.DirectionalLight(0x00B4D8, 2.4);
    keyMoonLight.position.set(65, 80, 65);
    keyMoonLight.castShadow = true;
    scene.add(keyMoonLight);

    const fillWarmLight = new THREE.DirectionalLight(0xF72585, 1.4);
    fillWarmLight.position.set(-65, 45, -65);
    scene.add(fillWarmLight);

    // 11. Raycast Selection Interaction
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

      if (dist < 8 && elapsed < 400) {
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

      // Controls update
      controls.update();

      // Camera Director smooth damping
      director.update(delta);

      // Real Observed Citizens
      observedCitizens.update(delta, now);

      // Building animations (interiors, beacons)
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
    <div className="w-full h-full relative select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Screen-Space Building Hover Tooltip */}
      {hoveredRoom && (
        <div
          className="fixed z-40 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#0A1322]/95 border border-[#1E3048] text-[11px] font-mono shadow-xl backdrop-blur-md text-white"
          style={{
            left: `${hoveredRoom.x + 12}px`,
            top: `${hoveredRoom.y + 12}px`
          }}
        >
          <div className="flex items-center space-x-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hoveredRoom.room.color }}
            />
            <span className="font-bold">#{hoveredRoom.room.name}</span>
          </div>
          <span className="text-[10px] text-[#6F8096]">Click to focus exterior / enter</span>
        </div>
      )}
    </div>
  );
};
