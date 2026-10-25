import * as THREE from "three";

/** Community exhibition pavilion. The supplied FLOP logo is used without redrawing it. */
export class MetroLandmark {
  readonly group = new THREE.Group();
  private halo = new THREE.Group();
  private logoTexture: THREE.Texture;
  constructor(_materials: unknown) {
    this.group.name = "flop-community-pavilion";
    this.group.scale.setScalar(.52);
    this.group.userData.isScenery = true;
    const stone = new THREE.MeshStandardMaterial({
      color: 0xc5d1dc,
      roughness: 0.7,
      metalness: 0.12,
    });
    const navy = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.35,
      metalness: 0.5,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2c5678,
      roughness: 0.19,
      metalness: 0.7,
    });
    const cyan = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      toneMapped: false,
    });
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
        new THREE.CylinderGeometry(10 - i * 0.9, 10 - i * 0.9, 0.25, 64),
        stone,
        0,
        0.125 + i * 0.25,
        0,
      );
    // Two precise blades and an open sky gallery, rather than a fictional operational HQ.
    for (const side of [-1, 1]) {
      mesh(new THREE.BoxGeometry(2.1, 22, 7), stone, side * 5.2, 11.8, 0);
      mesh(new THREE.BoxGeometry(0.18, 20, 5.8), glass, side * 4.08, 11.8, 0);
      for (let floor = 3; floor < 22; floor += 2)
        mesh(
          new THREE.BoxGeometry(2.25, 0.08, 7.1),
          navy,
          side * 5.2,
          floor,
          0,
        );
    }
    mesh(new THREE.BoxGeometry(12.6, 3.3, 7.4), navy, 0, 23.15, 0);
    mesh(new THREE.BoxGeometry(8.6, 2.5, 7.45), glass, 0, 23.15, 0);
    mesh(new THREE.BoxGeometry(13.4, 0.28, 8), stone, 0, 25, 0);
    // Logo sits on a true Base ground; the original image retains its internal clear space.
    this.logoTexture = new THREE.TextureLoader().load(
      "/brand/flop-lockup-on-dark.png",
    );
    this.logoTexture.colorSpace = THREE.SRGBColorSpace;
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: this.logoTexture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    });
    for (const side of [-1, 1]) {
      mesh(
        new THREE.BoxGeometry(11, 0.08, 5.5),
        new THREE.MeshBasicMaterial({ color: 0x0a1128, toneMapped: false }),
        0,
        13,
        side * 4.3,
      ).rotation.x = Math.PI / 2;
      const logo = mesh(
        new THREE.PlaneGeometry(11, 5.5),
        logoMaterial,
        0,
        13,
        side * 4.36,
      );
      logo.rotation.y = side === 1 ? 0 : Math.PI;
    }
    for (const side of [-1, 1])
      mesh(
        new THREE.BoxGeometry(0.055, 20, 0.055),
        cyan,
        side * 6.28,
        11.8,
        3.56,
      );
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.045, 6, 80),
      cyan,
    );
    line.rotation.x = Math.PI / 2;
    this.halo.add(line);
    this.halo.position.y = 0.85;
    this.group.add(this.halo);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0A1128";
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = "#F5F7FA";
      ctx.font = "32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("TECHNOCORE / COMMUNITY CITY", 512, 55);
      ctx.fillStyle = "#A1A7AE";
      ctx.font = "20px monospace";
      ctx.fillText("INDEPENDENT VISUALIZATION · BUILT BY ASAD LEE", 512, 93);
    }
    const inscription = new THREE.CanvasTexture(canvas);
    inscription.colorSpace = THREE.SRGBColorSpace;
    mesh(
      new THREE.PlaneGeometry(10, 1.25),
      new THREE.MeshBasicMaterial({ map: inscription, toneMapped: false }),
      0,
      1.6,
      8,
    );
  }
  update(time: number) {
    this.halo.rotation.y = time * 0.025;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    materials.forEach((m) => {
      if (m instanceof THREE.MeshBasicMaterial && m.map) textures.add(m.map);
      m.dispose();
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    this.logoTexture.dispose();
  }
}
