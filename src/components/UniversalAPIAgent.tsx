import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RefreshCw, Clock, CheckCircle, XCircle, Settings, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SemanticProcessor } from '@/lib/semanticProcessor';

interface APIAgent {
  id: string;
  name: string;
  description: string;
  api_url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body_template?: string;
  query_params: Record<string, string>;
  data_path: string;
  collection_interval: number;
  status: 'active' | 'inactive' | 'error';
  last_run: string | null;
  next_run: string | null;
  user_id: string;
  created_at: string;
}

interface APIExecution {
  id: string;
  agent_id: string;
  status: 'success' | 'error' | 'running';
  response_data: any;
  error_message?: string;
  response_time_ms: number;
  executed_at: string;
}

const POPULAR_APIS = [
  {
    name: 'HTTPBin UUID',
    url: 'https://httpbin.org/uuid',
    method: 'GET',
    params: {},
    dataPath: '$',
    description: 'Simple UUID generator - always works'
  },
  {
    name: 'HTTPBin JSON',
    url: 'https://httpbin.org/json',
    method: 'GET',
    params: {},
    dataPath: '$',
    description: 'Sample JSON data - reliable test API'
  },
  {
    name: 'Cat Facts',
    url: 'https://catfact.ninja/fact',
    method: 'GET',
    params: {},
    dataPath: '$',
    description: 'Random cat facts'
  },
  {
    name: 'JSONPlaceholder Users',
    url: 'https://jsonplaceholder.typicode.com/users',
    method: 'GET',
    params: {},
    dataPath: '$',
    description: 'Sample user data'
  }
];

