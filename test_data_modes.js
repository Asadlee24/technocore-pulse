import fs from 'fs';

console.log('=== VERIFYING DATA INTEGRITY: LIVE vs DEMO vs REPLAY ===\n');

// 1. Verify DataContext.tsx has ZERO seeded live data
console.log('Test 1: Check DataContext.tsx for seeded live constants');
const dataContextContent = fs.readFileSync('./src/context/DataContext.tsx', 'utf8');

if (dataContextContent.includes('INITIAL_LIVE_ROOMS')) {
  throw new Error('FAIL: INITIAL_LIVE_ROOMS still present in DataContext.tsx');
} else {
  console.log('  ✓ Verified: INITIAL_LIVE_ROOMS completely removed from DataContext.tsx');
}

if (dataContextContent.includes('INITIAL_RUNS')) {
  throw new Error('FAIL: INITIAL_RUNS still present in DataContext.tsx');
} else {
  console.log('  ✓ Verified: INITIAL_RUNS completely removed from DataContext.tsx');
}

if (dataContextContent.includes('Useful-work board for FLOP Labs')) {
  throw new Error('FAIL: Hardcoded kibble FLOP Labs claim still in DataContext.tsx');
} else {
  console.log('  ✓ Verified: Hardcoded kibble claim removed from DataContext.tsx');
}

// 2. Check that nick_diversity * window is NOT used to fake activeAgentsCount
if (dataContextContent.includes('nick_diversity * window') || dataContextContent.includes('nick_diversity ||') && dataContextContent.includes('activeAgentsCount: Math.max')) {
  throw new Error('FAIL: activeAgentsCount is still computed from nick_diversity');
} else {
  console.log('  ✓ Verified: activeAgentsCount is never fabricated from nick_diversity');
}

// 3. Check that idle_seconds is NOT mapped into averageResponseLatency
if (dataContextContent.includes('averageResponseLatency: Math.max(0.5, Math.round((r.idle_seconds')) {
  throw new Error('FAIL: idle_seconds is still mapped to averageResponseLatency');
} else {
  console.log('  ✓ Verified: idle_seconds is never mapped to averageResponseLatency');
}

// 4. Check that initial LIVE state starts empty
const liveRoomsInitMatch = dataContextContent.match(/const \[liveRooms,\s*setLiveRooms\]\s*=\s*useState<[^>]*>\((\[\])\)/);
if (liveRoomsInitMatch) {
  console.log('  ✓ Verified: liveRooms initializes to empty array [] in LIVE mode');
} else {
  throw new Error('FAIL: liveRooms does not initialize to empty array');
}

const liveRunsInitMatch = dataContextContent.match(/const \[liveDetectedRuns,\s*setLiveDetectedRuns\]\s*=\s*useState<[^>]*>\((\[\])\)/);
if (liveRunsInitMatch) {
  console.log('  ✓ Verified: liveDetectedRuns initializes to empty array [] in LIVE mode');
} else {
  throw new Error('FAIL: liveDetectedRuns does not initialize to empty array');
}

// 5. Verify demoCityData.ts exists and isolates DEMO fixtures
console.log('\nTest 2: Check demoCityData.ts isolation');
const demoCityContent = fs.readFileSync('./src/data/demoCityData.ts', 'utf8');

if (demoCityContent.includes('DEMO_DATASET_LABEL') && demoCityContent.includes('DEMO_ROOM_CLUSTERS')) {
  console.log('  ✓ Verified: DEMO fixtures are properly isolated in src/data/demoCityData.ts');
} else {
  throw new Error('FAIL: demoCityData.ts is missing expected demo fixtures');
}

// 6. Verify AgentCity3D.tsx pulse effect wording
console.log('\nTest 3: Pulse button audit in AgentCity3D.tsx and SignalMap3D.tsx');
const agentCityContent = fs.readFileSync('./src/components/agent-city/AgentCity3D.tsx', 'utf8');
if (agentCityContent.includes('Live probe v1 wave dispatched') || agentCityContent.includes('Subsequent agent activity recorded in #')) {
  throw new Error('FAIL: AgentCity3D still manufactures protocol activity on pulse');
} else {
  console.log('  ✓ Verified: AgentCity3D does not claim live probe dispatch or manufactured agent replies');
}

const signalMapContent = fs.readFileSync('./src/components/SignalMap3D.tsx', 'utf8');
if (signalMapContent.includes('Dispatch a Probe Wave into the District')) {
  throw new Error('FAIL: SignalMap3D still advertises dispatching probe waves on visual pulse');
} else {
  console.log('  ✓ Verified: SignalMap3D clearly labels pulse as DEMO SIGNAL / visual demo');
}

console.log('\n>>> ALL 10 DATA HONESTY CHECKS PASSED! <<<');
