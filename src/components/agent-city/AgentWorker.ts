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
  suitColor?: string | number;
}

export class AgentWorker {
  public group: THREE.Group;
  public config: AgentWorkerConfig;
  
  private headMesh: THREE.Mesh;
  private visorMesh: THREE.Mesh;
  private hairMesh: THREE.Mesh;
  private leftArmMesh: THREE.Mesh;
  private rightArmMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;

  private baseHeadY: number = 0.96;
  private animOffset: number;
  private walkT: number = 0;
  private walkDirection: number = 1;

  // Shared Geometries & Materials across all agent workers for 60fps performance
  private static headGeo: THREE.SphereGeometry | null = null;
  private static hairGeo: THREE.SphereGeometry | null = null;
  private static bodyGeo: THREE.CylinderGeometry | null = null;
  private static armGeo: THREE.CylinderGeometry | null = null;
  private static visorGeo: THREE.BoxGeometry | null = null;
  private static thighGeo: THREE.BoxGeometry | null = null;
  private static shinGeo: THREE.BoxGeometry | null = null;
  private static standingLegGeo: THREE.BoxGeometry | null = null;

  private static defaultSuitMat: THREE.MeshStandardMaterial | null = null;
  private static skinMat: THREE.MeshStandardMaterial | null = null;
  private static hairMat: THREE.MeshStandardMaterial | null = null;
  private static visorMat: THREE.MeshBasicMaterial | null = null;
  private static visorSurgeMat: THREE.MeshBasicMaterial | null = null;

  public static initSharedResources() {
    if (this.headGeo) return;

    // Stylized cute humanoid character forms matching reference video screenshots
    this.headGeo = new THREE.SphereGeometry(0.14, 16, 14);
    this.hairGeo = new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    this.bodyGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.38, 12);
    
