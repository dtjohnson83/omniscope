import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, type Agent } from '@/lib/supabase';

// Predefined categories for common agent types
const AGENT_CATEGORIES = [
  'Data Provider',
  'AI/ML Service',
  'IoT Device',
  'External API',
  'Database',
  'Monitoring',
  'Analytics',
  'Custom/Other'
];

const AUTH_METHODS = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer_token', label: 'Bearer Token' },
  { value: 'basic_auth', label: 'Basic Authentication' },
  { value: 'oauth', label: 'OAuth 2.0' },
  { value: 'custom', label: 'Custom Authentication' }
];

const COMMUNICATION_METHODS = [
  { value: 'webhook', label: 'Webhook (Push)' },
  { value: 'polling', label: 'Polling (Pull)' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'custom', label: 'Custom Protocol' }
];

const PAYLOAD_FORMATS = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'form_data', label: 'Form Data' },
  { value: 'custom', label: 'Custom Format' }
];

export default function AgentRegistrationSystem() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTab, setActiveTab] = useState('register');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Enhanced form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Custom/Other',
    dataTypes: '',
    webhookUrl: '',
    apiKey: '',
    authMethod: 'api_key' as const,
    payloadFormat: 'json' as const,
    communicationMethod: 'webhook' as const,
    customHeaders: '',
    customConfig: '',
    tags: '',
    version: '1.0.0'
  });

  // Check authentication and load agents
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAgents();
      } else {
        setAgents([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadAgents();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setShowError('Failed to load agents');
    }
  };

  const signIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      setShowError('Failed to sign in');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateApiKey = () => {
    const prefix = formData.name.toLowerCase().replace(/\s+/g, '').slice(0, 3);
    const randomPart = Math.random().toString(36).substr(2, 9);
    const apiKey = `${prefix}_${randomPart}`;
    setFormData(prev => ({
      ...prev,
      apiKey
    }));
  };

  const testConnection = async (agentId: string) => {
    setTestingAgent(agentId);
    
    try {
      // Simulate API test - in real implementation, you'd test the actual endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', agentId);

      if (error) throw error;
      
      await loadAgents();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error testing connection:', error);
      setShowError('Failed to test connection');
    } finally {
      setTestingAgent(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowError('Please sign in to register agents');
      return;
    }

    try {
      const customHeaders = formData.customHeaders ? JSON.parse(formData.customHeaders) : null;
      const customConfig = formData.customConfig ? JSON.parse(formData.customConfig) : null;
      
      const newAgent = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        data_types: formData.dataTypes.split(',').map(type => type.trim()),
        webhook_url: formData.webhookUrl,
        api_key: formData.apiKey,
        status: 'inactive' as const,
        auth_method: formData.authMethod,
        payload_format: formData.payloadFormat,
        communication_method: formData.communicationMethod,
        custom_headers: customHeaders,
        custom_config: customConfig,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        version: formData.version,
        user_id: user.id
      };

      const { error } = await supabase
        .from('agents')
        .insert([newAgent]);

      if (error) throw error;

      setFormData({
        name: '',
        description: '',
        category: 'Custom/Other',
        dataTypes: '',
        webhookUrl: '',
        apiKey: '',
        authMethod: 'api_key',
        payloadFormat: 'json',
        communicationMethod: 'webhook',
        customHeaders: '',
        customConfig: '',
        tags: '',
        version: '1.0.0'
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setActiveTab('manage');
      await loadAgents();
    } catch (error) {
      console.error('Error registering agent:', error);
      setShowError('Failed to register agent. Please check your JSON format.');
    }
  };

  const toggleAgentStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    try {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('agents')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      setShowError('Failed to update agent status');
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAgents();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error deleting agent:', error);
      setShowError('Failed to delete agent');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-blue-600">Universal Agent Registration System</h1>
          <p className="text-gray-600">Connect any agent, service, or data source to your platform</p>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">Please sign in to manage your agents</p>
              <Button onClick={signIn} className="w-full">
                🔗 Sign in with GitHub
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-blue-600">Universal Agent Registration System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👋 {user.email}</span>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
        <p className="text-gray-600">Connect any agent, service, or data source to your platform</p>
      </div>

      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✅ Operation completed successfully!
          </AlertDescription>
        </Alert>
      )}

      {showError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            ❌ {showError}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowError(null)}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register">+ Register Agent</TabsTrigger>
          <TabsTrigger value="manage">👥 Manage Agents</TabsTrigger>
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>+ Register New Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Custom Weather API"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        {AGENT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what this agent does and what data it provides"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => handleInputChange('version', e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        placeholder="e.g., weather, api, real-time"
                      />
                    </div>
                  </div>
                </div>

                {/* Communication Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Communication Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="communicationMethod">Communication Method</Label>
                      <select
                        id="communicationMethod"
                        value={formData.communicationMethod}
                        onChange={(e) => handleInputChange('communicationMethod', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        {COMMUNICATION_METHODS.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payloadFormat">Data Format</Label>
                      <select
                        id="payloadFormat"
                        value={formData.payloadFormat}
                        onChange={(e) => handleInputChange('payloadFormat', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        {PAYLOAD_FORMATS.map(format => (
                          <option key={format.value} value={format.value}>{format.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Endpoint URL *</Label>
                    <Input
                      id="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                      placeholder="https://your-agent.com/endpoint"
                      type="url"
                      required
                    />
                  </div>
                </div>

                {/* Authentication */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Authentication</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="authMethod">Authentication Method</Label>
                    <select
                      id="authMethod"
                      value={formData.authMethod}
                      onChange={(e) => handleInputChange('authMethod', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      {AUTH_METHODS.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key / Token</Label>
                    <div className="flex gap-2">
                      <Input
                        id="apiKey"
                        value={formData.apiKey}
                        onChange={(e) => handleInputChange('apiKey', e.target.value)}
                        placeholder="Your API key or token"
                        type="password"
                      />
                      <Button type="button" onClick={generateApiKey} variant="outline">
                        🔑 Generate
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Data Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Data Configuration</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dataTypes">Data Types (comma-separated) *</Label>
                    <Input
                      id="dataTypes"
                      value={formData.dataTypes}
                      onChange={(e) => handleInputChange('dataTypes', e.target.value)}
                      placeholder="e.g., temperature, humidity, predictions, metrics"
                      required
                    />
                  </div>
                </div>

                {/* Advanced Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Advanced Configuration (Optional)</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customHeaders">Custom Headers (JSON format)</Label>
                    <Textarea
                      id="customHeaders"
                      value={formData.customHeaders}
                      onChange={(e) => handleInputChange('customHeaders', e.target.value)}
                      placeholder='{"X-Custom-Header": "value", "Authorization": "Bearer token"}'
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customConfig">Custom Configuration (JSON format)</Label>
                    <Textarea
                      id="customConfig"
                      value={formData.customConfig}
                      onChange={(e) => handleInputChange('customConfig', e.target.value)}
                      placeholder='{"timeout": 5000, "retries": 3, "custom_param": "value"}'
                      rows={3}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Register Agent
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👥 Your Registered Agents</CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No agents registered yet. Click "Register Agent" to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge variant="secondary">{agent.category}</Badge>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {agent.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {agent.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{agent.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            <div><strong>Endpoint:</strong> {agent.webhook_url}</div>
                            <div><strong>Communication:</strong> {agent.communication_method} | {agent.payload_format}</div>
                            <div><strong>Created:</strong> {new Date(agent.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnection(agent.id)}
                            disabled={testingAgent === agent.id}
                          >
                            {testingAgent === agent.id ? '🔄 Testing...' : '🧪 Test'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAgentStatus(agent.id)}
                          >
                            {agent.status === 'active' ? '⏸️ Disable' : '▶️ Enable'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAgent(agent.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️ Delete
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

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{agents.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {agents.filter(a => a.status === 'active').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {new Set(agents.map(a => a.category)).size}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {new Set(agents.flatMap(a => a.data_types)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          {agents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>⚙️ Agent Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{agent.name}</h3>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Category:</strong> {agent.category}</div>
                        <div><strong>Version:</strong> {agent.version}</div>
                        <div><strong>Communication:</strong> {agent.communication_method}</div>
                        <div><strong>Format:</strong> {agent.payload_format}</div>
                        <div><strong>Auth:</strong> {agent.auth_method}</div>
                        <div><strong>Data Types:</strong> {agent.data_types.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const QueryInterface = ({ user }: { user: any }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userAgents, setUserAgents] = useState<any[]>([]);

  // Load user's agents on component mount
  useEffect(() => {
    loadUserAgents();
  }, [user]);

  const loadUserAgents = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('agents')
      .select('id, name, data_types, category')
      .eq('user_id', user.id);
    
    setUserAgents(data || []);
  };

  const handleQuery = async () => {
    if (!question.trim() || !user) return;
    
    setLoading(true);
    try {
      const response = await processUniversalQuery(question, user.id, userAgents);
      setResponse(response);
    } catch (error) {
      console.error('Query error:', error);
      setResponse({
        answer: "Sorry, I couldn't process that question. Please try again.",
        execution_method: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const processUniversalQuery = async (question: string, userId: string, agents: any[]) => {
    const lowerQ = question.toLowerCase();
    
    // 1. Determine query intent and extract keywords
    const intent = analyzeQueryIntent(lowerQ, agents);
    
    // 2. Based on intent, route to appropriate handler
    switch (intent.type) {
      case 'current_value':
        return await handleCurrentValueQuery(intent, userId);
      case 'agent_status':
        return await handleAgentStatusQuery(intent, userId);
      case 'latest_data':
        return await handleLatestDataQuery(intent, userId);
      case 'comparison':
        return await handleComparisonQuery(intent, userId);
      case 'trend':
        return await handleTrendQuery(intent, userId);
      case 'all_data':
        return await handleAllDataQuery(intent, userId);
      default:
        return await handleGeneralQuery(question, userId, agents);
    }
  };

  const analyzeQueryIntent = (question: string, agents: any[]) => {
    // Extract agent names mentioned in question
    const mentionedAgents = agents.filter(agent => 
      question.includes(agent.name.toLowerCase()) ||
      agent.data_types?.some((type: string) => question.includes(type.toLowerCase()))
    );

    // Determine query type based on keywords
    if (question.includes('current') || question.includes('now') || question.includes('latest')) {
      return {
        type: 'current_value',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('status') || question.includes('health') || question.includes('working')) {
      return {
        type: 'agent_status',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents
      };
    }
    
    if (question.includes('compare') || question.includes('vs') || question.includes('versus')) {
      return {
        type: 'comparison',
        agents: mentionedAgents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('trend') || question.includes('over time') || question.includes('history')) {
      return {
        type: 'trend',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
        keywords: extractDataKeywords(question)
      };
    }
    
    if (question.includes('show me') || question.includes('display') || question.includes('list')) {
      return {
        type: 'latest_data',
        agents: mentionedAgents.length > 0 ? mentionedAgents : agents
      };
    }
    
    if (question.includes('all') || question.includes('everything')) {
      return {
        type: 'all_data',
        agents: agents
      };
    }

    return {
      type: 'general',
      agents: mentionedAgents.length > 0 ? mentionedAgents : agents,
      keywords: extractDataKeywords(question)
    };
  };

  const extractDataKeywords = (question: string) => {
    // Common data keywords to look for
    const dataKeywords = [
      'price', 'value', 'amount', 'cost', 'rate', 'score', 'count', 'number',
      'temperature', 'humidity', 'pressure', 'speed', 'size', 'volume',
      'percentage', 'ratio', 'average', 'total', 'sum', 'min', 'max'
    ];
    
    return dataKeywords.filter(keyword => question.includes(keyword));
  };

  const handleCurrentValueQuery = async (intent: any, userId: string) => {
    if (intent.agents.length === 0) {
      return {
        answer: "I don't see any agents matching your query. Please check your agent names.",
        execution_method: 'function_calling'
      };
    }

    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        processed_data,
        collected_at,
        agents!inner(name, data_types)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(intent.agents.length);

    if (!data || data.length === 0) {
      return {
        answer: `No recent data found for ${intent.agents.map((a: any) => a.name).join(', ')}. Make sure your agents are running.`,
        execution_method: 'function_calling'
      };
    }

    // Extract current values from latest data
    const results = data.map(record => {
      const agentName = record.agents.name;
      const processedData = record.processed_data;
      
      // Find relevant values in the data
      const values = extractRelevantValues(processedData, intent.keywords);
      
      return {
        agent: agentName,
        values: values,
        timestamp: record.collected_at
      };
    });

    const answer = formatCurrentValueResponse(results);
    
    return {
      answer,
      data: results,
      execution_method: 'function_calling'
    };
  };

  const handleAgentStatusQuery = async (intent: any, userId: string) => {
    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        status,
        collected_at,
        response_time_ms,
        agents!inner(name)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .gte('collected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('collected_at', { ascending: false });

    const agentStats = data?.reduce((acc: any, record: any) => {
      const agentName = record.agents.name;
      if (!acc[agentName]) {
        acc[agentName] = { 
          total: 0, 
          success: 0, 
          avg_response_time: 0,
          last_execution: null 
        };
      }
      acc[agentName].total++;
      if (record.status === 'success') acc[agentName].success++;
      if (record.response_time_ms) {
        acc[agentName].avg_response_time += record.response_time_ms;
      }
      if (!acc[agentName].last_execution || record.collected_at > acc[agentName].last_execution) {
        acc[agentName].last_execution = record.collected_at;
      }
      return acc;
    }, {}) || {};

    // Calculate averages
    Object.keys(agentStats).forEach(agentName => {
      if (agentStats[agentName].total > 0) {
        agentStats[agentName].avg_response_time = Math.round(
          agentStats[agentName].avg_response_time / agentStats[agentName].total
        );
      }
    });

    const summary = Object.entries(agentStats)
      .map(([name, stats]: [string, any]) => {
        const successRate = Math.round((stats.success / stats.total) * 100);
        const lastSeen = stats.last_execution ? new Date(stats.last_execution).toLocaleTimeString() : 'N/A';
        return `${name}: ${successRate}% success rate, ${stats.avg_response_time}ms avg response, last seen ${lastSeen}`;
      }).join('\n') || "No agent activity in the last 24 hours.";

    return {
      answer: summary,
      data: agentStats,
      execution_method: 'function_calling'
    };
  };

  const handleLatestDataQuery = async (intent: any, userId: string) => {
    const agentIds = intent.agents.map((agent: any) => agent.id);
    
    const { data } = await supabase
      .from('agent_data')
      .select(`
        processed_data,
        collected_at,
        agents!inner(name, data_types)
      `)
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      return {
        answer: "No recent data found for your agents.",
        execution_method: 'function_calling'
      };
    }

    const summary = data.map(record => {
      const agentName = record.agents.name;
      const timestamp = new Date(record.collected_at).toLocaleString();
      const dataSize = JSON.stringify(record.processed_data).length;
      
      return `${agentName}: ${dataSize} bytes collected at ${timestamp}`;
    }).slice(0, 5).join('\n');

    return {
      answer: `Latest data from your agents:\n${summary}`,
      data: data,
      execution_method: 'function_calling'
    };
  };

  const handleComparisonQuery = async (intent: any, userId: string) => {
    if (intent.agents.length < 2) {
      return {
        answer: "Please specify at least two agents or data types for comparison.",
        execution_method: 'function_calling'
      };
    }

    const agentIds = intent.agents.map((a: any) => a.id);

    const { data, error } = await supabase
      .from('agent_data')
      .select('*')
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase error in comparison query:', error);
      return {
        answer: "Error fetching data for comparison. Please try again.",
        execution_method: 'function_calling'
      };
    }

    if (!data || data.length === 0) {
      return {
        answer: "No data available for comparison.",
        execution_method: 'function_calling'
      };
    }

    // Group data by agent
    const grouped = data.reduce((acc: any, record: any) => {
      const name = record.agents?.name;
      if (name) {
        if (!acc[name]) acc[name] = [];
        acc[name].push(record.processed_data);
      }
      return acc;
    }, {});

    // Compare latest values
    const comparison = {};
    intent.keywords.forEach(keyword => {
      const values = intent.agents.map(agent => {
        const latest = grouped[agent.name]?.[0];
        if (!latest) return 'No data';
        return findValueByKeyword(latest, keyword) || 'N/A';
      });
      comparison[keyword] = values;
    });

    const answer = Object.entries(comparison).map(([keyword, values]: [string, any]) => {
      return `${keyword}: ${intent.agents.map((a, i) => `${a.name}: ${values[i]}`).join(', ')}`;
    }).join('\n') || "No comparable data found.";

    return {
      answer: `Comparison:\n${answer}`,
      data: grouped,
      execution_method: 'function_calling'
    };
  };

  const handleTrendQuery = async (intent: any, userId: string) => {
    const agentIds = intent.agents.map((a: any) => a.id);

    const { data, error } = await supabase
      .from('agent_data')
      .select('*')
      .eq('user_id', userId)
      .in('agent_id', agentIds)
      .order('collected_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error in trend query:', error);
      return {
        answer: "Error fetching data for trend analysis. Please try again.",
        execution_method: 'function_calling'
      };
    }

    if (!data || data.length === 0) {
      return {
        answer: "No data available for trend analysis.",
        execution_method: 'function_calling'
      };
    }

    // Simple trend analysis
    const trends = intent.agents.map((agent: any) => {
      const agentData = data.filter(d => d.agent_id === agent.id).slice(0, 10);
      const values = agentData.map(d => extractRelevantValues(d.processed_data, intent.keywords));
      return { agent: agent.name, values };
    });

    const answer = trends.map(t => {
      if (intent.keywords.length > 0) {
        const key = intent.keywords[0];
        const vals = t.values.map(v => v[key] ?? 0).filter(v => typeof v === 'number');  // Filter non-numbers
        if (vals.length < 2) return `${t.agent}: Insufficient data for trend analysis`;
        const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
        const trend = vals[0] > vals[vals.length - 1] ? 'increasing' : 'decreasing';
        const change = ((vals[0] - vals[vals.length - 1]) / vals[vals.length - 1]) * 100;
        return `${t.agent}: ${key} is ${trend} by ${Math.round(change)}% over recent data (avg: ${Math.round(avg)})`;
      }
      return `${t.agent}: Data available for analysis`;
    }).join('\n');

    return {
      answer: `Trends:\n${answer}`,
      execution_method: 'function_calling'
    };
  };

  const handleAllDataQuery = async (intent: any, userId: string) => {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, status, execution_count, success_count')
      .eq('user_id', userId);

    const { data: recentData } = await supabase
      .from('agent_data')
      .select('agent_id, status')
      .eq('user_id', userId)
      .gte('collected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary = `You have ${agents?.length || 0} registered agents. ` +
      `${recentData?.filter(d => d.status === 'success').length || 0} successful executions ` +
      `in the last 24 hours out of ${recentData?.length || 0} total attempts.`;

    return {
      answer: summary,
      data: { agents, recentData },
      execution_method: 'function_calling'
    };
  };

  const handleGeneralQuery = async (question: string, userId: string, agents: any[]) => {
    // Fallback for questions we can't categorize
    const agentNames = agents.map(a => a.name).join(', ');
    
    return {
      answer: `I can help you query data from your agents: ${agentNames}. ` +
              `Try asking "What's the current data from [agent name]?" or "How are my agents doing?"`,
      execution_method: 'function_calling'
    };
  };

  const extractRelevantValues = (processedData: any, keywords: string[]) => {
    if (!processedData) return {};
    
    const values: any = {};
    
    // If keywords are specified, look for those specifically
    if (keywords.length > 0) {
      keywords.forEach(keyword => {
        findValuesByKeyword(processedData, keyword, values);
      });
    } else {
      // Otherwise, extract all numeric values
      extractAllNumericValues(processedData, values);
    }
    
    return values;
  };

  const findValuesByKeyword = (obj: any, keyword: string, results: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (key.toLowerCase().includes(keyword.toLowerCase())) {
        results[currentPath] = value;
      }
      
      if (typeof value === 'object' && value !== null) {
        findValuesByKeyword(value, keyword, results, currentPath);
      }
    });
  };

  const extractAllNumericValues = (obj: any, results: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'number') {
        results[currentPath] = value;
      } else if (typeof value === 'object' && value !== null) {
        extractAllNumericValues(value, results, currentPath);
      }
    });
  };

  const formatCurrentValueResponse = (results: any[]) => {
    return results.map(result => {
      const { agent, values, timestamp } = result;
      const time = new Date(timestamp).toLocaleTimeString();
      
      if (Object.keys(values).length === 0) {
        return `${agent}: No relevant data found (last updated ${time})`;
      }
      
      const valueStrings = Object.entries(values)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `${agent}: ${valueStrings} (updated ${time})`;
    }).join('\n');
  };

  const generateExampleQuestions = () => {
    if (userAgents.length === 0) return [];
    
    const examples = [];
    
    // Generate examples based on user's actual agents
    if (userAgents.length > 0) {
      const firstAgent = userAgents[0];
      examples.push(`What's the current data from ${firstAgent.name}?`);
      examples.push(`How is ${firstAgent.name} performing?`);
    }
    
    if (userAgents.length > 1) {
      examples.push(`Show me latest data from all agents`);
      examples.push(`Compare my agents' performance`);
    }
    
    examples.push(`How are my agents doing?`);
    
    return examples;
  };

  const exampleQuestions = generateExampleQuestions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>🤖 Ask Questions About Your Data</CardTitle>
        <p className="text-sm text-gray-600">
          Query any of your {userAgents.length} registered agents using natural language
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's the current data? How are my agents performing? Show me latest updates..."
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleQuery} disabled={loading}>
            {loading ? '🤔 Thinking...' : '🔍 Ask'}
          </Button>
        </div>

        {exampleQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.slice(0, 3).map((example, index) => (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                onClick={() => setQuestion(example)}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <pre className="text-blue-900 font-medium whitespace-pre-wrap">{response.answer}</pre>
              <div className="text-xs text-blue-600 mt-2">
                Method: {response.execution_method}
              </div>
            </div>

            {response.data && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="font-semibold cursor-pointer">📋 Raw Data</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {userAgents.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p>No agents registered yet. Register some agents first to query their data!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
