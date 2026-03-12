export const config = { runtime: 'edge' };

const LANGUAGE_NAMES = {
  hi: 'Hindi (हिंदी)',     en: 'English',
  mr: 'Marathi (मराठी)',    te: 'Telugu (తెలుగు)',
  ta: 'Tamil (தமிழ்)',      kn: 'Kannada (ಕನ್ನಡ)',
  gu: 'Gujarati (ગુજરાતી)', ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',   bn: 'Bengali (বাংলা)',
  or: 'Odia (ଓଡ଼ିଆ)',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { messages, language } = await req.json();

  const API_KEY         = process.env.API_KEY;
  const API_ENDPOINT    = process.env.API_ENDPOINT;
  const SEARCH_ENDPOINT = process.env.SEARCH_ENDPOINT || '';
  const SEARCH_INDEX    = process.env.SEARCH_INDEX    || '';
  const SEARCH_KEY      = process.env.SEARCH_KEY      || '';

  const lang = LANGUAGE_NAMES[language] || 'Hindi';
  const systemPrompt = `You are Kisan (किसान), an AI agricultural assistant for Indian farmers.
Always respond in ${lang}. Use only the information from the provided documents.
Give practical, specific, actionable advice. Use bullet points for steps.
If the answer is not in the documents, say so honestly.`;

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
      { role: 'system', content: systemPrompt },
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
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  if (!response.ok) {
    const error = await response.text();
    return new Response(error, { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
