import { logConversation } from './logger.js';

const LANGUAGE_NAMES = {
  hi: 'Hindi (हिंदी)',     en: 'English',
  mr: 'Marathi (मराठी)',    te: 'Telugu (తెలుగు)',
  ta: 'Tamil (தமிழ்)',      kn: 'Kannada (ಕನ್ನಡ)',
  gu: 'Gujarati (ગુજરાતી)', ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',   bn: 'Bengali (বাংলা)',
  or: 'Odia (ଓଡ଼ିਆ)',
};

function systemPrompt(language) {
  const lang = LANGUAGE_NAMES[language] || 'Hindi';
  return `You are Kisan (किसान), an AI agricultural assistant for Indian farmers.
Always respond in ${lang}. Use only the information from the provided documents.
Give practical, specific, actionable advice. Use bullet points for steps.
If the answer is not in the documents, say so honestly.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { messages, language, sessionId } = req.body;
    const startTime = Date.now();

    const API_ENDPOINT    = process.env.API_ENDPOINT;
    const API_KEY         = process.env.API_KEY;
    const SEARCH_ENDPOINT = process.env.SEARCH_ENDPOINT || '';
    const SEARCH_INDEX    = process.env.SEARCH_INDEX    || '';
    const SEARCH_KEY      = process.env.SEARCH_KEY      || '';

    if (!API_ENDPOINT || !API_KEY) {
      res.status(500).json({ error: 'Missing env vars', API_ENDPOINT: !!API_ENDPOINT, API_KEY: !!API_KEY });
      return;
    }

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

    const azureResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
      body: JSON.stringify(body),
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      res.status(azureResponse.status).json({ error: errorText });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    // Collect chunks to extract the full assistant reply for logging
    const reader = azureResponse.body.getReader();
    const decoder = new TextDecoder();
    let rawChunks = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
      rawChunks += decoder.decode(value, { stream: true });
    }

    // Parse SSE stream — extract assistant text and token usage
    const parsedChunks = rawChunks
      .split('\n')
      .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]')
      .map(line => { try { return JSON.parse(line.slice(6)); } catch { return null; } })
      .filter(Boolean);

    const agentResponse = parsedChunks
      .flatMap(parsed => parsed.choices || [])
      .map(choice => choice?.delta?.content || '')
      .join('');

    // Count tokens using gpt-tokenizer (pure JS, no WASM — works on Vercel)
    const inputText = systemPrompt(language) + messages.map(m => m.content).join('');
    let tokens;
    try {
      const { encode } = await import('gpt-tokenizer');
      const inputTok  = encode(inputText).length;
      const outputTok = encode(agentResponse).length;
      tokens = { prompt_tokens: inputTok, completion_tokens: outputTok, total_tokens: inputTok + outputTok, estimated: false };
    } catch {
      const inputTok  = Math.ceil(inputText.length / 4);
      const outputTok = Math.ceil(agentResponse.length / 4);
      tokens = { prompt_tokens: inputTok, completion_tokens: outputTok, total_tokens: inputTok + outputTok, estimated: true };
    }

    // Await logging BEFORE res.end() — Vercel kills the function immediately after end()
    await logConversation({
      language,
      sessionId,
      messages,
      agentResponse,
      tokens,
      durationMs: Date.now() - startTime,
      status: 'success',
    });

    res.end();

  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
