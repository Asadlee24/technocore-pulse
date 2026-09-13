import * as THREE from 'three';

export interface DeskConfig {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  screenType?: 'terminal' | 'telemetry' | 'signal' | 'gold';
  hasWorker?: boolean;
}

export class AgentDeskFactory {
  // Shared geometries for performance
  private static deskTopGeo: THREE.BoxGeometry | null = null;
  private static deskLegGeo: THREE.CylinderGeometry | null = null;
  private static chairSeatGeo: THREE.BoxGeometry | null = null;
  private static chairBackGeo: THREE.BoxGeometry | null = null;
  private static chairPostGeo: THREE.CylinderGeometry | null = null;
  private static chairArmGeo: THREE.BoxGeometry | null = null;
  private static monitorScreenGeo: THREE.BoxGeometry | null = null;
  private static monitorBezelGeo: THREE.BoxGeometry | null = null;
  private static monitorStandGeo: THREE.CylinderGeometry | null = null;
  private static monitorBaseGeo: THREE.BoxGeometry | null = null;
  private static keyboardGeo: THREE.BoxGeometry | null = null;

  // Shared materials
  private static deskMat: THREE.MeshStandardMaterial | null = null;
  private static legMat: THREE.MeshStandardMaterial | null = null;
  private static chairMat: THREE.MeshStandardMaterial | null = null;
  private static monitorFrameMat: THREE.MeshStandardMaterial | null = null;
  private static screenTerminalMat: THREE.MeshBasicMaterial | null = null;
  private static screenTelemetryMat: THREE.MeshBasicMaterial | null = null;
  private static screenSignalMat: THREE.MeshBasicMaterial | null = null;
  private static screenGoldMat: THREE.MeshBasicMaterial | null = null;

  public static initSharedResources() {
    if (this.deskTopGeo) return;

    // Sleek wide technical workstation surface
    this.deskTopGeo = new THREE.BoxGeometry(1.35, 0.05, 0.70);
    this.deskLegGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8);

