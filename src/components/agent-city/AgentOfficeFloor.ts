import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import { AgentDeskFactory, type DeskConfig } from './AgentDesk';
import { AgentWorker } from './AgentWorker';

export interface OfficeFloorConfig {
  floorIndex: number;
  floorHeight: number;
  width: number;
  depth: number;
  room: RoomCluster;
  isCommandFloor?: boolean;
}

export class AgentOfficeFloor {
  public group: THREE.Group;
  public config: OfficeFloorConfig;
  private workers: AgentWorker[] = [];
  private commandDisplayMesh: THREE.Mesh | null = null;
  private commandCanvas: HTMLCanvasElement | null = null;
  private commandTexture: THREE.CanvasTexture | null = null;

  constructor(config: OfficeFloorConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.y = config.floorIndex * config.floorHeight;

    this.buildFloorStructure();
    this.populateWorkstations();

    if (config.isCommandFloor) {
      this.buildCommandCenterScreen();
    }
  }

  /**
   * Builds the floor slab, ceiling slab, and subtle interior overhead lighting
   */
  private buildFloorStructure() {
    const { width, depth, floorHeight } = this.config;

    // Floor Slab
    const slabGeo = new THREE.BoxGeometry(width - 0.2, 0.15, depth - 0.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0B1320,
      roughness: 0.6,
      metalness: 0.4
    });
    const floorMesh = new THREE.Mesh(slabGeo, floorMat);
    floorMesh.position.y = 0.08;
    this.group.add(floorMesh);

    // Ceiling Light Bars (recessed cyan/soft white glow)
    const lightBarGeo = new THREE.PlaneGeometry(width * 0.7, 0.2);
    const lightBarMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.rotation.x = Math.PI / 2;
    lightBar.position.set(0, floorHeight - 0.05, 0);
    this.group.add(lightBar);

