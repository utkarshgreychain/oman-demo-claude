import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../_lib/supabase-admin';
import { getUserFromRequest, unauthorizedResponse, errorResponse } from '../_lib/auth';
import { decryptApiKey } from '../_lib/encryption';
import { buildMessages } from '../_lib/context-builder';
import { streamLLM } from '../_lib/llm/factory';
import { executeSearch } from '../_lib/search/factory';

export const config = { maxDuration: 120 };

const MAX_FILE_CONTENT_CHARS = 50_000;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
  let user;
  try {
    user = await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const supabase = createAdminClient();

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (event: string, data: unknown) => {
    res.write(sseEvent(event, data));
  };

  try {
    // Step 1: Get LLM provider config + decrypt API key
    const { data: llmProvider } = await supabase
      .from('llm_providers')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', body.provider)
      .single();

    if (!llmProvider) throw new Error(`LLM provider '${body.provider}' not configured`);
    const llmApiKey = await decryptApiKey(llmProvider.api_key_encrypted);

    // Step 2: Get search provider if needed
    let searchApiKey: string | undefined;
    if (body.web_search_enabled && body.search_provider) {
      const { data: searchProvider } = await supabase
        .from('search_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', body.search_provider)
        .single();
      if (searchProvider) {
        searchApiKey = await decryptApiKey(searchProvider.api_key_encrypted);
      }
    }

    // Step 3: Create or get conversation
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const title = body.message.slice(0, 80) + (body.message.length > 80 ? '...' : '');
      const { data: conv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title })
        .select('id')
        .single();
      if (convErr) throw new Error(`Failed to create conversation: ${convErr.message}`);
      conversationId = conv!.id;
    }

    // Step 4: Get conversation history
    const { data: historyRows } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);
    const history = historyRows || [];

    // Step 5: Fetch file contents
    let fileContents: Array<{ filename: string; content: string }> = [];
    if (body.file_ids?.length) {
      emit('progress', {
        type: 'progress', step: 'reading_files',
        label: 'Reading uploaded files...', status: 'in_progress',
      });

      const { data: files } = await supabase
        .from('uploaded_files')
        .select('filename, parsed_content')
        .eq('user_id', user.id)
        .in('id', body.file_ids);

      fileContents = (files || [])
        .filter((f: any) => f.parsed_content)
        .map((f: any) => ({
          filename: f.filename,
          content:
            f.parsed_content.length > MAX_FILE_CONTENT_CHARS
              ? f.parsed_content.slice(0, MAX_FILE_CONTENT_CHARS) +
                `\n\n... [Content truncated — showing first ${MAX_FILE_CONTENT_CHARS.toLocaleString()} characters]`
              : f.parsed_content,
        }));

      emit('progress', {
        type: 'progress', step: 'reading_files',
        label: 'Reading uploaded files...', status: 'completed',
        detail: `${fileContents.length} file(s) loaded`,
      });

      if (fileContents.length) {
        const filenames = fileContents.map((fc) => fc.filename).join(', ');
        emit('progress', {
          type: 'progress', step: 'analyzing_files',
          label: 'Analyzing file data...', status: 'completed',
          detail: filenames,
        });
      }
    }

    // Step 6: Web search
    let searchResults: Array<{ title: string; url: string; snippet: string }> = [];
    if (body.web_search_enabled && body.search_provider && searchApiKey) {
      emit('progress', {
        type: 'progress', step: 'searching_web',
        label: 'Searching the web...', status: 'in_progress',
      });

      try {
        searchResults = await executeSearch(body.search_provider, searchApiKey, body.message);
        emit('progress', {
          type: 'progress', step: 'searching_web',
          label: `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`,
          status: 'completed',
        });
        if (searchResults.length) {
          emit('search_results', { type: 'search_results', results: searchResults });
        }
      } catch (e: any) {
        emit('progress', {
          type: 'progress', step: 'searching_web',
          label: 'Web search failed', status: 'completed',
          detail: e.message,
        });
      }
    }

    // Step 7: Build context messages
    const messages = buildMessages(
      body.message,
      fileContents.length ? fileContents : undefined,
      searchResults.length ? searchResults : undefined,
      history.length ? history : undefined
    );

    // Step 8: Save user message
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: body.message,
      provider: body.provider,
      model: body.model,
      file_ids: body.file_ids || [],
      search_results: searchResults,
    });

    // Step 9: Stream LLM response
    emit('progress', {
      type: 'progress', step: 'generating',
      label: 'Generating response...', status: 'in_progress',
    });

    let fullResponse = '';
    const stream = streamLLM({
      provider: body.provider,
      apiKey: llmApiKey,
      baseUrl: llmProvider.base_url,
      model: body.model,
      messages,
      temperature: body.temperature || 0.7,
      maxTokens: body.max_tokens || 4096,
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
      emit('token', { type: 'token', content: chunk });
    }

    emit('progress', {
      type: 'progress', step: 'generating',
      label: 'Generating response...', status: 'completed',
    });

    // Step 10: Parse visualization blocks
    const vizRegex = /```visualization\s*\n([\s\S]*?)\n```/g;
    const visualizations: any[] = [];
    let vizMatch;

    while ((vizMatch = vizRegex.exec(fullResponse)) !== null) {
      try {
        const vizData = JSON.parse(vizMatch[1]);
        const vizResult = {
          viz_id: crypto.randomUUID(),
          chart_type: vizData.chart_type,
          title: vizData.title,
          data: vizData.data,
          x_label: vizData.x_label,
          y_label: vizData.y_label,
        };
        visualizations.push(vizResult);
        emit('visualization', { type: 'visualization', ...vizResult });
      } catch {
        /* skip invalid JSON */
      }
    }

    // Step 11: Save assistant message
    const { data: assistantMsg } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: fullResponse,
        provider: body.provider,
        model: body.model,
        visualizations,
      })
      .select('id')
      .single();

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Step 12: Done
    emit('done', {
      type: 'done',
      conversation_id: conversationId,
      message_id: assistantMsg?.id,
      file_sources: fileContents.map((f) => ({ filename: f.filename })),
    });
  } catch (e: any) {
    emit('error', { type: 'error', message: e.message });
  }

  res.end();
}
