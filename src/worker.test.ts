import { describe, expect, it } from 'vitest';
import worker from '../worker/index';

describe('worker', () => {
  it('rejects chat requests with an invalid proxy secret', async () => {
    const request = new Request('https://worker.example/api/chat', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        'X-Proxy-Secret': 'wrong-secret',
      },
      body: JSON.stringify({ stream: true }),
    });

    const response = await worker.fetch(request, {
      OPENROUTER_API_KEY: 'test-key',
      PROXY_SECRET: 'expected-secret',
      ENVIRONMENT: 'test',
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
