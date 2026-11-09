import * as THREE from "three";

type Surface = "concrete" | "masonry" | "asphalt" | "pavers" | "metal" | "wood";
type SurfaceSpec = {
  metres: number;
  grain: number;
  variation: number;
  bump: number;
  courses?: [number, number];
  stagger?: boolean;
};

const SPEC: Record<Surface, SurfaceSpec> = {
  concrete: { metres: 4, grain: 8, variation: 17, bump: .033, courses: [3, 2] },
  masonry: { metres: 3.6, grain: 9, variation: 25, bump: .046, courses: [4, 8], stagger: true },
  asphalt: { metres: 3, grain: 30, variation: 16, bump: .026 },
  pavers: { metres: 3.6, grain: 10, variation: 19, bump: .035, courses: [6, 8], stagger: true },
  metal: { metres: 2, grain: 6, variation: 12, bump: .008 },
  wood: { metres: 2.4, grain: 7, variation: 23, bump: .014, courses: [2, 10], stagger: true },
};

function hash(x: number, y: number) {
  let n = Math.imul(x + 43, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function tileNoise(x: number, y: number, frequency: number) {
  const px = x * frequency;
  const py = y * frequency;
  const i = Math.floor(px);
  const j = Math.floor(py);
  const u = THREE.MathUtils.smoothstep(px - i, 0, 1);
  const v = THREE.MathUtils.smoothstep(py - j, 0, 1);
  const nextX = (i + 1) % frequency;
  const nextY = (j + 1) % frequency;
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(i, j), hash(nextX, j), u),
    THREE.MathUtils.lerp(hash(i, nextY), hash(nextX, nextY), u),
    v,
  );
}

/** Shared, seamless surface tiles. One color/height pair per material family. */
export class CitySurfaces {
  private maps = new Map<Surface, { color: THREE.DataTexture; height?: THREE.DataTexture }>();
  private scale = new WeakMap<THREE.Material, number>();

  private size: number;
  private anisotropy: number;
  private relief: boolean;

  constructor(size: number, anisotropy: number, relief: boolean) {
    this.size = size;
    this.anisotropy = anisotropy;
    this.relief = relief;
  }

  apply(material: THREE.MeshStandardMaterial, surface: Surface) {
    const spec = SPEC[surface];
    let maps = this.maps.get(surface);
    if (!maps) {
      maps = this.makeMaps(surface, spec);
      this.maps.set(surface, maps);
    }
    material.map = maps.color;
    if (maps.height) {
      material.bumpMap = maps.height;
      material.bumpScale = spec.bump;
    }
    this.scale.set(material, 1 / spec.metres);
  }

  tile(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const scale = this.scale.get(material);
    if (!scale) return;
    const { position, normal, uv } = geometry.attributes;
    if (!position || !normal || !uv) return;
    for (let i = 0; i < position.count; i++) {
      const nx = Math.abs(normal.getX(i));
      const ny = Math.abs(normal.getY(i));
      const nz = Math.abs(normal.getZ(i));
      const vertical = ny >= nx && ny >= nz;
      uv.setXY(
        i,
        (nx > nz && !vertical ? position.getZ(i) + z : position.getX(i) + x) * scale,
        (vertical ? position.getZ(i) + z : position.getY(i) + y) * scale,
      );
    }
    uv.needsUpdate = true;
  }

  private makeMaps(surface: Surface, spec: SurfaceSpec) {
    const { size } = this;
    const colors = new Uint8Array(size * size * 4);
    const heights = this.relief ? new Uint8Array(colors.length) : undefined;
    const [columns, rows] = spec.courses ?? [1, 1];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const row = Math.floor(v * rows);
        const across = u * columns + (spec.stagger && row % 2 ? .5 : 0);
        const column = Math.floor(across) % columns;
        const localX = across % 1;
        const localY = (v * rows) % 1;
        const seam = Math.min(localX, 1 - localX, localY, 1 - localY);
        const edge = spec.courses ? THREE.MathUtils.smoothstep(seam, .012, .055) : 1;
        const broad = tileNoise(u, v, 5) - .5;
        const detail = tileNoise(u, v, 24) - .5;
        const grain = hash(x, y) - .5;
        const brush = surface === "wood" || surface === "metal" ? (hash(0, y) - .5) * 18 : 0;
        const block = (hash(column, row) - .5) * spec.variation;
        const value = 239 + broad * 23 + detail * 16 + block + grain * spec.grain + brush - (1 - edge) * 62;
        const height = 105 + edge * 63 + broad * 24 + detail * 20 + grain * spec.grain + brush;
        const i = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          colors[i + channel] = THREE.MathUtils.clamp(value, 0, 255);
          if (heights) heights[i + channel] = THREE.MathUtils.clamp(height, 0, 255);
        }
        colors[i + 3] = 255;
        if (heights) heights[i + 3] = 255;
      }
    }
    const texture = (pixels: Uint8Array) => {
      const map = new THREE.DataTexture(pixels, size, size);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.magFilter = THREE.LinearFilter;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.anisotropy = this.anisotropy;
      map.needsUpdate = true;
      return map;
    };
    const color = texture(colors);
    color.colorSpace = THREE.SRGBColorSpace;
    return { color, height: heights ? texture(heights) : undefined };
  }

  dispose() {
    for (const { color, height } of this.maps.values()) {
      color.dispose();
      height?.dispose();
    }
    this.maps.clear();
  }
}
