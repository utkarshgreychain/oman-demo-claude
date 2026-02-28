export async function* streamBedrock(params: {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  maxTokens: number;
}): AsyncGenerator<string, void, undefined> {
  // apiKey contains JSON: {"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}
  let credentials: { accessKeyId: string; secretAccessKey: string; region: string };
  try {
    credentials = JSON.parse(params.apiKey);
  } catch {
    throw new Error('Bedrock credentials must be JSON: {"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}');
  }

  const { BedrockRuntimeClient, ConverseStreamCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const client = new BedrockRuntimeClient({
    region: credentials.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  // Convert messages to Bedrock Converse format
  const converseMessages = params.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: [{ text: m.content }],
    }));

  const systemPrompts = params.messages
    .filter(m => m.role === 'system')
    .map(m => ({ text: m.content }));

  const command = new ConverseStreamCommand({
    modelId: params.model,
    messages: converseMessages,
    system: systemPrompts.length > 0 ? systemPrompts : undefined,
    inferenceConfig: {
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    },
  });

  const response = await client.send(command);

  if (response.stream) {
    for await (const event of response.stream) {
      if (event.contentBlockDelta?.delta?.text) {
        yield event.contentBlockDelta.delta.text;
      }
    }
  }
}
