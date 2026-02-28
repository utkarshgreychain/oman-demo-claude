export async function* streamAnthropic(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // Extract system message (Anthropic uses separate system parameter)
  let systemPrompt: string | undefined;
  const filteredMessages: Array<{ role: string; content: string }> = [];
  for (const msg of params.messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else {
      filteredMessages.push(msg);
    }
  }

  const url = `${params.baseUrl || 'https://api.anthropic.com'}/v1/messages`;
  const body: Record<string, unknown> = {
    model: params.model,
    messages: filteredMessages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: true,
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        /* skip */
      }
    }
  }
}
