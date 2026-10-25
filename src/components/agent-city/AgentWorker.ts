import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface AgentWorkerConfig {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  isSeated?: boolean;
  activityState?: "idle" | "active" | "surge";
  isWalking?: boolean;
  walkPath?: { start: THREE.Vector3; end: THREE.Vector3; speed: number };
  animationPhase?: number;
  visorColor?: string | number;
}

/** Designed characters are office scenery, never a measured agent population. */
export class AgentWorker {
  readonly group = new THREE.Group();
  readonly config: AgentWorkerConfig;
  private head = new THREE.Group();
  private torso = new THREE.Group();
  private forearms: THREE.Mesh[] = [];
  private palms: THREE.Mesh[] = [];
  private phase: number;
  private lastTime: number | null = null;
  private walkDistance = 0;
  private ownMaterials: THREE.Material[] = [];
  private static geometries = new Map<string, THREE.BufferGeometry>();
  private static materials = new Map<string, THREE.Material>();

  static initSharedResources() {}
  private static box(w: number, h: number, d: number, r = 0.035) {
    const key = `${w}/${h}/${d}/${r}`;
    if (!this.geometries.has(key))
      this.geometries.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
    return this.geometries.get(key)!;
  }
  private static material(color: number, metalness = 0.15) {
    const key = `${color}/${metalness}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness }),
      );
    return this.materials.get(key)!;
  }
  constructor(config: AgentWorkerConfig) {
    this.config = config;
    this.phase =
      config.animationPhase ??
      (config.x * 7.3 + config.z * 3.9 + config.y * 4.1) % 6.28;
    this.group.name = "illustrative-office-worker";
    this.group.userData.isIllustrative = true;
    this.group.position.set(config.x, config.y, config.z);
    this.group.rotation.y = config.rotationY ?? 0;
    const shell = AgentWorker.material(0xe1e8ef);
    const dark = AgentWorker.material(0x0a1128, 0.35);
    const joint = AgentWorker.material(0x5c6670, 0.5);
    const bronze = AgentWorker.material(0x7690a7, 0.6);
    const accent = new THREE.MeshStandardMaterial({
      color: config.visorColor ?? 0x86c5b5,
      roughness: 0.4,
      metalness: 0.25,
    });
    this.ownMaterials.push(accent);
    const add = (
      parent: THREE.Group,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const seated = !!config.isSeated;
    const bodyY = seated ? 0.48 : 0.65;
    this.torso.position.y = bodyY;
    add(this.torso, AgentWorker.box(0.3, 0.36, 0.2, 0.055), shell, 0, 0, 0);
    add(
      this.torso,
      AgentWorker.box(0.18, 0.18, 0.025, 0.018),
      accent,
      0,
      0.015,
      -0.109,
    );
    add(
      this.torso,
      AgentWorker.box(0.11, 0.018, 0.016, 0.004),
      bronze,
      0,
      0.04,
      -0.13,
    );
    this.group.add(this.torso);
    this.head.position.y = seated ? 0.79 : 0.96;
    add(this.head, AgentWorker.box(0.28, 0.245, 0.25, 0.065), shell, 0, 0, 0);
    add(
      this.head,
      AgentWorker.box(0.238, 0.112, 0.027, 0.025),
      dark,
      0,
      0,
      -0.127,
    );
    const eyes = new THREE.MeshBasicMaterial({ color: 0x00b4d8 });
    this.ownMaterials.push(eyes);
    [-0.065, 0.065].forEach((x) =>
      add(
        this.head,
        AgentWorker.box(0.041, 0.024, 0.012, 0.008),
        eyes,
        x,
        0.008,
        -0.147,
      ),
    );
    // Over-ear communications headset with a small boom microphone.
    [-1, 1].forEach((side) =>
      add(
        this.head,
        AgentWorker.box(0.045, 0.12, 0.12, 0.018),
        bronze,
        side * 0.154,
        0,
        0,
      ),
    );
    add(
      this.head,
      AgentWorker.box(0.022, 0.022, 0.13, 0.006),
      dark,
      0.15,
      -0.055,
      -0.09,
    );
    add(
      this.head,
      AgentWorker.box(0.065, 0.022, 0.025, 0.008),
      dark,
      0.125,
      -0.055,
      -0.15,
    );
    this.group.add(this.head);
    [-1, 1].forEach((side) => {
      const x = side * 0.17;
      add(
        this.group,
        AgentWorker.box(0.1, 0.1, 0.1, 0.035),
        joint,
        x,
        bodyY + 0.1,
        0,
      );
      const upper = add(
        this.group,
        AgentWorker.box(0.078, seated ? 0.18 : 0.25, 0.08, 0.025),
        shell,
        x,
        bodyY + 0.065,
        seated ? -0.07 : 0,
      );
      upper.rotation.x = seated ? -0.65 : 0;
      const elbowZ = seated ? -0.14 : 0;
      add(
        this.group,
        AgentWorker.box(0.086, 0.075, 0.075, 0.025),
        joint,
        x,
        bodyY - 0.005,
        elbowZ,
      );
      const forearm = add(
        this.group,
        AgentWorker.box(
          0.075,
          seated ? 0.085 : 0.2,
          seated ? 0.23 : 0.075,
          0.022,
        ),
        shell,
        x * 0.85,
        bodyY + 0.025,
        seated ? -0.24 : 0,
      );
      this.forearms.push(forearm);
      const palm = add(
        this.group,
        AgentWorker.box(0.082, 0.038, 0.095, 0.016),
        bronze,
        x * 0.8,
        bodyY + 0.025,
        seated ? -0.36 : 0,
      );
      this.palms.push(palm);
      if (seated) {
        add(
          this.group,
          AgentWorker.box(0.095, 0.095, 0.25, 0.025),
          dark,
          side * 0.085,
          0.28,
          -0.1,
        );
        add(
          this.group,
          AgentWorker.box(0.085, 0.24, 0.085, 0.02),
          shell,
          side * 0.085,
          0.13,
          -0.215,
        );
        add(
          this.group,
          AgentWorker.box(0.105, 0.065, 0.17, 0.02),
          dark,
          side * 0.085,
          0.035,
          -0.25,
        );
      } else {
        add(
          this.group,
          AgentWorker.box(0.095, 0.4, 0.1, 0.025),
          shell,
          side * 0.085,
          0.23,
          0,
        );
        add(
          this.group,
          AgentWorker.box(0.11, 0.07, 0.18, 0.02),
          dark,
          side * 0.085,
          0.035,
          -0.025,
        );
      }
    });
  }
  update(time: number) {
    const dt =
      this.lastTime === null
        ? 0
        : Math.min(0.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    if (this.config.isWalking && this.config.walkPath) {
      const { start, end, speed } = this.config.walkPath;
      const length = start.distanceTo(end) || 1;
      this.walkDistance += (dt * speed) / length;
      const cycle = this.walkDistance % 2,
        t = cycle > 1 ? 2 - cycle : cycle;
      this.group.position.lerpVectors(start, end, t);
      const sign = cycle > 1 ? -1 : 1;
      this.group.rotation.y =
        Math.atan2((end.x - start.x) * sign, (end.z - start.z) * sign) +
        Math.PI;
      this.group.position.y += Math.abs(Math.sin(time * 7)) * 0.025;
      return;
    }
    if (this.config.isSeated) {
      const typing =
        time * (this.config.activityState === "surge" ? 12 : 8) + this.phase;
      this.palms.forEach((p, i) => {
        p.position.y = 0.505 + Math.sin(typing + i * 2.5) * 0.012;
        p.rotation.x = Math.sin(typing + i) * 0.09;
      });
      this.forearms.forEach((arm, i) => {
        arm.rotation.x = Math.sin(typing + i * 2.5) * 0.035;
      });
      this.head.rotation.set(
        0.11 + Math.sin(time * 0.7 + this.phase) * 0.035,
        Math.sin(time * 0.45 + this.phase) * 0.11,
        Math.sin(time * 0.3 + this.phase) * 0.025,
      );
      this.torso.rotation.x = 0.035 + Math.sin(time * 0.9 + this.phase) * 0.015;
    } else this.head.rotation.y = Math.sin(time * 0.5 + this.phase) * 0.16;
  }
  dispose() {
    this.ownMaterials.forEach((m) => m.dispose());
    this.ownMaterials = [];
  }
  static dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.geometries.clear();
    this.materials.clear();
  }
}
