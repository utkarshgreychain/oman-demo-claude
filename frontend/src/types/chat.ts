import type { Visualization } from './visualization';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  file_ids?: string[];
  search_results?: SearchResult[];
  visualizations?: Visualization[];
  file_sources?: FileSource[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ChatPayload {
  conversation_id: string | null;
  message: string;
  provider: string;
  model: string;
  file_ids: string[];
  web_search_enabled: boolean;
  search_provider: string | null;
  temperature: number;
  max_tokens: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ProgressStep {
  step: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  detail?: string;
}

export interface FileSource {
  filename: string;
}

export interface SSEEvent {
  type: 'status' | 'token' | 'visualization' | 'search_results' | 'progress' | 'sources' | 'done' | 'error';
  data: any;
}
