/**
 * Kisan API Service — Azure OpenAI On Your Data (direct RAG)
 *
 * streamChat yields:
 *   { type: 'text',      content: string    }
 *   { type: 'citations', data:    Citation[] }
 */

const API_ENDPOINT    = import.meta.env.VITE_API_ENDPOINT;
const API_KEY         = import.meta.env.VITE_API_KEY           || '';
const SEARCH_ENDPOINT = import.meta.env.VITE_SEARCH_ENDPOINT  || '';
const SEARCH_INDEX    = import.meta.env.VITE_SEARCH_INDEX      || '';
const SEARCH_KEY      = import.meta.env.VITE_SEARCH_KEY        || '';

const LANGUAGE_NAMES = {
  hi: 'Hindi (हिंदी)',     en: 'English',
  mr: 'Marathi (मराठी)',    te: 'Telugu (తెలుగు)',
  ta: 'Tamil (தமிழ்)',      kn: 'Kannada (ಕನ್ನಡ)',
  gu: 'Gujarati (ગુજરાતી)', ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',   bn: 'Bengali (বাংলা)',
  or: 'Odia (ଓଡ଼ିଆ)',
};

function systemPrompt(language) {
  const lang = LANGUAGE_NAMES[language] || 'Hindi';
  return `You are Kisan (किसान), an AI agricultural assistant for Indian farmers.
Always respond in ${lang}. Use only the information from the provided documents.
Give practical, specific, actionable advice. Use bullet points for steps.
If the answer is not in the documents, say so honestly.`;
}

export async function* streamChat({ messages, language, signal }) {
  yield* streamFromAzure({ messages, language, signal });
}

async function* streamFromAzure({ messages, language, signal }) {
  const dataSource = (SEARCH_ENDPOINT && SEARCH_INDEX && SEARCH_KEY)
    ? [{
        type: 'azure_search',
        parameters: {
          endpoint: SEARCH_ENDPOINT,
          index_name: SEARCH_INDEX,
          authentication: { type: 'api_key', key: SEARCH_KEY },
          query_type: 'simple',
          top_n_documents: 5,
          in_scope: true,
        },
      }]
    : undefined;

  const body = {
    messages: [
      { role: 'system', content: systemPrompt(language) },
      ...messages,
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1500,
    ...(dataSource && { data_sources: dataSource }),
  };

  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
      body: JSON.stringify(body),
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
      detail = errBody?.error?.message || errBody?.message || '';
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
