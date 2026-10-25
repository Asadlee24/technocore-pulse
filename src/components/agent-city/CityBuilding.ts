import * as THREE from "three";
import type { RoomCluster } from "../../types/probe";
import type { BuildingLayout } from "./cityLayout";
import type { CityMaterials } from "./cityMaterials";
import { OfficeInterior } from "./OfficeInterior";

/** One architectural parcel per public room; massing is a visual arrangement. */
export class CityBuilding {
  readonly group = new THREE.Group();
  readonly hitMesh: THREE.Mesh;
  readonly interior: OfficeInterior;
  layout: BuildingLayout;
  isCutaway = false;
  private shell = new THREE.Group();
  private windows: THREE.InstancedMesh;
  private selection: THREE.LineSegments;
  private pulseUntil = 0;
  private labelTexture: THREE.CanvasTexture;
  private labelCanvas: HTMLCanvasElement;
  private darkGlass = new THREE.Color(0x21344e);

  constructor(layout: BuildingLayout, _materials: CityMaterials) {
    this.layout = layout;
    this.group.name = `building-${layout.room.id}`;
    this.group.position.set(...layout.position);
    this.group.userData.sourceRoom = layout.room.name;
    const concrete = new THREE.MeshStandardMaterial({
      color:
        layout.height < 12
          ? layout.position[0] > 0
            ? 0x9e9a8b
            : 0x7b8e9c
          : 0x7a8fa3,
      roughness: 0.74,
      metalness: 0.12,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x26465c,
      roughness: 0.24,
      metalness: 0.65,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x647c92,
      roughness: 0.38,
      metalness: 0.65,
    });
    const ground = new THREE.MeshStandardMaterial({
      color: 0x394c61,
      roughness: 0.9,
    });
    const accent = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      toneMapped: false,
    });
    const add = (
      parent: THREE.Group,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const { width: w, depth: d, height: h } = layout;
    add(
      this.group,
      new THREE.BoxGeometry(w * 1.3, 0.2, d * 1.3),
      ground,
      0,
      0.1,
      0,
    );
    // Discreet sidewalk furniture gives every building an entrance and scale.
    for (const side of [-1, 1]) {
      add(
        this.group,
        new THREE.BoxGeometry(0.55, 0.35, 0.38),
        trim,
        side * w * 0.44,
        0.375,
        d * 0.59,
      );
      add(
        this.group,
        new THREE.BoxGeometry(0.46, 0.035, 0.31),
        concrete,
        side * w * 0.44,
        0.57,
        d * 0.59,
      );
    }
    add(
      this.shell,
      new THREE.BoxGeometry(w * 1.05, 2.4, d * 1.05),
      glass,
      0,
      1.4,
      0,
    );
    add(
      this.shell,
      new THREE.BoxGeometry(w * 1.16, 0.18, d * 1.16),
      concrete,
      0,
      2.65,
      0,
    );
    const tier =
      layout.archetype === "skyscraper" ||
      layout.archetype === "office-tower" ||
      layout.archetype === "social-block";
    const split = tier ? h * 0.68 : h;
    add(
      this.shell,
      new THREE.BoxGeometry(w, split - 2.7, d),
      glass,
      0,
      (split + 2.7) / 2,
      0,
    );
    if (tier)
      add(
        this.shell,
        new THREE.BoxGeometry(w * 0.76, h - split, d * 0.76),
        glass,
        w * 0.1,
        (h + split) / 2,
        0,
      );
    // Structural ribbons, horizontal floor plates, roof terraces and solar canopies.
    for (let y = 3; y < h; y += 2.4) {
      const top = tier && y > split;
      const rw = top ? w * 0.76 : w;
      const rd = top ? d * 0.76 : d;
      const x = top ? w * 0.1 : 0;
      add(
        this.shell,
        new THREE.BoxGeometry(rw + 0.035, 0.045, rd + 0.035),
        concrete,
        x,
        y,
        0,
      );
      for (const side of [-1, 1])
        for (const col of [-1, 0, 1])
          add(
            this.shell,
            new THREE.BoxGeometry(0.075, Math.min(2.25, h - y), 0.1),
            trim,
            x + col * rw * 0.31,
            y + Math.min(2.25, h - y) / 2,
            side * (rd / 2 + 0.03),
          );
    }
    const roofW = tier ? w * 0.76 : w,
      roofD = tier ? d * 0.76 : d,
      roofX = tier ? w * 0.1 : 0;
    add(
      this.shell,
      new THREE.BoxGeometry(roofW + 0.2, 0.18, roofD + 0.2),
      concrete,
      roofX,
      h + 0.09,
      0,
    );
    const solar = new THREE.MeshStandardMaterial({
      color: 0x15335c,
      roughness: 0.25,
      metalness: 0.6,
    });
    for (const z of [-0.25, 0.25]) {
      const panel = add(
        this.shell,
        new THREE.BoxGeometry(roofW * 0.65, 0.055, roofD * 0.29),
        solar,
        roofX,
        h + 0.4,
        z * roofD,
      );
      panel.rotation.x = -0.13;
    }
    if (layout.archetype === "research-lab") {
      const skylight = add(
        this.shell,
        new THREE.CylinderGeometry(w * 0.2, w * 0.32, 0.55, 8),
        glass,
        roofX,
        h + 0.45,
        0,
      );
      skylight.rotation.y = Math.PI / 8;
    }
    if (
      layout.archetype === "data-center" ||
      layout.archetype === "utility-structure"
    ) {
      for (const side of [-1, 1])
        add(
          this.shell,
          new THREE.BoxGeometry(0.6, 0.6, 0.7),
          trim,
          roofX + side * roofW * 0.25,
          h + 0.45,
          0,
        );
    }
    // The only strong exterior cyan is a small entrance signal, not a neon outline.
    add(
      this.shell,
      new THREE.BoxGeometry(w * 0.48, 0.055, 0.07),
      accent,
      0,
      2.17,
      d * 0.53,
    );
    add(
      this.shell,
      new THREE.BoxGeometry(w * 0.58, 0.09, 0.65),
      concrete,
      0,
      2.3,
      d * 0.53 + 0.3,
    );
    if (h < 13) {
      const fabric = new THREE.MeshStandardMaterial({
        color: layout.position[0] > 0 ? 0x426b79 : 0x497062,
        roughness: 0.85,
      });
      const awning = add(
        this.shell,
        new THREE.BoxGeometry(w * 0.82, 0.11, 0.95),
        fabric,
        0,
        2.22,
        d * 0.53 + 0.4,
      );
      awning.rotation.x = 0.12;
      for (const side of [-1, 1])
        add(
          this.shell,
          new THREE.BoxGeometry(0.055, 2, 0.055),
          trim,
          side * w * 0.4,
          1.12,
          d * 0.53 + 0.7,
        );
    }
    this.group.add(this.shell);

    const rows = Math.max(1, Math.floor((h - 3.1) / 2.4));
    this.windows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(w * 0.235, 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      rows * 12,
    );
    this.windows.name = "observed-activity-windows";
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < rows; row++) {
      const y = 3.7 + row * 2.4,
        top = tier && y > split,
        rw = top ? w * 0.76 : w,
        rd = top ? d * 0.76 : d,
        x = top ? w * 0.1 : 0;
      for (const face of [0, 1, 2, 3])
        for (const col of [-1, 0, 1]) {
          if (face < 2) {
            dummy.position.set(
              x + col * rw * 0.31,
              y,
              (face === 0 ? 1 : -1) * (rd / 2 + 0.065),
            );
            dummy.rotation.set(0, face === 0 ? 0 : Math.PI, 0);
          } else {
            dummy.position.set(
              x + (face === 2 ? 1 : -1) * (rw / 2 + 0.065),
              y,
              col * rd * 0.31,
            );
            dummy.rotation.set(0, face === 2 ? Math.PI / 2 : -Math.PI / 2, 0);
          }
          dummy.updateMatrix();
          this.windows.setMatrixAt(index++, dummy.matrix);
        }
    }
    this.windows.instanceMatrix.needsUpdate = true;
    this.shell.add(this.windows);
    this.paintWindows();
    this.labelCanvas = document.createElement("canvas");
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 128;
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.colorSpace = THREE.SRGBColorSpace;
    const sign = add(
      this.shell,
      new THREE.PlaneGeometry(w * 0.88, w * 0.22),
      new THREE.MeshBasicMaterial({
        map: this.labelTexture,
        toneMapped: false,
      }),
      0,
      1.55,
      d * 0.526 + 0.02,
    );
    sign.name = "public-room-nameplate";
    this.paintLabel();
    this.selection = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.32, 0.22, d * 1.32)),
      new THREE.LineBasicMaterial({ color: 0x00b4d8 }),
    );
    this.selection.position.y = 0.14;
    this.selection.visible = false;
    this.group.add(this.selection);
    this.hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.16, h + 1, d * 1.16),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.hitMesh.position.y = (h + 1) / 2;
    this.hitMesh.userData = { room: layout.room, buildingId: layout.room.id };
    this.group.add(this.hitMesh);
    this.interior = new OfficeInterior(layout);
    this.interior.group.position.y = 0.2;
    this.group.add(this.interior.group);
  }
  private paintWindows() {
    const isActive =
      this.layout.room.status === "active" ||
      this.layout.room.status === "surge";
    const lit = new THREE.Color(0xb3aa8c);
    for (let i = 0; i < this.windows.count; i++) {
      // Deterministic architectural lighting. A lit building indicates recent room activity only.
      const pattern = Math.abs(Math.sin(i * 13.7 + this.layout.position[0]));
      this.windows.setColorAt(
        i,
        isActive && pattern > 0.82 ? lit : this.darkGlass,
      );
    }
    if (this.windows.instanceColor)
      this.windows.instanceColor.needsUpdate = true;
  }
  private paintLabel() {
    const c = this.labelCanvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#0A1128";
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = "#F5F7FA";
    c.font = "bold 35px monospace";
    c.fillText(`#${this.layout.room.name.slice(0, 21)}`, 20, 55);
    c.font = "19px monospace";
    c.fillStyle = "#A1A7AE";
    c.fillText("PUBLIC ROOM / TECHNOCORE", 20, 94);
    this.labelTexture.needsUpdate = true;
  }
  setCutaway(value: boolean) {
    this.isCutaway = value;
    this.shell.visible = !value;
    this.interior.setCutawayVisible(value);
  }
  updateRoomData(room: RoomCluster) {
    this.layout.room = room;
    this.hitMesh.userData.room = room;
    this.interior.updateRoomData(room);
    this.paintWindows();
    this.paintLabel();
  }
  triggerProbeEffect() {
    this.pulseUntil = performance.now() + 2000;
  }
  update(time: number, selected: boolean) {
    this.selection.visible = selected || performance.now() < this.pulseUntil;
    if (this.isCutaway) this.interior.update(time);
  }
  dispose() {
    this.interior.dispose();
    this.group.remove(this.interior.group);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.labelTexture.dispose();
  }
}
