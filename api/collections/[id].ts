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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  const supabase = createAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('file_collections')
      .select('*, file_collection_items(file_id)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Collection not found' });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    const { name, description, color } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('file_collections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'POST') {
    // Add file to collection
    const { data: collection } = await supabase
      .from('file_collections')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const { file_id } = req.body;
    if (!file_id) return res.status(400).json({ error: 'file_id is required' });

    const { data, error } = await supabase
      .from('file_collection_items')
      .insert({ collection_id: id, file_id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'DELETE') {
    const { file_id } = req.body || {};

    if (file_id) {
      // Remove file from collection
      const { error } = await supabase
        .from('file_collection_items')
        .delete()
        .eq('collection_id', id)
        .eq('file_id', file_id);

      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).end();
    }

    // Delete the collection itself
    const { error } = await supabase
      .from('file_collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
