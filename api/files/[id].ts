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
  const fileId = Array.isArray(id) ? id[0] : id;
  const supabase = createAdminClient();

  // Handle /api/files/list — list all files or files in a collection
  if (fileId === 'list') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const collectionId = req.query.collection_id as string | undefined;

    if (collectionId) {
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

    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // Regular file operations
  if (req.method === 'GET') {
    // If ?include=data, also return parsed_content for visualization
    const includeData = req.query.include === 'data';
    const selectCols = includeData
      ? 'id, filename, file_type, file_size, storage_path, created_at, row_count, column_names, summary, key_insights, parsed_content'
      : 'id, filename, file_type, file_size, storage_path, created_at, row_count, column_names, summary, key_insights';

    const { data, error } = await supabase
      .from('uploaded_files')
      .select(selectCols)
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'File not found' });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    // Get storage path first
    const { data: file } = await supabase
      .from('uploaded_files')
      .select('storage_path')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from storage
    await supabase.storage.from('uploads').remove([file.storage_path]);

    // Delete from DB
    await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id);

    return res.json({ message: 'File deleted', id: fileId });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