    // High-back executive chair matching reference screenshot frame_22s & frame_44s
    this.chairSeatGeo = new THREE.BoxGeometry(0.42, 0.08, 0.40);
    this.chairBackGeo = new THREE.BoxGeometry(0.40, 0.54, 0.06);
    this.chairPostGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8);
    this.chairArmGeo = new THREE.BoxGeometry(0.05, 0.04, 0.26);

    // Large desktop widescreen monitor matching reference screenshots
    this.monitorBezelGeo = new THREE.BoxGeometry(0.54, 0.36, 0.03);
    this.monitorScreenGeo = new THREE.BoxGeometry(0.50, 0.32, 0.01);
    this.monitorStandGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);
    this.monitorBaseGeo = new THREE.BoxGeometry(0.24, 0.02, 0.16);
    this.keyboardGeo = new THREE.BoxGeometry(0.40, 0.015, 0.14);

    this.deskMat = new THREE.MeshStandardMaterial({
      color: 0x121D2C,
      roughness: 0.35,
      metalness: 0.65
    });

    this.legMat = new THREE.MeshStandardMaterial({
      color: 0x1B2A3D,
      roughness: 0.5,
      metalness: 0.8
    });

    // Dark technical blue/charcoal executive chair material
    this.chairMat = new THREE.MeshStandardMaterial({
      color: 0x1B2A4A,
      roughness: 0.6,
      metalness: 0.4
    });

    this.monitorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0A0F18,
      roughness: 0.3,
      metalness: 0.8
    });

    // Glowing screen materials matching reference video (warm amber/yellow in frame_22s, cyan in frame_44s)
    this.screenGoldMat = new THREE.MeshBasicMaterial({
      color: 0xFDE047 // Radiant warm amber/yellow monitor
    });

    this.screenTerminalMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8 // Radiant cyan code screen
    });

    this.screenTelemetryMat = new THREE.MeshBasicMaterial({
      color: 0x34D399 // Emerald telemetry screen
    });

    this.screenSignalMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA // Electric blue monitor
    });
  }

  /**
   * Builds an individual desk workstation with high-back chair and glowing LCD monitor
   */
  public static createWorkstation(config: DeskConfig): THREE.Group {
    this.initSharedResources();

    const group = new THREE.Group();
    group.position.set(config.x, config.y, config.z);
    if (config.rotationY) group.rotation.y = config.rotationY;

    // 1. Desk Surface
    const deskTop = new THREE.Mesh(this.deskTopGeo!, this.deskMat!);
    deskTop.position.y = 0.70;
    deskTop.castShadow = true;
    group.add(deskTop);

    // 2. Desk Legs (4 sturdy pillars)
    const legOffsets = [
      [-0.58, 0.34, -0.28],
      [0.58, 0.34, -0.28],
      [-0.58, 0.34, 0.28],
      [0.58, 0.34, 0.28]
    ];
    legOffsets.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(this.deskLegGeo!, this.legMat!);
      leg.position.set(lx, ly, lz);
      group.add(leg);
    });

    // 3. High-Back Ergonomic Swivel Chair (behind desk at +Z)
    const chairGroup = new THREE.Group();
    chairGroup.name = 'executive-chair';
    chairGroup.position.set(0, 0, 0.44);

    // Seat cushion
    const seat = new THREE.Mesh(this.chairSeatGeo!, this.chairMat!);
    seat.position.y = 0.44;
    chairGroup.add(seat);

    // Center post
    const post = new THREE.Mesh(this.chairPostGeo!, this.legMat!);
    post.position.y = 0.20;
    chairGroup.add(post);

    // 5-Star leg base
    const starBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 5), this.legMat!);
    starBase.position.y = 0.04;
    chairGroup.add(starBase);

    // Tall high backrest (rises behind agent shoulders)
    const backrest = new THREE.Mesh(this.chairBackGeo!, this.chairMat!);
    backrest.position.set(0, 0.72, 0.17);
    chairGroup.add(backrest);

    // Armrests
    const leftArm = new THREE.Mesh(this.chairArmGeo!, this.chairMat!);
    leftArm.position.set(-0.23, 0.56, 0.02);
    chairGroup.add(leftArm);

    const rightArm = new THREE.Mesh(this.chairArmGeo!, this.chairMat!);
    rightArm.position.set(0.23, 0.56, 0.02);
    chairGroup.add(rightArm);

    group.add(chairGroup);

    // 4. Large Glowing Desktop LCD Monitor (facing +Z toward agent)
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0, 0.725, -0.16);

    // Monitor base on desk
    const mBase = new THREE.Mesh(this.monitorBaseGeo!, this.monitorFrameMat!);
    mBase.position.y = 0.01;
    monitorGroup.add(mBase);

    // Vertical stand
    const mStand = new THREE.Mesh(this.monitorStandGeo!, this.legMat!);
    mStand.position.set(0, 0.12, 0);
    monitorGroup.add(mStand);

    // Screen bezel & display
    const screenMat = config.screenType === 'gold'
      ? this.screenGoldMat!
      : config.screenType === 'telemetry'
        ? this.screenTelemetryMat!
        : config.screenType === 'signal'
          ? this.screenSignalMat!
          : this.screenTerminalMat!;

    const mBezel = new THREE.Mesh(this.monitorBezelGeo!, this.monitorFrameMat!);
    mBezel.position.set(0, 0.30, 0);
    monitorGroup.add(mBezel);

    const mDisplay = new THREE.Mesh(this.monitorScreenGeo!, screenMat);
    mDisplay.position.set(0, 0.30, 0.016); // facing +Z toward agent
    monitorGroup.add(mDisplay);

    group.add(monitorGroup);

    // 5. Glowing Keyboard on Desk
    const kb = new THREE.Mesh(this.keyboardGeo!, this.legMat!);
    kb.position.set(0, 0.73, 0.10);
    group.add(kb);

    return group;
  }

  public static dispose() {
    this.deskTopGeo?.dispose();
    this.deskLegGeo?.dispose();
    this.chairSeatGeo?.dispose();
    this.chairBackGeo?.dispose();
    this.chairPostGeo?.dispose();
    this.chairArmGeo?.dispose();
    this.monitorScreenGeo?.dispose();
    this.monitorBezelGeo?.dispose();
    this.monitorStandGeo?.dispose();
    this.monitorBaseGeo?.dispose();
    this.keyboardGeo?.dispose();

    this.deskMat?.dispose();
    this.legMat?.dispose();
    this.chairMat?.dispose();
    this.monitorFrameMat?.dispose();
    this.screenTerminalMat?.dispose();
    this.screenTelemetryMat?.dispose();
    this.screenSignalMat?.dispose();
    this.screenGoldMat?.dispose();

    this.deskTopGeo = null;
    this.deskLegGeo = null;
    this.chairSeatGeo = null;
    this.chairBackGeo = null;
    this.chairPostGeo = null;
    this.chairArmGeo = null;
    this.monitorScreenGeo = null;
    this.monitorBezelGeo = null;
    this.monitorStandGeo = null;
    this.monitorBaseGeo = null;
    this.keyboardGeo = null;
  }
}
