import * as THREE from 'three';
import type { BuildingLayout, InteriorStageType } from './cityLayout';
import type { ObservedIdentity } from '../../context/DataContext';
import { AgentWorker } from './AgentWorker';
import { AgentDeskFactory } from './AgentDesk';

interface DeskSlot {
  group: THREE.Group;
  floor: 1 | 2 | 3;
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
  private interiorLights: THREE.PointLight[] = [];
  private screens: THREE.Mesh[] = [];
  private activeMessagePulseUntil: number = 0;
  private currentFocusedFloor: 1 | 2 | 3 | 'all' = 'all';

  constructor(layout: BuildingLayout) {
    this.layout = layout;
    this.interiorType = layout.interiorType;
    this.group = new THREE.Group();
    this.group.name = `interior-${layout.id}`;
    this.group.visible = false; // Hidden until cutaway / enter

    // Multi-tier Lighting: Lights on each floor level
    const lightColors = [0xFDE047, 0x38BDF8, 0xC084FC];
    [1.8, 6.2, 10.6].forEach((ly, idx) => {
      const pLight = new THREE.PointLight(lightColors[idx], 1.8, 22);
      pLight.position.set(0, ly, 0);
      this.group.add(pLight);
      this.interiorLights.push(pLight);
    });

    this.buildMultiFloorStructure();
  }

