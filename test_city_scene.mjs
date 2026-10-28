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
  for (const name of ["CityEnvironment", "CityRoads", "MetroLandmark", "streetMotion"])
    writeFileSync(
      `${tmp}/${name === "streetMotion" ? "streetMotion.js" : name + ".mjs"}`,
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
  const environment = new CityEnvironment(),
    pavilion = new MetroLandmark({}),
    roads = new CityRoads({
      innerRingRadius: 14,
      outerRingRadius: 28,
      beltwayRadius: 43,
      radialAvenues: [{ angle: 0, startRadius: 8, endRadius: 65 }],
    });
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
  const vehicle = roads.group.children.find((o) => o.isInstancedMesh);
  const before = Array.from(vehicle.instanceMatrix.array);
  assert.ok(roads.group.children.filter(o => o.isMesh && !o.isInstancedMesh).length < 20, "Street geometry is batched by material, not one draw per stripe");
  assert.ok(roads.group.getObjectByName("vehicle-tail-lights"));
  roads.update(2);
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
  console.log(
    "City scene checks passed: original logo bytes, captured-source provenance, pavilion, waterfront, street traffic and finite geometry.",
  );
} finally {
  globalThis.document = previousDocument;
  THREE.TextureLoader.prototype.load = previousLoad;
  rmSync(tmp, { recursive: true, force: true });
}
