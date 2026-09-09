import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import { generateCityLayout, type BuildingLayout } from './cityLayout';
import { createCityMaterials, disposeCityMaterials, type CityMaterials } from './cityMaterials';
import { CityBuilding } from './CityBuilding';
import { CityDistrictManager } from './CityDistrict';
import { CityRoutes } from './CityRoutes';
import { AgentParticles } from './AgentParticles';
import { ProbePulseSystem } from './ProbePulseSystem';
import { CityTransportManager } from './CityTransport';
import { CityLODManager, type CameraViewLevel } from './CityLODManager';
import { Radio, RefreshCw, Sparkles, Building2, Monitor, ArrowLeft, Users } from 'lucide-react';

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
  
  // Visual scale state: 'city' | 'building' | 'interior'
  const [viewLevel, setViewLevel] = useState<CameraViewLevel>('city');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [hoveredRoom, setHoveredRoom] = useState<{ room: RoomCluster; x: number; y: number } | null>(null);
  const [pulseLog, setPulseLog] = useState<string>('Technocore Metropolis online. Autonomous agent districts active.');

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

  // Animation & Camera targets
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(34, 28, 38));
  const cameraTargetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));
  const cameraCurrentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 0));

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

  // -------------------------------------------------------------
  // CAMERA VIEW SCALE CONTROLLERS
  // -------------------------------------------------------------

  const switchCameraToCity = useCallback(() => {
    setViewLevel('city');
    setIsAutoRotate(true);
    lodManagerRef.current.setViewLevel('city', null);

    // Close all cutaways
    buildingsMapRef.current.forEach(b => b.setCutaway(false));

    cameraTargetPos.current.set(34, 28, 38);
    cameraTargetLookAt.current.set(0, 6, 0);
    setPulseLog('Camera returned to Agent City metropolitan overview.');
  }, []);

  const switchCameraToBuilding = useCallback((building: BuildingLayout) => {
    setViewLevel('building');
    setIsAutoRotate(false);
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

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050A12, 0.012);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.copy(cameraTargetPos.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Shared Materials & Pulse System
    const materials = createCityMaterials();
    materialsRef.current = materials;

    const pulseSystem = new ProbePulseSystem();
    pulseSystemRef.current = pulseSystem;
    scene.add(pulseSystem.group);

    // 5. Central Technocore Core Landmark & Public Plaza
    const districtMgr = new CityDistrictManager(materials);
    districtMgrRef.current = districtMgr;
    scene.add(districtMgr.group);

    // 6. Elevated Autonomous Sky Transport & Rails
    const transportMgr = new CityTransportManager();
    transportMgrRef.current = transportMgr;
    scene.add(transportMgr.group);

    // 7. Procedural Buildings & Cutaway Interiors
    const { buildings } = generateCityLayout(safeClusters);
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
    const ambientLight = new THREE.AmbientLight(0x0E1724, 1.5);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x36D7E7, 3.8, 55, 1.2);
    coreLight.position.set(0, 18, 0);
    scene.add(coreLight);

    const dirLight = new THREE.DirectionalLight(0x4DA3FF, 1.3);
    dirLight.position.set(25, 45, 20);
    scene.add(dirLight);

    // 11. Mouse / Pointer Controls
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

      if (isDragging && viewLevelRef.current === 'city') {
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
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1 + Math.sign(e.deltaY) * 0.08;
      const targetLook = cameraTargetLookAt.current;
      const dir = cameraTargetPos.current.clone().sub(targetLook);
      const minZoom = viewLevelRef.current === 'interior' ? 6 : 14;
      const maxZoom = 95;
      const newLen = THREE.MathUtils.clamp(dir.length() * zoomFactor, minZoom, maxZoom);
      dir.setLength(newLen);
      cameraTargetPos.current.copy(targetLook.clone().add(dir));
    };

    const handlePointerUp = () => {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
    };

    const handleClick = () => {
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
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('click', handleClick);

    // 12. Animation Loop (60 FPS)
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

      // Auto-rotation in city overview mode
      if (isAutoRotateRef.current && viewLevelRef.current === 'city' && !isDragging) {
        const rotSpeed = 0.12 * delta;
        const radius = Math.hypot(camera.position.x, camera.position.z);
        const angle = Math.atan2(camera.position.z, camera.position.x) + rotSpeed;
        cameraTargetPos.current.x = Math.cos(angle) * radius;
        cameraTargetPos.current.z = Math.sin(angle) * radius;
      }

      // Update Sub-systems
      districtMgr.update(time);
      transportMgr.update(delta);
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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('click', handleClick);

      pulseSystem.dispose();
      districtMgr.dispose();
      transportMgr.dispose();
      disposeCityMaterials(materials);

      buildingsMapRef.current.forEach(b => b.dispose());
      buildingsMapRef.current.clear();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [switchCameraToBuilding]);

  // Handler to enter office interior from HUD
  const handleEnterOffice = () => {
    const bObj = buildingsMapRef.current.get(activeRoom.id);
    if (bObj) {
      switchCameraToInterior(bObj.layout);
    }
  };

  const handleReturnToBuilding = () => {
    const bObj = buildingsMapRef.current.get(activeRoom.id);
    if (bObj) {
      switchCameraToBuilding(bObj.layout);
    }
  };

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

      {/* Top Controls: Visual Scale Switcher [ CITY ] [ BUILDING ] [ INTERIOR ] */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center p-1 rounded-xl bg-[#050A12]/90 backdrop-blur-md border border-[#1B2A3D] shadow-inner text-xs font-mono">
          <button
            onClick={switchCameraToCity}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewLevel === 'city'
                ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                : 'text-[#95A4B8] hover:text-white'
            }`}
            title="City Overview Scale"
          >
            <span>CITY</span>
          </button>

          <button
            onClick={() => {
              const bObj = buildingsMapRef.current.get(activeRoom.id);
              if (bObj) switchCameraToBuilding(bObj.layout);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewLevel === 'building'
                ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                : 'text-[#95A4B8] hover:text-white'
            }`}
            title="Selected Tower Scale & Cutaway"
          >
            <Building2 className="w-3 h-3" />
            <span>BUILDING</span>
          </button>

          <button
            onClick={handleEnterOffice}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewLevel === 'interior'
                ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                : 'text-[#95A4B8] hover:text-white'
            }`}
            title="Agent Office Interior & Laptops"
          >
            <Monitor className="w-3 h-3" />
            <span>INTERIOR</span>
          </button>
        </div>

        {viewLevel === 'city' && (
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
        )}
      </div>

      {/* Selected Room Interactive Action HUD */}
      {viewLevel !== 'city' && (
        <div className="absolute top-16 right-4 z-20 flex flex-col space-y-2 p-3.5 rounded-xl bg-[#0B1320]/95 backdrop-blur-md border border-[#36D7E7]/40 shadow-2xl shadow-black/80 text-xs font-mono max-w-xs">
          <div className="flex items-center justify-between border-b border-[#1B2A3D] pb-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeRoom.color }} />
              <strong className="text-white font-bold">{activeRoom.displayName || activeRoom.name}</strong>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#101A2A] text-[#2FD27F] border border-[#2FD27F]/30 uppercase font-bold">
              {activeRoom.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] py-1">
            <div>
              <span className="text-[#6F8096]">Workforce:</span>
              <div className="text-white font-bold flex items-center space-x-1">
                <Users className="w-3 h-3 text-[#36D7E7]" />
                <span>{activeRoom.activeAgentsCount} Agents</span>
              </div>
            </div>
            <div>
              <span className="text-[#6F8096]">Last Probe:</span>
              <div className="text-[#F0A824] font-bold uppercase truncate">
                {activeRoom.lastProbeArm || 'None'}
              </div>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center space-x-2 pt-1 border-t border-[#1B2A3D]">
            {viewLevel === 'building' ? (
              <button
                onClick={handleEnterOffice}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-[#36D7E7] text-[#050A12] font-bold hover:bg-[#36D7E7]/90 transition-all shadow-md shadow-[#36D7E7]/25"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>ENTER OFFICE</span>
              </button>
            ) : (
              <button
                onClick={handleReturnToBuilding}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg bg-[#101A2A] text-[#36D7E7] border border-[#36D7E7]/40 hover:bg-[#1B2A3D] transition-all"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>BUILDING VIEW</span>
              </button>
            )}

            <button
              onClick={switchCameraToCity}
              className="flex items-center justify-center p-1.5 rounded-lg bg-[#101A2A] text-[#95A4B8] hover:text-white border border-[#1B2A3D]"
              title="Return to City Overview"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[9px] text-[#6F8096] pt-1 leading-tight">
            Interior workers are an aggregate visualization of observed room activity, not a one-to-one identity map.
          </div>
        </div>
      )}

      {/* City Legend & Protocol Disclaimer */}
      <div className="absolute top-4 left-4 z-20 hidden md:flex flex-col space-y-1.5 p-3 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] text-[10px] font-mono text-[#95A4B8] max-w-xs">
        <div className="flex items-center space-x-2 text-[#36D7E7] font-semibold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          <span>Agent City Legend</span>
        </div>
        <div className="flex flex-col space-y-1 pt-1 text-[10px]">
          <div>🏢 <strong className="text-white">Building</strong> = Room</div>
          <div>💻 <strong className="text-white">Interior</strong> = Agent Desks & Laptops</div>
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