export default function UniversalAPIAgent() {
  const [agents, setAgents] = useState<APIAgent[]>([]);
  const [executions, setExecutions] = useState<APIExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new API agent
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    api_url: '',
    http_method: 'GET' as const,
    headers: '{}',
    body_template: '',
    query_params: '{}',
    data_path: '$',
    collection_interval: 60
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadAgents();
        loadExecutions();
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to authenticate user');
    }
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading API agents:', error);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('api_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadPopularAPI = (apiTemplate: typeof POPULAR_APIS[0]) => {
    setFormData({
      name: apiTemplate.name,
      description: apiTemplate.description,
      api_url: apiTemplate.url,
      http_method: apiTemplate.method as 'GET',
      headers: '{}',
      body_template: '',
      query_params: JSON.stringify(apiTemplate.params, null, 2),
      data_path: apiTemplate.dataPath,
      collection_interval: 60
    });
  };

  const safeJSONParse = (jsonString: string | any, fallback: any = {}) => {
    // Handle null, undefined, or non-string values
    if (!jsonString || typeof jsonString !== 'string') {
      return fallback;
    }
    
    const trimmedString = jsonString.trim();
    if (trimmedString === '') {
      return fallback;
    }
    
    try {
      return JSON.parse(trimmedString);
    } catch (e) {
      console.warn('Invalid JSON, using fallback:', trimmedString);
      return fallback;
    }
  };

  const testAPICall = async () => {
    if (!formData.api_url) {
      setError('Please enter an API URL');
      return;
    }

    setTesting('current');
    setError(null);
    
    try {
      const response = await executeAPICall(formData);
      alert(`✅ API Test Successful!\n\nStatus: ${response.status}\nResponse: ${JSON.stringify(response.data).slice(0, 200)}...`);
    } catch (error) {
      console.error('API test failed:', error);
      setError(`API Test Failed: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const executeAPICall = async (agentConfig: any): Promise<{status: number, data: any}> => {
    const url = new URL(agentConfig.api_url);
    
    // Safely parse query parameters
    const queryParams = safeJSONParse(agentConfig.query_params, {});
    if (queryParams && typeof queryParams === 'object') {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (key && value !== undefined && value !== null) {
          url.searchParams.append(String(key), String(value));
        }
      });
    }

    // Safely parse headers
    const customHeaders = safeJSONParse(agentConfig.headers, {});
    const headers = {
      'Content-Type': 'application/json',
      ...(customHeaders && typeof customHeaders === 'object' ? customHeaders : {})
    };

    const fetchOptions: RequestInit = {
      method: agentConfig.http_method,
      headers: headers
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT'].includes(agentConfig.http_method) && agentConfig.body_template) {
      try {
        // Validate body template is valid JSON
        const bodyTemplate = String(agentConfig.body_template);
        JSON.parse(bodyTemplate);
        fetchOptions.body = bodyTemplate;
      } catch (e) {
        throw new Error('Invalid JSON in body template');
      }
    }

    console.log('Making API call to:', url.toString());
    console.log('Fetch options:', fetchOptions);

    const response = await fetch(url.toString(), fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { status: response.status, data };
  };

  const createAPIAgent = async () => {
    if (!user) {
      setError('Please sign in to create agents');
      return;
    }

    if (!formData.name || typeof formData.name !== 'string' || !formData.name.trim()) {
      setError('Please enter a valid agent name');
      return;
    }

    if (!formData.api_url || typeof formData.api_url !== 'string' || !formData.api_url.trim()) {
      setError('Please enter a valid API URL');
      return;
    }

    setError(null);

    try {
      // Validate JSON fields before saving
      const headers = safeJSONParse(formData.headers, {});
      const queryParams = safeJSONParse(formData.query_params, {});

      const newAgent = {
        name: String(formData.name).trim(),
        description: String(formData.description || '').trim(),
        api_url: String(formData.api_url).trim(),
        http_method: formData.http_method,
        headers: headers,
        body_template: formData.body_template ? String(formData.body_template).trim() : null,
        query_params: queryParams,
        data_path: String(formData.data_path || '$').trim(),
        collection_interval: Math.max(1, Number(formData.collection_interval) || 60),
        status: 'active',
        user_id: user.id,
        next_run: new Date(Date.now() + (Number(formData.collection_interval) || 60) * 60000).toISOString()
      };

      console.log('Creating agent:', newAgent);

      const { error } = await supabase
        .from('api_agents')
        .insert([newAgent]);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        api_url: '',
        http_method: 'GET',
        headers: '{}',
        body_template: '',
        query_params: '{}',
        data_path: '$',
        collection_interval: 60
      });

      await loadAgents();
      alert('✅ API Agent created successfully!');
    } catch (error) {
      console.error('Error creating API agent:', error);
      setError(`Failed to create agent: ${error.message}`);
    }
  };

  const runAgentNow = async (agent: APIAgent) => {
    setTesting(agent.id);
    setError(null);
    const startTime = Date.now();

    try {
      console.log('Executing agent:', agent.name);
      const response = await executeAPICall(agent);
      const responseTime = Date.now() - startTime;

      // Extract data using data_path
      let extractedData = response.data;
      if (agent.data_path && agent.data_path !== '

  const toggleAgentStatus = async (agent: APIAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('api_agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      setError('Failed to update agent status');
    }
  };

  const deleteAgent = async (agent: APIAgent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('api_agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      setError('Failed to delete agent');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please sign in to manage API agents</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-600">Universal Agent System</h1>
        <p className="text-gray-600">Connect any API as a data source and collect real-time information</p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            ❌ {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">🔧 Create Agent</TabsTrigger>
          <TabsTrigger value="manage">📊 Manage Agents</TabsTrigger>
          <TabsTrigger value="executions">📈 Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <div className="space-y-6">
            {/* Popular APIs */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Quick Start - Popular APIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {POPULAR_APIS.map((api, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{api.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{api.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{api.url}</p>
                        </div>
                        <Button size="sm" onClick={() => loadPopularAPI(api)}>
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom API Form */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 Create Custom API Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Agent Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="My API Agent"
                    />
                  </div>
                  <div>
                    <Label>HTTP Method</Label>
                    <Select value={formData.http_method} onValueChange={(value) => handleInputChange('http_method', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="What this API provides..."
                  />
                </div>

                <div>
                  <Label>API URL *</Label>
                  <Input
                    value={formData.api_url}
                    onChange={(e) => handleInputChange('api_url', e.target.value)}
                    placeholder="https://api.example.com/data"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Query Parameters (JSON)</Label>
                    <Textarea
                      value={formData.query_params}
                      onChange={(e) => handleInputChange('query_params', e.target.value)}
                      placeholder='{}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {} for no parameters</p>
                  </div>
                  <div>
                    <Label>Headers (JSON)</Label>
                    <Textarea
                      value={formData.headers}
                      onChange={(e) => handleInputChange('headers', e.target.value)}
                      placeholder='{}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {} for default headers</p>
                  </div>
                </div>

                {['POST', 'PUT'].includes(formData.http_method) && (
                  <div>
                    <Label>Request Body Template (JSON)</Label>
                    <Textarea
                      value={formData.body_template}
                      onChange={(e) => handleInputChange('body_template', e.target.value)}
                      placeholder='{"data": "value"}'
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data Path (JSONPath)</Label>
                    <Input
                      value={formData.data_path}
                      onChange={(e) => handleInputChange('data_path', e.target.value)}
                      placeholder="$"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use $ for full response, $.data for nested data
                    </p>
                  </div>
                  <div>
                    <Label>Collection Interval (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.collection_interval}
                      onChange={(e) => handleInputChange('collection_interval', parseInt(e.target.value) || 60)}
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={testAPICall}
                    disabled={!formData.api_url || testing === 'current'}
                    variant="outline"
                  >
                    {testing === 'current' ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Test API
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={createAPIAgent}
                    disabled={!formData.name || !formData.api_url}
                  >
                    Create Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Your API Agents
                <Button variant="outline" size="sm" onClick={loadAgents} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No API agents created yet. Create your first agent to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                              {agent.status}
                            </Badge>
                            <Badge variant="outline">{agent.http_method}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div><strong>URL:</strong> {agent.api_url}</div>
                            <div><strong>Interval:</strong> Every {agent.collection_interval} minutes</div>
                            {agent.last_run && (
                              <div><strong>Last run:</strong> {new Date(agent.last_run).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => runAgentNow(agent)}
                            disabled={testing === agent.id}
                          >
                            {testing === agent.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAgentStatus(agent)}
                          >
                            {agent.status === 'active' ? '⏸️' : '▶️'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAgent(agent)}
                            className="text-red-600"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Execution History
                <Button variant="outline" size="sm" onClick={loadExecutions}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No executions yet. Run an agent to see execution history.
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.slice(0, 20).map((execution) => {
                    const agent = agents.find(a => a.id === execution.agent_id);
                    return (
                      <div key={execution.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{agent?.name || 'Unknown Agent'}</span>
                              {execution.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {execution.response_time_ms}ms
                              </span>
                              {/* ✨ NEW: Show if semantic data was processed */}
                              {execution.status === 'success' && (
                                <Badge variant="outline" className="text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  Semantic
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(execution.executed_at).toLocaleString()}
                            </div>
                            {execution.error_message && (
                              <div className="text-xs text-red-600 mt-1">
                                Error: {execution.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        {execution.response_data && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-600">
                              View Response Data
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                              {JSON.stringify(execution.response_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent></span>
                              {execution.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {execution.response_time_ms}ms
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(execution.executed_at).toLocaleString()}
                            </div>
                            {execution.error_message && (
                              <div className="text-xs text-red-600 mt-1">
                                Error: {execution.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        {execution.response_data && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-600">
                              View Response Data
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                              {JSON.stringify(execution.response_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}) {
        try {
          // Simple JSONPath implementation
          const path = agent.data_path.replace('$.', '').split('.');
          for (const key of path) {
            if (key && extractedData && typeof extractedData === 'object') {
              extractedData = extractedData[key];
            }
          }
        } catch (e) {
          console.warn('Data path extraction failed, using full response');
          extractedData = response.data;
        }
      }

      console.log('Extracted data:', extractedData);

      // ✨ NEW: Add semantic processing
      const semanticMetadata = SemanticProcessor.processData(extractedData, agent.name);
      console.log('Semantic metadata:', semanticMetadata);

      // Save execution result
      const { error: execError } = await supabase.from('api_executions').insert([{
        agent_id: agent.id,
        status: 'success',
        response_data: extractedData,
        response_time_ms: responseTime,
        executed_at: new Date().toISOString()
      }]);

      if (execError) {
        console.error('Failed to save execution:', execError);
      }

      // Save to agent_data table with semantic enrichment
      const { data: savedData, error: dataError } = await supabase
        .from('agent_data')
        .insert([{
          agent_id: agent.id,
          user_id: user.id,
          processed_data: extractedData,
          semantic_metadata: semanticMetadata, // ✨ NEW: Save semantic data
          status: 'success',
          response_time_ms: responseTime,
          collected_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (dataError) {
        console.error('Failed to save agent data:', dataError);
        throw dataError;
      }

      // ✨ NEW: Save extracted entities to entities table
      if (semanticMetadata.entities.length > 0) {
        const entityInserts = semanticMetadata.entities.map(entity => ({
          agent_data_id: savedData.id,
          entity_type: entity.type,
          entity_value: entity.value,
          confidence_score: entity.confidence,
          field_source: entity.fieldSource
        }));

        const { error: entitiesError } = await supabase
          .from('semantic_entities')
          .insert(entityInserts);

        if (entitiesError) {
          console.error('Failed to save entities:', entitiesError);
        }
      }

      // ✨ NEW: Check for cross-agent correlations
      await findAndSaveCorrelations(agent.id, semanticMetadata, agent.name);

      await loadExecutions();
      
      // Enhanced success message with semantic info
      const entitySummary = semanticMetadata.entities.length > 0 
        ? `\n\n🧠 Semantic Analysis:\n${semanticMetadata.entities.length} entities detected\nTypes: ${[...new Set(semanticMetadata.entities.map(e => e.type))].join(', ')}`
        : '';
      
      alert(`✅ Agent executed successfully!\n\nResponse time: ${responseTime}ms\nData collected: ${JSON.stringify(extractedData).slice(0, 100)}...${entitySummary}`);
    } catch (error) {
      console.error('Error executing agent:', error);
      
      // Save error execution
      try {
        await supabase.from('api_executions').insert([{
          agent_id: agent.id,
          status: 'error',
          error_message: error.message,
          response_time_ms: Date.now() - startTime,
          executed_at: new Date().toISOString()
        }]);
      } catch (saveError) {
        console.error('Failed to save error execution:', saveError);
      }

      setError(`Agent execution failed: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // ✨ NEW: Function to find and save correlations
  const findAndSaveCorrelations = async (currentAgentId: string, currentSemantics: any, currentAgentName: string) => {
    try {
      // Get recent data from other agents
      const { data: otherAgentData, error } = await supabase
        .from('agent_data')
        .select(`
          id,
          agent_id,
          semantic_metadata,
          api_agents(name)
        `)
        .neq('agent_id', currentAgentId)
        .order('collected_at', { ascending: false })
        .limit(10);

      if (error || !otherAgentData) return;

      const sourceData = {
        agent: currentAgentName,
        entities: currentSemantics.entities
      };

      const targetData = otherAgentData
        .filter(item => item.semantic_metadata?.entities)
        .map(item => ({
          agent: item.api_agents.name,
          entities: item.semantic_metadata.entities
        }));

      const correlations = SemanticProcessor.findCrossAgentCorrelations(sourceData, targetData);

      // Save significant correlations
      const significantCorrelations = correlations.filter(c => c.strength > 0.5);
      
      if (significantCorrelations.length > 0) {
        const correlationInserts = significantCorrelations.map(correlation => ({
          source_agent_id: currentAgentId,
          target_agent_id: otherAgentData.find(d => d.api_agents.name === correlation.targetAgent)?.agent_id,
          correlation_type: correlation.correlationType,
          correlation_strength: correlation.strength,
          correlation_data: {
            sharedEntities: correlation.sharedEntities,
            discoveredAt: new Date().toISOString()
          }
        }));

        await supabase.from('data_correlations').insert(correlationInserts);
        console.log(`Found ${significantCorrelations.length} correlations with other agents`);
      }
    } catch (error) {
      console.error('Error finding correlations:', error);
    }
  };

  const toggleAgentStatus = async (agent: APIAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('api_agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      setError('Failed to update agent status');
    }
  };

  const deleteAgent = async (agent: APIAgent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('api_agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      setError('Failed to delete agent');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please sign in to manage API agents</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-600">Universal Agent System</h1>
        <p className="text-gray-600">Connect any API as a data source and collect real-time information</p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            ❌ {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">🔧 Create Agent</TabsTrigger>
          <TabsTrigger value="manage">📊 Manage Agents</TabsTrigger>
          <TabsTrigger value="executions">📈 Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <div className="space-y-6">
            {/* Popular APIs */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Quick Start - Popular APIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {POPULAR_APIS.map((api, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{api.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{api.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{api.url}</p>
                        </div>
                        <Button size="sm" onClick={() => loadPopularAPI(api)}>
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom API Form */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 Create Custom API Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Agent Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="My API Agent"
                    />
                  </div>
                  <div>
                    <Label>HTTP Method</Label>
                    <Select value={formData.http_method} onValueChange={(value) => handleInputChange('http_method', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="What this API provides..."
                  />
                </div>

                <div>
                  <Label>API URL *</Label>
                  <Input
                    value={formData.api_url}
                    onChange={(e) => handleInputChange('api_url', e.target.value)}
                    placeholder="https://api.example.com/data"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Query Parameters (JSON)</Label>
                    <Textarea
                      value={formData.query_params}
                      onChange={(e) => handleInputChange('query_params', e.target.value)}
                      placeholder='{}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {} for no parameters</p>
                  </div>
                  <div>
                    <Label>Headers (JSON)</Label>
                    <Textarea
                      value={formData.headers}
                      onChange={(e) => handleInputChange('headers', e.target.value)}
                      placeholder='{}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {} for default headers</p>
                  </div>
                </div>

                {['POST', 'PUT'].includes(formData.http_method) && (
                  <div>
                    <Label>Request Body Template (JSON)</Label>
                    <Textarea
                      value={formData.body_template}
                      onChange={(e) => handleInputChange('body_template', e.target.value)}
                      placeholder='{"data": "value"}'
                      rows={3}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data Path (JSONPath)</Label>
                    <Input
                      value={formData.data_path}
                      onChange={(e) => handleInputChange('data_path', e.target.value)}
                      placeholder="$"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use $ for full response, $.data for nested data
                    </p>
                  </div>
                  <div>
                    <Label>Collection Interval (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.collection_interval}
                      onChange={(e) => handleInputChange('collection_interval', parseInt(e.target.value) || 60)}
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={testAPICall}
                    disabled={!formData.api_url || testing === 'current'}
                    variant="outline"
                  >
                    {testing === 'current' ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Test API
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={createAPIAgent}
                    disabled={!formData.name || !formData.api_url}
                  >
                    Create Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Your API Agents
                <Button variant="outline" size="sm" onClick={loadAgents} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No API agents created yet. Create your first agent to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                              {agent.status}
                            </Badge>
                            <Badge variant="outline">{agent.http_method}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div><strong>URL:</strong> {agent.api_url}</div>
                            <div><strong>Interval:</strong> Every {agent.collection_interval} minutes</div>
                            {agent.last_run && (
                              <div><strong>Last run:</strong> {new Date(agent.last_run).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => runAgentNow(agent)}
                            disabled={testing === agent.id}
                          >
                            {testing === agent.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAgentStatus(agent)}
                          >
                            {agent.status === 'active' ? '⏸️' : '▶️'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAgent(agent)}
                            className="text-red-600"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Execution History
                <Button variant="outline" size="sm" onClick={loadExecutions}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No executions yet. Run an agent to see execution history.
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.slice(0, 20).map((execution) => {
                    const agent = agents.find(a => a.id === execution.agent_id);
                    return (
                      <div key={execution.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{agent?.name || 'Unknown Agent'}</span>
                              {execution.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {execution.response_time_ms}ms
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(execution.executed_at).toLocaleString()}
                            </div>
                            {execution.error_message && (
                              <div className="text-xs text-red-600 mt-1">
                                Error: {execution.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        {execution.response_data && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-600">
                              View Response Data
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                              {JSON.stringify(execution.response_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
