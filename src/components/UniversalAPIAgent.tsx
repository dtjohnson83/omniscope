
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, Play, Pause, Trash2, Settings, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface APIAgent {
  id: string;
  name: string;
  description: string;
  api_url: string;
  http_method: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  body_template: string;
  data_path: string;
  collection_interval: number;
  status: 'active' | 'inactive' | 'paused';
  last_run: string;
  next_run: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface APIExecution {
  id: string;
  agent_id: string;
  status: 'success' | 'error';
  response_data: any;
  error_message: string;
  response_time_ms: number;
  executed_at: string;
}

const UniversalAPIAgent: React.FC = () => {
  const [agents, setAgents] = useState<APIAgent[]>([]);
  const [executions, setExecutions] = useState<APIExecution[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<APIAgent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    api_url: '',
    http_method: 'GET',
    headers: '{}',
    query_params: '{}',
    body_template: '',
    data_path: '$',
    collection_interval: 60
  });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAgents();
      fetchExecutions();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('api_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch API agents',
        variant: 'destructive'
      });
    }
  };

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('api_executions')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleCreateAgent = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let headers = {};
      let queryParams = {};

      try {
        headers = JSON.parse(formData.headers);
        queryParams = JSON.parse(formData.query_params);
      } catch (e) {
        throw new Error('Invalid JSON in headers or query parameters');
      }

      const newAgent = {
        name: formData.name,
        description: formData.description,
        api_url: formData.api_url,
        http_method: formData.http_method,
        headers,
        query_params: queryParams,
        body_template: formData.body_template,
        data_path: formData.data_path,
        collection_interval: formData.collection_interval,
        status: 'inactive',
        user_id: user.id
      };

      const { error } = await supabase
        .from('api_agents')
        .insert([newAgent]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'API agent created successfully'
      });

      setIsCreating(false);
      setFormData({
        name: '',
        description: '',
        api_url: '',
        http_method: 'GET',
        headers: '{}',
        query_params: '{}',
        body_template: '',
        data_path: '$',
        collection_interval: 60
      });
      fetchAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeAgent = async (agent: APIAgent) => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      
      const requestOptions: RequestInit = {
        method: agent.http_method,
        headers: {
          'Content-Type': 'application/json',
          ...agent.headers
        }
      };

      // Add query parameters to URL
      const url = new URL(agent.api_url);
      Object.entries(agent.query_params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      // Add body for non-GET requests
      if (agent.http_method !== 'GET' && agent.body_template) {
        requestOptions.body = agent.body_template;
      }

      const response = await fetch(url.toString(), requestOptions);
      const responseTime = Date.now() - startTime;
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Extract data using data_path
      let extractedData = responseData;
      if (agent.data_path && agent.data_path !== '$') {
        try {
          const pathParts = agent.data_path.split('.');
          for (const part of pathParts) {
            if (part !== '$') {
              extractedData = extractedData[part];
            }
          }
        } catch (e) {
          console.warn('Failed to extract data using path:', agent.data_path);
        }
      }

      // Store execution result
      const executionData = {
        agent_id: agent.id,
        status: response.ok ? 'success' : 'error',
        response_data: extractedData,
        error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        response_time_ms: responseTime
      };

      const { error } = await supabase
        .from('api_executions')
        .insert([executionData]);

      if (error) throw error;

      toast({
        title: response.ok ? 'Success' : 'Warning',
        description: response.ok ? 
          `Agent executed successfully (${responseTime}ms)` : 
          `Agent executed with errors: ${response.statusText}`,
        variant: response.ok ? 'default' : 'destructive'
      });

      fetchExecutions();
    } catch (error) {
      console.error('Error executing agent:', error);
      
      // Store error execution
      const executionData = {
        agent_id: agent.id,
        status: 'error',
        response_data: null,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        response_time_ms: Date.now() - Date.now()
      };

      await supabase
        .from('api_executions')
        .insert([executionData]);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to execute agent',
        variant: 'destructive'
      });

      fetchExecutions();
    } finally {
      setIsLoading(false);
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

      toast({
        title: 'Success',
        description: `Agent ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      });

      fetchAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent status',
        variant: 'destructive'
      });
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('api_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Agent deleted successfully'
      });

      fetchAgents();
      fetchExecutions();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete agent',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 'paused': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Universal API Agents</h1>
          <p className="text-gray-600 mt-2">Create and manage automated API data collection agents</p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isLoading}>
          Create New Agent
        </Button>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Create New API Agent</CardTitle>
                <CardDescription>Configure a new agent to collect data from an API endpoint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="My API Agent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api_url">API URL</Label>
                    <Input
                      id="api_url"
                      value={formData.api_url}
                      onChange={(e) => setFormData({...formData, api_url: e.target.value})}
                      placeholder="https://api.example.com/data"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe what this agent collects..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="http_method">HTTP Method</Label>
                    <Select value={formData.http_method} onValueChange={(value) => setFormData({...formData, http_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="data_path">Data Path</Label>
                    <Input
                      id="data_path"
                      value={formData.data_path}
                      onChange={(e) => setFormData({...formData, data_path: e.target.value})}
                      placeholder="$.data.items"
                    />
                  </div>
                  <div>
                    <Label htmlFor="collection_interval">Interval (minutes)</Label>
                    <Input
                      id="collection_interval"
                      type="number"
                      value={formData.collection_interval}
                      onChange={(e) => setFormData({...formData, collection_interval: parseInt(e.target.value)})}
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      value={formData.headers}
                      onChange={(e) => setFormData({...formData, headers: e.target.value})}
                      placeholder='{"Authorization": "Bearer token"}'
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="query_params">Query Parameters (JSON)</Label>
                    <Textarea
                      id="query_params"
                      value={formData.query_params}
                      onChange={(e) => setFormData({...formData, query_params: e.target.value})}
                      placeholder='{"limit": "100"}'
                      rows={3}
                    />
                  </div>
                </div>

                {formData.http_method !== 'GET' && (
                  <div>
                    <Label htmlFor="body_template">Request Body Template</Label>
                    <Textarea
                      id="body_template"
                      value={formData.body_template}
                      onChange={(e) => setFormData({...formData, body_template: e.target.value})}
                      placeholder='{"query": "SELECT * FROM data"}'
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleCreateAgent} disabled={isLoading || !formData.name || !formData.api_url}>
                    {isLoading ? 'Creating...' : 'Create Agent'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(agent.status)}
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => executeAgent(agent)}
                        disabled={isLoading}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAgentStatus(agent)}
                        disabled={isLoading}
                      >
                        {agent.status === 'active' ? 
                          <Pause className="h-4 w-4" /> : 
                          <CheckCircle className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAgent(agent.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <Badge variant="outline">{agent.http_method}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Interval:</span>
                      <span>{agent.collection_interval}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Run:</span>
                      <span>{agent.last_run ? new Date(agent.last_run).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 truncate">
                      {agent.api_url}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {agents.length === 0 && !isCreating && (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Agents</h3>
                <p className="text-gray-600 mb-4">Create your first API agent to start collecting data automatically.</p>
                <Button onClick={() => setIsCreating(true)}>
                  Create First Agent
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>Latest API agent execution results</CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length > 0 ? (
                <div className="space-y-3">
                  {executions.map((execution) => {
                    const agent = agents.find(a => a.id === execution.agent_id);
                    return (
                      <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {execution.status === 'success' ? 
                            <CheckCircle className="h-5 w-5 text-green-500" /> :
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          }
                          <div>
                            <p className="font-medium">{agent?.name || 'Unknown Agent'}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(execution.executed_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={execution.status === 'success' ? 
                            'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                          }>
                            {execution.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {execution.response_time_ms}ms
                          </span>
                          {execution.error_message && (
                            <span className="text-sm text-red-600 max-w-xs truncate">
                              {execution.error_message}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No executions yet. Run an agent to see results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UniversalAPIAgent;
