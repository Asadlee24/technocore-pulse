import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export interface DeskConfig {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  screenType?: "terminal" | "telemetry" | "signal";
  hasWorker?: boolean;
}

export class AgentDeskFactory {
  private static geometries = new Map<string, THREE.BufferGeometry>();
  private static materials = new Map<number, THREE.Material>();
  private static screens = new Map<
    string,
    {
      canvas: HTMLCanvasElement;
      texture: THREE.CanvasTexture;
      material: THREE.Material;
    }
  >();
  private static lastFrame = -1;
  static initSharedResources() {}
  private static box(w: number, h: number, d: number) {
    const key = `${w}/${h}/${d}`;
    if (!this.geometries.has(key))
      this.geometries.set(key, new RoundedBoxGeometry(w, h, d, 1, 0.015));
    return this.geometries.get(key)!;
  }
  private static material(color: number) {
    if (!this.materials.has(color))
      this.materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.58,
          metalness: 0.2,
        }),
      );
    return this.materials.get(color)!;
  }
  private static screen(type: string) {
    if (!this.screens.has(type)) {
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 240;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
      });
      this.screens.set(type, { canvas, texture, material });
      this.paint(type, 0);
    }
    return this.screens.get(type)!.material;
  }
  private static paint(type: string, time: number) {
    const entry = this.screens.get(type);
    if (!entry) return;
    const c = entry.canvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#0A1128";
    c.fillRect(0, 0, 384, 240);
    c.fillStyle = "#232A3E";
    c.fillRect(0, 0, 384, 32);
    c.fillStyle = "#F5F7FA";
    c.font = "14px monospace";
    c.fillText("TECHNOCORE / WORKSPACE", 14, 21);
    c.fillStyle = "#A1A7AE";
    c.font = "12px monospace";
    c.fillText("ILLUSTRATIVE TERMINAL", 14, 56);
    const lines =
      type === "terminal"
        ? [
            "> public room reader",
            "  await room.messages()",
            "> inspect source record",
            "  verify signature",
            "> preserve original text",
          ]
        : type === "telemetry"
          ? [
              "> observation window",
              "  public records only",
              "> observer.read()",
              "  unknown stays unknown",
              "> no inferred execution",
            ]
          : [
              "> coordination layer",
              "  discover public rooms",
              "> inspect signed identity",
              "  read original payload",
              "> local visualization",
            ];
    lines.forEach((line, i) => {
      c.fillStyle = i % 2 ? "#F5F7FA" : "#00B4D8";
      c.fillText(line, 14, 85 + i * 24);
    });
    if (Math.floor(time * 2) % 2 === 0) {
      c.fillStyle = "#00B4D8";
      c.fillRect(16, 214, 8, 13);
    }
    entry.texture.needsUpdate = true;
  }
  static updateScreens(time: number) {
    const frame = Math.floor(time * 3);
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    this.screens.forEach((_, type) => this.paint(type, time));
  }
  static createWorkstation(config: DeskConfig) {
    const group = new THREE.Group();
    group.name = "agent-workstation";
    group.position.set(config.x, config.y, config.z);
    group.rotation.y = config.rotationY ?? 0;
    const wood = this.material(0xbdc8d6),
      metal = this.material(0x5c6670),
      chair = this.material(0x253e59),
      hardware = this.material(0x273936);
    const add = (
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
      group.add(mesh);
      return mesh;
    };
    add(this.box(1.2, 0.055, 0.66), wood, 0, 0.7, 0);
    [-0.49, 0.49].forEach((x) => {
      add(this.box(0.045, 0.68, 0.045), metal, x, 0.34, -0.23);
      add(this.box(0.045, 0.68, 0.045), metal, x, 0.34, 0.23);
    });
    add(this.box(0.36, 0.065, 0.32), chair, 0, 0.44, 0.48);
    add(this.box(0.35, 0.36, 0.065), chair, 0, 0.65, 0.64);
    add(this.box(0.04, 0.42, 0.04), metal, 0, 0.21, 0.48);
    add(this.box(0.4, 0.035, 0.05), metal, 0, 0.055, 0.48);
    add(this.box(0.05, 0.035, 0.4), metal, 0, 0.055, 0.48);
    [-1, 1].forEach((s) =>
      add(this.box(0.035, 0.11, 0.23), metal, s * 0.23, 0.51, 0.48),
    );
    // Desktop monitor faces the character (+Z), with a separate keyboard and mouse.
    add(this.box(0.18, 0.025, 0.14), metal, 0, 0.743, -0.15);
    add(this.box(0.035, 0.18, 0.035), metal, 0, 0.82, -0.19);
    add(this.box(0.62, 0.4, 0.038), hardware, 0, 1.07, -0.19);
    const display = add(
      this.box(0.57, 0.345, 0.008),
      this.screen(config.screenType ?? "terminal"),
      0,
      1.075,
      -0.166,
    );
    display.userData.illustrative = true;
    add(this.box(0.38, 0.018, 0.145), hardware, 0, 0.742, 0.16);
    const keyGeo = this.box(0.027, 0.006, 0.022);
    const keys = new THREE.InstancedMesh(keyGeo, this.material(0x99aaa0), 30);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 30; i++) {
      matrix.makeTranslation(
        ((i % 10) - 4.5) * 0.034,
        0.755,
        0.12 + Math.floor(i / 10) * 0.035,
      );
      keys.setMatrixAt(i, matrix);
    }
    keys.instanceMatrix.needsUpdate = true;
    group.add(keys);
    add(this.box(0.09, 0.008, 0.13), metal, 0.35, 0.738, 0.16);
    add(this.box(0.045, 0.025, 0.07), hardware, 0.35, 0.755, 0.16);
    // Task light and notebook give the desks a human-designed material scale.
    add(this.box(0.045, 0.26, 0.045), metal, -0.47, 0.87, -0.19);
    add(this.box(0.16, 0.035, 0.1), this.material(0xf5f7fa), -0.43, 1.0, -0.17);
    add(this.box(0.15, 0.018, 0.2), this.material(0xd9dde1), 0.46, 0.74, -0.04);
    return group;
  }
  static dispose() {
    this.screens.forEach((s) => {
      s.texture.dispose();
      s.material.dispose();
    });
    this.screens.clear();
    this.geometries.forEach((g) => g.dispose());
    this.geometries.clear();
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    this.lastFrame = -1;
  }
}
