import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import { generateCityLayout, type BuildingLayout } from './cityLayout';
import { createCityMaterials, disposeCityMaterials } from './cityMaterials';
import { CityBuilding } from './CityBuilding';
import { CityDistrictManager } from './CityDistrict';
import { CityRoutes } from './CityRoutes';
import { AgentParticles } from './AgentParticles';
import { ProbePulseSystem } from './ProbePulseSystem';
import { Radio, RefreshCw, ZoomIn, Sparkles } from 'lucide-react';

interface AgentCity3DProps {
  activeRoomClusters: RoomCluster[];
  selectedRoom: RoomCluster;
  onSelectRoom: (room: RoomCluster) => void;
  isSimulatingPulse?: boolean;
  onPulseComplete?: () => void;
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
  onPulseComplete
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isFocusedOnBuilding, setIsFocusedOnBuilding] = useState<boolean>(false);
  const [hoveredRoom, setHoveredRoom] = useState<{ room: RoomCluster; x: number; y: number } | null>(null);
  const [pulseLog, setPulseLog] = useState<string>('City online. Autonomous agent districts synchronized.');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pulseSystemRef = useRef<ProbePulseSystem | null>(null);
  const buildingsMapRef = useRef<Map<string, CityBuilding>>(new Map());

  // Camera animation target references
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(34, 28, 38));
  const cameraTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));
  const cameraCurrentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));

  const safeClusters = activeRoomClusters.length > 0 ? activeRoomClusters : [DEFAULT_FALLBACK_ROOM];
  const activeRoom = selectedRoom || safeClusters[0] || DEFAULT_FALLBACK_ROOM;

  // Trigger live shockwave effect when isSimulatingPulse changes
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

  // Focus camera toward selected building
  const focusOnBuilding = useCallback((building: BuildingLayout) => {
    setIsFocusedOnBuilding(true);
    setIsAutoRotate(false);

    const bX = building.position[0];
    const bZ = building.position[2];
    const bY = building.height * 0.6;

    // Position camera offset from building
    const offsetDist = 14;
    const angle = Math.atan2(bZ, bX) + 0.35;
    cameraTargetPos.current.set(
      bX + Math.cos(angle) * offsetDist,
      Math.max(8, bY + 5),
      bZ + Math.sin(angle) * offsetDist
    );
    cameraTargetLookAt.current.set(bX, bY, bZ);
    setPulseLog(`Focusing optical sensor on #${building.room.name} (${building.room.activeAgentsCount} observed agents).`);
  }, []);

  // Return camera to full city overview
  const returnToOverview = useCallback(() => {
    setIsFocusedOnBuilding(false);
    setIsAutoRotate(true);
    cameraTargetPos.current.set(34, 28, 38);
    cameraTargetLookAt.current.set(0, 6, 0);
    setPulseLog('Sensor returned to Agent City metropolitan overview.');
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Atmosphere Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050A12, 0.012);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.copy(cameraTargetPos.current);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. City Materials & Shared Systems
    const materials = createCityMaterials();
    const pulseSystem = new ProbePulseSystem();
    pulseSystemRef.current = pulseSystem;
    scene.add(pulseSystem.group);

    // 5. Technocore Core & District Ground
    const districtMgr = new CityDistrictManager(materials);
    scene.add(districtMgr.group);

    // 6. Procedural Buildings
    const { buildings } = generateCityLayout(safeClusters);
    buildingsMapRef.current.clear();
    const interactiveMeshes: THREE.Mesh[] = [];

    const cityGroup = new THREE.Group();
    cityGroup.name = 'city-buildings-group';

    buildings.forEach((bLayout) => {
      const bObj = new CityBuilding(bLayout, materials);
      buildingsMapRef.current.set(bLayout.room.id, bObj);
      cityGroup.add(bObj.group);

      // Collect meshes for raycasting
      bObj.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData.room) {
          interactiveMeshes.push(child as THREE.Mesh);
        }
      });
    });
    scene.add(cityGroup);

    // 7. Elevated Network Routes & Data Packets
    const routes = new CityRoutes(buildings, materials);
    scene.add(routes.group);

    // 8. Autonomous Agent Particles
    const agentParticles = new AgentParticles(buildings);
    scene.add(agentParticles.group);

    // 9. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0E1724, 1.4);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x36D7E7, 3.5, 45, 1.2);
    coreLight.position.set(0, 18, 0);
    scene.add(coreLight);

    const dirLight = new THREE.DirectionalLight(0x4DA3FF, 1.2);
    dirLight.position.set(25, 40, 20);
    scene.add(dirLight);

    // 10. Mouse Interaction & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging && !isFocusedOnBuilding) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        const rotSpeed = 0.005;
        const radius = Math.hypot(camera.position.x, camera.position.z);
        let angle = Math.atan2(camera.position.z, camera.position.x) - deltaX * rotSpeed;

        camera.position.x = Math.cos(angle) * radius;
        camera.position.z = Math.sin(angle) * radius;
        camera.position.y = Math.max(6, Math.min(55, camera.position.y - deltaY * 0.1));
      } else if (!isDragging) {
        // Hover raycast check
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshes, false);
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
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1 + Math.sign(e.deltaY) * 0.08;
      const targetLook = cameraTargetLookAt.current;
      const dir = cameraTargetPos.current.clone().sub(targetLook);
      const newLen = THREE.MathUtils.clamp(dir.length() * zoomFactor, 14, 90);
      dir.setLength(newLen);
      cameraTargetPos.current.copy(targetLook.clone().add(dir));
    };

    const handlePointerUp = () => {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const room: RoomCluster = hit.userData.room;
        if (room) {
          onSelectRoom(room);
          const bObj = buildingsMapRef.current.get(room.id);
          if (bObj) {
            focusOnBuilding(bObj.layout);
          }
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('click', handleClick);

    // 11. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth camera interpolation towards target
      camera.position.lerp(cameraTargetPos.current, 0.045);
      cameraCurrentLookAt.current.lerp(cameraTargetLookAt.current, 0.045);
      camera.lookAt(cameraCurrentLookAt.current);

      // Auto-rotation in overview mode
      if (isAutoRotate && !isFocusedOnBuilding && !isDragging) {
        const rotSpeed = 0.12 * delta;
        const radius = Math.hypot(camera.position.x, camera.position.z);
        const angle = Math.atan2(camera.position.z, camera.position.x) + rotSpeed;
        cameraTargetPos.current.x = Math.cos(angle) * radius;
        cameraTargetPos.current.z = Math.sin(angle) * radius;
      }

      // Update sub-systems
      districtMgr.update(time);
      routes.update(time);
      agentParticles.update(time);
      pulseSystem.update(delta);

      // Update individual buildings
      buildingsMapRef.current.forEach((bObj) => {
        bObj.update(time, bObj.layout.room.id === activeRoom.id);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 12. Resize Observer
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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('click', handleClick);

      pulseSystem.dispose();
      disposeCityMaterials(materials);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [safeClusters, onSelectRoom, focusOnBuilding, isAutoRotate, isFocusedOnBuilding, activeRoom.id]);

  return (
    <div className="relative w-full h-[540px] overflow-hidden bg-radial-vignette select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Hover Tooltip */}
      {hoveredRoom && (
        <div
          className="fixed pointer-events-none z-50 p-2.5 rounded-xl bg-[#0B1320]/95 backdrop-blur-md border border-[#36D7E7]/50 shadow-2xl shadow-black/80 text-xs font-mono transition-transform"
          style={{
            left: Math.min(window.innerWidth - 240, hoveredRoom.x + 14),
            top: Math.max(10, hoveredRoom.y - 70)
          }}
        >
          <div className="flex items-center space-x-1.5 text-white font-bold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredRoom.room.color }} />
            <span className="truncate max-w-[180px]">{hoveredRoom.room.displayName || hoveredRoom.room.name}</span>
          </div>
          <div className="text-[11px] text-[#36D7E7] mt-1 flex items-center justify-between space-x-2">
            <span>Observed Agents:</span>
            <strong className="text-white font-bold">{hoveredRoom.room.activeAgentsCount}</strong>
          </div>
          <div className="text-[9px] text-[#95A4B8] mt-1 pt-1 border-t border-[#1B2A3D] leading-tight">
            Visual density represents observed agent activity.
          </div>
        </div>
      )}

      {/* Floating City Overlay Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {isFocusedOnBuilding && (
          <button
            onClick={returnToOverview}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#36D7E7] text-[#050A12] font-mono text-xs font-bold hover:bg-[#36D7E7]/90 transition-all shadow-lg shadow-[#36D7E7]/20"
            title="Reset Camera to City Overview"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Return to City</span>
          </button>
        )}

        <button
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            isAutoRotate
              ? 'bg-[#36D7E7]/15 text-[#36D7E7] border-[#36D7E7]/40'
              : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white'
          }`}
          title="Toggle Autonomous Orbital Camera"
        >
          <RefreshCw className={`w-3 h-3 ${isAutoRotate ? 'animate-spin' : ''}`} />
          <span>{isAutoRotate ? 'Orbit On' : 'Orbit Paused'}</span>
        </button>
      </div>

      {/* City Legend & Disclaimer */}
      <div className="absolute top-4 left-4 z-20 hidden md:flex flex-col space-y-1.5 p-3 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] text-[10px] font-mono text-[#95A4B8] max-w-xs">
        <div className="flex items-center space-x-2 text-[#36D7E7] font-semibold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          <span>Agent City Legend</span>
        </div>
        <div className="flex flex-col space-y-1 pt-1 text-[10px]">
          <div>🏢 <strong className="text-white">Building</strong> = Room</div>
          <div>💡 <strong className="text-white">Windows</strong> = Observed agent activity</div>
          <div>📡 <strong className="text-white">Beacon</strong> = Probe state</div>
          <div>⚡ <strong className="text-white">Pulse</strong> = 120s observation event</div>
          <div>🌐 <strong className="text-white">Routes</strong> = Network topology</div>
        </div>
        <div className="text-[9px] text-[#6F8096] pt-1.5 border-t border-[#1B2A3D] leading-tight">
          City geometry is a visualization of observed public activity, not a literal physical network.
        </div>
      </div>

      {/* Floating Status Ticker */}
      <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center space-x-2 text-[11px] font-mono text-[#95A4B8] bg-[#0B1320]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B2A3D]">
        <Radio className="w-3 h-3 text-[#36D7E7] animate-pulse flex-shrink-0" />
        <span className="truncate max-w-xs">{pulseLog}</span>
      </div>
    </div>
  );
};
