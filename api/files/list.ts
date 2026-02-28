import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../_lib/supabase-admin';
import { getUserFromRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let user;
  try {
    user = await getUserFromRequest(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createAdminClient();
  const collectionId = req.query.collection_id as string | undefined;

  if (collectionId) {
    // Get files in a specific collection
    const { data, error } = await supabase
      .from('file_collection_items')
      .select('file_id, uploaded_files(*)')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const files = (data || [])
      .map((item: any) => item.uploaded_files)
      .filter(Boolean);

    return res.json(files);
  }

  // Get all user files
  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}
