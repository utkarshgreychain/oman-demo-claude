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

  const [conversations, files, providers] = await Promise.all([
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('uploaded_files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('llm_providers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  return res.json({
    conversations: conversations.count || 0,
    files: files.count || 0,
    providers: providers.count || 0,
  });
}
