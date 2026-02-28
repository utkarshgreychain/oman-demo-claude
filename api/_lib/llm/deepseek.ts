import { streamOpenAI } from './openai';

export async function* streamDeepSeek(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // DeepSeek uses an OpenAI-compatible API
  yield* streamOpenAI({
    ...params,
    baseUrl: params.baseUrl || 'https://api.deepseek.com',
  });
}
