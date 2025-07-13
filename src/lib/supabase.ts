import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  data_types: string[];
  webhook_url: string;
  api_key: string;
  status: 'active' | 'inactive' | 'testing';
  auth_method: 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth' | 'custom';
  payload_format: 'json' | 'xml' | 'form_data' | 'custom';
  communication_method: 'webhook' | 'polling' | 'websocket' | 'custom';
  custom_headers?: Record<string, string>;
  custom_config?: Record<string, any>;
  tags: string[];
  version: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
