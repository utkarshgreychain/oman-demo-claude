import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../../_lib/supabase-admin';
import { getUserFromRequest } from '../../_lib/auth';
import { encryptApiKey } from '../../_lib/encryption';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user;
  try {
    user = await getUserFromRequest(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('search_providers')
      .select('id, name, display_name, is_active, is_default, connection_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { name, display_name, api_key, is_active, is_default } = req.body;

    if (!name || !api_key) {
      return res.status(400).json({ error: 'name and api_key are required' });
    }

    const apiKeyEncrypted = await encryptApiKey(api_key);

    if (is_default) {
      await supabase
        .from('search_providers')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('search_providers')
      .insert({
        user_id: user.id,
        name,
        display_name: display_name || name,
        api_key_encrypted: apiKeyEncrypted,
        is_active: is_active ?? true,
        is_default: is_default ?? false,
      })
      .select('id, name, display_name, is_active, is_default, connection_status, created_at')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
