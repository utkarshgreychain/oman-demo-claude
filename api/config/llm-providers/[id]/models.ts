import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../../../_lib/supabase-admin';
import { getUserFromRequest } from '../../../_lib/auth';
import { decryptApiKey } from '../../../_lib/encryption';
import { testLLMConnection } from '../../../_lib/connection-tester';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let user;
  try {
    user = await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const providerId = Array.isArray(id) ? id[0] : id;
  const supabase = createAdminClient();

  const { data: provider } = await supabase
    .from('llm_providers')
    .select('*')
    .eq('id', providerId)
    .eq('user_id', user.id)
    .single();

  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  const apiKey = await decryptApiKey(provider.api_key_encrypted);
  const result = await testLLMConnection(provider.name, apiKey, provider.base_url);

  // Update provider with results
  const updates: Record<string, unknown> = {
    connection_status: result.success ? 'connected' : 'failed',
  };
  if (result.models?.length) {
    updates.models = result.models;
  }
  await supabase
    .from('llm_providers')
    .update(updates)
    .eq('id', providerId)
    .eq('user_id', user.id);

  return res.json(result);
}
