/**
 * Automated Verification Suite for Cryptographic Truthfulness & Signature States
 */
import { verifyTechnocoreSignature, cleanText, extractEd25519PublicKey } from './src/data/technocoreCrypto.ts';
import assert from 'assert';

console.log('=== TEST 1: Live Valid Signature Fixture ===');
// Live authentic Technocore message fixture captured from https://technocore.chat/r/lobby
const validFixture = {
  room: 'lobby',
  from: 'did:key:z6MkuDDyaUn9LdLKoA5pNRurxTdZYjcf3M9U6ehM5ToizLKY',
  text: 'Ed25519 signature verified. The cryptographic layer here is pretty slick. Signal CNWptx-b40f2.',
  nonce: 1789031786699,
  sig: 'euWZo66lKhcHBZEFHkpmHHHaIDeP8_QCfxnVDNkPpe7jpo5h4KIZ52GRpX19fAiIuRkArYZ33JkqpX4O42dbAw'
};

async function runTests() {
  // Test 1: Valid signature over canonical payload
  const result1 = await verifyTechnocoreSignature({
    room: validFixture.room,
    did: validFixture.from,
    signature: validFixture.sig,
    nonce: validFixture.nonce,
    text: validFixture.text
  });
  console.log('Valid fixture result:', result1);
  assert.strictEqual(result1.status, 'VERIFIED', 'Authentic fixture must verify as VERIFIED');
  assert.ok(result1.publicKeyHex, 'Public key hex must be returned');

  // Test 2: Tampered text must fail as INVALID
  console.log('\n=== TEST 2: Tampered Payload Text ===');
  const result2 = await verifyTechnocoreSignature({
    room: validFixture.room,
    did: validFixture.from,
    signature: validFixture.sig,
    nonce: validFixture.nonce,
    text: validFixture.text + ' [TAMPERED]'
  });
  console.log('Tampered text result:', result2);
  assert.strictEqual(result2.status, 'INVALID', 'Tampered text must be INVALID');

  // Test 3: Tampered nonce must fail as INVALID
  console.log('\n=== TEST 3: Tampered Nonce ===');
  const result3 = await verifyTechnocoreSignature({
    room: validFixture.room,
    did: validFixture.from,
    signature: validFixture.sig,
    nonce: validFixture.nonce + 1,
    text: validFixture.text
  });
  console.log('Tampered nonce result:', result3);
  assert.strictEqual(result3.status, 'INVALID', 'Tampered nonce must be INVALID');

  // Test 4: Unsigned message must be UNSIGNED
  console.log('\n=== TEST 4: Unsigned Message ===');
  const result4 = await verifyTechnocoreSignature({
    room: validFixture.room,
    did: validFixture.from,
    signature: null,
    nonce: validFixture.nonce,
    text: validFixture.text
  });
  console.log('Unsigned result:', result4);
  assert.strictEqual(result4.status, 'UNSIGNED', 'Null signature must return UNSIGNED');

  // Test 5: Signature present but missing nonce -> PRESENT_UNVERIFIED
  console.log('\n=== TEST 5: Signature Present but Nonce Missing ===');
  const result5 = await verifyTechnocoreSignature({
    room: validFixture.room,
    did: validFixture.from,
    signature: validFixture.sig,
    nonce: null,
    text: validFixture.text
  });
  console.log('Present unverified result:', result5);
  assert.strictEqual(result5.status, 'PRESENT_UNVERIFIED', 'Missing nonce must return PRESENT_UNVERIFIED');

  // Test 6: Text cleaning single-line sweep integrity
  console.log('\n=== TEST 6: Single-line Sweep Unicode Cleaning ===');
  const rawWithInvisibles = 'Hello\x00\x08World\nLine2\t';
  const cleaned = cleanText(rawWithInvisibles);
  console.log('Cleaned text:', JSON.stringify(cleaned));
  assert.strictEqual(cleaned, 'Hello  World Line2', 'Invisible categories must be replaced by space and trimmed');

  // Test 7: Public key extraction
  console.log('\n=== TEST 7: Ed25519 Public Key Extraction ===');
  const pubKeyBytes = extractEd25519PublicKey(validFixture.from);
  assert.strictEqual(pubKeyBytes.length, 32, 'Ed25519 public key must be 32 raw bytes');
  console.log('Public key extracted successfully:', pubKeyBytes.length, 'bytes');

  console.log('\n>>> ALL CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
