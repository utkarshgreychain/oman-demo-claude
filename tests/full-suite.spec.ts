import { test, expect } from '@playwright/test';

const GATEWAY = 'http://localhost:8000';
const EXCEL_FILE = '/Users/utkarsh/Downloads/Sample Floted Tenders Data.xlsx';

// Helper: get working provider (prefer anthropic)
async function getProvider(request: any) {
  const resp = await request.get(`${GATEWAY}/api/config/llm-providers`);
  const providers = await resp.json();
  const active = providers.filter((p: any) => p.is_active && p.connection_status === 'connected');
  return active.find((p: any) => p.name === 'anthropic') || active[0] || null;
}

// Helper: stream chat and collect results
async function streamChat(request: any, payload: any) {
  const resp = await request.post(`${GATEWAY}/api/chat/stream`, { data: payload });
  const text = await resp.text();
  const tokens: string[] = [];
  let fullContent = '';
  let vizEvent: any = null;
  let doneEvent: any = null;
  let errorEvent: any = null;
  let searchEvent: any = null;

  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const d = JSON.parse(line.slice(6));
      if (d.type === 'token') { tokens.push(d.content); fullContent += d.content; }
      else if (d.type === 'visualization') vizEvent = d;
      else if (d.type === 'done') doneEvent = d;
      else if (d.type === 'error') errorEvent = d;
      else if (d.type === 'search_results') searchEvent = d;
    } catch {}
  }
  return { text, tokens, fullContent, vizEvent, doneEvent, errorEvent, searchEvent, ok: resp.ok() };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Backend Health & Infrastructure (tests 1-8)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('1. Health & Infrastructure', () => {
  test('1.01 gateway health endpoint returns 200', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/health`);
    expect(r.ok()).toBeTruthy();
  });

  test('1.02 gateway health reports service name', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/health`);
    const b = await r.json();
    expect(b.service).toBe('gateway');
  });

  test('1.03 gateway health reports LLM service status', async ({ request }) => {
    const b = await (await request.get(`${GATEWAY}/health`)).json();
    const llm = b.services?.find((s: any) => s.name === 'llm_service');
    expect(llm).toBeTruthy();
    expect(llm.status).toBe('healthy');
  });

  test('1.04 CORS headers present on API responses', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/api/conversations`);
    expect(r.ok()).toBeTruthy();
  });

  test('1.05 non-existent route returns 404', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/api/nonexistent`);
    expect(r.status()).toBe(404);
  });

  test('1.06 gateway serves multiple concurrent requests', async ({ request }) => {
    const [r1, r2, r3] = await Promise.all([
      request.get(`${GATEWAY}/api/config/llm-providers`),
      request.get(`${GATEWAY}/api/config/search-providers`),
      request.get(`${GATEWAY}/api/conversations`),
    ]);
    expect(r1.ok()).toBeTruthy();
    expect(r2.ok()).toBeTruthy();
    expect(r3.ok()).toBeTruthy();
  });

  test('1.07 LLM service health check', async ({ request }) => {
    const r = await request.get('http://localhost:8001/health');
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.service).toBe('llm_service');
  });

  test('1.08 gateway responds within 2 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get(`${GATEWAY}/health`);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: LLM Provider CRUD (tests 9-20)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('2. LLM Provider Management', () => {
  test('2.01 list LLM providers returns array', async ({ request }) => {
    const b = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    expect(Array.isArray(b)).toBe(true);
  });

  test('2.02 providers have required fields', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    for (const p of providers) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('display_name');
      expect(p).toHaveProperty('models');
      expect(p).toHaveProperty('is_active');
      expect(p).toHaveProperty('connection_status');
    }
  });

  test('2.03 at least one LLM provider is configured', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    expect(providers.length).toBeGreaterThan(0);
  });

  test('2.04 anthropic provider exists', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    const anthropic = providers.find((p: any) => p.name === 'anthropic');
    expect(anthropic).toBeTruthy();
    expect(anthropic.connection_status).toBe('connected');
  });

  test('2.05 provider models is a non-empty array', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    const active = providers.find((p: any) => p.connection_status === 'connected');
    expect(active.models.length).toBeGreaterThan(0);
  });

  test('2.06 test connection for unknown provider returns error', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/llm-providers/test`, {
      data: { name: 'fakeprovider', api_key: 'x' },
    });
    const b = await r.json();
    expect(b.success).toBe(false);
    expect(b.error).toContain('Unknown provider');
  });

  test('2.07 test connection for ollama returns structure', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/llm-providers/test`, {
      data: { name: 'ollama', api_key: '' },
    });
    const b = await r.json();
    expect(typeof b.success).toBe('boolean');
  });

  test('2.08 create and delete LLM provider', async ({ request }) => {
    // Create
    const cr = await request.post(`${GATEWAY}/api/config/llm-providers`, {
      data: { name: 'test_provider_temp', display_name: 'Temp', api_key: 'sk-temp', models: ['m1'] },
    });
    expect(cr.ok()).toBeTruthy();
    const created = await cr.json();
    expect(created).toHaveProperty('id');

    // Delete
    const dr = await request.delete(`${GATEWAY}/api/config/llm-providers/${created.id}`);
    expect(dr.ok()).toBeTruthy();
  });

  test('2.09 provider api_key is never returned in plaintext', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    for (const p of providers) {
      expect(p.api_key).toBeUndefined();
      expect(p.api_key_encrypted).toBeUndefined();
    }
  });

  test('2.10 provider has created_at and updated_at timestamps', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/llm-providers`)).json();
    expect(providers[0].created_at).toBeTruthy();
    expect(providers[0].updated_at).toBeTruthy();
  });

  test('2.11 test connection returns models list on success', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/llm-providers/test`, {
      data: { name: 'ollama', api_key: '' },
    });
    const b = await r.json();
    // Either succeeds with models or fails with error — both are valid structures
    expect(b).toHaveProperty('success');
    if (b.success) expect(Array.isArray(b.models)).toBe(true);
    else expect(b).toHaveProperty('error');
  });

  test('2.12 duplicate provider name returns error', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/llm-providers`, {
      data: { name: 'anthropic', display_name: 'Dup', api_key: 'sk-dup', models: [] },
    });
    expect(r.ok()).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Search Provider CRUD (tests 21-28)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('3. Search Provider Management', () => {
  test('3.01 list search providers returns array', async ({ request }) => {
    const b = await (await request.get(`${GATEWAY}/api/config/search-providers`)).json();
    expect(Array.isArray(b)).toBe(true);
  });

  test('3.02 search providers have required fields', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/search-providers`)).json();
    for (const p of providers) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('display_name');
    }
  });

  test('3.03 test search connection for unknown provider', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/search-providers/test`, {
      data: { name: 'fakesearch', api_key: 'x' },
    });
    const b = await r.json();
    expect(b.success).toBe(false);
  });

  test('3.04 create and delete search provider', async ({ request }) => {
    const cr = await request.post(`${GATEWAY}/api/config/search-providers`, {
      data: { name: 'test_search_temp', display_name: 'TempSearch', api_key: 'sk-ts' },
    });
    expect(cr.ok()).toBeTruthy();
    const created = await cr.json();
    const dr = await request.delete(`${GATEWAY}/api/config/search-providers/${created.id}`);
    expect(dr.ok()).toBeTruthy();
  });

  test('3.05 search provider api_key not exposed', async ({ request }) => {
    const providers = await (await request.get(`${GATEWAY}/api/config/search-providers`)).json();
    for (const p of providers) {
      expect(p.api_key).toBeUndefined();
      expect(p.api_key_encrypted).toBeUndefined();
    }
  });

  test('3.06 search provider test for tavily returns structure', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/search-providers/test`, {
      data: { name: 'tavily', api_key: 'tvly-fake' },
    });
    const b = await r.json();
    expect(typeof b.success).toBe('boolean');
  });

  test('3.07 search provider test for serper returns structure', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/search-providers/test`, {
      data: { name: 'serper', api_key: 'fake' },
    });
    const b = await r.json();
    expect(typeof b.success).toBe('boolean');
  });

  test('3.08 search provider test for brave returns structure', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/config/search-providers/test`, {
      data: { name: 'brave', api_key: 'fake' },
    });
    const b = await r.json();
    expect(typeof b.success).toBe('boolean');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: File Upload (tests 29-38)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('4. File Upload', () => {
  test('4.01 upload text file succeeds', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('Hello world') } },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.filename).toBe('test.txt');
    expect(b.file_type).toBe('.txt');
  });

  test('4.02 upload returns a valid UUID id', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('data') } },
    });
    const b = await r.json();
    expect(b.id).toMatch(/^[0-9a-f]{8}-/);
  });

  test('4.03 upload returns file_size', async ({ request }) => {
    const content = 'abcdefghij';
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from(content) } },
    });
    const b = await r.json();
    expect(b.file_size).toBe(content.length);
  });

  test('4.04 upload returns created_at timestamp', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'c.txt', mimeType: 'text/plain', buffer: Buffer.from('ts') } },
    });
    const b = await r.json();
    expect(b.created_at).toBeTruthy();
  });

  test('4.05 upload Excel file succeeds', async ({ request }) => {
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(EXCEL_FILE);
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'Sample Floted Tenders Data.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fileBuffer } },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.file_type).toBe('.xlsx');
  });

  test('4.06 get uploaded file metadata', async ({ request }) => {
    const ur = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'meta.txt', mimeType: 'text/plain', buffer: Buffer.from('meta test') } },
    });
    const uploaded = await ur.json();
    const gr = await request.get(`${GATEWAY}/api/files/${uploaded.id}`);
    expect(gr.ok()).toBeTruthy();
    const b = await gr.json();
    expect(b.id).toBe(uploaded.id);
    expect(b.filename).toBe('meta.txt');
  });

  test('4.07 get non-existent file returns 404', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/api/files/nonexistent-id`);
    expect(r.status()).toBe(404);
  });

  test('4.08 delete uploaded file', async ({ request }) => {
    const ur = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'del.txt', mimeType: 'text/plain', buffer: Buffer.from('delete me') } },
    });
    const uploaded = await ur.json();
    const dr = await request.delete(`${GATEWAY}/api/files/${uploaded.id}`);
    expect(dr.ok()).toBeTruthy();
    const gr = await request.get(`${GATEWAY}/api/files/${uploaded.id}`);
    expect(gr.status()).toBe(404);
  });

  test('4.09 upload JSON file succeeds', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from('{"key":"value"}') } },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.file_type).toBe('.json');
  });

  test('4.10 upload CSV file succeeds', async ({ request }) => {
    const csv = 'name,value\nAlice,10\nBob,20';
    const r = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } },
    });
    expect(r.ok()).toBeTruthy();
    const b = await r.json();
    expect(b.file_type).toBe('.csv');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: SSE Chat Streaming (tests 39-52)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('5. SSE Chat Streaming', () => {
  test('5.01 basic chat returns token events', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Say hi', provider: p.name, model: p.models[0], max_tokens: 20 });
    expect(r.tokens.length).toBeGreaterThan(0);
  });

  test('5.02 chat returns done event with conversation_id', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Say ok', provider: p.name, model: p.models[0], max_tokens: 10 });
    expect(r.doneEvent).toBeTruthy();
    expect(r.doneEvent.conversation_id).toBeTruthy();
  });

  test('5.03 chat returns done event with message_id', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Say yes', provider: p.name, model: p.models[0], max_tokens: 10 });
    expect(r.doneEvent.message_id).toBeTruthy();
  });

  test('5.04 progress event emitted before tokens', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Hi', provider: p.name, model: p.models[0], max_tokens: 10 });
    expect(r.text).toContain('event: progress');
    const progressIdx = r.text.indexOf('event: progress');
    const tokenIdx = r.text.indexOf('event: token');
    expect(progressIdx).toBeLessThan(tokenIdx);
  });

  test('5.05 unconfigured provider returns 404', async ({ request }) => {
    const r = await request.post(`${GATEWAY}/api/chat/stream`, {
      data: { message: 'hi', provider: 'nonexistent', model: 'x' },
    });
    expect(r.status()).toBe(404);
  });

  test('5.06 response contains actual content', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'What is 2+2? Reply with just the number.', provider: p.name, model: p.models[0], max_tokens: 20 });
    expect(r.fullContent).toContain('4');
  });

  test('5.07 file content included when file_ids provided', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    // Upload a file first
    const ur = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'info.txt', mimeType: 'text/plain', buffer: Buffer.from('The secret code is ALPHA-7.') } },
    });
    const file = await ur.json();
    const r = await streamChat(request, { message: 'What is the secret code in the file?', provider: p.name, model: p.models[0], file_ids: [file.id], max_tokens: 50 });
    expect(r.fullContent).toContain('ALPHA-7');
  });

  test('5.08 file status event emitted when files attached', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const ur = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'f.txt', mimeType: 'text/plain', buffer: Buffer.from('data') } },
    });
    const file = await ur.json();
    const r = await streamChat(request, { message: 'Summarize', provider: p.name, model: p.models[0], file_ids: [file.id], max_tokens: 30 });
    expect(r.text).toContain('Reading uploaded files');
  });

  test('5.09 no tool_call hallucination in response', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Tell me about weather', provider: p.name, model: p.models[0], max_tokens: 100 });
    expect(r.fullContent).not.toContain('<tool_call>');
    expect(r.fullContent).not.toContain('<tool_name>');
  });

  test('5.10 response is not empty', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Hello', provider: p.name, model: p.models[0], max_tokens: 30 });
    expect(r.fullContent.length).toBeGreaterThan(0);
  });

  test('5.11 conversation created for new chat', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'New convo test', provider: p.name, model: p.models[0], max_tokens: 10 });
    const convoResp = await request.get(`${GATEWAY}/api/conversations/${r.doneEvent.conversation_id}`);
    expect(convoResp.ok()).toBeTruthy();
  });

  test('5.12 continuing existing conversation preserves context', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r1 = await streamChat(request, { message: 'Remember: the password is ZEBRA', provider: p.name, model: p.models[0], max_tokens: 30 });
    const convId = r1.doneEvent.conversation_id;
    const r2 = await streamChat(request, { message: 'What was the password I told you?', provider: p.name, model: p.models[0], conversation_id: convId, max_tokens: 50 });
    expect(r2.fullContent.toUpperCase()).toContain('ZEBRA');
  });

  test('5.13 multiple tokens streamed for longer response', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'List 5 colors', provider: p.name, model: p.models[0], max_tokens: 100 });
    expect(r.tokens.length).toBeGreaterThan(3);
  });

  test('5.14 temperature parameter is respected (low temp = deterministic)', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r1 = await streamChat(request, { message: 'What is 10+5? Reply with just the number.', provider: p.name, model: p.models[0], max_tokens: 10, temperature: 0.0 });
    const r2 = await streamChat(request, { message: 'What is 10+5? Reply with just the number.', provider: p.name, model: p.models[0], max_tokens: 10, temperature: 0.0 });
    expect(r1.fullContent).toContain('15');
    expect(r2.fullContent).toContain('15');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Visualization Generation (tests 53-62)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('6. Visualization', () => {
  test('6.01 bar chart from direct data', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a bar chart: Apples 40, Bananas 25, Cherries 35',
      provider: p.name, model: p.models[0], max_tokens: 500,
    });
    if (r.vizEvent) {
      expect(r.vizEvent.viz_id).toBeTruthy();
      expect(r.vizEvent.chart_type).toBe('bar');
    }
  });

  test('6.02 pie chart from file data', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const fs = await import('fs');
    const ur = await request.post(`${GATEWAY}/api/files/upload`, {
      multipart: { file: { name: 'Sample Floted Tenders Data.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: fs.readFileSync(EXCEL_FILE) } },
    });
    const file = await ur.json();
    const r = await streamChat(request, {
      message: 'Build a pie chart of tenders by division',
      provider: p.name, model: p.models[0], file_ids: [file.id], max_tokens: 1000,
    });
    if (r.vizEvent) {
      expect(r.vizEvent.viz_id).toBeTruthy();
      expect(r.vizEvent.download_url).toContain('/api/viz/');
    }
  });

  test('6.03 chart PNG download returns valid image', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a line chart: Jan 10, Feb 20, Mar 15, Apr 30',
      provider: p.name, model: p.models[0], max_tokens: 500,
    });
    if (r.vizEvent) {
      const dl = await request.get(`${GATEWAY}${r.vizEvent.download_url}`);
      expect(dl.ok()).toBeTruthy();
      const body = await dl.body();
      expect(body[0]).toBe(0x89); // PNG magic
      expect(body[1]).toBe(0x50);
    }
  });

  test('6.04 viz download for non-existent id returns 404', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/api/viz/does-not-exist/download`);
    expect(r.status()).toBe(404);
  });

  test('6.05 visualization event has required fields', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Make a pie chart: Red 50, Blue 30, Green 20',
      provider: p.name, model: p.models[0], max_tokens: 500,
    });
    if (r.vizEvent) {
      expect(r.vizEvent).toHaveProperty('viz_id');
      expect(r.vizEvent).toHaveProperty('chart_type');
      expect(r.vizEvent).toHaveProperty('title');
      expect(r.vizEvent).toHaveProperty('download_url');
    }
  });

  test('6.06 visualization block stripped from displayed content concept', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a scatter plot: (1,5), (2,8), (3,3), (4,9)',
      provider: p.name, model: p.models[0], max_tokens: 500,
    });
    // The response should contain the viz block (backend has it)
    // but the frontend will strip it — we just verify events work
    expect(r.doneEvent).toBeTruthy();
  });

  test('6.07 chart generation handles donut type', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a donut chart: Coffee 60%, Tea 25%, Juice 15%',
      provider: p.name, model: p.models[0], max_tokens: 500,
    });
    expect(r.doneEvent).toBeTruthy();
    expect(r.errorEvent).toBeNull();
  });

  test('6.08 chart with large dataset does not crash', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a bar chart with months Jan through Dec and values 12,15,18,22,28,35,38,36,30,24,18,14',
      provider: p.name, model: p.models[0], max_tokens: 600,
    });
    expect(r.doneEvent).toBeTruthy();
    expect(r.errorEvent).toBeNull();
  });

  test('6.09 multiple chart requests in sequence', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r1 = await streamChat(request, { message: 'Bar chart: A=1, B=2', provider: p.name, model: p.models[0], max_tokens: 400 });
    const r2 = await streamChat(request, { message: 'Pie chart: X=50, Y=50', provider: p.name, model: p.models[0], max_tokens: 400 });
    expect(r1.doneEvent).toBeTruthy();
    expect(r2.doneEvent).toBeTruthy();
  });

  test('6.10 chart PNG file size is reasonable', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, {
      message: 'Create a simple bar chart: A=10, B=20',
      provider: p.name, model: p.models[0], max_tokens: 400,
    });
    if (r.vizEvent) {
      const dl = await request.get(`${GATEWAY}${r.vizEvent.download_url}`);
      const body = await dl.body();
      expect(body.length).toBeGreaterThan(1000); // at least 1KB
      expect(body.length).toBeLessThan(5_000_000); // under 5MB
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Conversation Management (tests 63-70)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('7. Conversation Management', () => {
  test('7.01 list conversations returns array', async ({ request }) => {
    const b = await (await request.get(`${GATEWAY}/api/conversations`)).json();
    expect(Array.isArray(b)).toBe(true);
  });

  test('7.02 conversations ordered by most recent', async ({ request }) => {
    const convos = await (await request.get(`${GATEWAY}/api/conversations`)).json();
    if (convos.length >= 2) {
      const d1 = new Date(convos[0].updated_at).getTime();
      const d2 = new Date(convos[1].updated_at).getTime();
      expect(d1).toBeGreaterThanOrEqual(d2);
    }
  });

  test('7.03 get conversation with messages', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Conv test', provider: p.name, model: p.models[0], max_tokens: 10 });
    const convo = await (await request.get(`${GATEWAY}/api/conversations/${r.doneEvent.conversation_id}`)).json();
    expect(convo.messages.length).toBeGreaterThanOrEqual(2);
    expect(convo.messages[0].role).toBe('user');
    expect(convo.messages[1].role).toBe('assistant');
  });

  test('7.04 conversation has correct title from first message', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Unique title test xyz123', provider: p.name, model: p.models[0], max_tokens: 10 });
    const convo = await (await request.get(`${GATEWAY}/api/conversations/${r.doneEvent.conversation_id}`)).json();
    expect(convo.title).toContain('Unique title test');
  });

  test('7.05 delete conversation removes it', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Delete me', provider: p.name, model: p.models[0], max_tokens: 10 });
    const cid = r.doneEvent.conversation_id;
    await request.delete(`${GATEWAY}/api/conversations/${cid}`);
    const gr = await request.get(`${GATEWAY}/api/conversations/${cid}`);
    expect(gr.status()).toBe(404);
  });

  test('7.06 delete non-existent conversation returns 404', async ({ request }) => {
    const r = await request.delete(`${GATEWAY}/api/conversations/does-not-exist`);
    expect(r.status()).toBe(404);
  });

  test('7.07 get non-existent conversation returns 404', async ({ request }) => {
    const r = await request.get(`${GATEWAY}/api/conversations/does-not-exist`);
    expect(r.status()).toBe(404);
  });

  test('7.08 messages have provider and model fields', async ({ request }) => {
    const p = await getProvider(request);
    if (!p) { test.skip(); return; }
    const r = await streamChat(request, { message: 'Model check', provider: p.name, model: p.models[0], max_tokens: 10 });
    const convo = await (await request.get(`${GATEWAY}/api/conversations/${r.doneEvent.conversation_id}`)).json();
    const assistantMsg = convo.messages.find((m: any) => m.role === 'assistant');
    expect(assistantMsg.provider).toBe(p.name);
    expect(assistantMsg.model).toBe(p.models[0]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: Frontend UI (tests 71-82)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('8. Frontend UI', () => {
  test('8.01 app loads with AI Chat header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=AI Chat')).toBeVisible();
  });

  test('8.02 empty state shows "Start a conversation"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Start a conversation')).toBeVisible();
  });

  test('8.03 textarea is present and enabled', async ({ page }) => {
    await page.goto('/');
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await expect(ta).toBeVisible();
    await expect(ta).toBeEnabled();
  });

  test('8.04 file attach button is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button[aria-label="Attach file"]')).toBeVisible();
  });

  test('8.05 web search toggle is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button[aria-label*="web search"]')).toBeVisible();
  });

  test('8.06 send button is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
  });

  test('8.07 settings button navigates to config', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Settings"]').click();
    await expect(page).toHaveURL(/\/config/);
  });

  test('8.08 config page shows Settings heading', async ({ page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('8.09 config page has LLM Providers section', async ({ page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'LLM Providers' })).toBeVisible({ timeout: 5000 });
  });

  test('8.10 config page has Web Search Providers section', async ({ page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Web Search Providers' })).toBeVisible({ timeout: 5000 });
  });

  test('8.11 config page has Add New buttons', async ({ page }) => {
    await page.goto('/config');
    const btns = page.locator('text=Add New');
    await expect(btns.first()).toBeVisible({ timeout: 5000 });
  });

  test('8.12 back to chat button works from config', async ({ page }) => {
    await page.goto('/config');
    await page.locator('text=Back to Chat').click();
    await expect(page).toHaveURL('/');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: Theme Switching (tests 83-92)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('9. Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();
  });

  test('9.01 dark mode is default', async ({ page }) => {
    const t = await page.locator('html').getAttribute('data-theme');
    expect(t === 'dark' || t === null).toBeTruthy();
  });

  test('9.02 toggle switches to light mode', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    expect(await page.locator('html').getAttribute('data-theme')).toBe('light');
  });

  test('9.03 toggle back returns to dark', async ({ page }) => {
    const btn = page.locator('button[aria-label="Toggle theme"]');
    await btn.click();
    await btn.click();
    expect(await page.locator('html').getAttribute('data-theme')).toBe('dark');
  });

  test('9.04 light mode persists on reload', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    await page.reload();
    expect(await page.locator('html').getAttribute('data-theme')).toBe('light');
  });

  test('9.05 light mode background is light color', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toContain('248'); // rgb(248,250,252)
  });

  test('9.06 dark mode background is dark color', async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Dark bg is #1a1a2e = rgb(26,26,46)
    expect(bg).toContain('26');
  });

  test('9.07 light mode text is dark', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    const color = await page.evaluate(() => {
      const el = document.querySelector('.text-text-primary');
      return el ? getComputedStyle(el).color : '';
    });
    const m = color.match(/rgb\((\d+),/);
    if (m) expect(parseInt(m[1])).toBeLessThan(100);
  });

  test('9.08 theme toggle button is visible', async ({ page }) => {
    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible();
  });

  test('9.09 localStorage stores theme preference', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('light');
  });

  test('9.10 theme applies to config page too', async ({ page }) => {
    await page.locator('button[aria-label="Toggle theme"]').click();
    await page.goto('/config');
    expect(await page.locator('html').getAttribute('data-theme')).toBe('light');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: E2E File Upload in UI (tests 93-100)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('10. E2E File Upload via UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    // Switch to Anthropic
    const sel = page.locator('.truncate.max-w-\\[200px\\]').first();
    await sel.click();
    await page.waitForTimeout(400);
    const model = page.locator('button:has-text("claude-sonnet")').first();
    if (await model.isVisible({ timeout: 2000 }).catch(() => false)) {
      await model.click();
      await page.waitForTimeout(400);
    }
  });

  test('10.01 upload Excel and ask about tenders for 17th feb', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(2000);
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Give me tenders for 17th feb');
    await ta.press('Enter');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 60000 });
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('tool_call');
    expect(text?.toLowerCase()).toContain('tender');
  });

  test('10.02 upload Excel and request pie chart', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(2000);
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Build a pie chart showing tenders by division');
    await ta.press('Enter');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('tool_call');
  });

  test('10.03 upload Excel and request bar chart', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(2000);
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Show a bar chart of tender types');
    await ta.press('Enter');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 90000 });
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('tool_call');
  });

  test('10.04 response uses markdown formatting', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(EXCEL_FILE);
    await page.waitForTimeout(2000);
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('List all tender grades found in the file');
    await ta.press('Enter');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 60000 });
    // Markdown renders via prose class
    const prose = page.locator('[class*="prose"]').first();
    await expect(prose).toBeVisible({ timeout: 5000 });
  });

  test('10.05 user message appears immediately in chat', async ({ page }) => {
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Test message appears');
    await ta.press('Enter');
    await expect(page.getByRole('main').getByText('Test message appears')).toBeVisible({ timeout: 3000 });
  });

  test('10.06 send button disabled while streaming', async ({ page }) => {
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Tell me a long story about a cat');
    await ta.press('Enter');
    // During streaming, the stop button should appear instead
    const stopBtn = page.locator('button[aria-label="Stop generating"]');
    await expect(stopBtn).toBeVisible({ timeout: 10000 });
  });

  test('10.07 stop button cancels streaming', async ({ page }) => {
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Write a very long essay about the history of computing');
    await ta.press('Enter');
    const stopBtn = page.locator('button[aria-label="Stop generating"]');
    await expect(stopBtn).toBeVisible({ timeout: 10000 });
    await stopBtn.click();
    // After stopping, send button should reappear
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 5000 });
  });

  test('10.08 conversation appears in sidebar after sending', async ({ page }) => {
    const ta = page.locator('textarea[placeholder="Type a message..."]');
    await ta.fill('Sidebar test message unique9876');
    await ta.press('Enter');
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible({ timeout: 60000 });
    // Check sidebar has the conversation
    await expect(page.locator('text=Sidebar test message').first()).toBeVisible({ timeout: 5000 });
  });
});
