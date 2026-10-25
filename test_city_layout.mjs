import assert from 'node:assert/strict';
import {generateCityLayout, calculateBuildingHeight} from './src/components/agent-city/cityLayout.ts';
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
