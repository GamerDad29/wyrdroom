import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { __resetRateLimiterForTests } from '../worker/index';

const env = {
  OPENROUTER_API_KEY: 'test-key',
  PROXY_SECRET: 'unused-but-still-in-interface',
  ENVIRONMENT: 'test',
};

function req(
  url: string,
  init: RequestInit & { origin?: string; ip?: string } = {},
): Request {
  const headers = new Headers(init.headers);
  if (init.origin !== undefined) headers.set('Origin', init.origin);
  if (init.ip !== undefined) headers.set('CF-Connecting-IP', init.ip);
  return new Request(url, { ...init, headers });
}

describe('worker', () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('origin validation (SEC-02)', () => {
    it('accepts an exact allowed origin', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'http://localhost:5173',
        }),
        env,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:5173',
      );
    });

    it('accepts a Cloudflare Pages preview subdomain (wyrdroom.pages.dev)', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://a1b2c3.wyrdroom.pages.dev',
        }),
        env,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://a1b2c3.wyrdroom.pages.dev',
      );
    });

    it('accepts the wyrdroom.com apex origin', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://wyrdroom.com',
        }),
        env,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://wyrdroom.com',
      );
    });

    it('rejects the retired apoc.pages.dev legacy origin', async () => {
      // During the rebrand transition (Shipment 2 Phase 1), the legacy
      // apoc.pages.dev was kept in the allow-list so production wouldn't
      // break mid-cutover. After the cutover landed and wyrdroom.com was
      // verified live, the legacy entries were removed. Requests from
      // the old URL should now be rejected cleanly.
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://apoc.pages.dev',
        }),
        env,
      );
      expect(response.status).toBe(403);
    });

    it('rejects a suffix-attack origin (historical vulnerability)', async () => {
      // The previous implementation used raw-string `endsWith`, which would
      // have accepted this attacker-controlled host. The structured URL
      // parser blocks it because the hostname is
      // "wyrdroom.com.evil.example", not "wyrdroom.com".
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://wyrdroom.com.evil.example',
        }),
        env,
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Forbidden origin');
    });

    it('rejects an origin with a path injected into the header', async () => {
      // A valid Origin header has no path; presence of one means the
      // header is malformed and should not be trusted.
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://localhost:5173/evil',
        }),
        env,
      );
      expect(response.status).toBe(403);
    });

    it('rejects a bare unknown origin', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'https://evil.example',
        }),
        env,
      );
      expect(response.status).toBe(403);
    });

    it('allows requests with no Origin header (server-to-server)', async () => {
      // Curl, monitoring probes, and similar non-browser clients don't
      // send an Origin header. We don't want to block those.
      const response = await worker.fetch(
        req('https://worker.example/api/health', { method: 'GET' }),
        env,
      );
      expect(response.status).toBe(200);
    });
  });

  describe('chat endpoint (SEC-01)', () => {
    it('no longer checks a proxy secret — header is ignored', async () => {
      // Mock OpenRouter so we don't hit the real API.
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const response = await worker.fetch(
        req('https://worker.example/api/chat', {
          method: 'POST',
          origin: 'http://localhost:5173',
          headers: { 'Content-Type': 'application/json' },
          // No X-Proxy-Secret at all.
          body: JSON.stringify({ stream: false, messages: [] }),
        }),
        env,
      );

      // The old worker would have returned 401 here. The new worker
      // proxies the request through because origin validation passed.
      expect(response.status).toBe(200);
    });

    it('rejects a chat request from a forbidden origin', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/chat', {
          method: 'POST',
          origin: 'https://evil.example',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stream: true }),
        }),
        env,
      );
      expect(response.status).toBe(403);
    });
  });

  describe('/api/models (BUG-05)', () => {
    it('derives the full 11-agent roster from the shared manifest', async () => {
      const response = await worker.fetch(
        req('https://worker.example/api/models', {
          method: 'GET',
          origin: 'http://localhost:5173',
        }),
        env,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        models: { id: string; agentId: string; agentName: string }[];
      };
      const agentIds = body.models.map((m) => m.agentId).sort();
      expect(agentIds).toEqual(
        [
          'cipher',
          'drift',
          'echo',
          'flux',
          'gemma',
          'jinx',
          'mistral',
          'oracle',
          'patch',
          'sage',
          'scribe',
        ].sort(),
      );
      // Drift and Echo were silently missing from the old hardcoded list.
      expect(agentIds).toContain('drift');
      expect(agentIds).toContain('echo');
    });
  });

  describe('rate limiting (OPS-01)', () => {
    it('returns 429 once a single IP exceeds the /api/health limit', async () => {
      const make = () =>
        req('https://worker.example/api/health', {
          method: 'GET',
          origin: 'http://localhost:5173',
          ip: '10.0.0.1',
        });

      // Limit is 120/min; issue 121 and expect the last one to fail.
      for (let i = 0; i < 120; i++) {
        const r = await worker.fetch(make(), env);
        expect(r.status).toBe(200);
      }
      const limited = await worker.fetch(make(), env);
      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBeTruthy();
      const body = (await limited.json()) as { error: string };
      expect(body.error).toMatch(/rate limit/i);
    });

    it('tracks limits separately per IP', async () => {
      // Burn the first IP's budget on /api/chat (limit 30) with a mocked
      // OpenRouter response so the upstream call doesn't reach the real API.
      // Each mock call returns a FRESH Response so the body can be consumed
      // once per invocation (otherwise the second call hits "Body already read").
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const chatReq = (ip: string) =>
        req('https://worker.example/api/chat', {
          method: 'POST',
          origin: 'http://localhost:5173',
          ip,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stream: false, messages: [] }),
        });

      for (let i = 0; i < 30; i++) {
        const r = await worker.fetch(chatReq('10.0.0.1'), env);
        expect(r.status).toBe(200);
      }
      const blocked = await worker.fetch(chatReq('10.0.0.1'), env);
      expect(blocked.status).toBe(429);

      // A different IP starts with a fresh budget.
      const otherIp = await worker.fetch(chatReq('10.0.0.2'), env);
      expect(otherIp.status).toBe(200);
    });
  });
});
