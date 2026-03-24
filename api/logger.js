import { BlobServiceClient } from '@azure/storage-blob';

const CONTAINER_NAME = 'rag-chat-logs';

// GPT-4.1 Azure pricing (per 1M tokens)
const PRICE_PER_1M_INPUT  = 2.00;  // USD
const PRICE_PER_1M_OUTPUT = 8.00;  // USD
const USD_TO_INR          = 84.0;  // Update this if exchange rate changes

function calculateCost(tokens) {
  if (!tokens) return null;
  const inputCost  = (tokens.prompt_tokens     / 1_000_000) * PRICE_PER_1M_INPUT  * USD_TO_INR;
  const outputCost = (tokens.completion_tokens / 1_000_000) * PRICE_PER_1M_OUTPUT * USD_TO_INR;
  const totalInr   = inputCost + outputCost;
  return {
    input_inr:  parseFloat(inputCost.toFixed(4)),
    output_inr: parseFloat(outputCost.toFixed(4)),
    total_inr:  parseFloat(totalInr.toFixed(4)),
  };
}

// Phrases across all supported languages that indicate RAG found no relevant answer
const NO_ANSWER_PHRASES = [
  // English
  'not in the documents', 'not available in', 'cannot find', "i don't know", 'no information',
  // Hindi
  'दस्तावेज़ों में नहीं', 'मुझे नहीं पता', 'जानकारी नहीं',
  // Marathi
  'कागदपत्रांमध्ये नाही', 'माहिती नाही',
  // Telugu
  'పత్రాలలో లేదు', 'తెలియదు',
  // Tamil
  'ஆவணங்களில் இல்லை', 'தெரியவில்லை',
  // Kannada
  'ದಾಖಲೆಗಳಲ್ಲಿ ಇಲ್ಲ', 'ತಿಳಿದಿಲ್ಲ',
  // Gujarati
  'દસ્તાવેજોમાં નથી', 'ખબર નથી',
  // Malayalam
  'രേഖകളിൽ ഇല്ല', 'അറിയില്ല',
  // Punjabi
  'ਦਸਤਾਵੇਜ਼ਾਂ ਵਿੱਚ ਨਹੀਂ', 'ਪਤਾ ਨਹੀਂ',
  // Bengali
  'নথিতে নেই', 'জানি না',
  // Odia
  'ଦଲିଲରେ ନାହିଁ', 'ଜାଣେ ନାହିଁ',
];

function detectNoAnswer(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return NO_ANSWER_PHRASES.some(phrase => lower.includes(phrase.toLowerCase()));
}

export async function logConversation({ language, sessionId, messages, agentResponse, tokens, durationMs, status, error }) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      console.warn('AZURE_STORAGE_CONNECTION_STRING not set — skipping log');
      return;
    }

    // One log file per day: chat_log_2026-03-17.jsonl
    const dateStr = new Date().toISOString().split('T')[0];
    const blobName = `chat_log_${dateStr}.jsonl`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    const appendBlobClient = containerClient.getAppendBlobClient(blobName);

    // Create the blob if it doesn't exist yet
    const exists = await appendBlobClient.exists();
    if (!exists) {
      await appendBlobClient.create();
    }

    const cost = calculateCost(tokens);

    // Build log entry — one JSON object per line (JSONL format)
    // Only log the latest user question + assistant answer (not the full history)
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      session_id: sessionId ?? null,
      language,
      question: lastUserMessage?.content ?? '',
      answer: agentResponse,
      no_answer_detected: detectNoAnswer(agentResponse),
      rag_used: true,
      duration_ms: durationMs,
      status,
      ...(tokens && {
        tokens: {
          input:     tokens.prompt_tokens,
          output:    tokens.completion_tokens,
          total:     tokens.total_tokens,
          estimated: tokens.estimated ?? false,
        },
      }),
      ...(cost && { cost_inr: cost }),
      ...(error && { error }),
    }) + '\n';

    await appendBlobClient.appendBlock(logEntry, Buffer.byteLength(logEntry));
  } catch (err) {
    // Never crash the main request if logging fails
    console.error('Conversation logging failed:', err.message);
  }
}
