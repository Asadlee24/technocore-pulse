import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingLayout } from "./cityLayout";
import type { CitySurfaces } from "./CitySurfaces";

type OpaqueMaterials = {
  structure: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
};

/** A real glazing gap and an interior behind it, independent of room activity. */
export function createCityFrontage(
  layout: BuildingLayout,
  materials: OpaqueMaterials,
  isDay: boolean,
  surfaces?: CitySurfaces,
) {
  const { width, depth, archetype, position } = layout;
  const w = width * 1.05;
  const d = depth * 1.05;
  const face = d / 2;
  const back = face - Math.min(2.45, d * .64);
  const ground = .2;
  const top = 2.58;
  const doorWidth = Math.min(w * .28, 1.62);
  const sideWidth = (w - doorWidth) / 2;
  const masonry = position[2] < -63 || archetype === "social-block" || archetype === "broadcast-hall";
  const { structure, trim, stone } = materials;
  const group = new THREE.Group();
  group.name = "street-frontage";
  const furniture = new THREE.Group();
  furniture.name = "street-frontage-interior";
  group.add(furniture);

  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const box = (mw: number, mh: number, md: number, material: THREE.Material, x: number, y: number, z: number) => {
    const geometry = new THREE.BoxGeometry(mw, mh, md);
    surfaces?.tile(geometry, material, x, y, z);
    geometry.translate(x, y, z);
    const list = batches.get(material) ?? [];
    list.push(geometry);
    batches.set(material, list);
  };
  const flush = (parent: THREE.Group, castShadow: boolean) => {
    for (const [material, parts] of batches) {
      const merged = mergeGeometries(parts)!;
      parts.forEach(part => part.dispose());
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    batches.clear();
  };

  // A recess rather than a solid plinth allows parallax through the clear front.
  box(w, top - ground, d - (face - back), structure, 0, (top + ground) / 2, (back - face) / 2);
  box(w, .105, face - back, stone, 0, ground + .027, (face + back) / 2);
  box(w, .12, face - back, structure, 0, top - .06, (face + back) / 2);
  box(w + .08, .13, .23, stone, 0, .26, face);
  for (const side of [-1, 1]) {
    const edge = side * (w / 2 - .095);
    const bay = side * (w + doorWidth) / 4;
    box(.19, top - ground, face - back, structure, edge, (top + ground) / 2, (face + back) / 2);
    box(sideWidth, .28, .19, structure, bay, .41, face);
    box(sideWidth, .20, .19, structure, bay, top - .12, face);
    for (const post of [.07, .51, .96]) {
      const x = side * (doorWidth / 2 + sideWidth * post);
      box(masonry ? .14 : .06, 1.79, .115, trim, x, 1.43, face + .016);
    }
    box(sideWidth - .08, .051, .09, trim, bay, 1.98, face + .025);
    box(.07, 2.08, .15, trim, side * (doorWidth / 2 - .045), 1.32, face + .034);
    box(.14, .026, .055, trim, side * .142, 1.184, face + .11);
  }
  box(.066, 2.04, .115, trim, 0, 1.275, face + .042);
  box(doorWidth, .063, .13, trim, 0, 2.31, face + .04);
  box(doorWidth + .16, .045, .39, stone, 0, .23, face + .14);
  box(w * (masonry ? .82 : .52), .098, masonry ? .73 : .95, trim, 0, 2.46, face + .37);
  flush(group, true);

  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(w - .22, 1.98),
    new THREE.MeshPhysicalMaterial({
      color: isDay ? 0xbcd4d7 : 0xaab9c1, transparent: true, opacity: isDay ? .26 : .19,
      roughness: .13, metalness: .48, clearcoat: .85, clearcoatRoughness: .13, depthWrite: false,
    }),
  );
  pane.name = "recessed-lobby-glazing";
  pane.position.set(0, 1.376, face + .042);
  group.add(pane);

  const warmWall = new THREE.MeshStandardMaterial({
    color: masonry ? 0xa68b74 : 0xbdb2a1, roughness: .79,
    emissive: 0xe6a56a, emissiveIntensity: isDay ? .05 : .19,
  });
  const wood = new THREE.MeshStandardMaterial({ color: 0x796051, roughness: .67, emissive: 0x8e5c35, emissiveIntensity: isDay ? .03 : .18 });
  surfaces?.apply(wood, "wood");
  const light = new THREE.MeshBasicMaterial({ color: isDay ? 0xf5dcba : 0xffd6a1, toneMapped: false });
  const fabric = new THREE.MeshStandardMaterial({ color: masonry ? 0x617161 : 0x545f61, roughness: .96 });
  const pot = new THREE.MeshStandardMaterial({ color: 0x81766c, roughness: .91 });
  const plant = new THREE.MeshStandardMaterial({ color: 0x526551, roughness: 1 });

  box(w - .27, 2.13, .07, warmWall, 0, 1.332, back + .075);
  box(w - .43, .18, .10, wood, 0, .389, back + .13);
  const panelWidth = Math.min(w * .38, 2.52);
  const receptionX = w * .22;
  box(panelWidth, 1.93, .055, trim, receptionX, 1.37, back + .14);
  for (let slat = 0; slat < 14; slat++) {
    const x = receptionX + (slat / 13 - .5) * (panelWidth - .1);
    box(.058, 1.88, .043, wood, x, 1.37, back + .191);
  }
  box(panelWidth * .84, .035, .047, light, receptionX, 2.22, back + .194);
  const deskWidth = Math.min(w * .25, 1.55);
  box(deskWidth, .66, .51, wood, receptionX, .63, back + .55);
  box(deskWidth + .06, .058, .57, stone, receptionX, .988, back + .55);
  box(.33, .223, .037, trim, receptionX, 1.14, back + .49);
  box(deskWidth * .81, .028, .04, trim, receptionX, .57, back + .814);
  box(.81, .30, .075, trim, -w * .23, 1.61, back + .165);
  box(.73, .22, .016, stone, -w * .23, 1.61, back + .211);
  for (const side of [-1, 1]) {
    box(.76, .14, .43, fabric, -w * .22 + side * .39, .68, back + .61);
    box(.76, .40, .12, fabric, -w * .22 + side * .39, .90, back + .44);
    box(.69, .25, .35, wood, -w * .22 + side * .39, .49, back + .60);
    box(.26, .33, .26, pot, side * (w / 2 - .4), .426, face - .60);
    for (const branch of [-1, 0, 1]) {
      const leaves = new THREE.IcosahedronGeometry(.17, 1);
      leaves.scale(.69, 1.9, .65).rotateZ(branch * .52);
      leaves.translate(side * (w / 2 - .4) + branch * .1, .79 + .08 * (1 - Math.abs(branch)), face - .60);
      const list = batches.get(plant) ?? [];
      list.push(leaves);
      batches.set(plant, list);
    }
    box(.08, .035, .93, light, side * w * .27, 2.383, face - .74);
  }
  flush(furniture, false);

  if (!isDay) {
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(w * .88, 1.5).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { tint: { value: new THREE.Color(0xe4b480) } },
      vertexShader: `varying vec2 floorUV; void main() {
        floorUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
      fragmentShader: `varying vec2 floorUV; uniform vec3 tint; void main() {
        float across = 1. - smoothstep(.14, .5, abs(floorUV.x - .5));
        float fade = smoothstep(.0, .87, floorUV.y) * (1. - smoothstep(.97, 1., floorUV.y));
        gl_FragColor = vec4(tint, .19 * across * fade);
        #include <colorspace_fragment>
      }`,
    }));
    spill.name = "lobby-light-spill";
    spill.position.set(0, .207, face + .64);
    furniture.add(spill);
  }
  return { group, furniture };
}
