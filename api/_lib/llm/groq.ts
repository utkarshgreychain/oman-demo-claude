import { streamOpenAI } from './openai';

export async function* streamGroq(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // Groq uses an OpenAI-compatible API
  yield* streamOpenAI({
    ...params,
    baseUrl: params.baseUrl || 'https://api.groq.com/openai',
  });
}
