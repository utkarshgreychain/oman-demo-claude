interface TestResult {
  success: boolean;
  error?: string;
  models?: string[];
}

const TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function testOpenAI(apiKey: string, baseUrl?: string | null): Promise<TestResult> {
  const url = `${baseUrl || 'https://api.openai.com'}/v1/models`;
  const resp = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || []).map((m: any) => m.id).sort();
  return { success: true, models: modelIds };
}

async function testAnthropic(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return {
    success: true,
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-haiku-35-20241022',
    ],
  };
}

async function testGoogle(apiKey: string, model?: string | null): Promise<TestResult> {
  const modelName = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return {
    success: true,
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  };
}

async function testGroq(apiKey: string): Promise<TestResult> {
  const url = 'https://api.groq.com/openai/v1/models';
  const resp = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || []).map((m: any) => m.id).sort();
  return { success: true, models: modelIds };
}

async function testTavily(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query: 'test', max_results: 1 }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testSerper(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'test' }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testBrave(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout(
    'https://api.search.brave.com/res/v1/web/search?q=test',
    {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

type TesterFn = (apiKey: string, baseUrlOrModel?: string | null) => Promise<TestResult>;

const LLM_TESTERS: Record<string, TesterFn> = {
  openai: (apiKey, baseUrl) => testOpenAI(apiKey, baseUrl),
  anthropic: (apiKey) => testAnthropic(apiKey),
  google: (apiKey, model) => testGoogle(apiKey, model),
  gemini: (apiKey, model) => testGoogle(apiKey, model),
  groq: (apiKey) => testGroq(apiKey),
};

const SEARCH_TESTERS: Record<string, TesterFn> = {
  tavily: (apiKey) => testTavily(apiKey),
  serper: (apiKey) => testSerper(apiKey),
  brave: (apiKey) => testBrave(apiKey),
};

export async function testLLMConnection(
  name: string,
  apiKey: string,
  baseUrl?: string | null,
  model?: string | null
): Promise<TestResult> {
  const tester = LLM_TESTERS[name.toLowerCase()];
  if (!tester) return { success: false, error: `Unknown LLM provider: ${name}` };
  try {
    return await tester(apiKey, baseUrl || model);
  } catch (e: any) {
    if (e.name === 'AbortError') return { success: false, error: `Connection timed out after ${TIMEOUT / 1000}s` };
    return { success: false, error: e.message };
  }
}

export async function testSearchConnection(
  name: string,
  apiKey: string
): Promise<TestResult> {
  const tester = SEARCH_TESTERS[name.toLowerCase()];
  if (!tester) return { success: false, error: `Unknown search provider: ${name}` };
  try {
    return await tester(apiKey);
  } catch (e: any) {
    if (e.name === 'AbortError') return { success: false, error: `Connection timed out after ${TIMEOUT / 1000}s` };
    return { success: false, error: e.message };
  }
}
