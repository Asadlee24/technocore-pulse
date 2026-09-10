/**
 * Official Technocore Cryptographic Verification Module
 * Reference: flop-labs/technocore-chat src/didkey.py, src/store.py, and scripts/sign.py
 *
 * Rules:
 * 1. Ed25519 only (did:key:z6Mk...)
 * 2. Multicodec varint prefix: 0xed, 0x01
 * 3. Base58btc decoding
 * 4. Canonical payload string: "<room>|<nonce>|<text-after-sweep>"
 * 5. Single-line sweep: replaces Unicode categories (Cc, Cf, Cs, Co, Zl, Zp) with a space and trims
 * 6. Signature: 86 base64url characters unpadded
 */

export type SignatureVerificationStatus =
  | 'VERIFIED'
  | 'INVALID'
  | 'PRESENT_UNVERIFIED'
  | 'UNSIGNED';

export interface VerificationResult {
  status: SignatureVerificationStatus;
  reason?: string;
  publicKeyHex?: string;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58_INDEX: Record<string, number> = {};
for (let i = 0; i < B58.length; i++) {
  B58_INDEX[B58[i]] = i;
}

const PREFIX = 'did:key:';
const MULTIBASE_CHARS = 48;
const SIG_RE = /^[A-Za-z0-9_-]{85}[AQgw]$/;
const NONCE_RE = /^[0-9]{1,19}$/;

// Unicode single-line sweep categories mirrored from src/store.py clean_text
// Cc: Control, Cf: Format, Cs: Surrogate, Co: Private use, Zl: Line separator, Zp: Paragraph separator
const INVISIBLE_REGEX = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu;

export function cleanText(text: string): string {
  return (text || '').replace(INVISIBLE_REGEX, ' ').trim();
}

/**
 * Base58btc decoder handling leading zeros properly
 */
export function b58decode(raw: string): Uint8Array {
  let n = BigInt(0);
  for (let i = 0; i < raw.length; i++) {
    const digit = B58_INDEX[raw[i]];
    if (digit === undefined) {
      throw new Error(`Invalid base58btc character: '${raw[i]}'`);
    }
    n = n * BigInt(58) + BigInt(digit);
  }

  let hex = n.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }

  // Preserve leading zeros encoded as '1'
  let leading = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '1') leading++;
    else break;
  }

  if (leading > 0) {
    const prefixed = new Uint8Array(leading + bytes.length);
    prefixed.set(bytes, leading);
    return prefixed;
  }

  return bytes;
}

/**
 * Extracts the 32 raw Ed25519 public key bytes from a did:key string
 */
export function extractEd25519PublicKey(did: string): Uint8Array {
  if (!did || typeof did !== 'string' || !did.startsWith(PREFIX)) {
    throw new Error(`Expected DID to start with ${PREFIX}`);
  }
  const mb = did.slice(PREFIX.length);
  if (mb.length !== MULTIBASE_CHARS || !mb.startsWith('z')) {
    throw new Error(`Expected ${MULTIBASE_CHARS} multibase characters starting with 'z'`);
  }
  const decoded = b58decode(mb.slice(1));
  // 2 bytes multicodec (0xed, 0x01) + 32 bytes pubkey = 34 bytes
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('Only ed25519-pub (z6Mk...) did:keys are supported');
  }
  return decoded.slice(2);
}

/**
 * Decodes 86-character unpadded base64url string to 64 raw bytes
 */
export function decodeBase64UrlSig(sig: string): Uint8Array {
  if (!SIG_RE.test(sig)) {
    throw new Error('Signature is not canonical 86-char base64url ending in [AQgw]');
  }
  let b64 = sig.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  const binStr = typeof atob === 'function' ? atob(b64) : '';
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

export interface VerifySignatureInput {
  room: string;
  did?: string | null;
  signature?: string | null;
  nonce?: number | string | null;
  text?: string | null;
}

/**
 * Verifies an authentic Technocore Ed25519 signature against its canonical payload.
 *
 * Payload: `<room>|<nonce>|<text-after-sweep>`
 */
export async function verifyTechnocoreSignature(
  input: VerifySignatureInput
): Promise<VerificationResult> {
  const { room, did, signature, nonce, text } = input;

  // 1. Missing signature -> strictly UNSIGNED
  if (!signature || signature.trim() === '') {
    return { status: 'UNSIGNED', reason: 'No signature provided' };
  }

  // 2. Missing DID -> invalid
  if (!did || !did.startsWith('did:key:')) {
    return { status: 'INVALID', reason: 'Missing or malformed DID' };
  }

  // 3. Nonce verification
  const nonceStr = nonce !== undefined && nonce !== null ? String(nonce).trim() : '';
  if (!NONCE_RE.test(nonceStr)) {
    // If signature exists but nonce is absent in payload context, mark PRESENT_UNVERIFIED
    return { status: 'PRESENT_UNVERIFIED', reason: 'Missing or malformed sequence nonce' };
  }

  // 4. Validate signature format
  let sigBytes: Uint8Array;
  try {
    sigBytes = decodeBase64UrlSig(signature.trim());
    if (sigBytes.length !== 64) {
      return { status: 'INVALID', reason: `Invalid signature byte length: ${sigBytes.length} (expected 64)` };
    }
  } catch (err: any) {
    return { status: 'INVALID', reason: `Signature decode failed: ${err.message}` };
  }

  // 5. Extract public key
  let pubKeyBytes: Uint8Array;
  try {
    pubKeyBytes = extractEd25519PublicKey(did.trim());
  } catch (err: any) {
    return { status: 'INVALID', reason: `Public key extraction failed: ${err.message}` };
  }

  // 6. Build canonical swept payload: <room>|<nonce>|<text-after-sweep>
  const swept = cleanText(text || '');
  const canonicalPayload = `${room}|${nonceStr}|${swept}`;
  const payloadBytes = new TextEncoder().encode(canonicalPayload);

  // 7. Verify using standard WebCrypto SubtleCrypto
  try {
    const cryptoSubtle = globalThis.crypto?.subtle;

    if (!cryptoSubtle) {
      return { status: 'PRESENT_UNVERIFIED', reason: 'WebCrypto SubtleCrypto is unavailable in environment' };
    }

    const key = await cryptoSubtle.importKey(
      'raw',
      pubKeyBytes as unknown as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const isValid = await cryptoSubtle.verify(
      { name: 'Ed25519' },
      key,
      sigBytes as unknown as BufferSource,
      payloadBytes as unknown as BufferSource
    );

    if (isValid) {
      return {
        status: 'VERIFIED',
        publicKeyHex: Array.from(pubKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      };
    } else {
      return { status: 'INVALID', reason: 'Cryptographic signature mismatch over canonical payload' };
    }
  } catch (err: any) {
    return { status: 'INVALID', reason: `Verification execution error: ${err.message}` };
  }
}
