import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
// Scene-graph checks run without claiming GPU-rendered visual verification.
const previousDocument = globalThis.document;
const drawCalls = [];
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () =>
      new Proxy(
        {},
        {
          get: (_, key) =>
            key === "fillText"
              ? (...args) => drawCalls.push(args[0])
              : () => {},
        },
      ),
  }),
};
mkdirSync("node_modules/.tmp", { recursive: true });
const tmp = mkdtempSync(resolve("node_modules/.tmp/office-"));
const source = "src/components/agent-city/";
try {
  for (const name of [
    "AgentWorker",
    "AgentDesk",
    "AgentOfficeFloor",
    "OfficeInterior",
  ]) {
    let compiled = ts.transpileModule(
      readFileSync(`${source}${name}.ts`, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    compiled = compiled.replace(
      /from ['"]\.\/(AgentWorker|AgentDesk|AgentOfficeFloor)['"]/g,
      'from "./$1.mjs"',
    );
    writeFileSync(`${tmp}/${name}.mjs`, compiled);
  }
  const { OfficeInterior } = await import(
    pathToFileURL(`${tmp}/OfficeInterior.mjs`)
  );
  const { AgentDeskFactory } = await import(
    pathToFileURL(`${tmp}/AgentDesk.mjs`)
  );
  const { AgentWorker } = await import(pathToFileURL(`${tmp}/AgentWorker.mjs`));
  const room = {
    id: "source-room",
    name: "lobby",
    displayName: "#lobby",
    category: "unclassified",
    signedIdentitiesObserved: null,
    activeAgentsCount: null,
    totalProbesReceived: 0,
    medianSubsequentLatencySeconds: null,
    status: "nominal",
    color: "#86bda6",
    coordinates: [0, 0, 0],
  };
  const office = new OfficeInterior({
    room,
    width: 4.4,
    depth: 4.4,
    height: 18,
    position: [0, 0, 0],
    district: "coordination",
    archetype: "office-tower",
    color: room.color,
    beaconColor: room.color,
    windowDensity: 16,
    rotationY: 0,
    isPrimaryRoom: true,
  });
  const find = (name) => {
    const out = [];
    office.group.traverse((o) => {
      if (o.name === name) out.push(o);
    });
    return out;
  };
  assert.equal(
    find("illustrative-office-worker").length,
    0,
    "Closed offices allocate no crew",
  );
  office.setCutawayVisible(true);
  assert.equal(
    find("illustrative-office-worker").length,
    18,
    "Unknown identity counts must not hide the illustrative crew",
  );
  assert.equal(
    find("agent-workstation").length,
    18,
    "Each worker needs a workstation",
  );
  office.setFocusedFloor(0);
  const visible = [];
  office.group.traverseVisible((o) => {
    if (o.name === "illustrative-office-worker") visible.push(o);
  });
  assert.equal(visible.length, 6, "Ground-floor detail hides upper floors");
  const before = visible[0].children.map((o) => o.position.y);
  office.update(1.1);
  const after = visible[0].children.map((o) => o.position.y);
  assert.notDeepEqual(after, before, "Visible characters animate");
  office.group.updateMatrixWorld(true);
  const desks = find("agent-workstation");
  for (const desk of desks) {
    assert.ok(desk.userData.illustrativeCrew);
    assert.ok(
      desk.children.some((o) => o.isInstancedMesh && o.count === 30),
      "Each computer has a modeled keyboard",
    );
  }
  assert.ok(
    drawCalls.some((s) => s === "UNKNOWN"),
    "Unknown source metrics remain unknown",
  );
  assert.ok(
    drawCalls.some((s) => s.includes("ILLUSTRATIVE")),
    "Illustrative screens are labelled",
  );
  office.updateRoomData({ ...room, signedIdentitiesObserved: 1 });
  assert.equal(
    find("illustrative-office-worker").length,
    18,
    "Crew count never impersonates observed DID count",
  );
  office.setFocusedFloor(null);
  assert.ok(
    office.group.children
      .filter((o) => o.type === "Group")
      .every((o) => o.visible),
  );
  office.setCutawayVisible(false);
  assert.equal(
    find("illustrative-office-worker").length,
    0,
    "Closed office releases worker groups",
  );
  office.setCutawayVisible(true);
  assert.equal(
    find("illustrative-office-worker").length,
    18,
    "Reopening restores the crew",
  );
  office.setCutawayVisible(false);
  office.dispose();
  AgentDeskFactory.dispose();
  AgentWorker.dispose();
  console.log(
    "Office scene checks passed: visible crew, workstations, animation, labels, floor focus and reopen lifecycle.",
  );
} finally {
  globalThis.document = previousDocument;
  rmSync(tmp, { recursive: true, force: true });
}
