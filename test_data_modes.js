import fs from 'fs';

console.log('=== VERIFYING DATA INTEGRITY: STRICT REAL OBSERVED DATA ===\n');

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

// 2. Verify DEMO mode removed from GlobalDataMode
console.log('\nTest 2: Verify DEMO mode elimination');
if (dataContextContent.includes("GlobalDataMode = 'LIVE' | 'DEMO' | 'REPLAY'")) {
  throw new Error('FAIL: DEMO mode is still present in GlobalDataMode');
} else if (dataContextContent.includes("export type GlobalDataMode = 'LIVE' | 'REPLAY'")) {
  console.log('  ✓ Verified: GlobalDataMode is strictly LIVE | REPLAY (no DEMO mode)');
} else {
  throw new Error('FAIL: GlobalDataMode definition unexpected');
}

// 3. Check that nick_diversity * window is NOT used to fake activeAgentsCount
console.log('\nTest 3: Verify metrics honesty');
if (dataContextContent.includes('nick_diversity * window') || (dataContextContent.includes('nick_diversity ||') && dataContextContent.includes('activeAgentsCount: Math.max'))) {
  throw new Error('FAIL: activeAgentsCount is still computed from nick_diversity');
} else {
  console.log('  ✓ Verified: activeAgentsCount is never fabricated from nick_diversity');
}

// 4. Check that idle_seconds is NOT mapped into averageResponseLatency
if (dataContextContent.includes('averageResponseLatency: Math.max(0.5, Math.round((r.idle_seconds')) {
  throw new Error('FAIL: idle_seconds is still mapped to averageResponseLatency');
} else {
  console.log('  ✓ Verified: idle_seconds is never mapped to averageResponseLatency');
}

// 5. Check that initial LIVE state starts empty
console.log('\nTest 4: Verify Fail-Closed Empty Initialization');
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

const liveIdentitiesInitMatch = dataContextContent.match(/const \[liveObservedIdentities,\s*setLiveObservedIdentities\]\s*=\s*useState<[^>]*>\((\[\])\)/);
if (liveIdentitiesInitMatch) {
  console.log('  ✓ Verified: liveObservedIdentities initializes to empty array [] in LIVE mode');
} else {
  throw new Error('FAIL: liveObservedIdentities does not initialize to empty array');
}

// 6. Verify SignalMap3D has no CitizenSimulation or DEMO buttons
console.log('\nTest 5: Check SignalMap3D UI cleanliness');
const signalMapContent = fs.readFileSync('./src/components/SignalMap3D.tsx', 'utf8');

if (signalMapContent.includes('CitizenSimulation') || signalMapContent.includes('citizenSimulationData')) {
  throw new Error('FAIL: SignalMap3D still references CitizenSimulation or citizenSimulationData');
} else {
  console.log('  ✓ Verified: SignalMap3D has zero references to simulated citizen personas');
}

if (signalMapContent.includes("setDataMode('DEMO')")) {
  throw new Error('FAIL: SignalMap3D still includes DEMO mode button');
} else {
  console.log('  ✓ Verified: SignalMap3D mode switcher only exposes LIVE and REPLAY');
}

console.log('\n>>> ALL DATA HONESTY & MODE INTEGRITY CHECKS PASSED! <<<');
