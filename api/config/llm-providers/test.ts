import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../../_lib/auth';
import { testLLMConnection } from '../../_lib/connection-tester';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, api_key, base_url, model } = req.body;

  if (!name || !api_key) {
    return res.status(400).json({ error: 'name and api_key are required' });
  }

  const result = await testLLMConnection(name, api_key, base_url, model);
  return res.json(result);
}
