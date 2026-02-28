import { streamOpenAI } from './openai';

export async function* streamMeta(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // Meta models via Together.ai (OpenAI-compatible)
  yield* streamOpenAI({
    ...params,
    baseUrl: params.baseUrl || 'https://api.together.xyz',
  });
}