    // Subtle interior floor boundary glass railing
    const railGeo = new THREE.BoxGeometry(width - 0.3, 0.4, 0.05);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1B2A3D,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.9
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.28, depth / 2 - 0.2);
    this.group.add(rail);
  }

  /**
   * Places workstations and agent workers based on room activity
   */
  private populateWorkstations() {
    const { width, depth, room } = this.config;

    // Determine how many workers to render based on activeAgentsCount:
    // 1-5 agents -> 3 workers
    // 6-20 agents -> 4-6 workers
    // 21+ agents -> 6-8 workers per floor
    const count = room.activeAgentsCount;
    const workerTarget = count > 20 ? 6 : count > 5 ? 4 : 2;

    const availableX = (width - 1.8) / 2;
    const availableZ = (depth - 1.8) / 2;

    const deskLayouts: DeskConfig[] = [
      { x: -availableX * 0.55, y: 0.15, z: -availableZ * 0.4, rotationY: 0, screenType: 'terminal' },
      { x: availableX * 0.55, y: 0.15, z: -availableZ * 0.4, rotationY: 0, screenType: 'telemetry' },
      { x: -availableX * 0.55, y: 0.15, z: availableZ * 0.4, rotationY: Math.PI, screenType: 'signal' },
      { x: availableX * 0.55, y: 0.15, z: availableZ * 0.4, rotationY: Math.PI, screenType: 'terminal' },
      { x: 0, y: 0.15, z: -availableZ * 0.4, rotationY: 0, screenType: 'telemetry' },
      { x: 0, y: 0.15, z: availableZ * 0.4, rotationY: Math.PI, screenType: 'signal' }
    ];

    const desksToCreate = deskLayouts.slice(0, Math.min(deskLayouts.length, workerTarget));

    desksToCreate.forEach((cfg) => {
      // 1. Create Workstation (Desk + Chair + Glowing Laptop)
      const deskGroup = AgentDeskFactory.createWorkstation(cfg);
      this.group.add(deskGroup);

      // 2. Create Seated Agent Worker
      const worker = new AgentWorker({
        x: cfg.x,
        y: cfg.y,
        z: cfg.z + (cfg.rotationY === Math.PI ? -0.55 : 0.55),
        rotationY: cfg.rotationY === Math.PI ? 0 : Math.PI, // Facing laptop
        isSeated: true,
        activityState: room.status === 'surge' ? 'surge' : 'active'
      });
      this.workers.push(worker);
      this.group.add(worker.group);
    });

    // Add 1 walking agent patrolling the office corridor if room is active
    if (count >= 8) {
      const walkingWorker = new AgentWorker({
        x: -availableX * 0.4,
        y: 0.15,
        z: 0,
        isSeated: false,
        isWalking: true,
        walkPath: {
          start: new THREE.Vector3(-availableX * 0.6, 0.15, 0),
          end: new THREE.Vector3(availableX * 0.6, 0.15, 0),
          speed: 1.2
        },
        activityState: room.status === 'surge' ? 'surge' : 'active'
      });
      this.workers.push(walkingWorker);
      this.group.add(walkingWorker.group);
    }
  }

  /**
   * Builds the shared Room Command Center wall screen with real room data
   */
  private buildCommandCenterScreen() {
    const { width, depth } = this.config;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    this.commandCanvas = canvas;

    this.renderCommandTexture();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    this.commandTexture = texture;

    const screenGeo = new THREE.PlaneGeometry(Math.min(3.2, width * 0.65), 1.3);
    const screenMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide
    });

    this.commandDisplayMesh = new THREE.Mesh(screenGeo, screenMat);
    // Positioned on the back wall of the office floor
    this.commandDisplayMesh.position.set(0, 1.4, -depth / 2 + 0.2);
    this.group.add(this.commandDisplayMesh);
  }

  private renderCommandTexture() {
    if (!this.commandCanvas) return;
    const ctx = this.commandCanvas.getContext('2d');
    if (!ctx) return;

    const { room } = this.config;

    // Dark sleek terminal background
    ctx.fillStyle = '#050A12';
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = room.color || '#36D7E7';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    // Top Header Bar
    ctx.fillStyle = '#0B1320';
    ctx.fillRect(10, 10, 492, 44);

    ctx.fillStyle = room.color || '#36D7E7';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`ROOM: ${room.displayName || room.name}`, 24, 40);

    ctx.fillStyle = room.status === 'surge' ? '#2FD27F' : '#4DA3FF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`STATUS: ${room.status.toUpperCase()}`, 340, 40);

    // Data Rows
    ctx.fillStyle = '#95A4B8';
    ctx.font = '16px monospace';
    ctx.fillText(`ACTIVE WORKFORCE:`, 24, 90);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${room.activeAgentsCount} AUTONOMOUS AGENTS`, 220, 90);

    ctx.fillStyle = '#95A4B8';
    ctx.font = '16px monospace';
    ctx.fillText(`CATEGORY:`, 24, 130);
    ctx.fillStyle = '#36D7E7';
    ctx.fillText(room.category.toUpperCase(), 220, 130);

    ctx.fillStyle = '#95A4B8';
    ctx.font = '16px monospace';
    ctx.fillText(`LAST PROBE ARM:`, 24, 170);
    ctx.fillStyle = room.lastProbeArm === 'question' ? '#F0A824' : room.lastProbeArm === 'offer' ? '#A855F7' : '#4DA3FF';
    ctx.fillText(room.lastProbeArm ? room.lastProbeArm.toUpperCase() : 'NONE OBSERVED', 220, 170);

    ctx.fillStyle = '#95A4B8';
    ctx.font = '16px monospace';
    ctx.fillText(`OBSERVED LATENCY:`, 24, 210);
    ctx.fillStyle = '#2FD27F';
    ctx.fillText(`${room.averageResponseLatency.toFixed(1)}s (120s WINDOW)`, 220, 210);

    // Bottom telemetry ticker
    ctx.fillStyle = '#1B2A3D';
    ctx.fillRect(10, 226, 492, 20);
    ctx.fillStyle = '#6F8096';
    ctx.font = '11px monospace';
    ctx.fillText(`TECHNOCORE METROPOLIS · AUTONOMOUS AGENT AGGREGATE OBSERVER`, 24, 240);
  }

  /**
   * Update animations
   */
  public update(time: number) {
    this.workers.forEach(w => w.update(time));
  }

  public updateRoomData(room: RoomCluster) {
    this.config.room = room;
    if (this.commandCanvas && this.commandTexture) {
      this.renderCommandTexture();
      this.commandTexture.needsUpdate = true;
    }
  }

  public dispose() {
    this.commandTexture?.dispose();
    this.commandDisplayMesh = null;
    this.commandCanvas = null;
    this.workers = [];
  }
}
