import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import type { BuildingLayout, InteriorStageType } from './cityLayout';
import type { ObservedIdentity } from '../../context/DataContext';
import { AgentWorker } from './AgentWorker';
import { AgentDeskFactory } from './AgentDesk';

interface DeskSlot {
  group: THREE.Group;
  worker?: AgentWorker;
  assignedDid?: string;
  activeUntil?: number;
}

export class OfficeInterior {
  public group: THREE.Group;
  public layout: BuildingLayout;
  private interiorType: InteriorStageType;
  private deskSlots: DeskSlot[] = [];
  private blinkingLeds: { mesh: THREE.Mesh; baseIntensity: number; speed: number; color: THREE.Color }[] = [];
  private interiorLight: THREE.PointLight;
  private screens: THREE.Mesh[] = [];
  private activeMessagePulseUntil: number = 0;

  constructor(layout: BuildingLayout) {
    this.layout = layout;
    this.interiorType = layout.interiorType;
    this.group = new THREE.Group();
    this.group.name = `interior-${layout.id}`;
    this.group.visible = false; // Hidden until cutaway / enter

    // Interior Warm / Themed Illumination
    const lightColor = this.interiorType === 'tower-control' ? 0xFDE047
      : this.interiorType === 'institute-classroom' ? 0x00B4D8
      : this.interiorType === 'engineering-bay' ? 0x4CC9F0
      : 0xC77DFF;

    this.interiorLight = new THREE.PointLight(lightColor, 2.2, 28);
    this.interiorLight.position.set(0, 4.5, 0);
    this.group.add(this.interiorLight);

    this.buildOpenStage();
  }

