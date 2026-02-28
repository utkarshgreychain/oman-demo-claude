import { streamOpenAI } from './openai';
import { streamAnthropic } from './anthropic';
import { streamGoogle } from './google';
import { streamGroq } from './groq';

export interface StreamParams {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}

export function streamLLM(params: StreamParams): AsyncGenerator<string, void, undefined> {
  switch (params.provider) {
    case 'openai':
      return streamOpenAI(params);
    case 'anthropic':
      return streamAnthropic(params);
    case 'google':
    case 'gemini':
      return streamGoogle(params);
    case 'groq':
      return streamGroq(params);
    default:
      throw new Error(`Unsupported LLM provider: ${params.provider}`);
  }
}
