/**
 * Kisan API Service — proxies through /api/chat serverless function
 *
 * streamChat yields:
 *   { type: 'text',      content: string    }
 *   { type: 'citations', data:    Citation[] }
 */

export async function* streamChat({ messages, language, sessionId, signal }) {
  let response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, language, sessionId }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(`Network error: ${err.message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody?.error?.message || errBody?.error || errBody?.message || '';
    } catch {
      detail = await response.text().catch(() => '');
    }
    throw new Error(`API error ${response.status}: ${detail || response.statusText}`);
  }

  yield* parseSseStream(response);
}

async function* parseSseStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue;
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          if (parsed?.error) throw new Error(String(parsed.error));

          const delta = parsed?.choices?.[0]?.delta;
          if (delta?.content) yield { type: 'text', content: delta.content };
          if (delta?.context?.citations?.length) {
            yield { type: 'citations', data: delta.context.citations };
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
