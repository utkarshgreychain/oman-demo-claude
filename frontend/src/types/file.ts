export interface UploadedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  parsed_content?: string;
  summary?: string | null;
  key_insights?: string[] | null;
  row_count?: number | null;
  column_names?: string[] | null;
  created_at: string;
}
