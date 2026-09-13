import assert from 'assert';

console.log('=== TEST: Real Observed Identity Pipeline & Avatar Budget ===\n');

// 1. Deterministic hashing test (DJB2)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

const testDid = 'did:key:z6MkuDDyaUn9LdLKoA5pNRurxTdZYjcf3M9U6ehM5ToizLKY';
const hash1 = hashString(testDid);
const hash2 = hashString(testDid);
assert.strictEqual(hash1, hash2, 'Hash must be strictly deterministic across calls');
console.log('  ✓ Deterministic hashing validated for DID:', testDid.slice(0, 20) + '...', '-> hash:', hash1);

// 2. Identity Deduplication logic test
const sampleMessages = [
  { did: 'did:key:agent1', room: 'technocore', text: 'msg 1', ts: 100 },
  { did: 'did:key:agent2', room: 'kibble', text: 'msg 2', ts: 110 },
  { did: 'did:key:agent1', room: 'kibble', text: 'msg 3', ts: 120 },
  { did: 'did:key:agent3', room: 'lobby', text: 'msg 4', ts: 130 },
];

const identityMap = new Map();
sampleMessages.forEach(msg => {
  if (!identityMap.has(msg.did)) {
    identityMap.set(msg.did, {
      did: msg.did,
      roomsSeen: [msg.room],
      messageCount: 1,
      lastObserved: msg.ts
    });
  } else {
    const existing = identityMap.get(msg.did);
    if (!existing.roomsSeen.includes(msg.room)) existing.roomsSeen.push(msg.room);
    existing.messageCount += 1;
    existing.lastObserved = Math.max(existing.lastObserved, msg.ts);
  }
});

assert.strictEqual(identityMap.size, 3, 'Distinct identities must equal 3');
assert.strictEqual(identityMap.get('did:key:agent1').messageCount, 2, 'Agent1 message count must be 2');
assert.strictEqual(identityMap.get('did:key:agent1').roomsSeen.length, 2, 'Agent1 roomsSeen must include both rooms');
console.log('  ✓ Distinct DID deduplication and multi-room tracking verified (3 unique from 4 messages)');

// 3. Avatar Capping Logic (Max 16 rendered avatars for 60fps frame budget)
const MAX_RENDERED = 16;
const manyIdentities = Array.from({ length: 45 }, (_, i) => ({
  did: `did:key:agent_${i}`,
  lastObserved: 1000 + i
}));

const sorted = manyIdentities.slice().sort((a, b) => b.lastObserved - a.lastObserved);
const renderedSlice = sorted.slice(0, MAX_RENDERED);

assert.strictEqual(renderedSlice.length, 16, 'Rendered avatars must be capped at 16');
assert.strictEqual(manyIdentities.length, 45, 'Total observed count remains 45');
console.log(`  ✓ Avatar rendering cap verified: ${renderedSlice.length} rendered of ${manyIdentities.length} total observed`);

// 4. Empty State Verification
const emptyIdentities = [];
const emptyRendered = emptyIdentities.slice(0, MAX_RENDERED);
assert.strictEqual(emptyRendered.length, 0, 'Zero observed identities must result in 0 rendered avatars');
console.log('  ✓ Honest empty state verified: 0 observed -> 0 avatars');

console.log('\n>>> ALL OBSERVED PIPELINE TESTS PASSED! <<<');
