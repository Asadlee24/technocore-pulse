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
  for (const name of ["CityEnvironment", "CityRoads", "MetroLandmark"])
    writeFileSync(
      `${tmp}/${name}.mjs`,
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
  assert.equal(roads.group.userData.isScenery, true);
  const vehicle = roads.group.children.find((o) => o.isInstancedMesh);
  const before = Array.from(vehicle.instanceMatrix.array);
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
