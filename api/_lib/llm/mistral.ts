import { streamOpenAI } from './openai';

export async function* streamMistral(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // Mistral uses an OpenAI-compatible API
  yield* streamOpenAI({
    ...params,
    baseUrl: params.baseUrl || 'https://api.mistral.ai',
  });
}
