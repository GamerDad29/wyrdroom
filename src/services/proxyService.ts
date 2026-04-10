import { ChatCompletionRequest } from '../types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

// SEC-01: The previous build shipped `VITE_PROXY_SECRET` to the browser
// and attached it as `X-Proxy-Secret` on every chat request. That was
// not a real secret — `VITE_*` env vars are bundled into the client
// build and anyone with the app could extract and reuse it. The worker
// no longer consults that header; access is now gated by strict
// origin validation plus per-IP rate limiting on the worker side.

export async function sendChatRequest(
  request: ChatCompletionRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Short-circuit: if already aborted, do nothing and do not fire callbacks.
  if (signal?.aborted) return;

  try {
    const response = await fetch(`${WORKER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        onError('Rate limited. Free models have usage caps. Try again in a moment.');
        return;
      }
      const errorText = await response.text();
      onError(`API error ${response.status}: ${errorText}`);
      return;
    }

    if (!response.body) {
      onError('No response body received');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // If the caller aborts mid-stream, cancel the reader so the underlying
    // fetch tears down instead of burning tokens in the background.
    const abortHandler = () => {
      reader.cancel().catch(() => { /* swallow */ });
    };
    signal?.addEventListener('abort', abortHandler);

    try {
      while (true) {
        if (signal?.aborted) return;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (signal?.aborted) return;
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      onDone();
    } finally {
      signal?.removeEventListener('abort', abortHandler);
    }
  } catch (err) {
    // Abort shows up as a DOMException/AbortError — that's expected, not
    // an error to surface to the user.
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      return;
    }
    onError(err instanceof Error ? err.message : 'Network error');
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
