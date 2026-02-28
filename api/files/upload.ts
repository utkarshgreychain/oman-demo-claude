import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminClient } from '../_lib/supabase-admin';
import { getUserFromRequest } from '../_lib/auth';
import { parseFile } from '../_lib/parsers';
import { IncomingForm, type File } from 'formidable';
import { readFileSync } from 'fs';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

function parseForm(req: VercelRequest): Promise<{ file: File }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: 50 * 1024 * 1024 });
    form.parse(req, (err, _fields, files) => {
      if (err) return reject(err);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) return reject(new Error('No file provided'));
      resolve({ file });
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let user;
  try {
    user = await getUserFromRequest(req as unknown as Request);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { file } = await parseForm(req);
    const filename = file.originalFilename || 'unknown';
    const fileBuffer = readFileSync(file.filepath);
    const fileId = crypto.randomUUID();
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const storagePath = `${user.id}/${fileId}/${filename}`;

    const supabase = createAdminClient();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
      });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Parse content
    let parsedContent: string;
    try {
      parsedContent = await parseFile(fileBuffer, filename, ext);
    } catch (e: any) {
      parsedContent = `[Failed to parse file: ${e.message}]`;
    }

    // Save metadata to DB
    const { data: uploaded, error: dbError } = await supabase
      .from('uploaded_files')
      .insert({
        id: fileId,
        user_id: user.id,
        filename,
        file_type: `.${ext}`,
        file_size: file.size || fileBuffer.length,
        storage_path: storagePath,
        parsed_content: parsedContent,
      })
      .select('id, filename, file_type, file_size, created_at')
      .single();

    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);
    return res.status(201).json(uploaded);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
