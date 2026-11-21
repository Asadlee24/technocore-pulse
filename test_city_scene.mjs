import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as THREE from "three";
import { PUBLIC_CITY_SNAPSHOT } from "./src/data/publicCitySnapshot.ts";
import { CITY_GRID, CIVIC_SPACES, QUAY_WALK } from "./src/components/agent-city/cityLayout.ts";
const hashes = {
  dark: "beaa615528cd9b3ee2273b54c944bb2c66ef02d4fa2d8dd223b08dc823bb3f87",
  light: "aefccec3895b8850f0b7e789bbebbb6ae86f14ba49e439e571e61f726cd3890a",
};
for (const [name, hash] of Object.entries(hashes))
  assert.equal(
    createHash("sha256")
      .update(readFileSync(`public/brand/flop-lockup-on-${name}.png`))
      .digest("hex"),
    hash,
    "Official logo export must remain unchanged",
  );
assert.equal(
  PUBLIC_CITY_SNAPSHOT.source,
  "https://technocore.chat/rooms?format=json",
);
assert.equal(PUBLIC_CITY_SNAPSHOT.rooms.length, 48);
assert.ok(Number.isFinite(Date.parse(PUBLIC_CITY_SNAPSHOT.capturedAt)));
assert.equal(new Set(PUBLIC_CITY_SNAPSHOT.rooms.map((r) => r.room)).size, 48);
const previousDocument = globalThis.document,
  previousLoad = THREE.TextureLoader.prototype.load;
