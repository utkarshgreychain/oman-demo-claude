import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../../_lib/supabase-admin';
import { getUserFromRequest } from '../../_lib/auth';
import { encryptApiKey } from '../../_lib/encryption';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user;
  try {
    user = await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const providerId = Array.isArray(id) ? id[0] : id;
  const supabase = createAdminClient();

  if (req.method === 'PUT') {
    const updates: Record<string, unknown> = {};
    const { name, display_name, api_key, is_active, is_default, connection_status } = req.body;

    if (name !== undefined) updates.name = name;
    if (display_name !== undefined) updates.display_name = display_name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (connection_status !== undefined) updates.connection_status = connection_status;

    if (api_key) {
      updates.api_key_encrypted = await encryptApiKey(api_key);
    }

    if (is_default) {
      await supabase
        .from('search_providers')
        .update({ is_default: false })
        .eq('user_id', user.id);
      updates.is_default = true;
    } else if (is_default === false) {
      updates.is_default = false;
    }

    const { data, error } = await supabase
      .from('search_providers')
      .update(updates)
      .eq('id', providerId)
      .eq('user_id', user.id)
      .select('id, name, display_name, is_active, is_default, connection_status, created_at')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Provider not found' });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('search_providers')
      .delete()
      .eq('id', providerId)
      .eq('user_id', user.id);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Provider deleted', id: providerId });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
