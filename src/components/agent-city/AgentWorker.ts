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
  visorColor?: string | number;
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
  private static thighGeo: THREE.BoxGeometry | null = null;
  private static shinGeo: THREE.BoxGeometry | null = null;
  private static standingLegGeo: THREE.BoxGeometry | null = null;

  private static bodyMat: THREE.MeshStandardMaterial | null = null;
  private static visorMat: THREE.MeshBasicMaterial | null = null;
  private static visorSurgeMat: THREE.MeshBasicMaterial | null = null;

  public static initSharedResources() {
    if (this.headGeo) return;

    // Stylized low-poly cybernetic forms
    this.headGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);
    this.bodyGeo = new THREE.BoxGeometry(0.30, 0.44, 0.20);
    
    // Arm geometry with shoulder pivot at origin (0, 0, 0)
    this.armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8);
    this.armGeo.translate(0, -0.14, 0);

    // Seated and standing leg geometries
    this.thighGeo = new THREE.BoxGeometry(0.09, 0.09, 0.24);
    this.shinGeo = new THREE.BoxGeometry(0.08, 0.24, 0.08);
    this.standingLegGeo = new THREE.BoxGeometry(0.09, 0.44, 0.09);

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

    const vMat = config.visorColor
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(config.visorColor) })
      : config.activityState === 'surge' 
        ? AgentWorker.visorSurgeMat! 
        : AgentWorker.visorMat!;

    // 1. Torso
    this.bodyMesh = new THREE.Mesh(AgentWorker.bodyGeo!, AgentWorker.bodyMat!);
    this.bodyMesh.position.y = config.isSeated ? 0.48 : 0.65;
    this.group.add(this.bodyMesh);

    // 2. Head
    this.headMesh = new THREE.Mesh(AgentWorker.headGeo!, AgentWorker.bodyMat!);
    this.baseHeadY = config.isSeated ? 0.78 : 0.95;
    this.headMesh.position.y = this.baseHeadY;
    this.group.add(this.headMesh);

    // 3. Emissive Visor Screen (faces -Z forward)
    this.visorMesh = new THREE.Mesh(AgentWorker.visorGeo!, vMat);
    this.visorMesh.position.set(0, 0, -0.125);
    this.visorMesh.rotation.y = Math.PI; // faces forward toward -Z
    this.headMesh.add(this.visorMesh);

    // 4. Arms (Typing pose pointing forward toward keyboard at -Z if seated, natural resting pose if standing)
    this.leftArmMesh = new THREE.Mesh(AgentWorker.armGeo!, AgentWorker.bodyMat!);
    this.rightArmMesh = new THREE.Mesh(AgentWorker.armGeo!, AgentWorker.bodyMat!);

    if (config.isSeated) {
      // Arms angled forward and slightly inward resting on the laptop keyboard
      this.leftArmMesh.position.set(-0.16, 0.54, -0.06);
      this.leftArmMesh.rotation.set(-1.18, -0.14, -0.06);

      this.rightArmMesh.position.set(0.16, 0.54, -0.06);
      this.rightArmMesh.rotation.set(-1.18, 0.14, 0.06);

      // Seated legs (thighs forward onto chair, shins hanging down toward floor)
      const leftThigh = new THREE.Mesh(AgentWorker.thighGeo!, AgentWorker.bodyMat!);
      leftThigh.position.set(-0.08, 0.30, -0.10);
      this.group.add(leftThigh);

      const rightThigh = new THREE.Mesh(AgentWorker.thighGeo!, AgentWorker.bodyMat!);
      rightThigh.position.set(0.08, 0.30, -0.10);
      this.group.add(rightThigh);

      const leftShin = new THREE.Mesh(AgentWorker.shinGeo!, AgentWorker.bodyMat!);
      leftShin.position.set(-0.08, 0.14, -0.21);
      this.group.add(leftShin);

      const rightShin = new THREE.Mesh(AgentWorker.shinGeo!, AgentWorker.bodyMat!);
      rightShin.position.set(0.08, 0.14, -0.21);
      this.group.add(rightShin);
    } else {
      // Standing upright arms resting at side
      this.leftArmMesh.position.set(-0.18, 0.62, 0);
      this.rightArmMesh.position.set(0.18, 0.62, 0);

      // Standing legs
      const leftLeg = new THREE.Mesh(AgentWorker.standingLegGeo!, AgentWorker.bodyMat!);
      leftLeg.position.set(-0.08, 0.22, 0);
      this.group.add(leftLeg);

      const rightLeg = new THREE.Mesh(AgentWorker.standingLegGeo!, AgentWorker.bodyMat!);
      rightLeg.position.set(0.08, 0.22, 0);
      this.group.add(rightLeg);
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

      // Walking bounce & arm swing around shoulder pivot
      this.group.position.y = this.config.y + Math.abs(Math.sin(time * 8)) * 0.04;
      this.leftArmMesh.rotation.x = Math.sin(time * 8) * 0.35;
      this.rightArmMesh.rotation.x = -Math.sin(time * 8) * 0.35;
      return;
    }

    if (this.config.isSeated) {
      // Typing micro-animation on the keyboard (negative X angle pointing forward)
      const typingSpeed = this.config.activityState === 'surge' ? 14 : 7;
      this.leftArmMesh.rotation.x = -1.18 + Math.sin(time * typingSpeed + this.animOffset) * 0.06;
      this.rightArmMesh.rotation.x = -1.18 + Math.cos(time * typingSpeed + this.animOffset) * 0.06;

      // Occasional thoughtful head tilt/nod looking down at screen
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.5) * 0.01;
      this.headMesh.rotation.x = 0.08 + Math.sin(t * 0.6) * 0.03;
      this.headMesh.rotation.y = Math.sin(t * 0.3) * 0.04;
    } else {
      // Standing idle breathing
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.8) * 0.01;
      this.headMesh.rotation.y = Math.sin(t * 0.3) * 0.12;
    }
  }

  public dispose() {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        if (obj.material !== AgentWorker.bodyMat && obj.material !== AgentWorker.visorMat && obj.material !== AgentWorker.visorSurgeMat) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  public static dispose() {
    this.headGeo?.dispose();
    this.bodyGeo?.dispose();
    this.armGeo?.dispose();
    this.visorGeo?.dispose();
    this.thighGeo?.dispose();
    this.shinGeo?.dispose();
    this.standingLegGeo?.dispose();

    this.bodyMat?.dispose();
    this.visorMat?.dispose();
    this.visorSurgeMat?.dispose();

    this.headGeo = null;
    this.bodyGeo = null;
    this.armGeo = null;
    this.visorGeo = null;
    this.thighGeo = null;
    this.shinGeo = null;
    this.standingLegGeo = null;
  }
}
