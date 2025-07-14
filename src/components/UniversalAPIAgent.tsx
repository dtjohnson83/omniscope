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
import { Play, RefreshCw, Clock, CheckCircle, XCircle, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface APIAgent {
  id: string;
  name: string;
  description: string;
  api_url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body_template?: string;
  query_params: Record<string, string>;
  data_path: string; // JSONPath to extract data
  collection_interval: number; // minutes
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
    name: 'CoinGecko Crypto Prices',
    url: 'https://api.coingecko.com/api/v3/simple/price',
    method: 'GET',
    params: { ids: 'bitcoin,ethereum', vs_currencies: 'usd' },
    dataPath: '$',
    description: 'Real-time cryptocurrency prices'
  },
  {
    name: 'OpenWeatherMap',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    method: 'GET',
    params: { q: 'New York', appid: 'YOUR_API_KEY' },
    dataPath: '$',
    description: 'Current weather data'
  },
  {
    name: 'JSONPlaceholder Posts',
    url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET',
    params: {},
    dataPath: '$',
    description: 'Sample blog posts data'
  },
  {
    name: 'News API Headlines',
    url: 'https://newsapi.org/v2/top-headlines',
    method: 'GET',
    params: { country: 'us', apiKey: 'YOUR_API_KEY' },
    dataPath: '$.articles',
    description: 'Latest news headlines'
  }
];

export default function UniversalAPIAgent() {
  const [agents, setAgents] = useState<APIAgent[]>([]);
  const [executions, setExecutions] = useState<APIExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

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
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadAgents();
      loadExecutions();
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

  const testAPICall = async () => {
    if (!formData.api_url) return;

    setTesting('current');
    try {
      const response = await executeAPICall(formData);
      alert(`✅ API Test Successful!\n\nStatus: ${response.status}\nData: ${JSON.stringify(response.data).slice(0, 200)}...`);
    } catch (error) {
      alert(`❌ API Test Failed!\n\nError: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const executeAPICall = async (agentConfig: any): Promise<{status: number, data: any}> => {
    const url = new URL(agentConfig.api_url);
    
    // Add query parameters
    let queryParams = {};
    try {
      queryParams = JSON.parse(agentConfig.query_params || '{}');
    } catch (e) {
      console.warn('Invalid query params JSON');
    }
    
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    // Prepare headers
    let headers = {};
    try {
      headers = JSON.parse(agentConfig.headers || '{}');
    } catch (e) {
      console.warn('Invalid headers JSON');
    }

    const fetchOptions: RequestInit = {
      method: agentConfig.http_method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT'].includes(agentConfig.http_method) && agentConfig.body_template) {
      fetchOptions.body = agentConfig.body_template;
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();

    return { status: response.status, data };
  };

  const createAPIAgent = async () => {
    if (!user) return;

    try {
      // Validate JSON fields
      JSON.parse(formData.headers || '{}');
      JSON.parse(formData.query_params || '{}');

      const newAgent = {
        name: formData.name,
        description: formData.description,
        api_url: formData.api_url,
        http_method: formData.http_method,
        headers: JSON.parse(formData.headers || '{}'),
        body_template: formData.body_template || null,
        query_params: JSON.parse(formData.query_params || '{}'),
        data_path: formData.data_path,
        collection_interval: formData.collection_interval,
        status: 'active',
        user_id: user.id,
        next_run: new Date(Date.now() + formData.collection_interval * 60000).toISOString()
      };

      const { error } = await supabase
        .from('api_agents')
        .insert([newAgent]);

      if (error) throw error;

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

      loadAgents();
      alert('✅ API Agent created successfully!');
    } catch (error) {
      console.error('Error creating API agent:', error);
      alert(`❌ Error creating agent: ${error.message}`);
    }
  };

  const runAgentNow = async (agent: APIAgent) => {
    setTesting(agent.id);
    const startTime = Date.now();

    try {
      const response = await executeAPICall(agent);
      const responseTime = Date.now() - startTime;

      // Extract data using data_path (simplified JSONPath)
      let extractedData = response.data;
      if (agent.data_path && agent.data_path !== '$') {
        // Simple dot notation support
        const path = agent.data_path.replace('$.', '').split('.');
        for (const key of path) {
          if (key && extractedData && typeof extractedData === 'object') {
            extractedData = extractedData[key];
          }
        }
      }

      // Save execution result
      await supabase.from('api_executions').insert([{
        agent_id: agent.id,
        status: 'success',
        response_data: extractedData,
        response_time_ms: responseTime,
        executed_at: new Date().toISOString()
      }]);

      // Save to agent_data table for integration with data processor
      await supabase.from('agent_data').insert([{
        agent_id: agent.id,
        user_id: user.id,
        processed_data: extractedData,
        status: 'success',
        response_time_ms: responseTime,
        collected_at: new Date().toISOString()
      }]);

      loadExecutions();
      alert(`✅ Agent executed successfully!\n\nResponse time: ${responseTime}ms\nData collected: ${JSON.stringify(extractedData).slice(0, 100)}...`);
    } catch (error) {
      // Save error execution
      await supabase.from('api_executions').insert([{
        agent_id: agent.id,
        status: 'error',
        error_message: error.message,
        response_time_ms: Date.now() - startTime,
        executed_at: new Date().toISOString()
      }]);

      console.error('Error executing agent:', error);
      alert(`❌ Agent execution failed: ${error.message}`);
    } finally {
      setTesting(null);
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
      loadAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
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
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
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
        <h1 className="text-3xl font-bold text-blue-600">Universal API Agent System</h1>
        <p className="text-gray-600">Connect any API as a data source and collect real-time information</p>
      </div>

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
                      placeholder='{"key": "value", "limit": 10}'
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Headers (JSON)</Label>
                    <Textarea
                      value={formData.headers}
                      onChange={(e) => handleInputChange('headers', e.target.value)}
                      placeholder='{"Authorization": "Bearer token"}'
                      rows={3}
                    />
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
                      placeholder="$ or $.data.items"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Path to extract specific data from response
                    </p>
                  </div>
                  <div>
                    <Label>Collection Interval (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.collection_interval}
                      onChange={(e) => handleInputChange('collection_interval', parseInt(e.target.value))}
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
