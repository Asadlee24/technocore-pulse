import * as THREE from "three";
import type { CitySurfaces } from "./CitySurfaces";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CITY_GRID, CIVIC_SPACES, QUAY_WALK } from "./cityLayout.js";
import { createStreetTrees, type TreeLocation } from "./StreetTrees.js";

/** Waterfront, gardens and light poles are architectural scenery, not telemetry. */
export class CityEnvironment {
  readonly group = new THREE.Group();
  readonly streetLampPositions: THREE.Vector3[] = [];
  private treeMap: THREE.Texture;
  private water: THREE.Mesh;
  private waterMaterial: THREE.ShaderMaterial;
  constructor(theme: "dark" | "light" = "dark", surfaces?: CitySurfaces) {
    const light = theme === "light";
    this.group.name = "waterfront-city-landscape";
    this.group.userData.isScenery = true;
    const ground = new THREE.MeshStandardMaterial({
      color: light ? 0xb7b3a4 : 0x22292b,
      roughness: 0.88,
      metalness: 0.08,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: light ? 0xd8d0be : 0x59605e,
      roughness: 0.8,
    });
    const navy = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.7,
      metalness: 0.3,
    });
    surfaces?.apply(ground, "asphalt");
    surfaces?.apply(stone, "pavers");
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      parent: THREE.Group = this.group,
    ) => {
      surfaces?.tile(geo, mat, x, y, z);
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(x, y, z);
      obj.receiveShadow = true;
      parent.add(obj);
      return obj;
    };
    // A grounded waterfront neighbourhood rather than a circular display plinth.
    add(new THREE.BoxGeometry(182, 2, 182), ground, 0, -1, 0);
    add(new THREE.BoxGeometry(184, .3, 184), navy, 0, -1.9, 0);
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(180, .08, 3.5), stone, 0, .04, side * 89);
      add(new THREE.BoxGeometry(3.5, .08, 180), stone, side * 89, .04, 0);
      add(new THREE.BoxGeometry(.15, .5, 182), navy, side * 91, .35, 0);
    }
    add(new THREE.BoxGeometry(182, .5, .15), navy, 0, .35, 91);
    const crossingLeft = QUAY_WALK.crossingX - QUAY_WALK.crossingWidth / 2;
    const crossingRight = QUAY_WALK.crossingX + QUAY_WALK.crossingWidth / 2;
    for (const [from, to] of [[-91, crossingLeft], [crossingRight, 91]])
      add(new THREE.BoxGeometry(to - from, .5, .15), navy, (from + to) / 2, .35, -91);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }, daylight: { value: light ? 1 : 0 }, wetness: { value: 0 },
        deep: { value: new THREE.Color(light ? 0x326e91 : 0x081724) },
        horizon: { value: new THREE.Color(light ? 0xdaecf8 : 0x293a55) },
      },
      vertexShader: `varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `
        varying vec3 world;
        uniform float time, daylight, wetness;
        uniform vec3 deep, horizon;

        void main() {
          vec2 p = world.xz;
          float a = sin(dot(p, vec2(.31, .18)) + time * .52);
          float b = cos(dot(p, vec2(-.12, .64)) - time * .39);
          float c = sin(dot(p, vec2(.74, -.36)) + time * .85);
          float detail = 1. - smoothstep(.15, 1.4, length(fwidth(p)));
          vec3 normal = normalize(vec3(a * .08 + c * .045 * detail, 1., b * .075));
          vec3 view = normalize(cameraPosition - world);
          float fresnel = .03 + .97 * pow(1. - max(dot(normal, view), 0.), 4.);
          vec3 color = mix(deep, horizon, fresnel * .8);
          float glint = pow(max(dot(reflect(-normalize(vec3(-.61, .18, -.79)), normal), view), 0.), 80.);
          color += mix(vec3(.16, .24, .37), vec3(1., .80, .55), daylight) * glint * .36 * (1. - wetness * .7);
          color += vec3(.003, .006, .011) * a * b;

          // The promenade lights are spaced 18 metres apart along each quay.
          vec2 side = abs(p);
          float sea = max(side.x, side.y) - 102.;
          float along = side.x > side.y ? p.y : p.x;
          float distortion = (a * .65 + b * .45 + c * .35 * detail) * (1. + wetness);
          float lampDistance = abs(mod(along + distortion + 9., 18.) - 9.);
          float reflection = exp(-max(sea, 0.) * .105 - lampDistance * .72);
          reflection *= smoothstep(-.2, 1.5, sea) * (1. - smoothstep(87., 93., abs(along)));
          reflection *= (.67 + .33 * b * detail) * (1. - daylight) * (1. - wetness * .35);
          color += vec3(.46, .22, .075) * reflection;
          color = mix(color, horizon, 1. - exp(-pow(length(cameraPosition - world) * .0018, 2.)));
          gl_FragColor = vec4(color, 1.);
          #include <colorspace_fragment>
        }
      `,
    });
    this.water = add(new THREE.PlaneGeometry(5000, 5000), this.waterMaterial, 0, -2.1, 0);
    this.water.name = "animated-waterfront-water";
    this.water.rotation.x = -Math.PI / 2;
    // An inhabited waterfront edge fills the foreground around the room district.
    const warm = new THREE.MeshBasicMaterial({ color: light ? 0xe4dfc5 : 0xffd599, toneMapped: false });
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(206, .38, 10), stone, 0, -.1, side * 97);
      add(new THREE.BoxGeometry(10, .38, 186), stone, side * 97, -.1, 0);
      add(new THREE.BoxGeometry(206, .10, .12), navy, 0, .95, side * 101.5);
      add(new THREE.BoxGeometry(.12, .10, 186), navy, side * 101.5, .95, 0);
      for (let i = 0; i < 11; i++) {
        const along = (i - 5) * 18;
        for (const orientation of [0, 1]) {
          const x = orientation ? side * 98 : along;
          const z = orientation ? along : side * 98;
          add(new THREE.CylinderGeometry(.07, .10, 3.7, 6), navy, x, 1.95, z);
          add(new THREE.SphereGeometry(.23, 8, 6), warm, x, 3.85, z);
          const seat = add(new THREE.BoxGeometry(2.5, .18, .65), ground, x + (orientation ? 0 : 3.5), .6, z + (orientation ? 3.5 : 0));
          const back = add(new THREE.BoxGeometry(2.5, .65, .12), navy, seat.position.x, .98, seat.position.z + .3);
          if (orientation) { seat.rotation.y = Math.PI / 2; back.rotation.y = Math.PI / 2; back.position.set(seat.position.x + .3, .98, seat.position.z); }
        }
      }
    }
    const promenade = new THREE.Group();
    promenade.name = "north-quay-boardwalk";
    promenade.userData.isScenery = true;
    this.group.add(promenade);
    const deck = new THREE.MeshStandardMaterial({ color: 0x84735e, roughness: .84 });
    surfaces?.apply(deck, "wood");
    add(new THREE.BoxGeometry(QUAY_WALK.length, .12, QUAY_WALK.depth), deck, 0, .15, QUAY_WALK.z, promenade);
    const pavementWalk = add(new THREE.BoxGeometry(QUAY_WALK.crossingWidth, .15, 15.6), stone,
      QUAY_WALK.crossingX, .124, -91.55, promenade);
    pavementWalk.name = "quay-tram-crossing";
    const curbStripe = new THREE.MeshBasicMaterial({ color: 0xd8bb80 });
    for (const z of [-92.85, -95.15])
      add(new THREE.BoxGeometry(QUAY_WALK.crossingWidth - .18, .012, .15), curbStripe, QUAY_WALK.crossingX, .208, z, promenade);
    const soil = new THREE.MeshStandardMaterial({ color: 0x383329, roughness: 1 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x6b7653, roughness: 1 });
    for (const x of [-67, -48, -29, -10, 12, 47, 68]) {
      add(new THREE.BoxGeometry(3.4, .16, .82), stone, x, .175, -96.75, promenade);
      add(new THREE.BoxGeometry(3.16, .05, .65), soil, x, .26, -96.75, promenade);
      for (let i = 0; i < 8; i++) {
        const h = .20 + Math.abs(Math.sin(x * .7 + i * 2.17)) * .38;
        const tuft = add(new THREE.ConeGeometry(.14, h, 5), grass, x + (i - 3.5) * .37, .27 + h / 2, -96.77, promenade);
        tuft.rotation.z = Math.sin(i + x) * .38;
      }
    }
    // Distant shore and architecture are scenery, kept separate from public rooms.
    const shore = new THREE.MeshStandardMaterial({ color: light ? 0x789286 : 0x1c3037, roughness: 1 });
    const distant = new THREE.MeshStandardMaterial({ color: light ? 0x8cabb9 : 0x253b50, roughness: .8 });
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(1300, 3, 220), shore, 0, -2, side * 510);
      add(new THREE.BoxGeometry(220, 3, 820), shore, side * 510, -2, 0);
    }
    const skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), distant, 88);
    skyline.name = "distant-scenery-skyline";
    skyline.userData.isScenery = true;
    const transform = new THREE.Object3D();
    for (let i = 0; i < 88; i++) {
      const edge = Math.floor(i / 22), along = (i % 22 - 10.5) * 42;
      const height = 18 + Math.abs(Math.sin(i * 7.31)) ** 3 * 68;
      transform.position.set(edge < 2 ? along : (edge === 2 ? -1 : 1) * 480, height / 2 - .5, edge < 2 ? (edge === 0 ? -1 : 1) * 480 : along);
      transform.scale.set(12 + i % 4 * 4, height, 14 + i % 3 * 5);
      transform.updateMatrix();skyline.setMatrixAt(i, transform.matrix);
    }
    skyline.instanceMatrix.needsUpdate = true;
    this.group.add(skyline);
    // Four clean arrival piers create a recognizable waterfront silhouette.
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const pier = add(
        new THREE.BoxGeometry(4, 0.45, 14),
        stone,
        Math.cos(angle) * 99,
        -0.5,
        Math.sin(angle) * 99,
      );
      pier.rotation.y = Math.PI / 2 - angle;
      for (const offset of [-1.7, 1.7]) {
        const edge = add(
          new THREE.BoxGeometry(0.07, 0.7, 13),
          navy,
          Math.cos(angle) * 99 + Math.cos(angle + Math.PI / 2) * offset,
          0.05,
          Math.sin(angle) * 99 + Math.sin(angle + Math.PI / 2) * offset,
        );
        edge.rotation.y = Math.PI / 2 - angle;
      }
    }
    const foliage = new THREE.MeshStandardMaterial({ color: light ? 0x496c45 : 0x395440, roughness: .98 });
    const treeLocations: TreeLocation[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const height = 3.7 + (i * 7 % 9) * .31;
        const along = (i - 5.5) * 14 + Math.sin(i * 1.7) * 1.7;
        // Plant behind the promenade so furniture and trunks leave a clear walking strip.
        treeLocations.push({ x: along, z: side * 86, height, spread: height * .57 });
        treeLocations.push({ x: side * 86, z: along + 2.5, height: height * .88, spread: height * .51 });
      }
    }
    for (const z of CITY_GRID.streetZs.slice(0, -1)) for (const x of CITY_GRID.streetXs.slice(0, -1)) {
      const cx = x + 9, cz = z + 9;
      if (CIVIC_SPACES.some(space => space.x === cx && space.z === cz)) continue;
      const height = 3.15 + Math.abs(Math.sin(x * 1.8 + z * .7)) * 2.15;
      const treeX = cx + 5.12;
      const treeZ = cz + 3.5 + Math.cos(z * .9 + x) * 1.1;
      add(new THREE.BoxGeometry(.68, .058, .86), stone, treeX, .074, treeZ);
      treeLocations.push({ x: treeX, z: treeZ, height, spread: height * .51, ground: .105 });
    }
    const lawn = new THREE.MeshStandardMaterial({color: light ? 0x4e775a : 0x284b39, roughness: 1});
    const bench = new THREE.MeshStandardMaterial({color: 0x8a7561, roughness: .9});
    for (const [gardenX, gardenZ] of CITY_GRID.quaysideGardens) {
      add(new THREE.BoxGeometry(15, .1, 25), lawn, gardenX, .08, gardenZ);
      add(new THREE.BoxGeometry(1.6, .13, 25), stone, gardenX, .13, gardenZ);
      const benchX = gardenX + Math.sign(gardenX) * 2;
      for (let i = 0; i < 4; i++) {
        const z = gardenZ + (i - 1.5) * 5;
        add(new THREE.BoxGeometry(1.5, .15, .5), bench, benchX, .55, z);
        add(new THREE.BoxGeometry(1.5, .7, .1), bench, benchX, .8, z + .25);
      }
    }
    const civicBlocks: THREE.Group[] = [];
    const canvas = new THREE.MeshStandardMaterial({ color: 0xa66043, roughness: .92 });
    const greenCanvas = new THREE.MeshStandardMaterial({ color: 0x547565, roughness: .92 });
    for (const space of CIVIC_SPACES) {
      if (space.kind === "plaza") continue;
      const block = new THREE.Group();
      block.name = space.name;
      block.userData.civicSpace = true;
      block.position.set(space.x, 0, space.z);
      this.group.add(block);
      civicBlocks.push(block);
      const place = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) =>
        add(geometry, material, x, y, z, block);
      const box = (width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number) =>
        place(new THREE.BoxGeometry(width, height, depth), material, x, y, z);

      box(11.2, .13, 11.2, space.kind === "market" ? stone : lawn, 0, .1, 0);
      box(12.4, .11, 1.35, stone, 0, .115, 0);
      box(1.35, .11, 12.4, stone, 0, .116, 0);
      for (const side of [-1, 1]) {
        box(1.75, .13, .52, bench, side * 3.25, .54, .95);
        box(1.75, .39, .075, bench, side * 3.25, .72, 1.2);
        box(1.35, .33, .16, navy, side * 3.25, .305, .95);
        for (const end of [-1, 1]) {
          const x = side * 4.4, z = end * 4.4;
          const height = 3.6 + Math.abs(Math.sin((space.x + x) * .3 + z)) * 2.3;
          treeLocations.push({ x: space.x + x, z: space.z + z, height, spread: height * .59, ground: .16 });
        }
      }
      if (space.kind === "market") {
        for (const x of [-2.7, 2.7]) {
          box(2.6, .13, 1.35, bench, x, .87, -2.7);
          box(2.35, .64, .95, navy, x, .5, -2.7);
          for (const side of [-1, 1]) box(.08, 2.35, .08, navy, x + side * 1.12, 1.25, -3.19);
          box(2.75, .085, 1.65, x < 0 ? canvas : greenCanvas, x, 2.36, -2.77).rotation.x = -.16;
          for (const side of [-1, 1]) box(.25, .18, .29, x < 0 ? greenCanvas : canvas, x + side * .45, 1.006, -2.55);
        }
      } else if (space.kind === "playground") {
        box(3.2, .1, 2.7, canvas, 2.55, .23, -2.65);
        box(2.7, .1, .13, navy, 2.55, 2.18, -2.65);
        for (const x of [1.22, 3.88]) box(.11, 1.96, .11, navy, x, 1.2, -2.65);
        for (const x of [2.12, 2.98]) {
          box(.41, .07, .26, bench, x, .74, -2.65);
          for (const side of [-1, 1]) box(.025, 1.42, .025, navy, x + side * .17, 1.48, -2.65);
        }
      } else {
        for (const x of [-2.65, 2.65]) {
          box(2.5, .27, 1.15, stone, x, .29, -2.4);
          for (const offset of [-.69, 0, .69])
            place(new THREE.IcosahedronGeometry(.44, 1), foliage, x + offset, .62, -2.4);
        }
      }
    }
    const trees = createStreetTrees(treeLocations);
    this.treeMap = trees.map;
    this.group.add(trees.group);

    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 2.4, 6);
    const headGeo = new THREE.BoxGeometry(.56, .105, .23);
    const bulbGeo = new THREE.BoxGeometry(.45, .036, .17);
    const armGeo = new THREE.BoxGeometry(.60, .045, .055);
    const baseGeo = new THREE.CylinderGeometry(.10, .14, .28, 8);
    const glow = new THREE.MeshBasicMaterial({
      color: light ? 0xe5f2fa : 0xffdfac,
      toneMapped: false,
    });
    for (const streetX of CITY_GRID.streetXs.slice(0, -1)) for (const streetZ of CITY_GRID.streetZs.slice(0, -1)) {
      const x = streetX + 3;
      const z = streetZ + 12;
      add(poleGeo, navy, x, 1.28, z);
      add(baseGeo, navy, x, .22, z);
      add(armGeo, navy, x - .26, 2.42, z);
      add(headGeo, navy, x - .61, 2.42, z);
      add(bulbGeo, glow, x - .61, 2.355, z);
      this.streetLampPositions.push(new THREE.Vector3(x - .61, 2.32, z));
    }
    if (!light) {
      const poolMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { tint: { value: new THREE.Color(0xffb777) } },
        vertexShader: `
          varying vec2 poolUv;
          void main() {
            poolUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
          }
        `,
        fragmentShader: `
          uniform vec3 tint;
          varying vec2 poolUv;
          void main() {
            vec2 fromCenter = (poolUv - .5) * 2.;
            float radius = dot(fromCenter, fromCenter);
            float falloff = exp(-radius * 3.4) * (1. - smoothstep(.55, 1., radius));
            gl_FragColor = vec4(tint, falloff * .31);
            #include <colorspace_fragment>
          }
        `,
      });
      const pools = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(7.4, 5.8).rotateX(-Math.PI / 2),
        poolMaterial,
        this.streetLampPositions.length,
      );
      pools.name = "street-lamp-light-pools";
      const matrix = new THREE.Matrix4();
      this.streetLampPositions.forEach((lamp, index) => {
        pools.setMatrixAt(index, matrix.makeTranslation(lamp.x - .5, .127, lamp.z));
      });
      pools.instanceMatrix.needsUpdate = true;
      this.group.add(pools);
    }
    // Keep promenade detail inexpensive on mobile by batching static scenery.
    for (const parent of [this.group, promenade, ...civicBlocks]) {
      const batches = new Map<THREE.Material, THREE.Mesh[]>();
      for (const child of parent.children) {
        if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || child.name || Array.isArray(child.material)) continue;
        const list = batches.get(child.material) ?? [];
        list.push(child);
        batches.set(child.material, list);
      }
      for (const [material, meshes] of batches) {
        if (meshes.length < 2) continue;
        const parts = meshes.map(mesh => {
          mesh.updateMatrix();
          return mesh.geometry.clone().applyMatrix4(mesh.matrix);
        });
        const geometry = mergeGeometries(parts, false);
        parts.forEach(part => part.dispose());
        if (!geometry) continue;
        const combined = new THREE.Mesh(geometry, material);
        combined.receiveShadow = true;
        combined.castShadow = parent !== this.group && material !== lawn && material !== stone;
        meshes.forEach(mesh => { parent.remove(mesh); mesh.geometry.dispose(); });
        parent.add(combined);
      }
    }
  }
  update(time: number, wetness = 0) {
    this.waterMaterial.uniforms.time.value = time;
    this.waterMaterial.uniforms.wetness.value = wetness;
    this.water.position.y = -2.1 + Math.sin(time * 0.3) * 0.025;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (o instanceof THREE.InstancedMesh) o.dispose();
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.treeMap.dispose();
  }
}
