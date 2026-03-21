import { BlobServiceClient } from '@azure/storage-blob';

const CONTAINER_NAME = 'rag-chat-logs';

// GPT-4.1 Azure pricing (per 1M tokens)
const PRICE_PER_1M_INPUT  = 2.00;  // USD
const PRICE_PER_1M_OUTPUT = 8.00;  // USD

function calculateCost(tokens) {
  if (!tokens) return null;
  const inputCost  = (tokens.prompt_tokens     / 1_000_000) * PRICE_PER_1M_INPUT;
  const outputCost = (tokens.completion_tokens / 1_000_000) * PRICE_PER_1M_OUTPUT;
  return {
    input_usd:  parseFloat(inputCost.toFixed(6)),
    output_usd: parseFloat(outputCost.toFixed(6)),
    total_usd:  parseFloat((inputCost + outputCost).toFixed(6)),
  };
}

export async function logConversation({ language, messages, agentResponse, tokens, durationMs, status, error }) {
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
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      language,
      conversation: [
        ...messages,
        { role: 'assistant', content: agentResponse },
      ],
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
      ...(cost && { cost_usd: cost }),
      ...(error && { error }),
    }) + '\n';

    await appendBlobClient.appendBlock(logEntry, Buffer.byteLength(logEntry));
  } catch (err) {
    // Never crash the main request if logging fails
    console.error('Conversation logging failed:', err.message);
  }
}
