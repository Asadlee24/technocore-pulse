import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useData } from '../context/DataContext';
import type { RoomCluster, ProbeArm } from '../types/probe';
import {
  Radio,
  RefreshCw,
  Sparkles,
  Building2,
  Network,
  Monitor,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AgentCity3D } from './agent-city/AgentCity3D';
import type { CameraViewLevel } from './agent-city/CityLODManager';

interface SignalMap3DProps {
  onSelectRoom?: (room: RoomCluster) => void;
  selectedRoomId?: string;
  activeFilter?: ProbeArm | 'all';
}

const DEFAULT_ROOM: RoomCluster = {
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

export const SignalMap3D: React.FC<SignalMap3DProps> = ({
  onSelectRoom,
  selectedRoomId: _selectedRoomId,
  activeFilter: _activeFilter = 'all'
}) => {
  const { activeRoomClusters } = useData();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'topology' | 'city'>('city');
  const [cityViewLevel, setCityViewLevel] = useState<CameraViewLevel>('city');
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0] || DEFAULT_ROOM);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [pulseLog, setPulseLog] = useState<string>('Technocore Metropolis online. Autonomous agent districts active.');
  const [isSimulatingPulse, setIsSimulatingPulse] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync selected room when activeRoomClusters changes
  useEffect(() => {
    if (activeRoomClusters.length > 0) {
      setSelectedRoom(activeRoomClusters[0]);
    }
  }, [activeRoomClusters]);

  // Robust Native Fullscreen API Handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      // Trigger resize for Three.js camera projection & renderer
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (wrapperRef.current?.requestFullscreen) {
          await wrapperRef.current.requestFullscreen();
        } else if ((wrapperRef.current as any)?.webkitRequestFullscreen) {
          await (wrapperRef.current as any).webkitRequestFullscreen();
        } else {
          // CSS fallback
          setIsFullscreen(prev => !prev);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else {
          setIsFullscreen(false);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
        }
      }
    } catch (err) {
      console.warn('Fullscreen request rejected, using CSS fallback', err);
      setIsFullscreen(prev => !prev);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    }
  };

  const activeDisplayRoom = selectedRoom || activeRoomClusters[0] || DEFAULT_ROOM;

  // References for Three.js objects (Topology Mode)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const roomMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const pulseRingsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (viewMode !== 'topology') return;
    const container = mountRef.current;
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050A12, 0.015);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / (container.clientHeight || 600),
      0.1,
      1000
    );
    camera.position.set(0, 18, 48);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight || 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050A12, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // AMBIENT & DIRECTIONAL LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x36D7E7, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x4DA3FF, 2, 60);
    blueLight.position.set(-20, -10, -20);
    scene.add(blueLight);

    // BACKGROUND GRID FLOOR
    const gridHelper = new THREE.GridHelper(80, 40, 0x1B2A3D, 0x0B1320);
    gridHelper.position.y = -22;
    scene.add(gridHelper);

    // CREATE ROOM CLUSTERS
    const clusters = activeRoomClusters.length > 0 ? activeRoomClusters : [DEFAULT_ROOM];
    clusters.forEach((room) => {
      const roomGroup = new THREE.Group();
      roomGroup.position.set(...room.coordinates);

      const nodeGeometry = new THREE.IcosahedronGeometry(2.2, 2);
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color),
        emissive: new THREE.Color(room.color),
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.8
      });
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.userData = { roomId: room.id };
      roomGroup.add(nodeMesh);

      const wireGeometry = new THREE.WireframeGeometry(nodeGeometry);
      const wireMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(room.color),
        transparent: true,
        opacity: 0.5
      });
      const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
      roomGroup.add(wireMesh);

      // Orbiting Agent Satellites
      const agentCount = Math.min(Math.max(room.activeAgentsCount, 3), 12);
      for (let i = 0; i < agentCount; i++) {
        const agentGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const agentMat = new THREE.MeshBasicMaterial({ color: 0x36D7E7 });
        const agentMesh = new THREE.Mesh(agentGeo, agentMat);

        const angle = (i / agentCount) * Math.PI * 2;
        const radius = 3.6;
        agentMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * 0.8, Math.sin(angle) * radius);
        roomGroup.add(agentMesh);
      }

      scene.add(roomGroup);
      roomMeshesRef.current.set(room.id, roomGroup);
    });

    // Pulse rings
    const ringGeo = new THREE.RingGeometry(2.5, 2.7, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    scene.add(ring);
    pulseRingsRef.current = [ring];

    // ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 120;
    controls.minDistance = 12;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (isAutoRotate) {
        scene.rotation.y += 0.0015;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      camera.aspect = container.clientWidth / (container.clientHeight || 600);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight || 600);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, activeRoomClusters, isAutoRotate]);

  const handleTriggerSimulatedPulse = () => {
    setIsSimulatingPulse(true);
    setPulseLog(`Simulating probe v1 pulse into ${selectedRoom.displayName}...`);

    if (pulseRingsRef.current && selectedRoom) {
      pulseRingsRef.current.forEach((ring) => {
        ring.visible = true;
        ring.position.set(...selectedRoom.coordinates);
      });
    }

    setTimeout(() => {
      setIsSimulatingPulse(false);
      setPulseLog(`Probe response recorded: 3 signed agent replies detected within 14.8s.`);
    }, 2800);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full transition-all duration-200 bg-[#050A12] text-[#EAF2F7] ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen overflow-hidden'
          : 'h-[calc(100vh-5rem)] min-h-[720px] rounded-2xl overflow-hidden border border-[#1B2A3D] shadow-2xl shadow-black/80'
      }`}
    >
      {/* HUD Header Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#0B1320]/85 backdrop-blur-xl border-b border-[#1B2A3D]">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#36D7E7] animate-ping" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs uppercase tracking-widest font-bold text-[#36D7E7]">
                {viewMode === 'city' ? 'Technocore Agent City' : 'Signal Topology'}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded font-bold uppercase bg-[#101A2A] text-[#2FD27F] border border-[#2FD27F]/30">
                {viewMode === 'city' ? 'Autonomous Colony' : 'Live Topology'}
              </span>
            </div>
            <span className="block text-[10px] font-mono text-[#6F8096]">
              Autonomous Digital Metropolis · Procedural 3D WebGL
            </span>
          </div>
        </div>

        {/* View Mode Switcher, Orbit & Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent View Mode Switcher: TOPOLOGY vs AGENT CITY */}
          <div className="flex items-center p-1 rounded-xl bg-[#050A12] border border-[#1B2A3D] shadow-inner">
            <button
              onClick={() => setViewMode('city')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                viewMode === 'city'
                  ? 'bg-[#36D7E7] text-[#050A12] shadow-md shadow-[#36D7E7]/25'
                  : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>AGENT CITY</span>
            </button>
            <button
              onClick={() => setViewMode('topology')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                viewMode === 'topology'
                  ? 'bg-[#101A2A] text-[#36D7E7] border border-[#36D7E7]/40'
                  : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>TOPOLOGY</span>
            </button>
          </div>

          {/* Visual Scales for Agent City: CITY | BUILDING | INTERIOR */}
          {viewMode === 'city' && (
            <div className="flex items-center p-1 rounded-xl bg-[#050A12] border border-[#1B2A3D] shadow-inner text-xs font-mono">
              <button
                onClick={() => setCityViewLevel('city')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cityViewLevel === 'city'
                    ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                    : 'text-[#6F8096] hover:text-[#95A4B8]'
                }`}
                title="Metropolitan City Overview"
              >
                <span>CITY</span>
              </button>

              <button
                onClick={() => setCityViewLevel('building')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cityViewLevel === 'building'
                    ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                    : 'text-[#6F8096] hover:text-[#95A4B8]'
                }`}
                title="Building Tower View & Cutaway"
              >
                <Building2 className="w-3 h-3" />
                <span>BUILDING</span>
              </button>

              <button
                onClick={() => setCityViewLevel('interior')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cityViewLevel === 'interior'
                    ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                    : 'text-[#6F8096] hover:text-[#95A4B8]'
                }`}
                title="Agent Office Interior & Laptops"
              >
                <Monitor className="w-3 h-3" />
                <span>INTERIOR</span>
              </button>
            </div>
          )}

          {viewMode === 'topology' && (
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                isAutoRotate
                  ? 'bg-[#36D7E7]/15 text-[#36D7E7] border-[#36D7E7]/40'
                  : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D]'
              }`}
              title="Toggle Orbital Rotation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
              <span>{isAutoRotate ? 'Orbit On' : 'Orbit Paused'}</span>
            </button>
          )}

          {/* Native Fullscreen Expansion Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white hover:border-[#36D7E7]/40"
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Expand Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#36D7E7]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#36D7E7]" />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          {/* Probe Pulse Simulator */}
          <button
            onClick={handleTriggerSimulatedPulse}
            disabled={isSimulatingPulse}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all bg-[#36D7E7] text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#36D7E7]/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatingPulse ? 'Pulsing...' : 'Fire Probe Pulse'}</span>
          </button>
        </div>
      </div>

      {/* Giant 3D WebGL Canvas Container */}
      <div className="w-full h-full relative">
        {viewMode === 'city' ? (
          <AgentCity3D
            activeRoomClusters={activeRoomClusters}
            selectedRoom={activeDisplayRoom}
            viewLevel={cityViewLevel}
            onViewLevelChange={setCityViewLevel}
            theme="dark"
            onSelectRoom={(room) => {
              setSelectedRoom(room);
              if (onSelectRoom) onSelectRoom(room);
            }}
            isSimulatingPulse={isSimulatingPulse}
            onPulseComplete={() => setIsSimulatingPulse(false)}
          />
        ) : (
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing bg-radial-vignette"
          />
        )}
      </div>

      {/* Floating HUD: Selected Room Details (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20 p-4 rounded-xl bg-[#0B1320]/90 backdrop-blur-xl border border-[#36D7E7]/30 text-white shadow-2xl shadow-black/80">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeDisplayRoom.color }}
              />
              <h4 className="font-heading font-bold text-lg text-white">
                {activeDisplayRoom.displayName}
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#101A2A] text-[#36D7E7] border border-[#1B2A3D]">
                {activeDisplayRoom.category}
              </span>
            </div>
            <p className="font-mono text-xs mt-1 text-[#95A4B8]">
              Room Identifier: <span className="text-[#36D7E7] font-semibold">{activeDisplayRoom.name}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-[#95A4B8]">Status</span>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#2FD27F]" />
              <span className="text-xs font-mono font-medium uppercase text-[#2FD27F]">
                {activeDisplayRoom.status}
              </span>
            </div>
          </div>
        </div>

        {/* Room Metrics Row */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-[#1B2A3D]">
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono uppercase text-[#6F8096]">Active Agents</div>
            <div className="text-base font-bold font-mono mt-0.5 text-white">
              {activeDisplayRoom.activeAgentsCount}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono uppercase text-[#6F8096]">Probes Received</div>
            <div className="text-base font-bold font-mono mt-0.5 text-[#36D7E7]">
              {activeDisplayRoom.totalProbesReceived}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono uppercase text-[#6F8096]">Avg Latency</div>
            <div className="text-base font-bold text-[#F0A824] font-mono mt-0.5">
              {activeDisplayRoom.averageResponseLatency}s
            </div>
          </div>
        </div>

        {/* Agent City Mode Actions: Quick Jump to Office Interior or Building View */}
        {viewMode === 'city' && (
          <div className="mt-3 pt-3 border-t border-[#1B2A3D] flex items-center space-x-2">
            {cityViewLevel !== 'interior' ? (
              <button
                onClick={() => setCityViewLevel('interior')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-[#36D7E7] text-[#050A12] font-mono font-bold text-xs hover:bg-[#36D7E7]/90 active:scale-95 transition-all shadow-lg shadow-[#36D7E7]/25"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>ENTER OFFICE INTERIOR</span>
              </button>
            ) : (
              <button
                onClick={() => setCityViewLevel('building')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-mono font-bold text-xs active:scale-95 transition-all bg-[#101A2A] text-[#36D7E7] border border-[#36D7E7]/40 hover:bg-[#1B2A3D]"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>BUILDING CUTAWAY</span>
              </button>
            )}

            {cityViewLevel !== 'city' && (
              <button
                onClick={() => setCityViewLevel('city')}
                className="px-3 py-2 rounded-lg font-mono text-xs transition-all bg-[#101A2A] text-[#95A4B8] hover:text-white border border-[#1B2A3D]"
                title="Return to City Overview"
              >
                <span>RESET</span>
              </button>
            )}
          </div>
        )}

        {/* Status Log Footer */}
        <div className="mt-3 flex items-center space-x-2 text-[11px] font-mono px-2.5 py-1.5 rounded-md border bg-[#101A2A]/60 text-[#95A4B8] border-[#1B2A3D]">
          <Radio className="w-3 h-3 text-[#36D7E7] animate-pulse flex-shrink-0" />
          <span className="truncate">{pulseLog}</span>
        </div>
      </div>

      {/* Helper Legend / Hint (Only in Topology view) */}
      {viewMode === 'topology' && (
        <div className="absolute top-18 right-4 hidden md:flex flex-col space-y-2 p-3 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] text-[11px] font-mono text-[#95A4B8]">
          <div className="text-[10px] font-bold uppercase tracking-wider border-b border-[#1B2A3D] pb-1 text-[#6F8096]">
            Cluster Categories
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#36D7E7]" />
            <span>Coordination</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
            <span>Compute Relay</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4DA3FF]" />
            <span>Settlement Prep</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2FD27F]" />
            <span>Agent Social</span>
          </div>
          <div className="pt-2 text-[10px] border-t border-[#1B2A3D] text-[#6F8096]">
            * Click node to inspect details. Drag to orbit.
          </div>
        </div>
      )}
    </div>
  );
};
