
export interface FormData {
  name: string;
  description: string;
  category: string;
  dataTypes: string;
  webhookUrl: string;
  apiKey: string;
  authMethod: 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth' | 'custom';
  payloadFormat: 'json' | 'xml' | 'form_data' | 'custom';
  communicationMethod: 'webhook' | 'polling' | 'websocket' | 'custom';
  customHeaders: string;
  customConfig: string;
  tags: string;
  version: string;
}
