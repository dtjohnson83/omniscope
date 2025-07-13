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
