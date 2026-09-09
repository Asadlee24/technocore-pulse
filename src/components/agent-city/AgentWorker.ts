import * as THREE from 'three';

export interface AgentWorkerConfig {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  isSeated?: boolean;
  activityState?: 'idle' | 'active' | 'surge';
  isWalking?: boolean;
  walkPath?: { start: THREE.Vector3; end: THREE.Vector3; speed: number };
}

export class AgentWorker {
  public group: THREE.Group;
  public config: AgentWorkerConfig;
  
  private headMesh: THREE.Mesh;
  private visorMesh: THREE.Mesh;
  private leftArmMesh: THREE.Mesh;
  private rightArmMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;

  private baseHeadY: number = 0.95;
  private animOffset: number;
  private walkT: number = 0;
  private walkDirection: number = 1;

  // Shared Geometries & Materials across all agent workers
  private static headGeo: THREE.BoxGeometry | null = null;
  private static bodyGeo: THREE.BoxGeometry | null = null;
  private static armGeo: THREE.CylinderGeometry | null = null;
  private static visorGeo: THREE.PlaneGeometry | null = null;

  private static bodyMat: THREE.MeshStandardMaterial | null = null;
  private static visorMat: THREE.MeshBasicMaterial | null = null;
  private static visorSurgeMat: THREE.MeshBasicMaterial | null = null;

  public static initSharedResources() {
    if (this.headGeo) return;

    // Stylized low-poly cybernetic forms
    this.headGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);
    this.bodyGeo = new THREE.BoxGeometry(0.32, 0.46, 0.22);
    this.armGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.32, 6);
    this.visorGeo = new THREE.PlaneGeometry(0.2, 0.08);

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0x080F1D,
      roughness: 0.35,
      metalness: 0.85
    });

    this.visorMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7 // Iconic Technocore Cyan
    });

    this.visorSurgeMat = new THREE.MeshBasicMaterial({
      color: 0x2FD27F // Surge state green
    });
  }

  constructor(config: AgentWorkerConfig) {
    AgentWorker.initSharedResources();
    this.config = config;
    this.animOffset = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.set(config.x, config.y, config.z);
    if (config.rotationY) this.group.rotation.y = config.rotationY;

    const vMat = config.activityState === 'surge' 
      ? AgentWorker.visorSurgeMat! 
      : AgentWorker.visorMat!;

    // 1. Torso
    this.bodyMesh = new THREE.Mesh(AgentWorker.bodyGeo!, AgentWorker.bodyMat!);
    this.bodyMesh.position.y = config.isSeated ? 0.62 : 0.68;
    this.group.add(this.bodyMesh);

    // 2. Head
    this.headMesh = new THREE.Mesh(AgentWorker.headGeo!, AgentWorker.bodyMat!);
    this.baseHeadY = config.isSeated ? 0.92 : 1.0;
    this.headMesh.position.y = this.baseHeadY;
    this.group.add(this.headMesh);

    // 3. Emissive Visor Screen
    this.visorMesh = new THREE.Mesh(AgentWorker.visorGeo!, vMat);
    this.visorMesh.position.set(0, 0, -0.125);
    this.visorMesh.rotation.y = Math.PI; // faces forward
    this.headMesh.add(this.visorMesh);

    // 4. Arms (Typing pose if seated, natural resting pose if standing)
    this.leftArmMesh = new THREE.Mesh(AgentWorker.armGeo!, AgentWorker.bodyMat!);
    this.rightArmMesh = new THREE.Mesh(AgentWorker.armGeo!, AgentWorker.bodyMat!);

    if (config.isSeated) {
      // Arms angled forward toward laptop keyboard
      this.leftArmMesh.position.set(-0.2, 0.62, -0.16);
      this.leftArmMesh.rotation.set(Math.PI / 3, 0, -Math.PI / 12);

      this.rightArmMesh.position.set(0.2, 0.62, -0.16);
      this.rightArmMesh.rotation.set(Math.PI / 3, 0, Math.PI / 12);
    } else {
      // Arms resting at side
      this.leftArmMesh.position.set(-0.2, 0.6, 0);
      this.rightArmMesh.position.set(0.2, 0.6, 0);
    }

    this.group.add(this.leftArmMesh);
    this.group.add(this.rightArmMesh);
  }

  /**
   * Subtle procedural micro-animations: typing, head nodding, walking
   */
  public update(time: number) {
    const t = time * 3.5 + this.animOffset;

    if (this.config.isWalking && this.config.walkPath) {
      // Walking procedural patrol
      const path = this.config.walkPath;
      this.walkT += 0.008 * this.walkDirection * path.speed;
      if (this.walkT >= 1) {
        this.walkT = 1;
        this.walkDirection = -1;
      } else if (this.walkT <= 0) {
        this.walkT = 0;
        this.walkDirection = 1;
      }

      const currentPos = new THREE.Vector3().lerpVectors(path.start, path.end, this.walkT);
      this.group.position.copy(currentPos);

      // Rotate towards walking direction
      const dirAngle = this.walkDirection > 0 
        ? Math.atan2(path.end.x - path.start.x, path.end.z - path.start.z)
        : Math.atan2(path.start.x - path.end.x, path.start.z - path.end.z);
      this.group.rotation.y = dirAngle;

      // Walking bounce & arm swing
      this.group.position.y = this.config.y + Math.abs(Math.sin(time * 8)) * 0.05;
      this.leftArmMesh.rotation.x = Math.sin(time * 8) * 0.35;
      this.rightArmMesh.rotation.x = -Math.sin(time * 8) * 0.35;
      return;
    }

    if (this.config.isSeated) {
      // Typing micro-animation
      const typingSpeed = this.config.activityState === 'surge' ? 14 : 7;
      this.leftArmMesh.rotation.x = Math.PI / 3 + Math.sin(time * typingSpeed + this.animOffset) * 0.08;
      this.rightArmMesh.rotation.x = Math.PI / 3 + Math.cos(time * typingSpeed + this.animOffset) * 0.08;

      // Occasional thoughtful head tilt/nod
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.5) * 0.015;
      this.headMesh.rotation.x = Math.sin(t * 0.7) * 0.06;
      this.headMesh.rotation.y = Math.sin(t * 0.4) * 0.08;
    } else {
      // Standing idle breathing
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.8) * 0.01;
      this.headMesh.rotation.y = Math.sin(t * 0.3) * 0.12;
    }
  }

  public static dispose() {
    this.headGeo?.dispose();
    this.bodyGeo?.dispose();
    this.armGeo?.dispose();
    this.visorGeo?.dispose();

    this.bodyMat?.dispose();
    this.visorMat?.dispose();
    this.visorSurgeMat?.dispose();

    this.headGeo = null;
    this.bodyGeo = null;
    this.armGeo = null;
    this.visorGeo = null;
  }
}
