
export interface AgentExecution {
  agent_id: string;
  success: boolean;
  response_data?: any;
  error_message?: string;
  response_time_ms: number;
  response_size_bytes: number;
}

export interface AgentDataStorage {
  raw_response?: any;
  processed_data?: any;
  status: string;
  error_message?: string;
  response_time_ms: number;
  response_size_bytes: number;
}

export interface ProcessedResponse {
  timestamp: string;
  agent_name: string;
  data_types: string[];
  metrics?: Record<string, number>;
  content?: Record<string, string>;
  response_structure?: {
    type: string;
    keys: string[];
    array_length?: number;
  };
  error?: string;
  raw?: any;
}
