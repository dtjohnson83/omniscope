
export const AGENT_CATEGORIES = [
  'Data Provider',
  'AI/ML Service',
  'IoT Device',
  'External API',
  'Database',
  'Monitoring',
  'Analytics',
  'Custom/Other'
];

export const AUTH_METHODS = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer_token', label: 'Bearer Token' },
  { value: 'basic_auth', label: 'Basic Authentication' },
  { value: 'oauth', label: 'OAuth 2.0' },
  { value: 'custom', label: 'Custom Authentication' }
];

export const COMMUNICATION_METHODS = [
  { value: 'webhook', label: 'Webhook (Push)' },
  { value: 'polling', label: 'Polling (Pull)' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'custom', label: 'Custom Protocol' }
];

export const PAYLOAD_FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'form_data', label: 'Form Data' },
  { value: 'custom', label: 'Custom Format' }
];
