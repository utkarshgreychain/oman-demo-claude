export type ModelTier = 'fast' | 'powerful' | 'reasoning';

const TIER_MAP: Record<string, ModelTier> = {
  // OpenAI
  'gpt-4o-mini': 'fast',
  'gpt-4o': 'powerful',
  'gpt-4-turbo': 'powerful',
  'gpt-4': 'powerful',
  'gpt-3.5-turbo': 'fast',
  'o1': 'reasoning',
  'o1-mini': 'reasoning',
  'o1-preview': 'reasoning',
  'o3': 'reasoning',
  'o3-mini': 'reasoning',
  'o4-mini': 'reasoning',

  // Anthropic
  'claude-opus-4-20250514': 'powerful',
  'claude-sonnet-4-20250514': 'powerful',
  'claude-haiku-35-20241022': 'fast',

  // Google
  'gemini-2.5-pro': 'powerful',
  'gemini-2.5-flash': 'fast',
  'gemini-2.0-flash': 'fast',
  'gemini-2.0-flash-lite': 'fast',

  // Meta Llama
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'powerful',
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': 'powerful',
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': 'powerful',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'fast',

  // Mistral
  'mistral-large-latest': 'powerful',
  'mistral-medium-latest': 'powerful',
  'mistral-small-latest': 'fast',
  'open-mistral-nemo': 'fast',
  'codestral-latest': 'powerful',

  // DeepSeek
  'deepseek-chat': 'powerful',
  'deepseek-reasoner': 'reasoning',

  // Groq
  'llama-3.3-70b-versatile': 'powerful',
  'llama-3.1-8b-instant': 'fast',
  'mixtral-8x7b-32768': 'fast',
  'gemma2-9b-it': 'fast',
};

// Regex fallbacks for unknown models
const TIER_PATTERNS: Array<{ pattern: RegExp; tier: ModelTier }> = [
  { pattern: /\b(o1|o3|o4|reason)/i, tier: 'reasoning' },
  { pattern: /\b(405b|70b|large|pro|opus|gpt-4|turbo)/i, tier: 'powerful' },
  { pattern: /\b(mini|small|tiny|nano|lite|flash|8b|7b|instant|haiku)/i, tier: 'fast' },
];

export function getModelTier(modelId: string): ModelTier {
  if (TIER_MAP[modelId]) return TIER_MAP[modelId];
  for (const { pattern, tier } of TIER_PATTERNS) {
    if (pattern.test(modelId)) return tier;
  }
  return 'powerful'; // default
}

export function getTierLabel(tier: ModelTier): string {
  switch (tier) {
    case 'fast': return 'Fast';
    case 'powerful': return 'Powerful';
    case 'reasoning': return 'Reasoning';
  }
}

export function getTierColor(tier: ModelTier): string {
  switch (tier) {
    case 'fast': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'powerful': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'reasoning': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
  }
}
