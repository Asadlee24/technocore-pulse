/**
 * Constrained Read-Only Technocore Public API Proxy
 * 
 * Security & Integrity Rules:
 * 1. Strictly GET requests only. Rejects POST, PUT, PATCH, DELETE with 405.
 * 2. Hardcoded upstream: https://technocore.chat (never accepts arbitrary URLs).
 * 3. Whitelisted paths:
 *    - /rooms?format=json
 *    - /r/<room>?format=json
 *    - /r/<room>?since=<seq>&format=json
 * 4. Room name grammar strictly validated: ^[a-z0-9][a-z0-9_-]{0,47}$
 * 5. Sequence strictly validated as non-negative integer.
 * 6. Strips all client cookies, authorization headers, and custom headers.
 * 7. Forwards only Accept: application/json.
 */

const UPSTREAM_ORIGIN = 'https://technocore.chat';
const ROOM_NAME_REGEX = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const SEQ_REGEX = /^[0-9]{1,18}$/;

export default async function handler(req: any, res: any) {
  // 1. Strictly enforce GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Technocore Pulse proxy is strictly read-only. Only GET requests are permitted.'
    });
  }

  try {
    // Determine path from query or URL
    // Expected incoming query: ?endpoint=rooms OR ?endpoint=room&room=<name>&since=<seq>
    // Or path: req.url
    const url = new URL(req.url, 'https://technocore-pulse.vercel.app');
    const pathParam = url.searchParams.get('path') || '';
    const roomParam = url.searchParams.get('room') || '';
    const sinceParam = url.searchParams.get('since') || '';

    let upstreamPath = '';

    if (pathParam === 'rooms' || url.pathname.endsWith('/rooms')) {
      upstreamPath = '/rooms?format=json';
    } else if (roomParam || pathParam.startsWith('r/')) {
      const room = roomParam || pathParam.replace(/^r\//, '');
      if (!ROOM_NAME_REGEX.test(room)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid Technocore room name grammar. Must match ^[a-z0-9][a-z0-9_-]{0,47}$'
        });
      }

      if (sinceParam) {
        if (!SEQ_REGEX.test(sinceParam)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid sequence parameter. Must be a non-negative integer.'
          });
        }
        upstreamPath = `/r/${encodeURIComponent(room)}?since=${sinceParam}&format=json`;
      } else {
        upstreamPath = `/r/${encodeURIComponent(room)}?format=json`;
      }
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Unsupported proxy path. Only /rooms and /r/<room> are permitted.'
      });
    }

    const upstreamUrl = `${UPSTREAM_ORIGIN}${upstreamPath}`;

    // Forward request with strictly sanitized headers
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TechnocorePulse-Observatory/2.0 (+https://github.com/Asadlee24/technocore-pulse)'
      }
    });

    const data = await upstreamRes.json();

    // Cache control & safe response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=30');

    if (upstreamRes.status === 429) {
      const retryAfter = upstreamRes.headers.get('Retry-After');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Technocore public rate limit reached. Please back off.',
        retryAfter
      });
    }

    return res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to communicate with upstream technocore.chat endpoint.'
    });
  }
}
