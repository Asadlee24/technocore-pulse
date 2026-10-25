import * as THREE from "three";

/** Civic sculpture, not a network node or an official FLOP building. */
export class MetroLandmark {
  readonly group = new THREE.Group();
  private crown = new THREE.Group();
  constructor(_materials: unknown) {
    this.group.name = "community-coordination-monument";
    const stone = new THREE.MeshStandardMaterial({
      color: 0xa9ad9b,
      roughness: 0.8,
      metalness: 0.12,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x344a48,
      roughness: 0.22,
      metalness: 0.65,
    });
    const bronze = new THREE.MeshStandardMaterial({
      color: 0xc4a779,
      roughness: 0.35,
      metalness: 0.7,
    });
    const glow = new THREE.MeshBasicMaterial({ color: 0xe9c58b });
    const mesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(x, y, z);
      obj.castShadow = true;
      obj.receiveShadow = true;
      this.group.add(obj);
      return obj;
    };
    for (let i = 0; i < 3; i++)
      mesh(
        new THREE.CylinderGeometry(10 - i * 1.2, 10 - i * 1.2, 0.35, 64),
        stone,
        0,
        0.18 + i * 0.35,
        0,
      );
    // Three offset architectural blades share an open civic courtyard.
    [-1, 0, 1].forEach((lane, i) => {
      const height = 25 + i * 5;
      mesh(
        new THREE.BoxGeometry(2.6, height, 4.5),
        stone,
        lane * 3.4,
        height / 2 + 1.1,
        lane * 1.8,
      );
      mesh(
        new THREE.BoxGeometry(2.63, height - 2, 0.2),
        glass,
        lane * 3.4,
        height / 2 + 1.1,
        lane * 1.8 + 2.26,
      );
      mesh(
        new THREE.BoxGeometry(0.1, height - 2, 0.12),
        glow,
        lane * 3.4 + 0.95,
        height / 2 + 1.1,
        lane * 1.8 + 2.4,
      );
      for (let floor = 3; floor < height; floor += 2)
        mesh(
          new THREE.BoxGeometry(2.85, 0.1, 4.7),
          bronze,
          lane * 3.4,
          floor + 1.1,
          lane * 1.8,
        );
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.09, 8, 80),
      bronze,
    );
    ring.rotation.x = Math.PI / 2;
    this.crown.add(ring);
    this.crown.position.y = 37;
    this.group.add(this.crown);
    // A small physical inscription keeps the landmark's status explicit.
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#c4c9b5";
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = "#273c33";
      ctx.font = "38px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TECHNOCORE / COMMUNITY CITY", 512, 57);
      ctx.font = "20px sans-serif";
      ctx.fillText("COORDINATION MONUMENT · VISUAL LANDMARK", 512, 94);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 1.375),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
    );
    sign.position.set(0, 1.6, 8);
    this.group.add(sign);
  }
  update(time: number) {
    this.crown.rotation.y = time * 0.035;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        geometries.add(obj.geometry);
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
          (mat) => materials.add(mat),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((mat) => {
      if (mat instanceof THREE.MeshBasicMaterial) mat.map?.dispose();
      mat.dispose();
    });
  }
}
