import assert from 'node:assert/strict';
import {CITY_GRID, CIVIC_SPACES, generateCityLayout, calculateBuildingHeight} from './src/components/agent-city/cityLayout.ts';
const rooms = Array.from({length:48},(_,i)=>({id:`r-${i}`,name:`room-${i}`,displayName:`#room-${i}`,category:'unclassified',signedIdentitiesObserved:null,activeAgentsCount:null,totalProbesReceived:0,medianSubsequentLatencySeconds:null,status:'nominal',color:'#b8c5af',coordinates:[0,0,0]}));
assert.equal(generateCityLayout([]).buildings.length,0,'An empty source must not create fake room buildings');
const city = generateCityLayout(rooms);
assert.equal(city.buildings.length,rooms.length,'One building for every supplied room');
assert.deepEqual(new Set(city.buildings.map(b=>b.room.id)),new Set(rooms.map(r=>r.id)),'No synthetic or omitted rooms');
assert.equal(new Set(city.buildings.map(b=>b.position.join(','))).size,rooms.length,'No overlapping lots');
assert.deepEqual(generateCityLayout(rooms),city,'Layout is deterministic');
assert.equal(calculateBuildingHeight(null),calculateBuildingHeight(0),'Unknown data does not invent activity');
assert.ok(calculateBuildingHeight(20)>calculateBuildingHeight(0),'Observed activity affects massing monotonically');
assert.ok(city.buildings.every(b=>Number.isFinite(b.height)&&b.height>0));
console.log('City integrity: 8 runtime assertions passed.');

for (let i=0;i<city.buildings.length;i++) for (let j=i+1;j<city.buildings.length;j++) {const a=city.buildings[i],b=city.buildings[j];assert.ok(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2]) > Math.max(a.width,a.depth,b.width,b.depth)*1.35, "Building parcels need clear spacing");}
console.log("All 1,128 building-pair spacing checks passed.");

assert.ok(city.buildings.filter(b=>b.height<12).length>24,'Most city blocks should remain low-rise');
assert.ok(city.buildings.filter(b=>b.height>23).length<10,'Tall towers should be occasional skyline anchors');
assert.ok(city.buildings.every(b=>b.position[0]!==0||b.position[2]!==0),'Central community square remains clear');
const lotKeys = new Set(city.buildings.map(({ position: [x, , z] }) => `${x},${z}`));
for (const { x, z } of CIVIC_SPACES) assert.ok(!lotKeys.has(`${x},${z}`), 'Public spaces reserve distinct parcels');
assert.ok(city.buildings.some(({ position }) => position[2] < -63), 'The north quay includes room buildings');
for (const { position: [x, , z] } of city.buildings) {
  assert.ok(CITY_GRID.streetXs.includes(x - 9) && CITY_GRID.streetXs.includes(x + 9));
  assert.ok(CITY_GRID.streetZs.includes(z - 9) && CITY_GRID.streetZs.includes(z + 9));
}

for (const a of city.buildings) for (const b of city.buildings) {
  if (a === b) continue;
  const dx = Math.abs(a.position[0] - b.position[0]), dz = Math.abs(a.position[2] - b.position[2]);
  if (dz === 0) assert.ok(dx - (a.width + b.width) * .65 >= 6, 'Neighbouring foundations leave a wide street corridor');
  if (dx === 0) assert.ok(dz - (a.depth + b.depth) * .65 >= 6, 'Rows leave a wide street corridor');
}