    // Arm geometry with shoulder pivot at origin (0, 0, 0)
    this.armGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8);
    this.armGeo.translate(0, -0.14, 0);

    // Seated and standing leg geometries
    this.thighGeo = new THREE.BoxGeometry(0.09, 0.09, 0.24);
    this.shinGeo = new THREE.BoxGeometry(0.08, 0.24, 0.08);
    this.standingLegGeo = new THREE.BoxGeometry(0.09, 0.44, 0.09);

    // Sleek glowing visor across face
    this.visorGeo = new THREE.BoxGeometry(0.18, 0.06, 0.05);

    this.defaultSuitMat = new THREE.MeshStandardMaterial({
      color: 0x0284C7, // Iconic cyber cobalt blue suit (frame_44s)
      roughness: 0.4,
      metalness: 0.3
    });

    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0, // Sleek porcelain/cybernetic skin tone
      roughness: 0.5,
      metalness: 0.1
    });

    this.hairMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B, // Dark slate styled hair/cap
      roughness: 0.7,
      metalness: 0.2
    });

    this.visorMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8 // Electric Cyan visor
    });

    this.visorSurgeMat = new THREE.MeshBasicMaterial({
      color: 0x10B981 // Surge emerald visor
    });
  }

  constructor(config: AgentWorkerConfig) {
    AgentWorker.initSharedResources();
    this.config = config;
    this.animOffset = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.name = 'agent-worker';
    this.group.position.set(config.x, config.y, config.z);
    if (config.rotationY) this.group.rotation.y = config.rotationY;

    // Determine suit material from config
    const suitMat = config.suitColor 
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color(config.suitColor), roughness: 0.4, metalness: 0.3 })
      : AgentWorker.defaultSuitMat!;

    const vMat = config.visorColor
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(config.visorColor) })
      : config.activityState === 'surge' 
        ? AgentWorker.visorSurgeMat! 
        : AgentWorker.visorMat!;

    // 1. Torso / Suit Jacket
    this.bodyMesh = new THREE.Mesh(AgentWorker.bodyGeo!, suitMat);
    this.bodyMesh.position.y = config.isSeated ? 0.52 : 0.65;
    this.group.add(this.bodyMesh);

    // Collar / chest tie accent
    const collarGeo = new THREE.BoxGeometry(0.08, 0.14, 0.04);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.10, -0.13); // facing -Z forward
    this.bodyMesh.add(collar);

    // 2. Head
    this.headMesh = new THREE.Mesh(AgentWorker.headGeo!, AgentWorker.skinMat!);
    this.baseHeadY = config.isSeated ? 0.82 : 0.96;
    this.headMesh.position.y = this.baseHeadY;
    this.group.add(this.headMesh);

    // Stylized hair/headgear cap
    this.hairMesh = new THREE.Mesh(AgentWorker.hairGeo!, AgentWorker.hairMat!);
    this.hairMesh.position.y = 0.02;
    this.headMesh.add(this.hairMesh);

    // 3. Emissive Visor (faces -Z forward toward desk monitors)
    this.visorMesh = new THREE.Mesh(AgentWorker.visorGeo!, vMat);
    this.visorMesh.position.set(0, -0.01, -0.12);
    this.headMesh.add(this.visorMesh);

    // 4. Arms (Typing pose pointing forward toward keyboard at -Z if seated, natural resting pose if standing)
    this.leftArmMesh = new THREE.Mesh(AgentWorker.armGeo!, suitMat);
    this.rightArmMesh = new THREE.Mesh(AgentWorker.armGeo!, suitMat);

    if (config.isSeated) {
      // Arms angled forward and slightly inward resting on the keyboard
      this.leftArmMesh.position.set(-0.16, 0.58, -0.06);
      this.leftArmMesh.rotation.set(-1.15, -0.14, -0.06);

      this.rightArmMesh.position.set(0.16, 0.58, -0.06);
      this.rightArmMesh.rotation.set(-1.15, 0.14, 0.06);

      // Seated legs (thighs forward onto chair, shins hanging down toward floor)
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0F172A });
      const leftThigh = new THREE.Mesh(AgentWorker.thighGeo!, pantsMat);
      leftThigh.position.set(-0.08, 0.36, -0.10);
      this.group.add(leftThigh);

      const rightThigh = new THREE.Mesh(AgentWorker.thighGeo!, pantsMat);
      rightThigh.position.set(0.08, 0.36, -0.10);
      this.group.add(rightThigh);

      const leftShin = new THREE.Mesh(AgentWorker.shinGeo!, pantsMat);
      leftShin.position.set(-0.08, 0.18, -0.21);
      this.group.add(leftShin);

      const rightShin = new THREE.Mesh(AgentWorker.shinGeo!, pantsMat);
      rightShin.position.set(0.08, 0.18, -0.21);
      this.group.add(rightShin);
    } else {
      // Standing upright arms resting at side
      this.leftArmMesh.position.set(-0.18, 0.64, 0);
      this.rightArmMesh.position.set(0.18, 0.64, 0);

      // Standing legs
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0F172A });
      const leftLeg = new THREE.Mesh(AgentWorker.standingLegGeo!, pantsMat);
      leftLeg.position.set(-0.08, 0.22, 0);
      this.group.add(leftLeg);

      const rightLeg = new THREE.Mesh(AgentWorker.standingLegGeo!, pantsMat);
      rightLeg.position.set(0.08, 0.22, 0);
      this.group.add(rightLeg);
    }

    this.group.add(this.leftArmMesh);
    this.group.add(this.rightArmMesh);
  }

  /**
   * Subtle procedural micro-animations: typing on keyboard, head nodding, chair swivel, walking
   */
  public update(time: number) {
    const t = time * 3.5 + this.animOffset;

    if (this.config.isWalking && this.config.walkPath) {
      // Walking procedural patrol along sidewalk
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
      // Dynamic typing micro-animation on keyboard
      const typingSpeed = this.config.activityState === 'surge' ? 14 : 7;
      this.leftArmMesh.rotation.x = -1.15 + Math.sin(time * typingSpeed + this.animOffset) * 0.07;
      this.rightArmMesh.rotation.x = -1.15 + Math.cos(time * typingSpeed + this.animOffset) * 0.07;

      // Occasional thoughtful head tilt/nod looking down at LCD monitor
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.5) * 0.01;
      this.headMesh.rotation.x = 0.10 + Math.sin(t * 0.6) * 0.04;
      this.headMesh.rotation.y = Math.sin(t * 0.3) * 0.05;

      // Gentle chair/body swivel (+- 3 degrees)
      this.bodyMesh.rotation.y = Math.sin(t * 0.4) * 0.05;
    } else {
      // Standing idle breathing
      this.headMesh.position.y = this.baseHeadY + Math.sin(t * 0.8) * 0.01;
      this.headMesh.rotation.y = Math.sin(t * 0.3) * 0.12;
    }
  }

  public dispose() {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        if (obj.material !== AgentWorker.defaultSuitMat && 
            obj.material !== AgentWorker.skinMat && 
            obj.material !== AgentWorker.hairMat && 
            obj.material !== AgentWorker.visorMat && 
            obj.material !== AgentWorker.visorSurgeMat) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      }
    });
  }

  public static dispose() {
    this.headGeo?.dispose();
    this.hairGeo?.dispose();
    this.bodyGeo?.dispose();
    this.armGeo?.dispose();
    this.visorGeo?.dispose();
    this.thighGeo?.dispose();
    this.shinGeo?.dispose();
    this.standingLegGeo?.dispose();

    this.defaultSuitMat?.dispose();
    this.skinMat?.dispose();
    this.hairMat?.dispose();
    this.visorMat?.dispose();
    this.visorSurgeMat?.dispose();

    this.headGeo = null;
    this.hairGeo = null;
    this.bodyGeo = null;
    this.armGeo = null;
    this.visorGeo = null;
    this.thighGeo = null;
    this.shinGeo = null;
    this.standingLegGeo = null;
  }
}
