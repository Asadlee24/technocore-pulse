import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useData } from '../context/DataContext';
import type { RoomCluster, ProbeArm } from '../types/probe';
import { Radio, RefreshCw, Sparkles } from 'lucide-react';

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
  selectedRoomId,
  activeFilter: _activeFilter = 'all'
}) => {
  const { activeRoomClusters } = useData();
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0] || DEFAULT_ROOM);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [pulseLog, setPulseLog] = useState<string>('System nominal. Tracking active clusters.');
  const [isSimulatingPulse, setIsSimulatingPulse] = useState<boolean>(false);

  // Sync selected room when activeRoomClusters changes
  useEffect(() => {
    if (activeRoomClusters.length > 0) {
      setSelectedRoom(activeRoomClusters[0]);
    }
  }, [activeRoomClusters]);

  const activeDisplayRoom = selectedRoom || activeRoomClusters[0] || DEFAULT_ROOM;

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const roomMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const pulseRingsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050A12, 0.015);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 18, 48);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
    const roomGroups = new Map<string, THREE.Group>();

    activeRoomClusters.forEach((room) => {
      const group = new THREE.Group();
      group.position.set(...room.coordinates);

      // Core Geometric Room Node (Icosahedron)
      const coreGeo = new THREE.IcosahedronGeometry(2.4, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color),
        emissive: new THREE.Color(room.color),
        emissiveIntensity: 0.45,
        wireframe: false,
        roughness: 0.2,
        metalness: 0.8
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.name = `core_${room.id}`;
      group.add(coreMesh);

      // Wireframe Outer Cage
      const cageGeo = new THREE.IcosahedronGeometry(3.1, 1);
      const cageMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(room.color),
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      group.add(cageMesh);

      // Orbiting Agent DIDs (Tiny glowing spheres)
      const orbitCount = Math.min(room.activeAgentsCount, 6);
      const orbitRadius = 4.2;
      for (let i = 0; i < orbitCount; i++) {
        const agentGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const agentMat = new THREE.MeshBasicMaterial({
          color: 0xEAF2F7,
          wireframe: false
        });
        const agentMesh = new THREE.Mesh(agentGeo, agentMat);
        const angle = (i / orbitCount) * Math.PI * 2;
        agentMesh.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
        agentMesh.userData = { angle, speed: 0.8 + Math.random() * 0.6, radius: orbitRadius };
        group.add(agentMesh);
      }

      scene.add(group);
      roomGroups.set(room.id, group);
    });

    roomMeshesRef.current = roomGroups;

    // INTER-CLUSTER NETWORK EDGES
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x1B2A3D,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < activeRoomClusters.length; i++) {
      for (let j = i + 1; j < activeRoomClusters.length; j++) {
        const start = new THREE.Vector3(...activeRoomClusters[i].coordinates);
        const end = new THREE.Vector3(...activeRoomClusters[j].coordinates);
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
        const edgeLine = new THREE.Line(edgeGeo, edgeMaterial);
        scene.add(edgeLine);
      }
    }

    // PULSE RINGS POOL FOR PROBE ANIMATION
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.RingGeometry(1, 1.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x36D7E7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      scene.add(ringMesh);
      rings.push(ringMesh);
    }
    pulseRingsRef.current = rings;

    // RAYCASTING & INTERACTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = 0;
    const cameraRadius = 50;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        cameraAngle += deltaX * 0.005;
        camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        camera.position.y = Math.max(5, Math.min(35, camera.position.y - deltaY * 0.1));
        camera.lookAt(0, 0, 0);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (let hit of intersects) {
        let parent = hit.object.parent;
        if (parent && parent instanceof THREE.Group) {
          const matchRoom = activeRoomClusters.find(r => {
            const grp = roomGroups.get(r.id);
            return grp === parent;
          });

          if (matchRoom) {
            setSelectedRoom(matchRoom);
            if (onSelectRoom) onSelectRoom(matchRoom);
            setPulseLog(`Inspecting room ${matchRoom.displayName} (${matchRoom.name}). Latency: ${matchRoom.averageResponseLatency}s.`);
            break;
          }
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Auto-rotation if enabled
      if (isAutoRotate && !isDragging) {
        cameraAngle += 0.0025;
        camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        camera.lookAt(0, 0, 0);
      }

      // Rotate room nodes and animate agent orbits
      roomGroups.forEach((group, roomId) => {
        const core = group.children[0] as THREE.Mesh;
        const cage = group.children[1] as THREE.Mesh;

        if (core) core.rotation.y = elapsed * 0.4;
        if (cage) cage.rotation.y = -elapsed * 0.25;

        // Orbit agents
        for (let i = 2; i < group.children.length; i++) {
          const agent = group.children[i] as THREE.Mesh;
          if (agent && agent.userData) {
            agent.userData.angle += agent.userData.speed * 0.015;
            agent.position.x = Math.cos(agent.userData.angle) * agent.userData.radius;
            agent.position.z = Math.sin(agent.userData.angle) * agent.userData.radius;
            agent.position.y = Math.sin(elapsed * 2 + i) * 0.6;
          }
        }

        // Highlight selected room with a scale bounce
        const isSelected = selectedRoom?.id === roomId;
        const targetScale = isSelected ? 1.25 : 1.0;
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
      });

      // Animate active pulse rings
      pulseRingsRef.current.forEach((ring, idx) => {
        if (ring.visible) {
          const progress = (elapsed * 1.5 + idx * 0.3) % 2.0;
          ring.scale.set(progress * 16, progress * 16, 1);
          (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress / 1.8) * 0.8;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isAutoRotate, activeRoomClusters]);

  // Handle external selectedRoomId prop changes
  useEffect(() => {
    if (selectedRoomId) {
      const room = activeRoomClusters.find(r => r.id === selectedRoomId);
      if (room) {
        setSelectedRoom(room);
      }
    }
  }, [selectedRoomId, activeRoomClusters]);

  // Trigger simulated probe pulse in 3D
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
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#1B2A3D] bg-[#050A12] shadow-2xl">
      {/* HUD Header Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0B1320]/80 backdrop-blur-md border-b border-[#1B2A3D]">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#36D7E7] animate-ping" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#36D7E7] font-semibold">
            3D Signal Map · Cluster Topology
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-[#101A2A] text-[#2FD27F] border border-[#2FD27F]/30">
            Live Public Topology
          </span>
        </div>

        {/* 3D Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              isAutoRotate
                ? 'bg-[#36D7E7]/15 text-[#36D7E7] border-[#36D7E7]/40'
                : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white'
            }`}
            title="Toggle Orbital Rotation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
            <span>{isAutoRotate ? 'Auto Orbit ON' : 'Paused'}</span>
          </button>

          <button
            onClick={handleTriggerSimulatedPulse}
            disabled={isSimulatingPulse}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all bg-[#36D7E7] text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#36D7E7]/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatingPulse ? 'Pulsing...' : 'Fire Probe Pulse'}</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-[540px] cursor-grab active:cursor-grabbing bg-radial-vignette"
      />

      {/* Floating HUD: Selected Room Details */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-20 p-4 rounded-xl bg-[#0B1320]/90 backdrop-blur-xl border border-[#36D7E7]/30 shadow-2xl">
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
            <p className="font-mono text-xs text-[#95A4B8] mt-1">
              Room Identifier: <span className="text-[#36D7E7]">{activeDisplayRoom.name}</span>
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
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1B2A3D]">
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono text-[#6F8096] uppercase">Active Agents</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {activeDisplayRoom.activeAgentsCount}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono text-[#6F8096] uppercase">Probes Received</div>
            <div className="text-base font-bold text-[#36D7E7] font-mono mt-0.5">
              {activeDisplayRoom.totalProbesReceived}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#101A2A]/80 border border-[#1B2A3D]">
            <div className="text-[10px] font-mono text-[#6F8096] uppercase">Avg Latency</div>
            <div className="text-base font-bold text-[#F0A824] font-mono mt-0.5">
              {activeDisplayRoom.averageResponseLatency}s
            </div>
          </div>
        </div>

        {/* Status Log Footer */}
        <div className="mt-3 flex items-center space-x-2 text-[11px] font-mono text-[#95A4B8] bg-[#101A2A]/60 px-2.5 py-1.5 rounded-md border border-[#1B2A3D]">
          <Radio className="w-3 h-3 text-[#36D7E7] animate-pulse" />
          <span className="truncate">{pulseLog}</span>
        </div>
      </div>

      {/* Helper Legend / Hint */}
      <div className="absolute top-18 right-4 hidden md:flex flex-col space-y-2 p-3 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] text-[11px] font-mono text-[#95A4B8]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#6F8096] border-b border-[#1B2A3D] pb-1">
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
        <div className="pt-2 text-[10px] text-[#6F8096] border-t border-[#1B2A3D]">
          * Click node to inspect details. Drag to orbit.
        </div>
      </div>
    </div>
  );
};
