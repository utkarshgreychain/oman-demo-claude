export interface LLMProvider {
  id: string;
  name: string;
  display_name: string;
  base_url?: string;
  models: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  connection_status: string;
}

export interface SearchProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  connection_status: string;
}

export interface LLMProviderCreate {
  name: string;
  display_name: string;
  api_key: string;
  base_url?: string;
  models?: string[];
  is_default?: boolean;
}

export interface SearchProviderCreate {
  name: string;
  display_name: string;
  api_key: string;
  is_default?: boolean;
}

export interface TestConnectionRequest {
  name: string;
  api_key: string;
  base_url?: string;
  model?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  models?: string[];
}
