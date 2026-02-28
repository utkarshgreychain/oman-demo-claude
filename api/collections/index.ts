import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../_lib/supabase-admin';
import { getUserFromRequest } from '../_lib/auth';

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
      .from('file_collections')
      .select('*, file_collection_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const collections = (data || []).map((c: any) => ({
      ...c,
      file_count: c.file_collection_items?.[0]?.count || 0,
      file_collection_items: undefined,
    }));

    return res.json(collections);
  }

  if (req.method === 'POST') {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase
      .from('file_collections')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        color: color || '#6366f1',
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