const loads = [];
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => new Proxy({}, { get: () => () => {} }),
  }),
};
THREE.TextureLoader.prototype.load = function (url) {
  loads.push(url);
  return new THREE.Texture();
};
mkdirSync("node_modules/.tmp", { recursive: true });
const tmp = mkdtempSync(resolve("node_modules/.tmp/city-scene-"));
try {
  const dependencies = ["streetMotion", "cityLayout", "StreetTraffic", "StreetPedestrians", "StreetTrees"];
  for (const name of ["CityEnvironment", "CityRoads", "CitySurfaces", "MetroLandmark", ...dependencies])
    writeFileSync(
      `${tmp}/${name}.${dependencies.includes(name) ? "js" : "mjs"}`,
      ts.transpileModule(
        readFileSync(`src/components/agent-city/${name}.ts`, "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        },
      ).outputText,
    );
  const { CityEnvironment } = await import(
    pathToFileURL(`${tmp}/CityEnvironment.mjs`)
  );
  const { CityRoads } = await import(pathToFileURL(`${tmp}/CityRoads.mjs`));
  const { MetroLandmark } = await import(
    pathToFileURL(`${tmp}/MetroLandmark.mjs`)
  );
  const { CitySurfaces } = await import(pathToFileURL(`${tmp}/CitySurfaces.mjs`));
  const surfaces = new CitySurfaces(64, 4, true);
  const asphalt = new THREE.MeshStandardMaterial();
  surfaces.apply(asphalt, "asphalt");
  assert.ok(asphalt.map && asphalt.bumpMap);
  assert.equal(asphalt.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(asphalt.bumpMap.colorSpace, THREE.NoColorSpace);
  const strip = new THREE.BoxGeometry(12, .1, 6);
  surfaces.tile(strip, asphalt);
  const { normal, uv } = strip.attributes;
  const horizontalUVs = Array.from({ length: uv.count }, (_, i) => i)
    .filter(i => normal.getY(i) === 1).map(i => uv.getX(i));
  assert.equal(Math.max(...horizontalUVs) - Math.min(...horizontalUVs), 4);
  strip.dispose();
  asphalt.dispose();
  const smooth = new CitySurfaces(64, 1, false);
  const smoothMaterial = new THREE.MeshStandardMaterial();
  smooth.apply(smoothMaterial, "pavers");
  assert.ok(smoothMaterial.map);
  assert.equal(smoothMaterial.bumpMap, null);
  smoothMaterial.dispose();
  smooth.dispose();
  const environment = new CityEnvironment("dark", surfaces),
    pavilion = new MetroLandmark({}, surfaces),
    roads = new CityRoads({
      innerRingRadius: 14,
      outerRingRadius: 28,
      beltwayRadius: 43,
      radialAvenues: [{ angle: 0, startRadius: 8, endRadius: 65 }],
    }, "dark", surfaces);
  const asphaltMesh = roads.group.children.find(o => o.material?.map === asphalt.map);
  assert.ok(asphaltMesh, "The road and shared asphalt material use the same texture");
  roads.update(0, 1);
  assert.ok(asphaltMesh.material.roughness < .5, "Rain changes the road material response");
  const roadShader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
  asphaltMesh.material.onBeforeCompile(roadShader);
  assert.equal(roadShader.uniforms.streetWetness.value, 1);
  assert.match(roadShader.fragmentShader, /roughnessFactor = clamp/);
  roads.update(0, 0);
  assert.equal(roadShader.uniforms.streetWetness.value, 0, "Wetness updates without rebuilding the road material");
  assert.equal(environment.streetLampPositions.length, (CITY_GRID.streetXs.length - 1) * (CITY_GRID.streetZs.length - 1));
  for (const place of CIVIC_SPACES.filter(place => place.kind !== "plaza")) {
    const block = environment.group.getObjectByName(place.name);
    assert.deepEqual(block?.position.toArray(), [place.x, 0, place.z]);
    assert.ok(block.children.length > 3, "Civic blocks are furnished in the rendered scene");
  }
  asphaltMesh.geometry.computeBoundingBox();
  assert.ok(asphaltMesh.geometry.boundingBox.min.z <= -92, "Downtown roads reach the north quay");
  const nightPools = environment.group.getObjectByName("street-lamp-light-pools");
  assert.ok(nightPools?.isInstancedMesh, "Street lighting uses one batch");
  assert.equal(nightPools.count, environment.streetLampPositions.length);
  const daylight = new CityEnvironment("light", surfaces);
  assert.equal(daylight.group.getObjectByName("street-lamp-light-pools"), undefined);
  daylight.dispose();
  environment.update(2, .65);
  const water = environment.group.getObjectByName("animated-waterfront-water");
  assert.equal(water.material.uniforms.wetness.value, .65);
  const trees = environment.group.getObjectByName("street-tree-canopies");
  const trunks = trees.getObjectByName("tapered-tree-trunks");
  const branches = trees.getObjectByName("tapered-tree-branches");
  const crowns = trees.getObjectByName("layered-leaf-clusters");
  assert.equal(branches.count, trunks.count * 5);
  assert.equal(crowns.count, trunks.count * 18);
  assert.ok(crowns.material.map?.isCanvasTexture && crowns.material.alphaTest > 0);
  const crossing = environment.group.getObjectByName("quay-tram-crossing");
  assert.equal(crossing.position.x, QUAY_WALK.crossingX);
  assert.ok(new THREE.Box3().setFromObject(crossing).min.z < CITY_GRID.quayTram.z);
  assert.deepEqual(loads, ["/brand/flop-lockup-on-dark.png"]);
  assert.equal(pavilion.group.userData.isScenery, true);
  pavilion.group.updateMatrixWorld(true);
  const landmarkBounds = new THREE.Box3().setFromObject(pavilion.group);
  assert.ok(landmarkBounds.max.y > 30, "Central landmark rises above the room-building skyline");
  assert.ok(Math.max(Math.abs(landmarkBounds.min.x),Math.abs(landmarkBounds.max.x),Math.abs(landmarkBounds.min.z),Math.abs(landmarkBounds.max.z)) < 8.3, "Landmark fits inside the reserved plaza without blocking traffic");
  const logos=pavilion.group.children.filter(o=>o.name==="flop-landmark-logo");
  assert.equal(logos.length,4,"FLOP branding is readable from all four approach directions");
  for(const logo of logos) assert.equal(logo.geometry.parameters.width/logo.geometry.parameters.height,2,"Original logo aspect ratio is preserved");
  assert.ok(pavilion.group.getObjectByName("landmark-entrance-canopy"));
  assert.ok(pavilion.group.getObjectByName("landmark-community-inscription"));
  assert.ok(pavilion.group.children.length<25,"Landmark detail is batched rather than hundreds of draw calls");
  assert.equal(roads.group.userData.isScenery, true);
  const vehicle = roads.group.getObjectByName("vehicle-painted-body");
  vehicle.geometry.computeBoundingBox();
  const vehicleSize = vehicle.geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(vehicleSize.x > 2.6 && vehicleSize.z <= 1.02 && vehicleSize.y > .7);
  assert.ok(roads.group.getObjectByName("vehicle-windshields"));
  assert.ok(roads.group.getObjectByName("vehicle-rims"));
  const pedestrian = roads.group.getObjectByName("pedestrian-heads");
  const leftShin = roads.group.getObjectByName("pedestrian-shins");
  const matrix = new THREE.Matrix4();
  const walker = new THREE.Vector3();
  pedestrian.getMatrixAt(pedestrian.count - 1, matrix);
  assert.ok(Math.abs(walker.setFromMatrixPosition(matrix).z - QUAY_WALK.z) < QUAY_WALK.depth / 2);
  const shinBefore = Array.from(leftShin.instanceMatrix.array);
  const before = Array.from(vehicle.instanceMatrix.array);
  assert.ok(roads.group.children.filter(o => o.isMesh && !o.isInstancedMesh).length < 20, "Street geometry is batched by material, not one draw per stripe");
  assert.ok(roads.group.getObjectByName("vehicle-tail-lights"));
  roads.update(2);
  assert.notDeepEqual(Array.from(leftShin.instanceMatrix.array), shinBefore, "Pedestrians bend their knees while walking");
  assert.notDeepEqual(
    Array.from(vehicle.instanceMatrix.array),
    before,
    "Street traffic moves with elapsed time",
  );
  for (const scene of [environment, pavilion, roads]) {
    scene.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene.group);
    assert.ok(
      [...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
      "All scene bounds must remain finite",
    );
    scene.dispose();
  }
  surfaces.dispose();
  console.log(
    "City scene checks passed: shared tiled surfaces, rain response, original logo bytes, captured-source provenance, pavilion, waterfront, street traffic and finite geometry.",
  );
} finally {
  globalThis.document = previousDocument;
  THREE.TextureLoader.prototype.load = previousLoad;
  rmSync(tmp, { recursive: true, force: true });
}
