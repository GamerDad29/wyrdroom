import { describe, expect, it, vi } from 'vitest';
import { ChatCompletionRequest } from '../types';

const request: ChatCompletionRequest = {
  model: 'test-model',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 64,
  temperature: 0.7,
  stream: true,
};

describe('proxyService', () => {
  it('streams SSE chunks without sending any bundled secret header', async () => {
    // SEC-01: the browser build used to ship VITE_PROXY_SECRET and send
    // it as X-Proxy-Secret. The worker no longer reads that header and
    // the frontend no longer sends it. Confirm both.
    vi.stubEnv('VITE_WORKER_URL', 'https://worker.example');

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'),
        );
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(body, { status: 200 }));

    const { sendChatRequest } = await import('./proxyService');

    const chunks: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatRequest(
      request,
      (text) => chunks.push(text),
      onDone,
      onError,
    );

    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe('https://worker.example/api/chat');
    const sentHeaders = (call[1] as RequestInit).headers as Record<string, string>;
    expect(sentHeaders['Content-Type']).toBe('application/json');
    expect(sentHeaders['X-Proxy-Secret']).toBeUndefined();
    expect(chunks).toEqual(['Hello', ' world']);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('does nothing if the signal is already aborted before the call', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://worker.example');

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { sendChatRequest } = await import('./proxyService');

    const controller = new AbortController();
    controller.abort();

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatRequest(request, onChunk, onDone, onError, controller.signal);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onChunk).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('passes the abort signal through to fetch', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://worker.example');

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(streamController) {
        streamController.enqueue(encoder.encode('data: [DONE]\n\n'));
        streamController.close();
      },
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(body, { status: 200 }));

    const { sendChatRequest } = await import('./proxyService');

    const controller = new AbortController();
    await sendChatRequest(request, vi.fn(), vi.fn(), vi.fn(), controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://worker.example/api/chat',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('surfaces rate-limit responses as a friendly error', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://worker.example');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Too many requests', { status: 429 }),
    );

    const { sendChatRequest } = await import('./proxyService');

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatRequest(request, onChunk, onDone, onError);

    expect(onChunk).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      'Rate limited. Free models have usage caps. Try again in a moment.',
    );
  });
});
