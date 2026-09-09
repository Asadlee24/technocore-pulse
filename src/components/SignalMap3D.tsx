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
  Minimize2,
  Sun,
  Moon
} from 'lucide-react';
import { AgentCity3D } from './agent-city/AgentCity3D';
import type { CameraViewLevel } from './agent-city/CityLODManager';

interface SignalMap3DProps {
  onSelectRoom?: (room: RoomCluster) => void;
  selectedRoomId?: string;
  activeFilter?: ProbeArm | 'all';
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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

const DISTRICT_QUICK_JUMPS = [
  { id: 'coordination', label: 'Core', icon: '🏛️' },
  { id: 'work', label: 'Work', icon: '🏢' },
  { id: 'research', label: 'Research', icon: '🧪' },
  { id: 'compute-relay', label: 'Compute', icon: '⚡' },
  { id: 'settlement-prep', label: 'Settlement', icon: '🔒' },
  { id: 'agent-social', label: 'Social', icon: '💬' },
  { id: 'broadcast', label: 'Broadcast', icon: '📡' },
  { id: 'infrastructure', label: 'Infra', icon: '🌐' }
];

export const SignalMap3D: React.FC<SignalMap3DProps> = ({
  onSelectRoom,
  selectedRoomId: _selectedRoomId,
  activeFilter: _activeFilter = 'all',
  theme = 'dark',
  onToggleTheme
}) => {
  const { activeRoomClusters } = useData();
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'topology' | 'city'>('city');
  const [cityViewLevel, setCityViewLevel] = useState<CameraViewLevel>('city');
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0] || DEFAULT_ROOM);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [pulseLog, setPulseLog] = useState<string>('Technocore Metropolis online. Tracking autonomous clusters.');
  const [isSimulatingPulse, setIsSimulatingPulse] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isLight = theme === 'light';

  // Sync selected room when activeRoomClusters changes
  useEffect(() => {
    if (activeRoomClusters.length > 0) {
      setSelectedRoom(activeRoomClusters[0]);
    }
  }, [activeRoomClusters]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const activeDisplayRoom = selectedRoom || activeRoomClusters[0] || DEFAULT_ROOM;

  // Quick jump to a district
  const handleDistrictJump = (districtCat: string) => {
    const targetRoom = activeRoomClusters.find(r => r.category === districtCat || r.id.includes(districtCat)) || activeRoomClusters[0];
    if (targetRoom) {
      setSelectedRoom(targetRoom);
      if (onSelectRoom) onSelectRoom(targetRoom);
      setCityViewLevel('building');
    }
  };

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
    scene.fog = new THREE.FogExp2(isLight ? 0xE8EEF5 : 0x050A12, 0.015);

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
    renderer.setClearColor(isLight ? 0xE8EEF5 : 0x050A12, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // AMBIENT & DIRECTIONAL LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.2 : 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(isLight ? 0x0284C7 : 0x36D7E7, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x4DA3FF, 2, 60);
    blueLight.position.set(-20, -10, -20);
    scene.add(blueLight);

    // BACKGROUND GRID FLOOR
    const gridHelper = new THREE.GridHelper(80, 40, isLight ? 0x94A3B8 : 0x1B2A3D, isLight ? 0xCBD5E1 : 0x0B1320);
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
  }, [viewMode, activeRoomClusters, isLight, isAutoRotate]);

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
      className={`relative w-full transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden'
          : 'rounded-2xl overflow-hidden border shadow-2xl'
      } ${
        isLight
          ? 'bg-[#E8EEF5] border-slate-300 text-slate-900 shadow-slate-300/60'
          : 'bg-[#050A12] border-[#1B2A3D] text-[#EAF2F7] shadow-black/80'
      }`}
    >
      {/* HUD Header Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 backdrop-blur-xl border-b transition-colors ${
          isLight
            ? 'bg-white/90 border-slate-200 text-slate-800'
            : 'bg-[#0B1320]/85 border-[#1B2A3D] text-white'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#36D7E7] animate-ping" />
          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-mono text-xs uppercase tracking-widest font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'}`}>
                {viewMode === 'city' ? 'Technocore Agent City' : 'Signal Topology'}
              </span>
              <span className={`hidden sm:inline-block px-2 py-0.2 text-[10px] font-mono rounded font-bold uppercase ${
                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-[#101A2A] text-[#2FD27F] border border-[#2FD27F]/30'
              }`}>
                {viewMode === 'city' ? '8 Districts Active' : 'Live Topology'}
              </span>
            </div>
            <span className={`block text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>
              Autonomous Procedural Metropolis · 60 FPS
            </span>
          </div>
        </div>

        {/* View Mode Switcher, Theme & Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent View Mode Switcher: TOPOLOGY vs AGENT CITY */}
          <div className={`flex items-center p-1 rounded-xl border shadow-inner ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#050A12] border-[#1B2A3D]'}`}>
            <button
              onClick={() => setViewMode('city')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                viewMode === 'city'
                  ? 'bg-[#36D7E7] text-[#050A12] shadow-md shadow-[#36D7E7]/25'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>AGENT CITY</span>
            </button>
            <button
              onClick={() => setViewMode('topology')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                viewMode === 'topology'
                  ? isLight ? 'bg-white text-[#0284C7] shadow-sm' : 'bg-[#101A2A] text-[#36D7E7] border border-[#36D7E7]/40'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>TOPOLOGY</span>
            </button>
          </div>

          {/* Visual Scales for Agent City: CITY | BUILDING | INTERIOR */}
          {viewMode === 'city' && (
            <div className={`flex items-center p-1 rounded-xl border shadow-inner text-xs font-mono ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#050A12] border-[#1B2A3D]'}`}>
              <button
                onClick={() => setCityViewLevel('city')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cityViewLevel === 'city'
                    ? 'bg-[#36D7E7] text-[#050A12] shadow-sm shadow-[#36D7E7]/20'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#6F8096] hover:text-[#95A4B8]'
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
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#6F8096] hover:text-[#95A4B8]'
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
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#6F8096] hover:text-[#95A4B8]'
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
                  ? isLight ? 'bg-sky-100 text-[#0284C7] border-sky-300' : 'bg-[#36D7E7]/15 text-[#36D7E7] border-[#36D7E7]/40'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D]'
              }`}
              title="Toggle Orbital Rotation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
              <span>{isAutoRotate ? 'Orbit On' : 'Orbit Paused'}</span>
            </button>
          )}

          {/* Theme Switcher Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-[#101A2A] text-[#F0A824] border-[#1B2A3D] hover:border-[#F0A824]/50'
              }`}
              title={isLight ? "Switch to Dark Night Theme" : "Switch to White/Daylight Theme"}
            >
              {isLight ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Moon className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isLight ? 'Daylight' : 'Cyber Night'}</span>
            </button>
          )}

          {/* Fullscreen Expansion Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white'
            }`}
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Expand Giant Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          {/* Probe Pulse Simulator */}
          <button
            onClick={handleTriggerSimulatedPulse}
            disabled={isSimulatingPulse}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all bg-[#36D7E7] text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#36D7E7]/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatingPulse ? 'Pulsing...' : 'Fire Probe Pulse'}</span>
          </button>
        </div>
      </div>

      {/* District Quick Jumps Toolbar (Directly beneath Header in City mode) */}
      {viewMode === 'city' && (
        <div className={`absolute top-16 inset-x-0 z-20 hidden md:flex items-center justify-center space-x-1.5 py-1.5 px-4 backdrop-blur-md border-b text-[11px] font-mono transition-colors ${
          isLight ? 'bg-white/70 border-slate-200/80 text-slate-700' : 'bg-[#0B1320]/60 border-[#1B2A3D]/80 text-[#95A4B8]'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider mr-2 ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>
            Districts:
          </span>
          {DISTRICT_QUICK_JUMPS.map(d => (
            <button
              key={d.id}
              onClick={() => handleDistrictJump(d.id)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                isLight
                  ? 'hover:bg-slate-200/80 hover:text-slate-900'
                  : 'hover:bg-[#101A2A] hover:text-[#36D7E7]'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Giant 3D WebGL Canvas Container */}
      <div className={`w-full relative transition-all duration-300 ${
        isFullscreen
          ? 'h-screen'
          : 'h-[calc(100vh-4.5rem)] min-h-[720px]'
      }`}>
        {viewMode === 'city' ? (
          <AgentCity3D
            activeRoomClusters={activeRoomClusters}
            selectedRoom={activeDisplayRoom}
            viewLevel={cityViewLevel}
            onViewLevelChange={setCityViewLevel}
            theme={theme}
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
      <div
        className={`absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20 p-4 rounded-xl backdrop-blur-xl border shadow-2xl transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/70'
            : 'bg-[#0B1320]/90 border-[#36D7E7]/30 text-white shadow-black/80'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeDisplayRoom.color }}
              />
              <h4 className={`font-heading font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {activeDisplayRoom.displayName}
              </h4>
              <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${
                isLight ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-[#101A2A] text-[#36D7E7] border-[#1B2A3D]'
              }`}>
                {activeDisplayRoom.category}
              </span>
            </div>
            <p className={`font-mono text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-[#95A4B8]'}`}>
              Room Identifier: <span className={isLight ? 'text-[#0284C7] font-semibold' : 'text-[#36D7E7]'}>{activeDisplayRoom.name}</span>
            </p>
          </div>

          <div className="text-right">
            <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-[#95A4B8]'}`}>Status</span>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#2FD27F]" />
              <span className="text-xs font-mono font-medium uppercase text-[#2FD27F]">
                {activeDisplayRoom.status}
              </span>
            </div>
          </div>
        </div>

        {/* Room Metrics Row */}
        <div className={`grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-[#1B2A3D]'}`}>
          <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101A2A]/80 border-[#1B2A3D]'}`}>
            <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>Active Agents</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {activeDisplayRoom.activeAgentsCount}
            </div>
          </div>
          <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101A2A]/80 border-[#1B2A3D]'}`}>
            <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>Probes Received</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'}`}>
              {activeDisplayRoom.totalProbesReceived}
            </div>
          </div>
          <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101A2A]/80 border-[#1B2A3D]'}`}>
            <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>Avg Latency</div>
            <div className="text-base font-bold text-[#F0A824] font-mono mt-0.5">
              {activeDisplayRoom.averageResponseLatency}s
            </div>
          </div>
        </div>

        {/* Agent City Mode Actions: Quick Jump to Office Interior or Building View */}
        {viewMode === 'city' && (
          <div className={`mt-3 pt-3 border-t flex items-center space-x-2 ${isLight ? 'border-slate-200' : 'border-[#1B2A3D]'}`}>
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
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-mono font-bold text-xs active:scale-95 transition-all border ${
                  isLight
                    ? 'bg-slate-100 text-[#0284C7] border-[#0284C7]/40 hover:bg-slate-200'
                    : 'bg-[#101A2A] text-[#36D7E7] border-[#36D7E7]/40 hover:bg-[#1B2A3D]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>BUILDING CUTAWAY</span>
              </button>
            )}

            {cityViewLevel !== 'city' && (
              <button
                onClick={() => setCityViewLevel('city')}
                className={`px-3 py-2 rounded-lg font-mono text-xs transition-all border ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    : 'bg-[#101A2A] text-[#95A4B8] hover:text-white border-[#1B2A3D]'
                }`}
                title="Return to City Overview"
              >
                <span>RESET</span>
              </button>
            )}
          </div>
        )}

        {/* Status Log Footer */}
        <div className={`mt-3 flex items-center space-x-2 text-[11px] font-mono px-2.5 py-1.5 rounded-md border ${
          isLight
            ? 'bg-slate-100/90 text-slate-700 border-slate-200'
            : 'bg-[#101A2A]/60 text-[#95A4B8] border-[#1B2A3D]'
        }`}>
          <Radio className={`w-3 h-3 animate-pulse flex-shrink-0 ${isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'}`} />
          <span className="truncate">{pulseLog}</span>
        </div>
      </div>

      {/* Helper Legend / Hint (Only in Topology view) */}
      {viewMode === 'topology' && (
        <div className={`absolute top-18 right-4 hidden md:flex flex-col space-y-2 p-3 rounded-xl backdrop-blur-md border text-[11px] font-mono ${
          isLight
            ? 'bg-white/90 border-slate-200 text-slate-700 shadow-lg'
            : 'bg-[#0B1320]/80 border-[#1B2A3D] text-[#95A4B8]'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider border-b pb-1 ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-[#6F8096] border-[#1B2A3D]'
          }`}>
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
          <div className={`pt-2 text-[10px] border-t ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-[#6F8096] border-[#1B2A3D]'
          }`}>
            * Click node to inspect details. Drag to orbit.
          </div>
        </div>
      )}
    </div>
  );
};
