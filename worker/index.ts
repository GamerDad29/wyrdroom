import { agentManifest } from '../src/agents/manifest';

export interface Env {
  OPENROUTER_API_KEY: string;
  // PROXY_SECRET is no longer consulted (SEC-01). Left in the interface so
  // existing wrangler bindings don't break, but the worker never reads it.
  PROXY_SECRET?: string;
  ENVIRONMENT: string;
}

// ---- Origin validation (SEC-02) ----------------------------------------
//
// The previous implementation matched origins with `startsWith` and
// `endsWith` against the raw header string, which allowed suffix attacks
// like `https://<legit>.evil.example`. This version parses the header
// into a URL and compares the structured `hostname` component (which
// the parser normalizes) against an exact allow-list plus a whitelisted
// set of parent domains that accept any subdomain.

const EXACT_ALLOWED_ORIGINS = new Set<string>([
  // Local dev
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  // Wyrdroom production (current target)
  'https://wyrdroom.com',
  'https://www.wyrdroom.com',
  // Legacy APOC production — kept during the rebrand transition so the
  // old pages.dev URL keeps working until the Cloudflare Pages custom
  // domain cutover. Can be removed once production traffic has moved
  // entirely to wyrdroom.com.
  'https://apoc.pages.dev',
]);

// Parent hostnames whose subdomains are allowed. Subdomain matching uses
// the structured URL hostname (not the raw origin string), which is
// immune to suffix injection.
const ALLOWED_PARENT_HOSTNAMES = [
  'wyrdroom.com',
  'wyrdroom.pages.dev',
  // Legacy — remove after the Cloudflare Pages custom domain cutover.
  'apoc.pages.dev',
];

function isOriginAllowed(rawOrigin: string): boolean {
  if (!rawOrigin) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    return false;
  }

  // Only http/https scheme. Reject file://, data://, null, etc.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Reject anything with a path, query, or fragment — a valid Origin
  // header never has these, and if one is present the header is lying.
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    return false;
  }

  // Rebuild canonical origin from the parsed URL so we compare apples
  // to apples ("https://wyrdroom.com" not "https://wyrdroom.com/").
  const canonical = `${parsed.protocol}//${parsed.host}`;
  if (EXACT_ALLOWED_ORIGINS.has(canonical)) return true;

  // Subdomain match via structured hostname. `hostname.endsWith('.' + parent)`
  // is safe here because `parsed.hostname` is the normalized host component,
  // not a substring of the raw header, so there is no suffix attack vector.
  const host = parsed.hostname;
  for (const parent of ALLOWED_PARENT_HOSTNAMES) {
    if (host === parent || host.endsWith(`.${parent}`)) {
      return true;
    }
  }

  return false;
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = isOriginAllowed(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ---- Rate limiting (OPS-01) --------------------------------------------
//
// Best-effort in-memory per-isolate per-IP rate limiting. Not a substitute
// for a real KV/DO-backed limiter — isolate lifetimes are short and
// traffic can land on different isolates — but it stops accidental
// runaway loops and caps cost exposure for a single abusive client.
//
// Window: 60s. Limits are per-endpoint:
//   /api/chat     → 30 req/min per IP
//   /api/health   → 120 req/min per IP
//   /api/models   → 60 req/min per IP

interface RateBucket {
  count: number;
  resetAt: number;
}

const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  '/api/chat': 30,
  '/api/health': 120,
  '/api/models': 60,
};
const rateState = new Map<string, RateBucket>();

function getClientIp(request: Request): string {
  // Cloudflare sets CF-Connecting-IP. Fall back to X-Forwarded-For, then
  // to a fixed string so tests without headers still get a stable key.
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown'
  );
}

/**
 * @returns `null` if the request is within limits, or a Response with
 *   429 if the client has exceeded its budget for this endpoint.
 */
function checkRateLimit(
  request: Request,
  endpoint: string,
  cors: Record<string, string>,
): Response | null {
  const limit = RATE_LIMITS[endpoint];
  if (!limit) return null;

  const ip = getClientIp(request);
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = rateState.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateState.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Slow down and try again shortly.',
      }),
      {
        status: 429,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
        },
      },
    );
  }

  return null;
}

// Exposed for tests so a fresh run doesn't inherit state.
export function __resetRateLimiterForTests(): void {
  rateState.clear();
}

// ---- Request handler ---------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Reject non-CORS cross-origin requests outright. Browsers that sent
    // an Origin header we don't recognize get a 403; server-to-server
    // clients (no Origin header at all) are left alone so curl and
    // monitoring still work.
    if (origin && !isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    // Per-endpoint rate limit check (applies to every non-preflight request)
    const rateLimited = checkRateLimit(request, url.pathname, cors);
    if (rateLimited) return rateLimited;

    // Health check
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Models list — derived from the shared agent manifest (BUG-05).
    // No more hardcoded duplicate that silently misses Drift and Echo.
    if (url.pathname === '/api/models' && request.method === 'GET') {
      const models = agentManifest.map((a) => ({
        id: a.modelId,
        name: a.displayName,
        agentId: a.id,
        agentName: a.name,
        status: 'active' as const,
      }));
      return new Response(JSON.stringify({ models }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Chat endpoint — SEC-01: no more shared-secret check. Access is
    // gated by origin validation + rate limiting. The old X-Proxy-Secret
    // header was bundled into the browser build and therefore never a
    // real secret.
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Forward to OpenRouter with retry on 429
      const MAX_RETRIES = 3;
      let openRouterResponse: Response | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://wyrdroom.com',
            'X-Title': 'Wyrdroom',
          },
          body: JSON.stringify(body),
        });

        if (openRouterResponse.status !== 429 || attempt === MAX_RETRIES) break;

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      if (!openRouterResponse || !openRouterResponse.ok) {
        const status = openRouterResponse?.status || 500;
        const errorText = openRouterResponse ? await openRouterResponse.text() : 'No response';

        // Friendly message for rate limits
        if (status === 429) {
          return new Response(
            JSON.stringify({
              error:
                'Rate limited by model provider. Free models have usage caps. Try again in a minute, or switch to a paid model.',
            }),
            { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({ error: `OpenRouter error: ${status}`, details: errorText }),
          {
            status,
            headers: { ...cors, 'Content-Type': 'application/json' },
          },
        );
      }

      // Stream the response through
      if (body.stream) {
        return new Response(openRouterResponse.body, {
          headers: {
            ...cors,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Non-streaming response
      const result = await openRouterResponse.json();
      return new Response(JSON.stringify(result), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
