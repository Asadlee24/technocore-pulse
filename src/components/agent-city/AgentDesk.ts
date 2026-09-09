import * as THREE from 'three';

export interface DeskConfig {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  screenType?: 'terminal' | 'telemetry' | 'signal';
  hasWorker?: boolean;
}

export class AgentDeskFactory {
  // Shared geometries for performance
  private static deskTopGeo: THREE.BoxGeometry | null = null;
  private static deskLegGeo: THREE.CylinderGeometry | null = null;
  private static chairSeatGeo: THREE.CylinderGeometry | null = null;
  private static chairBackGeo: THREE.BoxGeometry | null = null;
  private static laptopBaseGeo: THREE.BoxGeometry | null = null;
  private static laptopScreenGeo: THREE.BoxGeometry | null = null;

  // Shared materials
  private static deskMat: THREE.MeshStandardMaterial | null = null;
  private static legMat: THREE.MeshStandardMaterial | null = null;
  private static chairMat: THREE.MeshStandardMaterial | null = null;
  private static laptopBodyMat: THREE.MeshStandardMaterial | null = null;
  private static screenTerminalMat: THREE.MeshBasicMaterial | null = null;
  private static screenTelemetryMat: THREE.MeshBasicMaterial | null = null;
  private static screenSignalMat: THREE.MeshBasicMaterial | null = null;

  public static initSharedResources() {
    if (this.deskTopGeo) return;

    this.deskTopGeo = new THREE.BoxGeometry(1.4, 0.08, 0.8);
    this.deskLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8);
    this.chairSeatGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12);
    this.chairBackGeo = new THREE.BoxGeometry(0.42, 0.35, 0.05);

    this.laptopBaseGeo = new THREE.BoxGeometry(0.42, 0.025, 0.32);
    this.laptopScreenGeo = new THREE.BoxGeometry(0.42, 0.28, 0.02);

    this.deskMat = new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.4,
      metalness: 0.6
    });

    this.legMat = new THREE.MeshStandardMaterial({
      color: 0x1B2A3D,
      roughness: 0.5,
      metalness: 0.8
    });

    this.chairMat = new THREE.MeshStandardMaterial({
      color: 0x0B1320,
      roughness: 0.6,
      metalness: 0.5
    });

    this.laptopBodyMat = new THREE.MeshStandardMaterial({
      color: 0x050A12,
      roughness: 0.2,
      metalness: 0.9
    });

    // Procedural glowing screen materials
    this.screenTerminalMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7 // Cyan terminal glow
    });

    this.screenTelemetryMat = new THREE.MeshBasicMaterial({
      color: 0x2FD27F // Signal green telemetry
    });

    this.screenSignalMat = new THREE.MeshBasicMaterial({
      color: 0x4DA3FF // Soft blue protocol feed
    });
  }

  /**
   * Builds an individual desk workstation with chair and glowing laptop
   */
  public static createWorkstation(config: DeskConfig): THREE.Group {
    this.initSharedResources();

    const group = new THREE.Group();
    group.position.set(config.x, config.y, config.z);
    if (config.rotationY) group.rotation.y = config.rotationY;

    // 1. Desk Surface
    const deskTop = new THREE.Mesh(this.deskTopGeo!, this.deskMat!);
    deskTop.position.y = 0.7;
    deskTop.castShadow = true;
    group.add(deskTop);

    // 2. Desk Legs (4 slim minimalist pillars)
    const legOffsets = [
      [-0.6, 0.35, -0.3],
      [0.6, 0.35, -0.3],
      [-0.6, 0.35, 0.3],
      [0.6, 0.35, 0.3]
    ];
    legOffsets.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(this.deskLegGeo!, this.legMat!);
      leg.position.set(lx, ly, lz);
      group.add(leg);
    });

    // 3. Ergonomic Minimalist Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 0.55); // positioned behind desk

    const seat = new THREE.Mesh(this.chairSeatGeo!, this.chairMat!);
    seat.position.y = 0.42;
    chairGroup.add(seat);

    const chairPost = new THREE.Mesh(this.deskLegGeo!, this.legMat!);
    chairPost.scale.set(1, 0.6, 1);
    chairPost.position.y = 0.21;
    chairGroup.add(chairPost);

    const backrest = new THREE.Mesh(this.chairBackGeo!, this.chairMat!);
    backrest.position.set(0, 0.72, 0.2);
    chairGroup.add(backrest);

    group.add(chairGroup);

    // 4. Autonomous Agent Laptop
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(0, 0.75, 0.05);

    // Laptop Base
    const laptopBase = new THREE.Mesh(this.laptopBaseGeo!, this.laptopBodyMat!);
    laptopGroup.add(laptopBase);

    // Laptop Display (raised at ~105 deg angle)
    const screenMat = config.screenType === 'telemetry'
      ? this.screenTelemetryMat!
      : config.screenType === 'signal'
        ? this.screenSignalMat!
        : this.screenTerminalMat!;

    const laptopScreen = new THREE.Mesh(this.laptopScreenGeo!, screenMat);
    laptopScreen.position.set(0, 0.14, -0.15);
    laptopScreen.rotation.x = -Math.PI / 10; // angled upward
    laptopGroup.add(laptopScreen);

    // Tiny keyboard accent plate
    const kbGeo = new THREE.PlaneGeometry(0.36, 0.16);
    const kbMat = new THREE.MeshBasicMaterial({ color: 0x1B2A3D });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.rotation.x = -Math.PI / 2;
    kb.position.set(0, 0.016, 0.04);
    laptopGroup.add(kb);

    group.add(laptopGroup);

    return group;
  }

  public static dispose() {
    this.deskTopGeo?.dispose();
    this.deskLegGeo?.dispose();
    this.chairSeatGeo?.dispose();
    this.chairBackGeo?.dispose();
    this.laptopBaseGeo?.dispose();
    this.laptopScreenGeo?.dispose();

    this.deskMat?.dispose();
    this.legMat?.dispose();
    this.chairMat?.dispose();
    this.laptopBodyMat?.dispose();
    this.screenTerminalMat?.dispose();
    this.screenTelemetryMat?.dispose();
    this.screenSignalMat?.dispose();

    this.deskTopGeo = null;
    this.deskLegGeo = null;
    this.chairSeatGeo = null;
    this.chairBackGeo = null;
    this.laptopBaseGeo = null;
    this.laptopScreenGeo = null;
  }
}
