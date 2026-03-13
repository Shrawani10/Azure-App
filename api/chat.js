export const config = { runtime: 'edge' };

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

export default async function handler(req) {
  try {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { messages, language } = await req.json();

  const API_ENDPOINT    = process.env.API_ENDPOINT;
  const API_KEY         = process.env.API_KEY;
  const SEARCH_ENDPOINT = process.env.SEARCH_ENDPOINT || '';
  const SEARCH_INDEX    = process.env.SEARCH_INDEX    || '';
  const SEARCH_KEY      = process.env.SEARCH_KEY      || '';

  if (!API_ENDPOINT || !API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars', API_ENDPOINT: !!API_ENDPOINT, API_KEY: !!API_KEY }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
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
    return new Response(JSON.stringify({ error: errorText }), {
      status: azureResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(azureResponse.body, {
    status: azureResponse.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