  /**
   * Constructs an open stage interior matching the reference video:
   * - Hexagonal dark floor slab with glowing neon border
   * - Partial back wall with luminous building/room signage
   * - 3 large video monitors / server racks / podium
   * - Workstations with seated real observed senders
   */
  private buildOpenStage() {
    const stageRadius = Math.max(4.2, Math.min(this.layout.width, this.layout.depth) * 0.95);
    const floorY = 0.3;

    // 1. Hexagonal Dark Technical Floor
    const hexGeo = new THREE.CylinderGeometry(stageRadius, stageRadius, 0.25, 6);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0A1128,
      roughness: 0.65,
      metalness: 0.45
    });
    const hexFloor = new THREE.Mesh(hexGeo, floorMat);
    hexFloor.position.y = floorY;
    hexFloor.receiveShadow = true;
    this.group.add(hexFloor);

    // Glowing Neon Perimeter Border around hexagon
    const borderEdges = new THREE.EdgesGeometry(hexGeo);
    const borderColor = this.interiorType === 'tower-control' ? 0xF0A824
      : this.interiorType === 'institute-classroom' ? 0x00B4D8
      : this.interiorType === 'engineering-bay' ? 0x4CC9F0
      : 0xC77DFF;

    const borderMat = new THREE.LineBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: 0.95
    });
    const borderLine = new THREE.LineSegments(borderEdges, borderMat);
    borderLine.position.y = floorY;
    this.group.add(borderLine);

    // 2. Partial Back Wall Panel
    const wallW = stageRadius * 1.6;
    const wallH = 4.2;
    const wallGeo = new THREE.BoxGeometry(wallW, wallH, 0.25);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0D1929,
      roughness: 0.8,
      metalness: 0.3
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, floorY + wallH / 2, -stageRadius * 0.75);
    this.group.add(backWall);

    // Wall frame neon border
    const wallEdges = new THREE.EdgesGeometry(wallGeo);
    const wallFrame = new THREE.LineSegments(wallEdges, borderMat);
    wallFrame.position.copy(backWall.position);
    this.group.add(wallFrame);

    // 3. Wall Signboard (Room / Building Title)
    this.buildWallSignboard(backWall.position.y + wallH * 0.35, backWall.position.z + 0.14, wallW);

    // 4. Themed Elements by Interior Type
    switch (this.interiorType) {
      case 'tower-control':
        this.buildTowerControlRoom(floorY, backWall.position.z);
        break;
      case 'institute-classroom':
        this.buildInstituteClassroom(floorY, backWall.position.z);
        break;
      case 'engineering-bay':
        this.buildEngineeringBay(floorY, backWall.position.z);
        break;
      case 'compute-floor':
        this.buildComputeFoundryFloor(floorY, backWall.position.z);
        break;
      default:
        this.buildGenericOffice(floorY);
        break;
    }
  }

  private buildWallSignboard(y: number, z: number, maxW: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#060D1A';
    ctx.fillRect(0, 0, 512, 96);

    ctx.strokeStyle = this.layout.edgeColor || '#00B4D8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 88);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = this.interiorType === 'tower-control' ? 'TECHNOCORE TOWER // CONTROL ROOM'
      : this.interiorType === 'institute-classroom' ? 'THE INSTITUTE // ACADEMY'
      : this.interiorType === 'engineering-bay' ? 'ENGINEERING BAY // CLUSTER OPS'
      : this.interiorType === 'compute-floor' ? 'COMPUTE FOUNDRY // INFERENCE CORE'
      : `${this.layout.name.toUpperCase()} // INTERIOR`;

    ctx.fillText(title, 256, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.PlaneGeometry(Math.min(maxW * 0.85, 5.0), 0.9);
    const signMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, y, z);
    this.group.add(signMesh);
  }

  private buildTowerControlRoom(floorY: number, wallZ: number) {
    const screenWidths = [1.5, 1.8, 1.5];
    const offsets = [-1.9, 0, 1.9];

    offsets.forEach((xOff, idx) => {
      const sw = screenWidths[idx];
      const sh = 1.1;
      const sGeo = new THREE.PlaneGeometry(sw, sh);
      const sMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0x00B4D8 : 0x0466C8,
        transparent: true,
        opacity: 0.85
      });
      const scr = new THREE.Mesh(sGeo, sMat);
      scr.position.set(xOff, floorY + 2.1, wallZ + 0.14);
      this.group.add(scr);
      this.screens.push(scr);

      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(sGeo),
        new THREE.LineBasicMaterial({ color: 0xFDE047 })
      );
      frame.position.copy(scr.position);
      this.group.add(frame);
    });

    const rows = [-0.8, 0.8];
    const cols = [-1.2, 0, 1.2];

    rows.forEach((zRow, rIdx) => {
      cols.forEach((xCol) => {
        const deskGroup = AgentDeskFactory.createWorkstation({
          x: xCol,
          y: floorY + 0.12,
          z: zRow,
          rotationY: rIdx === 0 ? 0 : Math.PI,
          screenType: rIdx === 0 ? 'terminal' : 'telemetry'
        });
        this.group.add(deskGroup);
        this.deskSlots.push({ group: deskGroup });
      });
    });
  }

  private buildInstituteClassroom(floorY: number, wallZ: number) {
    const scrGeo = new THREE.PlaneGeometry(3.6, 1.4);
    const scrMat = new THREE.MeshBasicMaterial({
      color: 0x00B4D8,
      transparent: true,
      opacity: 0.8
    });
    const scr = new THREE.Mesh(scrGeo, scrMat);
    scr.position.set(0, floorY + 2.2, wallZ + 0.14);
    this.group.add(scr);
    this.screens.push(scr);

    const podiumGeo = new THREE.BoxGeometry(0.8, 0.9, 0.5);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.7 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, floorY + 0.45, -1.2);
    this.group.add(podium);

    const studentCols = [-1.4, -0.4, 0.6, 1.6];
    const studentRows = [0.2, 1.4];

    studentRows.forEach(zR => {
      studentCols.forEach(xC => {
        const deskGroup = AgentDeskFactory.createWorkstation({
          x: xC,
          y: floorY + 0.12,
          z: zR,
          rotationY: 0,
          screenType: 'terminal'
        });
        this.group.add(deskGroup);
        this.deskSlots.push({ group: deskGroup });
      });
    });
  }

  private buildEngineeringBay(floorY: number, wallZ: number) {
    const rackW = 0.8;
    const rackH = 2.8;
    const rackD = 0.55;
    const rackPositions = [-2.1, -0.7, 0.7, 2.1];

    rackPositions.forEach((xP) => {
      const rackGeo = new THREE.BoxGeometry(rackW, rackH, rackD);
      const rackMat = new THREE.MeshStandardMaterial({
        color: 0x0A0F1D,
        roughness: 0.5,
        metalness: 0.8
      });
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(xP, floorY + rackH / 2, wallZ + 0.35);
      this.group.add(rack);

      const rackEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(rackGeo),
        new THREE.LineBasicMaterial({ color: 0x4CC9F0 })
      );
      rackEdges.position.copy(rack.position);
      this.group.add(rackEdges);

      const ledColors = [0x32D74B, 0x00B4D8, 0xF72585, 0xFDE047];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          const lGeo = new THREE.PlaneGeometry(0.08, 0.08);
          const col = ledColors[(r + c) % ledColors.length];
          const lMat = new THREE.MeshBasicMaterial({
            color: col,
            transparent: true,
            opacity: 0.9
          });
          const led = new THREE.Mesh(lGeo, lMat);
          led.position.set(
            xP - 0.22 + c * 0.22,
            floorY + 0.6 + r * 0.45,
            wallZ + 0.35 + rackD / 2 + 0.02
          );
          this.group.add(led);
          this.blinkingLeds.push({
            mesh: led,
            baseIntensity: 0.9,
            speed: 3 + (r * 3 + c) * 0.7,
            color: new THREE.Color(col)
          });
        }
      }
    });

    [-1.2, 0, 1.2].forEach(xP => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: xP,
        y: floorY + 0.12,
        z: 0.5,
        rotationY: 0,
        screenType: 'terminal'
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup });
    });
  }

  private buildComputeFoundryFloor(floorY: number, wallZ: number) {
    [-1.8, 0, 1.8].forEach(xP => {
      const cabGeo = new THREE.BoxGeometry(1.2, 2.5, 0.7);
      const cabMat = new THREE.MeshStandardMaterial({
        color: 0x080D1A,
        metalness: 0.9,
        roughness: 0.4
      });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(xP, floorY + 1.25, wallZ + 0.45);
      this.group.add(cab);

      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(cabGeo),
        new THREE.LineBasicMaterial({ color: 0xC77DFF })
      );
      frame.position.copy(cab.position);
      this.group.add(frame);
    });

    [-1.1, 0, 1.1].forEach(xP => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: xP,
        y: floorY + 0.12,
        z: 0.6,
        rotationY: 0,
        screenType: 'telemetry'
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup });
    });
  }

  private buildGenericOffice(floorY: number) {
    [-0.9, 0.9].forEach(xP => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: xP,
        y: floorY + 0.12,
        z: 0.5,
        rotationY: 0,
        screenType: 'terminal'
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup });
    });
  }

  /**
   * Binds real observed senders from this room to desk slots.
   * If zero identities have posted here, desks remain cleanly vacant.
   */
  public updateRoomIdentities(identities: ObservedIdentity[]) {
    // Clear previous workers
    this.deskSlots.forEach(slot => {
      if (slot.worker) {
        slot.group.remove(slot.worker.group);
        slot.worker.dispose();
        slot.worker = undefined;
        slot.assignedDid = undefined;
      }
    });

    // Populate desks with real identities
    identities.slice(0, this.deskSlots.length).forEach((id, idx) => {
      const slot = this.deskSlots[idx];
      const visorColor = id.isVerified ? '#00B4D8' : id.verificationStatus === 'PRESENT_UNVERIFIED' ? '#F0A824' : '#94A3B8';
      const worker = new AgentWorker({
        x: 0,
        y: 0.25,
        z: 0.46,
        rotationY: 0,
        isSeated: true,
        visorColor,
        activityState: id.isVerified ? 'surge' : 'active'
      });
      slot.group.add(worker.group);
      slot.worker = worker;
      slot.assignedDid = id.did;
    });
  }

  /**
   * Triggers a brief 3.5s typing activity strictly when an observed message arrives.
   */
  public triggerMessageActivity(did: string) {
    const slot = this.deskSlots.find(s => s.assignedDid === did) || this.deskSlots[0];
    if (slot) {
      slot.activeUntil = performance.now() + 3500;
    }
    this.activeMessagePulseUntil = performance.now() + 3500;
  }

  public setCutawayVisible(visible: boolean) {
    this.group.visible = visible;
  }

  public update(time: number) {
    if (!this.group.visible) return;
    const now = performance.now();

    // Animate seated workers: active typing if triggered by real event, subtle resting breathing otherwise
    this.deskSlots.forEach(slot => {
      if (slot.worker) {
        if (slot.activeUntil && now < slot.activeUntil) {
          slot.worker.update(time * 1.5);
        } else {
          slot.worker.update(time * 0.2);
        }
      }
    });

    // Animate blinking server rack LEDs
    this.blinkingLeds.forEach(led => {
      const blink = (Math.sin(time * led.speed) > 0.1) ? 1.0 : 0.2;
      (led.mesh.material as THREE.MeshBasicMaterial).opacity = blink;
    });

    // Screens glow pulse if recent real message pulse is active
    const isPulsing = now < this.activeMessagePulseUntil;
    this.screens.forEach((s, idx) => {
      const baseOpacity = isPulsing ? 0.95 : 0.75;
      (s.material as THREE.MeshBasicMaterial).opacity = baseOpacity + Math.sin(time * 2 + idx) * 0.1;
    });

    this.interiorLight.intensity = (isPulsing ? 2.8 : 2.0) + Math.sin(time * 3) * 0.2;
  }

  public updateRoomData(room: RoomCluster) {
    this.layout.room = room;
  }

  public dispose() {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.deskSlots.forEach(slot => {
      if (slot.worker) slot.worker.dispose();
    });
    this.deskSlots = [];
    this.blinkingLeds = [];
    this.screens = [];
  }
}
