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

async function testMeta(apiKey: string, baseUrl?: string | null): Promise<TestResult> {
  const url = `${baseUrl || 'https://api.together.xyz'}/v1/models`;
  const resp = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || [])
    .map((m: any) => m.id)
    .filter((id: string) => /llama|meta/i.test(id))
    .sort();
  return { success: true, models: modelIds.length > 0 ? modelIds : (data.data || []).map((m: any) => m.id).sort() };
}

async function testMistral(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || []).map((m: any) => m.id).sort();
  return { success: true, models: modelIds };
}

async function testDeepSeek(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://api.deepseek.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || []).map((m: any) => m.id).sort();
  return { success: true, models: modelIds };
}

async function testAzureOpenAI(apiKey: string, baseUrl?: string | null): Promise<TestResult> {
  if (!baseUrl) throw new Error('Azure OpenAI requires a base URL (Resource URL)');
  const url = `${baseUrl.replace(/\/$/, '')}/openai/models?api-version=2024-10-21`;
  const resp = await fetchWithTimeout(url, {
    headers: { 'api-key': apiKey },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const modelIds = (data.data || []).map((m: any) => m.id).sort();
  return { success: true, models: modelIds };
}

async function testBedrock(apiKey: string): Promise<TestResult> {
  let credentials: { accessKeyId: string; secretAccessKey: string; region: string };
  try {
    credentials = JSON.parse(apiKey);
  } catch {
    throw new Error('Bedrock credentials must be JSON: {"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}');
  }
  const { BedrockClient, ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock');
  const client = new BedrockClient({
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
  const response = await client.send(new ListFoundationModelsCommand({}));
  const modelIds = (response.modelSummaries || [])
    .filter((m: any) => m.modelLifecycle?.status === 'ACTIVE')
    .map((m: any) => m.modelId)
    .sort();
  return { success: true, models: modelIds };
}

async function testBing(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout(
    'https://api.bing.microsoft.com/v7.0/search?q=test&count=1',
    { headers: { 'Ocp-Apim-Subscription-Key': apiKey } }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testExa(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test', numResults: 1 }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testYou(apiKey: string): Promise<TestResult> {
  const resp = await fetchWithTimeout(
    'https://api.ydc-index.io/search?query=test&num_web_results=1',
    { headers: { 'X-API-Key': apiKey } }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testSearxng(apiKey: string): Promise<TestResult> {
  const instanceUrl = apiKey.replace(/\/$/, '');
  const resp = await fetchWithTimeout(`${instanceUrl}/search?q=test&format=json`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return { success: true };
}

async function testDuckDuckGo(): Promise<TestResult> {
  const resp = await fetchWithTimeout(
    'https://api.duckduckgo.com/?q=test&format=json&no_redirect=1'
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
  meta: (apiKey, baseUrl) => testMeta(apiKey, baseUrl),
  mistral: (apiKey) => testMistral(apiKey),
  deepseek: (apiKey) => testDeepSeek(apiKey),
  'azure-openai': (apiKey, baseUrl) => testAzureOpenAI(apiKey, baseUrl),
  bedrock: (apiKey) => testBedrock(apiKey),
};

const SEARCH_TESTERS: Record<string, TesterFn> = {
  tavily: (apiKey) => testTavily(apiKey),
  serper: (apiKey) => testSerper(apiKey),
  brave: (apiKey) => testBrave(apiKey),
  bing: (apiKey) => testBing(apiKey),
  exa: (apiKey) => testExa(apiKey),
  you: (apiKey) => testYou(apiKey),
  searxng: (apiKey) => testSearxng(apiKey),
  duckduckgo: () => testDuckDuckGo(),
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
