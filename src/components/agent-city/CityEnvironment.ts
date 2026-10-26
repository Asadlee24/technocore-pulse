import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Waterfront, gardens and light poles are architectural scenery, not telemetry. */
export class CityEnvironment {
  readonly group = new THREE.Group();
  private water: THREE.Mesh;
  private waterMaterial: THREE.ShaderMaterial;
  constructor(theme: "dark" | "light" = "dark") {
    const light = theme === "light";
    this.group.name = "waterfront-city-landscape";
    this.group.userData.isScenery = true;
    const ground = new THREE.MeshStandardMaterial({
      color: light ? 0xb8c6d3 : 0x1b222b,
      roughness: 0.88,
      metalness: 0.08,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: light ? 0xe0e8ef : 0x505963,
      roughness: 0.8,
    });
    const navy = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.7,
      metalness: 0.3,
    });
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(x, y, z);
      obj.receiveShadow = true;
      this.group.add(obj);
      return obj;
    };
    // A grounded waterfront neighbourhood rather than a circular display plinth.
    add(new THREE.BoxGeometry(182, 2, 182), ground, 0, -1, 0);
    add(new THREE.BoxGeometry(184, .3, 184), navy, 0, -1.9, 0);
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(180, .08, 3.5), stone, 0, .04, side * 89);
      add(new THREE.BoxGeometry(3.5, .08, 180), stone, side * 89, .04, 0);
      add(new THREE.BoxGeometry(182, .5, .15), navy, 0, .35, side * 91);
      add(new THREE.BoxGeometry(.15, .5, 182), navy, side * 91, .35, 0);
    }
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }, daylight: { value: light ? 1 : 0 },
        deep: { value: new THREE.Color(light ? 0x326e91 : 0x081724) },
        horizon: { value: new THREE.Color(light ? 0xdaecf8 : 0x22304f) },
      },
      vertexShader: `varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `varying vec3 world;uniform float time;uniform float daylight;uniform vec3 deep;uniform vec3 horizon;
        void main(){vec2 p=world.xz;float t=time*.35;
          float a=sin(p.x*.31+p.y*.18+t),b=cos(p.y*.49-p.x*.12-t*.7);
          vec3 n=normalize(vec3(a*.10,1.,b*.08));vec3 view=normalize(cameraPosition-world);
          float fresnel=pow(1.-max(dot(n,view),0.),4.);
          vec3 col=mix(deep,horizon,fresnel*.52);
          float glint=pow(max(dot(reflect(-normalize(vec3(-.61,.18,-.79)),n),view),0.),100.);
          float ripples=.5+.5*sin(p.x*1.8+p.y*.7+a*2.);
          col+=mix(vec3(.28,.35,.47),vec3(1.,.86,.60),daylight)*glint*(.25+.5*ripples);
          col+=vec3(.008,.014,.018)*a*b;
          float haze=1.-exp(-pow(length(cameraPosition-world)*.0018,2.));
          col=mix(col,horizon,haze);gl_FragColor=vec4(col,1.);
          #include <colorspace_fragment>
        }`,
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
    const trunk = new THREE.MeshStandardMaterial({
      color: 0x52616d,
      roughness: 0.9,
    });
    const foliage = new THREE.MeshStandardMaterial({
      color: light ? 0x5f7b6d : 0x456858,
      roughness: 0.95,
    });
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.25, 6),
      canopyGeo = new THREE.IcosahedronGeometry(0.7, 1);
    const stems = new THREE.InstancedMesh(stemGeo, trunk, 160),
      canopies = new THREE.InstancedMesh(canopyGeo, foliage, 160);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 160; i++) {
      const angle = (i / 64) * Math.PI * 2,
        radius = 6.5;
      const streetIndex = i - 64;
      const edge = Math.floor(i / 12) % 4;
      const along = ((i % 12) / 11 * 2 - 1) * 84;
      const perimeterX = edge === 0 ? along : edge === 1 ? 87 : edge === 2 ? -along : -87;
      const perimeterZ = edge === 0 ? -87 : edge === 1 ? along : edge === 2 ? 87 : -along;
      const x = i < 48 ? perimeterX : i < 64 ? Math.cos(angle) * radius : ((streetIndex % 7) - 3) * 18 + (streetIndex % 2 ? 6.2 : -6.2),
        z = i < 48 ? perimeterZ : i < 64 ? Math.sin(angle) * radius : ((Math.floor(streetIndex / 7) % 7) - 3) * 18 + (streetIndex % 3 - 1) * 3;
      dummy.position.set(x, 0.65, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.75;
      dummy.scale.set(1.2, 1.6, 1.2);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    }
    stems.castShadow = true;
    canopies.castShadow = true;
    stems.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.group.add(stems, canopies);
    const lawn = new THREE.MeshStandardMaterial({color: light ? 0x4e775a : 0x284b39, roughness: 1});
    const bench = new THREE.MeshStandardMaterial({color: 0x8a7561, roughness: .9});
    for (const side of [-1, 1]) for (const other of [-1, 1]) {
      add(new THREE.BoxGeometry(15, .1, 25), lawn, side * 76, .08, other * 40);
      add(new THREE.BoxGeometry(1.6, .13, 25), stone, side * 76, .13, other * 40);
      for (let i = 0; i < 4; i++) {
        const z = other * 40 + (i - 1.5) * 5;
        add(new THREE.BoxGeometry(1.5, .15, .5), bench, side * 78, .55, z);
        add(new THREE.BoxGeometry(1.5, .7, .1), bench, side * 78, .8, z + .25);
      }
    }
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 2.4, 6);
    const bulbGeo = new THREE.BoxGeometry(0.35, 0.045, 0.16);
    const glow = new THREE.MeshBasicMaterial({
      color: 0xe5f2fa,
      toneMapped: false,
    });
    for (let i = 0; i < 48; i++) {
      const x = ((i % 8) - 3.5) * 18 + 3;
      const z = (Math.floor(i / 8) - 2.5) * 18 + 3;
      add(poleGeo, navy, x, 1.2, z);
      add(bulbGeo, glow, x, 2.4, z);
    }
    // Keep promenade detail inexpensive on mobile by batching static scenery.
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of this.group.children) {
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
      combined.name = "batched-waterfront-scenery";
      combined.receiveShadow = true;
      meshes.forEach(mesh => { this.group.remove(mesh); mesh.geometry.dispose(); });
      this.group.add(combined);
    }
  }
  update(time: number) {
    this.waterMaterial.uniforms.time.value = time;
    this.water.position.y = -2.1 + Math.sin(time * 0.3) * 0.025;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}
