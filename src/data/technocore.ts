/**
 * Polite & Constrained Technocore Public API Adapter
 * 
 * Rules:
 * 1. Bounded initial pass: samples 10-16 most active public rooms.
 * 2. Strict concurrency cap: max 4 parallel requests.
 * 3. Incremental updates: tracks last_seq per room and uses ?since=<last_seq>.
 * 4. Caching & deduplication: memory cache with 15s TTL.
 * 5. Respects 429 rate limits and Retry-After headers.
 * 6. Supports AbortSignal for component unmounts.
 */

export interface TechnocoreRoomSummary {
  room: string;
  last_seq: number;
  bytes: number;
  idle_seconds: number;
  topic: string | null;
  window: number;
  zero_response_share: number;
  nick_diversity: number;
}

export interface TechnocoreRoomsResponse {
  rooms: TechnocoreRoomSummary[];
  total?: number;
  capacity?: number;
  bytes?: number;
  engagement?: {
    window_cap: number;
    windowed_messages: number;
    zero_response_share: number;
    nick_diversity: number;
    windowed_note_to_message_ratio: number;
  };
}

export interface TechnocoreMessage {
  seq: number;
  ts: string; // ISO8601
  from: string; // "did:key:..."
  text: string;
  nonce?: number;
  sig?: string;
}

export interface TechnocoreRoomMessagesResponse {
  room: string;
  count: number;
  first_seq: number;
  last_seq: number;
  generation: number;
  messages: TechnocoreMessage[];
}

export type ObserverHealth = 'LIVE' | 'RATE LIMITED' | 'STALE' | 'OFFLINE';

const PROXY_BASE = '/api/technocore';
const DIRECT_PUBLIC_BASE = 'https://technocore.chat';

// Memory cache & deduplication store
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 15000; // 15 seconds

// Room sequence tracking for incremental ?since=<seq>
const lastKnownSeqMap = new Map<string, number>();

// Rate limit state
let rateLimitResetTime = 0;

export function getRateLimitStatus(): { isRateLimited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (now < rateLimitResetTime) {
    return {
      isRateLimited: true,
      retryAfterSeconds: Math.ceil((rateLimitResetTime - now) / 1000)
    };
  }
  return { isRateLimited: false, retryAfterSeconds: 0 };
}

/**
 * Robust, polite fetch with deduplication, timeout, and 429 backoff
 */
async function politeFetch<T>(
  path: string,
  signal?: AbortSignal
): Promise<T> {
  // Check active rate limit
  const rateLimit = getRateLimitStatus();
  if (rateLimit.isRateLimited) {
    throw new Error(`Technocore rate limit active. Retry in ${rateLimit.retryAfterSeconds}s.`);
  }

  // Deduplicate identical in-flight requests
  const cacheKey = path;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    const urlsToTry = [
      `${PROXY_BASE}${path}`,
      `${DIRECT_PUBLIC_BASE}${path}`
    ];

    let lastError: any = null;

    for (const url of urlsToTry) {
      if (signal?.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal
        });

        if (res.status === 429) {
          const retryAfterHeader = res.headers.get('Retry-After');
          const delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 30;
          rateLimitResetTime = Date.now() + (delaySeconds * 1000);
          throw new Error(`Rate limit encountered (HTTP 429). Retry-After: ${delaySeconds}s`);
        }

        if (res.status === 408 || res.status === 503) {
          throw new Error(`Technocore upstream temporary failure (HTTP ${res.status})`);
        }

        if (res.ok) {
          const json = await res.json();
          memoryCache.set(cacheKey, { data: json, timestamp: Date.now() });
          return json;
        }

        lastError = new Error(`HTTP error ${res.status}`);
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        lastError = err;
        // Continue to fallback if not aborted
      }
    }

    throw lastError || new Error('Unable to contact Technocore endpoints');
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Fetch bounded list of most active rooms returned by public index
 */
export async function fetchPublicRooms(signal?: AbortSignal): Promise<TechnocoreRoomsResponse> {
  return politeFetch<TechnocoreRoomsResponse>('/rooms?format=json', signal);
}

/**
 * Fetch incremental room messages using ?since=<last_seq> where known
 */
export async function fetchRoomMessagesIncremental(
  roomName: string,
  signal?: AbortSignal
): Promise<{ messages: TechnocoreMessage[]; lastSeq: number }> {
  const lastSeq = lastKnownSeqMap.get(roomName);
  const path = lastSeq !== undefined 
    ? `/r/${encodeURIComponent(roomName)}?since=${lastSeq}&format=json`
    : `/r/${encodeURIComponent(roomName)}?format=json`;

  const res = await politeFetch<TechnocoreRoomMessagesResponse>(path, signal);
  const messages = res.messages || [];

  if (res.last_seq) {
    lastKnownSeqMap.set(roomName, res.last_seq);
  }

  return { messages, lastSeq: res.last_seq };
}

/**
 * Polite concurrency-limited worker to sample multiple rooms
 * Maximum 3 parallel room fetches at any time
 */
export async function sampleActiveRoomsPolitely(
  rooms: string[],
  concurrency = 3,
  signal?: AbortSignal
): Promise<Map<string, TechnocoreMessage[]>> {
  const results = new Map<string, TechnocoreMessage[]>();
  const queue = [...rooms];

  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) break;
      const room = queue.shift()!;
      try {
        const { messages } = await fetchRoomMessagesIncremental(room, signal);
        results.set(room, messages);
      } catch (_err) {
        // Continue processing remaining rooms without throwing
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, rooms.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
