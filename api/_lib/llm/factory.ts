import { streamOpenAI } from './openai';
import { streamAnthropic } from './anthropic';
import { streamGoogle } from './google';
import { streamGroq } from './groq';
import { streamMeta } from './meta';
import { streamMistral } from './mistral';
import { streamDeepSeek } from './deepseek';
import { streamAzureOpenAI } from './azure-openai';
import { streamBedrock } from './bedrock';

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
    case 'meta':
      return streamMeta(params);
    case 'mistral':
      return streamMistral(params);
    case 'deepseek':
      return streamDeepSeek(params);
    case 'azure-openai':
      return streamAzureOpenAI(params);
    case 'bedrock':
      return streamBedrock(params);
    default:
      throw new Error(`Unsupported LLM provider: ${params.provider}`);
  }
}