  /**
   * Constructs a 3-Floor Multi-Tier Architectural Stage matching reference:
   * - Floor 1: Ground Operations & Control Room (Y = 0.3)
   * - Floor 2: Mezzanine Engineering & Labs (Y = 4.8)
   * - Floor 3: Observation Deck & Sky Lounge (Y = 9.2)
   */
  private buildMultiFloorStructure() {
    const stageRadius = Math.max(4.6, Math.min(this.layout.width, this.layout.depth) * 0.95);
    const borderColor = this.layout.edgeColor || '#00B4D8';

    // Shared floor slab material
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0A1128,
      roughness: 0.65,
      metalness: 0.45
    });

    const borderMat = new THREE.LineBasicMaterial({
      color: borderColor,
      transparent: true,
      opacity: 0.95
    });

    // 4 Corner Architectural Columns supporting the structure
    const colGeo = new THREE.BoxGeometry(0.35, 12.5, 0.35);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x1E2A3E, roughness: 0.5, metalness: 0.8 });
    const colOffsets = [
      [-stageRadius * 0.7, 6.0, -stageRadius * 0.65],
      [stageRadius * 0.7, 6.0, -stageRadius * 0.65],
      [-stageRadius * 0.7, 6.0, stageRadius * 0.65],
      [stageRadius * 0.7, 6.0, stageRadius * 0.65]
    ];
    colOffsets.forEach(([cx, cy, cz]) => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, cy, cz);
      this.group.add(col);
    });

    // =========================================================================
    // FLOOR 1: GROUND LEVEL — OPERATIONS & CONTROL ROOM (Y = 0.3)
    // =========================================================================
    const f1Y = 0.3;
    const hexGeo1 = new THREE.CylinderGeometry(stageRadius, stageRadius, 0.3, 6);
    const floor1 = new THREE.Mesh(hexGeo1, floorMat);
    floor1.position.y = f1Y;
    floor1.receiveShadow = true;
    this.group.add(floor1);

    const f1Border = new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo1), borderMat);
    f1Border.position.y = f1Y;
    this.group.add(f1Border);

    // Floor 1 Back Wall & Video Screens
    const wall1W = stageRadius * 1.5;
    const wall1H = 3.8;
    const wall1Geo = new THREE.BoxGeometry(wall1W, wall1H, 0.2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0C1626, roughness: 0.8 });
    const backWall1 = new THREE.Mesh(wall1Geo, wallMat);
    backWall1.position.set(0, f1Y + wall1H / 2, -stageRadius * 0.72);
    this.group.add(backWall1);

    // Floor 1 Signboard: "MAIN TOWER // OPERATIONS HUB"
    this.buildWallSignboard(backWall1.position.y + wall1H * 0.35, backWall1.position.z + 0.12, wall1W, 'FLOOR 1 // OPERATIONS & CONTROL');

    // 3 Large Video Wall Screens (frame_22s)
    const screenOffsets = [-1.8, 0, 1.8];
    screenOffsets.forEach((sx, sIdx) => {
      const sGeo = new THREE.PlaneGeometry(1.5, 1.1);
      const sMat = new THREE.MeshBasicMaterial({
        color: sIdx === 1 ? 0x00B4D8 : 0xF59E0B,
        transparent: true,
        opacity: 0.85
      });
      const scr = new THREE.Mesh(sGeo, sMat);
      scr.position.set(sx, f1Y + 2.0, backWall1.position.z + 0.13);
      this.group.add(scr);
      this.screens.push(scr);

      const fGeo = new THREE.EdgesGeometry(sGeo);
      const frame = new THREE.LineSegments(fGeo, new THREE.LineBasicMaterial({ color: 0xFDE047 }));
      frame.position.copy(scr.position);
      this.group.add(frame);
    });

    // Floor 1 Server Racks with Blinking LEDs (frame_44s)
    this.buildServerRacks(f1Y, stageRadius * 0.75, backWall1.position.z + 0.8);

    // Floor 1 Workstations (4 Desks)
    const f1DeskCoords = [
      { x: -1.4, z: -0.6, rot: 0, screen: 'gold' as const },
      { x: 1.4, z: -0.6, rot: 0, screen: 'gold' as const },
      { x: -1.4, z: 1.2, rot: Math.PI, screen: 'terminal' as const },
      { x: 1.4, z: 1.2, rot: Math.PI, screen: 'terminal' as const }
    ];
    f1DeskCoords.forEach(d => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: d.x,
        y: f1Y + 0.15,
        z: d.z,
        rotationY: d.rot,
        screenType: d.screen
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup, floor: 1 });
    });

    // =========================================================================
    // FLOOR 2: MEZZANINE LEVEL — ENGINEERING & LABS (Y = 4.8)
    // =========================================================================
    const f2Y = 4.8;
    const f2Radius = stageRadius * 0.92;
    const hexGeo2 = new THREE.CylinderGeometry(f2Radius, f2Radius, 0.25, 6);
    const floor2 = new THREE.Mesh(hexGeo2, floorMat);
    floor2.position.y = f2Y;
    this.group.add(floor2);

    const f2Border = new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo2), borderMat);
    f2Border.position.y = f2Y;
    this.group.add(f2Border);

    // Translucent Safety Railing around Mezzanine
    const railGeo = new THREE.CylinderGeometry(f2Radius, f2Radius, 0.8, 6, 1, true);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const railing = new THREE.Mesh(railGeo, railMat);
    railing.position.y = f2Y + 0.4;
    this.group.add(railing);

    // Floor 2 Back Wall & Engineering Display
    const backWall2 = new THREE.Mesh(new THREE.BoxGeometry(wall1W * 0.9, 3.6, 0.2), wallMat);
    backWall2.position.set(0, f2Y + 1.8, -stageRadius * 0.65);
    this.group.add(backWall2);

    this.buildWallSignboard(backWall2.position.y + 1.2, backWall2.position.z + 0.12, wall1W * 0.9, 'FLOOR 2 // ENGINEERING & RESEARCH');

    // Floor 2 Engineering Display Screens
    [-1.5, 1.5].forEach(ex => {
      const scrGeo = new THREE.PlaneGeometry(1.6, 0.9);
      const scr = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.8 }));
      scr.position.set(ex, f2Y + 1.8, backWall2.position.z + 0.12);
      this.group.add(scr);
      this.screens.push(scr);
    });

    // Floor 2 Workstations (4 Desks)
    const f2DeskCoords = [
      { x: -1.3, z: -0.5, rot: 0, screen: 'terminal' as const },
      { x: 1.3, z: -0.5, rot: 0, screen: 'terminal' as const },
      { x: -1.3, z: 1.1, rot: Math.PI, screen: 'telemetry' as const },
      { x: 1.3, z: 1.1, rot: Math.PI, screen: 'telemetry' as const }
    ];
    f2DeskCoords.forEach(d => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: d.x,
        y: f2Y + 0.12,
        z: d.z,
        rotationY: d.rot,
        screenType: d.screen
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup, floor: 2 });
    });

    // =========================================================================
    // FLOOR 3: SKY OBSERVATION DECK & RELAY LOUNGE (Y = 9.2)
    // =========================================================================
    const f3Y = 9.2;
    const f3Radius = stageRadius * 0.85;
    const hexGeo3 = new THREE.CylinderGeometry(f3Radius, f3Radius, 0.25, 6);
    const floor3 = new THREE.Mesh(hexGeo3, floorMat);
    floor3.position.y = f3Y;
    this.group.add(floor3);

    const f3Border = new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo3), new THREE.LineBasicMaterial({ color: 0xF72585, transparent: true, opacity: 0.95 }));
    f3Border.position.y = f3Y;
    this.group.add(f3Border);

    // Floor 3 Glass Sky Railing
    const f3Rail = new THREE.Mesh(new THREE.CylinderGeometry(f3Radius, f3Radius, 0.7, 6, 1, true), railMat);
    f3Rail.position.y = f3Y + 0.35;
    this.group.add(f3Rail);

    // Central Holographic Projector Pedestal
    const holoBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8 }));
    holoBase.position.set(0, f3Y + 0.3, 0);
    this.group.add(holoBase);

    const holoGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0x38BDF8, wireframe: true, transparent: true, opacity: 0.7 }));
    holoGlobe.position.set(0, f3Y + 0.9, 0);
    this.group.add(holoGlobe);

    // Floor 3 Observation Workstations (4 Desks)
    const f3DeskCoords = [
      { x: -1.2, z: -0.6, rot: 0.2, screen: 'signal' as const },
      { x: 1.2, z: -0.6, rot: -0.2, screen: 'signal' as const },
      { x: -1.2, z: 0.8, rot: Math.PI - 0.2, screen: 'telemetry' as const },
      { x: 1.2, z: 0.8, rot: Math.PI + 0.2, screen: 'telemetry' as const }
    ];
    f3DeskCoords.forEach(d => {
      const deskGroup = AgentDeskFactory.createWorkstation({
        x: d.x,
        y: f3Y + 0.12,
        z: d.z,
        rotationY: d.rot,
        screenType: d.screen
      });
      this.group.add(deskGroup);
      this.deskSlots.push({ group: deskGroup, floor: 3 });
    });
  }

  private buildWallSignboard(y: number, z: number, maxW: number, customTitle?: string) {
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
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = customTitle || (
      this.interiorType === 'tower-control' ? 'TECHNOCORE TOWER // OPERATIONS' :
      this.interiorType === 'institute-classroom' ? 'THE INSTITUTE // ACADEMY' :
      this.interiorType === 'engineering-bay' ? 'ENGINEERING BAY // CLUSTER OPS' :
      this.interiorType === 'compute-floor' ? 'COMPUTE FOUNDRY // INFERENCE CORE' :
      `${this.layout.name.toUpperCase()} // OPERATIONS`
    );
    ctx.fillText(title, 256, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.PlaneGeometry(Math.min(maxW * 0.85, 4.8), 0.8);
    const signMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, y, z);
    this.group.add(signMesh);
  }

  /**
   * Server Racks with Blinking LED Arrays matching reference screenshot frame_44s
   */
  private buildServerRacks(baseY: number, rightX: number, zPos: number) {
    const rackW = 0.5;
    const rackH = 2.4;
    const rackD = 0.6;
    const rackGeo = new THREE.BoxGeometry(rackW, rackH, rackD);
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x080E18,
      roughness: 0.4,
      metalness: 0.85
    });

    const ledColors = [0x10B981, 0x38BDF8, 0xF59E0B, 0xEC4899];
    const ledGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);

    [-0.6, 0, 0.6].forEach((xOff, rIdx) => {
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(rightX + xOff, baseY + rackH / 2, zPos);
      this.group.add(rack);

      // Grid of LED activity dots on rack face
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          const colorHex = ledColors[(row + col + rIdx) % ledColors.length];
          const ledMat = new THREE.MeshBasicMaterial({ color: colorHex });
          const led = new THREE.Mesh(ledGeo, ledMat);
          led.position.set(
            rack.position.x - 0.15 + col * 0.15,
            rack.position.y - 0.8 + row * 0.28,
            rack.position.z + rackD / 2 + 0.015
          );
          this.group.add(led);

          this.blinkingLeds.push({
            mesh: led,
            baseIntensity: 0.8,
            speed: 3.0 + (row * col) % 4,
            color: new THREE.Color(colorHex)
          });
        }
      }
    });
  }

  /**
   * Dynamically binds real observed senders across all 3 floors.
   * If identities is empty, desks remain honestly vacant.
   */
  public bindRealObservedIdentities(identities: ObservedIdentity[]) {
    // 1. Clear previous workers from desks
    this.deskSlots.forEach(slot => {
      if (slot.worker) {
        slot.group.remove(slot.worker.group);
        slot.worker.dispose();
        slot.worker = undefined;
      }
      slot.assignedDid = undefined;
    });

    if (!identities || identities.length === 0) return;

    // Distribute observed identities across Floor 1, Floor 2, and Floor 3 desks
    const suitPalettes = ['#0284C7', '#0EA5E9', '#2563EB', '#7C3AED', '#D97706', '#059669', '#DB2777'];

    identities.forEach((id, idx) => {
      if (idx >= this.deskSlots.length) return;
      const slot = this.deskSlots[idx];
      slot.assignedDid = id.did;

      // Deterministic suit & visor colors
      let hash = 0;
      for (let i = 0; i < id.did.length; i++) hash = (hash * 31 + id.did.charCodeAt(i)) >>> 0;
      const suitColor = suitPalettes[hash % suitPalettes.length];
      const visorColor = id.verificationStatus === 'VERIFIED' ? '#38BDF8' : '#F59E0B';

      // Create stylized seated worker at desk
      const worker = new AgentWorker({
        x: 0,
        y: 0,
        z: 0.44, // seated in high-back chair behind desk
        rotationY: Math.PI, // facing desk monitors
        isSeated: true,
        activityState: id.isVerified ? 'surge' : 'active',
        visorColor,
        suitColor
      });

      slot.worker = worker;
      slot.group.add(worker.group);
    });
  }

  public triggerMessageActivity(did: string) {
    const slot = this.deskSlots.find(s => s.assignedDid === did);
    if (slot && slot.worker) {
      slot.activeUntil = performance.now() + 3500;
    }
    this.activeMessagePulseUntil = performance.now() + 1500;
  }

  /**
   * Camera focus target offsets for Floor 1, Floor 2, Floor 3, or All Floors
   */
  public getFloorCameraFocus(floor: 1 | 2 | 3 | 'all'): { cameraOffset: THREE.Vector3; targetOffset: THREE.Vector3 } {
    this.currentFocusedFloor = floor;
    if (floor === 1) {
      return {
        cameraOffset: new THREE.Vector3(0, 3.2, 7.5),
        targetOffset: new THREE.Vector3(0, 1.8, 0)
      };
    } else if (floor === 2) {
      return {
        cameraOffset: new THREE.Vector3(0, 7.6, 7.5),
        targetOffset: new THREE.Vector3(0, 6.2, 0)
      };
    } else if (floor === 3) {
      return {
        cameraOffset: new THREE.Vector3(0, 12.0, 7.5),
        targetOffset: new THREE.Vector3(0, 10.6, 0)
      };
    }
    // All floors stacked cutaway view
    return {
      cameraOffset: new THREE.Vector3(0, 9.0, 17.0),
      targetOffset: new THREE.Vector3(0, 5.2, 0)
    };
  }

  public getFocusedFloor(): 1 | 2 | 3 | 'all' {
    return this.currentFocusedFloor;
  }

  public update(time: number) {
    if (!this.group.visible) return;

    // Animate blinking server LEDs
    this.blinkingLeds.forEach(led => {
      const pulse = Math.sin(time * led.speed) > 0.1 ? 1 : 0.2;
      (led.mesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    });

    // Animate workers at workstations
    const now = performance.now();
    this.deskSlots.forEach(slot => {
      if (slot.worker) {
        slot.worker.update(time);
      }
    });

    // Screen pulse on active protocol message
    if (now < this.activeMessagePulseUntil) {
      const pulse = 0.5 + Math.sin(time * 20) * 0.5;
      this.screens.forEach(s => {
        (s.material as THREE.MeshBasicMaterial).opacity = 0.8 + pulse * 0.2;
      });
    }
  }

  public setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  public dispose() {
    this.deskSlots.forEach(slot => {
      if (slot.worker) {
        slot.worker.dispose();
      }
    });
    this.deskSlots = [];
    this.blinkingLeds = [];
    this.screens = [];
  }
}
