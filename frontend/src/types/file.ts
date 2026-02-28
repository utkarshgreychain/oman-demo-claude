export interface UploadedFile {
  id: string;
  filename: string;
  original_name?: string;
  file_type: string;
  mime_type?: string;
  file_size: number;
  size_bytes?: number;
  storage_path?: string;
  summary?: string | null;
  key_insights?: string[] | null;
  row_count?: number | null;
  column_names?: string[] | null;
  created_at: string;
}
