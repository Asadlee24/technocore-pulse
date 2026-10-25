import * as THREE from "three";
import type { RoomCluster } from "../../types/probe";
import { AgentDeskFactory, type DeskConfig } from "./AgentDesk";
import { AgentWorker } from "./AgentWorker";

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
  private structureResources: {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  }[] = [];
  private commandDisplayMesh: THREE.Mesh | null = null;
  private commandCanvas: HTMLCanvasElement | null = null;
  private commandTexture: THREE.CanvasTexture | null = null;

  constructor(config: OfficeFloorConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.y = config.floorIndex * config.floorHeight;

    this.buildFloorStructure();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !Array.isArray(obj.material))
        this.structureResources.push({
          geometry: obj.geometry,
          material: obj.material,
        });
    });
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
      color: 0x71869d,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(slabGeo, floorMat);
    floorMesh.position.y = 0.08;
    floorMesh.receiveShadow = true;
    this.group.add(floorMesh);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xb9c8d6,
      roughness: 0.85,
    });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.2, floorHeight - 0.1, 0.08),
      wallMat,
    );
    backWall.position.set(0, floorHeight / 2, -depth / 2 + 0.08);
    backWall.receiveShadow = true;
    this.group.add(backWall);
    // A ribbed wall and recessed cabinetry frame the desks without covering the cutaway.
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x253e59,
      roughness: 0.75,
    });
    for (const side of [-1, 1]) {
      const cabinet = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.3),
        cabinetMat,
      );
      cabinet.position.set(side * (width / 2 - 0.43), 0.42, -depth / 2 + 0.29);
      this.group.add(cabinet);
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.08, 0.17, 10),
        new THREE.MeshStandardMaterial({ color: 0xaf9978, roughness: 0.8 }),
      );
      pot.position.set(side * (width / 2 - 0.43), 0.8, -depth / 2 + 0.29);
      this.group.add(pot);
      const leaves = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.17, 1),
        new THREE.MeshStandardMaterial({ color: 0x638364, roughness: 0.9 }),
      );
      leaves.scale.set(0.7, 1.7, 0.7);
      leaves.position.set(pot.position.x, 1.03, pot.position.z);
      this.group.add(leaves);
    }

    // Ceiling Light Bars (recessed cyan/soft white glow)
    const lightBarGeo = new THREE.PlaneGeometry(width * 0.7, 0.2);
    const lightBarMat = new THREE.MeshBasicMaterial({
      color: 0xffe5b5,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.rotation.x = Math.PI / 2;
    lightBar.position.set(0, floorHeight - 0.05, 0);
    this.group.add(lightBar);

    // Subtle interior floor boundary glass railing
    const railGeo = new THREE.BoxGeometry(width - 0.3, 0.4, 0.05);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xc3d9cd,
      transparent: true,
      opacity: 0.16,
      roughness: 0.1,
      metalness: 0.9,
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

    // Calculate clean non-overlapping spacing across the room
    const spacingX = Math.min(1.35, (width - 0.8) / 3);
    const rowZ = Math.min(1.25, depth * 0.24);

    // 6 distinct workstations arranged in 2 collaborative banks
    const deskLayouts: DeskConfig[] = [
      // Row 1 (desks at -rowZ, facing towards +Z center aisle, rotationY: 0)
      { x: -spacingX, y: 0.15, z: -rowZ, rotationY: 0, screenType: "terminal" },
      { x: 0, y: 0.15, z: -rowZ, rotationY: 0, screenType: "telemetry" },
      { x: spacingX, y: 0.15, z: -rowZ, rotationY: 0, screenType: "signal" },

      // Row 2 (desks at +rowZ, facing towards -Z center aisle, rotationY: Math.PI)
      {
        x: -spacingX,
        y: 0.15,
        z: rowZ,
        rotationY: Math.PI,
        screenType: "signal",
      },
      { x: 0, y: 0.15, z: rowZ, rotationY: Math.PI, screenType: "terminal" },
      {
        x: spacingX,
        y: 0.15,
        z: rowZ,
        rotationY: Math.PI,
        screenType: "telemetry",
      },
    ];

    // Fixed illustrative crew. Geometry never represents a measured population.
    deskLayouts.forEach((cfg) => {
      // 1. Create Workstation (Desk + Ergonomic Chair + Glowing Cyber Laptop)
      const deskGroup = AgentDeskFactory.createWorkstation(cfg);
      this.group.add(deskGroup);

      // 2. Mount Seated Agent directly inside deskGroup
      // Because worker is a child of deskGroup, local (0, 0.25, 0.46) places them squarely on the chair,
      // facing the laptop (-Z) with hands on the keyboard regardless of desk rotation!
      const worker = new AgentWorker({
        x: 0,
        y: 0.25,
        z: 0.46,
        rotationY: 0, // Faces forward (-Z) towards laptop
        isSeated: true,
        visorColor: "#00B4D8",
        animationPhase:
          cfg.x * 1.7 + cfg.z * 3.1 + this.config.floorIndex * 0.8,
        activityState: room.status === "surge" ? "surge" : "active",
      });
      deskGroup.userData.illustrativeCrew = true;
      deskGroup.add(worker.group);
      this.workers.push(worker);
    });
  }

  /**
   * Builds the shared Room Command Center wall screen with real room data
   */
  private buildCommandCenterScreen() {
    const { width, depth } = this.config;

    const canvas = document.createElement("canvas");
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
      side: THREE.FrontSide,
    });

    this.commandDisplayMesh = new THREE.Mesh(screenGeo, screenMat);
    // Positioned on the back wall of the office floor
    this.commandDisplayMesh.position.set(0, 1.4, -depth / 2 + 0.2);
    this.group.add(this.commandDisplayMesh);
  }

  private renderCommandTexture() {
    if (!this.commandCanvas) return;
    const ctx = this.commandCanvas.getContext("2d");
    if (!ctx) return;

    const { room } = this.config;

    // Dark sleek terminal background
    ctx.fillStyle = "#050A12";
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = "#00B4D8";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    // Top Header Bar
    ctx.fillStyle = "#0B1320";
    ctx.fillRect(10, 10, 492, 44);

    ctx.fillStyle = "#00B4D8";
    ctx.font = "bold 22px monospace";
    ctx.fillText(`ROOM: ${room.displayName || room.name}`, 24, 40);

    ctx.fillStyle = room.status === "surge" ? "#2FD27F" : "#4DA3FF";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`STATUS: ${room.status.toUpperCase()}`, 340, 40);

    // Data Rows
    ctx.fillStyle = "#95A4B8";
    ctx.font = "16px monospace";
    ctx.fillText(`SIGNED IDENTITIES:`, 24, 90);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px monospace";
    const didsText =
      typeof room.signedIdentitiesObserved === "number"
        ? `${room.signedIdentitiesObserved} DIDs`
        : "UNKNOWN";
    ctx.fillText(didsText, 220, 90);

    ctx.fillStyle = "#95A4B8";
    ctx.font = "16px monospace";
    ctx.fillText(`VISUAL DISTRICT:`, 24, 130);
    ctx.fillStyle = "#36D7E7";
    ctx.fillText(
      (room.visualDistrict || room.category).toUpperCase(),
      220,
      130,
    );

    ctx.fillStyle = "#95A4B8";
    ctx.font = "16px monospace";
    ctx.fillText(`LAST PROBE ARM:`, 24, 170);
    ctx.fillStyle =
      room.lastProbeArm === "question"
        ? "#F0A824"
        : room.lastProbeArm === "offer"
          ? "#A855F7"
          : "#4DA3FF";
    ctx.fillText(
      room.lastProbeArm ? room.lastProbeArm.toUpperCase() : "NONE OBSERVED",
      220,
      170,
    );

    ctx.fillStyle = "#95A4B8";
    ctx.font = "16px monospace";
    ctx.fillText(`SUBSEQUENT LATENCY:`, 24, 210);
    ctx.fillStyle = "#2FD27F";
    const latencyVal =
      typeof room.medianSubsequentLatencySeconds === "number"
        ? `${room.medianSubsequentLatencySeconds.toFixed(1)}s (120s WINDOW)`
        : "NOT MEASURED";
    ctx.fillText(latencyVal, 220, 210);

    // Bottom telemetry ticker
    ctx.fillStyle = "#1B2A3D";
    ctx.fillRect(10, 226, 492, 20);
    ctx.fillStyle = "#6F8096";
    ctx.font = "11px monospace";
    ctx.fillText(`ILLUSTRATIVE OFFICE CREW · NOT AN AGENT COUNT`, 24, 240);
  }

  /**
   * Update animations
   */
  public update(time: number) {
    this.workers.forEach((w) => w.update(time));
  }

  public updateRoomData(room: RoomCluster) {
    this.config.room = room;
    if (this.commandCanvas && this.commandTexture) {
      this.renderCommandTexture();
      this.commandTexture.needsUpdate = true;
    }
  }

  public dispose() {
    this.workers.forEach((worker) => worker.dispose());
    this.structureResources.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
    this.structureResources = [];
    this.commandDisplayMesh?.geometry.dispose();
    if (this.commandDisplayMesh?.material instanceof THREE.Material)
      this.commandDisplayMesh.material.dispose();
    this.commandTexture?.dispose();
    this.commandDisplayMesh = null;
    this.commandCanvas = null;
    this.workers = [];
  }
}
