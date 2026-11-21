import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CitySurfaces } from "./CitySurfaces";
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
  surfaces?: CitySurfaces;
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
    this.furnishOffice();
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

  private furnishOffice() {
    const { width, depth, floorHeight, floorIndex, room, surfaces } = this.config;
    const ivory = new THREE.MeshStandardMaterial({ color: 0xf3d9ad, roughness: .87, emissive: 0xd78b42, emissiveIntensity: .48 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x95816a, roughness: .36, metalness: .62 });
    const lamp = new THREE.Group();
    lamp.name = "office-lamp";
    const roomy = width >= 6 && depth >= 6;
    lamp.position.set(-width * .39, .15, roomy ? depth * .15 : -depth * .28);
    this.group.add(lamp);

    const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(lamp, new THREE.CylinderGeometry(.17, .2, .045, 16), bronze, 0, .025, 0);
    add(lamp, new THREE.CylinderGeometry(.018, .025, 1.43, 8), bronze, 0, .74, 0);
    add(lamp, new THREE.CylinderGeometry(.16, .27, .23, 20, 1, true), ivory, 0, 1.43, 0).material.side = THREE.DoubleSide;
    const bulb = new THREE.MeshBasicMaterial({ color: 0xffdeaa });
    add(lamp, new THREE.SphereGeometry(.073, 10, 8), bulb, 0, 1.37, 0).castShadow = false;
    const glow = new THREE.PointLight(0xffc494, 9, 4.2);
    glow.position.set(0, 1.34, 0);
    lamp.add(glow);

    // Light the workstations of whichever floor is visible in the cutaway.
    const overhead = new THREE.PointLight(0xffebd4, 11, Math.max(width, depth));
    overhead.position.set(.15, floorHeight - .18, -.65);
    this.group.add(overhead);
    if (!roomy) return;

    const lounge = new THREE.Group();
    lounge.name = "office-lounge";
    lounge.position.set(0, .155, depth * .30);
    this.group.add(lounge);
    const palette = [...room.name].reduce((value, letter) => value + letter.codePointAt(0)!, floorIndex) % 3;
    const fabric = new THREE.MeshStandardMaterial({
      color: [0x496c66, 0x5a697e, 0x9c705a][palette], roughness: .95,
    });
    const cushion = new THREE.MeshStandardMaterial({ color: 0xc48c61, roughness: .95 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x493d35, roughness: .75 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8f5f42, roughness: .65 });
    surfaces?.apply(wood, "wood");
    const rug = new THREE.MeshStandardMaterial({ color: 0x918579, roughness: 1 });
    const rugBorder = new THREE.MeshStandardMaterial({ color: 0x6c615e, roughness: 1 });
    const upholstered = (parent: THREE.Group, w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, radius = .06) =>
      add(parent, new RoundedBoxGeometry(w, h, d, 2, radius), material, x, y, z);

    upholstered(lounge, Math.min(width - .9, 5.6), .028, 2.35, rugBorder, 0, .018, 0, .01).castShadow = false;
    upholstered(lounge, Math.min(width - 1.1, 5.4), .019, 2.15, rug, 0, .032, 0, .006).castShadow = false;
    const seating = (name: string, x: number, span: number, rotation: number, seats: number) => {
      const seat = new THREE.Group();
      seat.name = name;
      seat.position.x = x;
      seat.rotation.y = rotation;
      lounge.add(seat);
      upholstered(seat, span, .22, .88, fabric, 0, .225, 0);
      upholstered(seat, span - .05, .54, .19, fabric, 0, .57, -.35).rotation.x = -.13;
      for (const side of [-1, 1]) {
        upholstered(seat, .13, .35, .82, fabric, side * (span / 2 - .08), .42, 0);
        for (const z of [-.31, .31]) add(seat, new THREE.BoxGeometry(.07, .15, .07), frame, side * (span / 2 - .13), .087, z);
      }
      const seatWidth = (span - .34) / seats;
      for (let i = 0; i < seats; i++) {
        const x = (i - (seats - 1) / 2) * seatWidth;
        upholstered(seat, seatWidth - .018, .12, .65, fabric, x, .385, .065);
        upholstered(seat, seatWidth * .81, .29, .12, i === 0 ? cushion : fabric, x, .59, -.19).rotation.x = -.18;
      }
    };
    seating("office-sofa", -1.95, 2.16, Math.PI / 2, 3);
    seating("office-armchair", 1.85, .92, -Math.PI / 2, 1);

    const table = upholstered(lounge, 1.22, .075, .67, wood, -.12, .455, 0, .035);
    table.name = "office-coffee-table";
    surfaces?.tile(table.geometry, wood);
    for (const x of [-.55, .31]) for (const z of [-.24, .24])
      add(lounge, new THREE.CylinderGeometry(.027, .034, .39, 8), frame, x, .227, z);
    upholstered(lounge, .23, .035, .17, cushion, -.33, .51, -.12, .009).rotation.y = .22;
    const cup = new THREE.MeshStandardMaterial({ color: 0xe6ddd0, roughness: .35 });
    add(lounge, new THREE.CylinderGeometry(.05, .04, .088, 12), cup, .18, .535, .11);
    add(lounge, new THREE.TorusGeometry(.024, .009, 6, 10), cup, .23, .54, .11);
  }

  /**
   * Builds the floor slab, ceiling slab, and subtle interior overhead lighting
   */
  private buildFloorStructure() {
    const { width, depth, floorHeight, surfaces } = this.config;

    // Floor Slab
    const slabGeo = new THREE.BoxGeometry(width - 0.2, 0.15, depth - 0.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x96795f,
      roughness: 0.59,
      metalness: 0.05,
    });
    surfaces?.apply(floorMat, "wood");
    surfaces?.tile(slabGeo, floorMat);
    const floorMesh = new THREE.Mesh(slabGeo, floorMat);
    floorMesh.position.y = 0.08;
    floorMesh.receiveShadow = true;
    this.group.add(floorMesh);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xb9c8d6,
      roughness: 0.85,
    });
    const backWallGeo = new THREE.BoxGeometry(width - 0.2, floorHeight - 0.1, 0.08);
    surfaces?.apply(wallMat, "concrete");
    surfaces?.tile(backWallGeo, wallMat);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, floorHeight / 2, -depth / 2 + 0.08);
    backWall.receiveShadow = true;
    this.group.add(backWall);
    if (surfaces) {
      const metal = new THREE.MeshStandardMaterial({
        color: 0x4a5762, roughness: .46, metalness: .55,
      });
      const skirting = new THREE.Mesh(new THREE.BoxGeometry(width - .24, .12, .045), metal);
      skirting.position.set(0, .23, -depth / 2 + .15);
      this.group.add(skirting);
      for (const side of [-1, 1]) {
        const lightHousing = new THREE.Mesh(new THREE.BoxGeometry(.09, .08, depth * .63), metal);
        lightHousing.position.set(side * width * .28, floorHeight - .03, 0);
        this.group.add(lightHousing);
        const diffuser = new THREE.Mesh(
          new THREE.BoxGeometry(.06, .02, depth * .60),
          new THREE.MeshBasicMaterial({ color: 0xffe6c3 }),
        );
        diffuser.position.copy(lightHousing.position).y -= .045;
        this.group.add(diffuser);
      }
    }
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
    const roomy = width >= 6 && depth >= 6;
    const rowZ = roomy ? depth * .15 : Math.min(1.25, depth * .24);
    const workAreaZ = roomy ? -depth * .21 : 0;

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
      const deskGroup = AgentDeskFactory.createWorkstation({ ...cfg, z: cfg.z + workAreaZ });
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
    new Set(this.structureResources.map(resource => resource.geometry)).forEach(geometry => geometry.dispose());
    new Set(this.structureResources.map(resource => resource.material)).forEach(material => material.dispose());
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
