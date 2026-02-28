import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../_lib/supabase-admin';
import { getUserFromRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user;
  try {
    user = await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const fileId = Array.isArray(id) ? id[0] : id;
  const supabase = createAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('id, filename, file_type, file_size, created_at')
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
