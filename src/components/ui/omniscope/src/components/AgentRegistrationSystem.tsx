import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Users, Database, Webhook, Key, Settings, TestTube } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Enhanced Types for more flexibility
interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  dataTypes: string[];
  webhookUrl: string;
  apiKey: string;
  status: 'active' | 'inactive' | 'testing';
  registeredAt: Date;
  lastActivity?: Date;
  // Enhanced configuration options
  authMethod: 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth' | 'custom';
  customHeaders?: Record<string, string>;
  payloadFormat: 'json' | 'xml' | 'form_data' | 'custom';
  communicationMethod: 'webhook' | 'polling' | 'websocket' | 'custom';
  customConfig?: Record<string, any>;
  tags: string[];
  version: string;
}

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

// Mock data with enhanced fields
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Weather Data Provider',
    description: 'Provides real-time weather data and forecasts',
    category: 'Data Provider',
    dataTypes: ['temperature', 'humidity', 'precipitation', 'wind'],
    webhookUrl: 'https://weather-agent.example.com/webhook',
    apiKey: 'wea_' + Math.random().toString(36).substr(2, 9),
    status: 'active',
    registeredAt: new Date('2024-01-15'),
    lastActivity: new Date('2024-01-20'),
    authMethod: 'api_key',
    payloadFormat: 'json',
    communicationMethod: 'webhook',
    tags: ['weather', 'meteorology', 'real-time'],
    version: '1.0.0'
  },
  {
    id: '2',
    name: 'Custom ML Model',
    description: 'Custom machine learning inference endpoint',
    category: 'AI/ML Service',
    dataTypes: ['predictions', 'confidence_scores', 'feature_importance'],
    webhookUrl: 'https://ml-agent.example.com/predict',
    apiKey: 'ml_' + Math.random().toString(36).substr(2, 9),
    status: 'testing',
    registeredAt: new Date('2024-01-10'),
    authMethod: 'bearer_token',
    payloadFormat: 'json',
    communicationMethod: 'polling',
    customHeaders: { 'X-Model-Version': '2.1.0' },
    tags: ['ml', 'ai', 'custom'],
    version: '2.1.0'
  }
];

export default function AgentRegistrationSystem() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [activeTab, setActiveTab] = useState('register');
  const [showSuccess, setShowSuccess] = useState(false);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  
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
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'active', lastActivity: new Date() }
        : agent
    ));
    setTestingAgent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const customHeaders = formData.customHeaders ? JSON.parse(formData.customHeaders) : undefined;
      const customConfig = formData.customConfig ? JSON.parse(formData.customConfig) : undefined;
      
      const newAgent: Agent = {
        id: (agents.length + 1).toString(),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        dataTypes: formData.dataTypes.split(',').map(type => type.trim()),
        webhookUrl: formData.webhookUrl,
        apiKey: formData.apiKey,
        status: 'inactive',
        registeredAt: new Date(),
        authMethod: formData.authMethod,
        payloadFormat: formData.payloadFormat,
        communicationMethod: formData.communicationMethod,
        customHeaders,
        customConfig,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        version: formData.version
      };

      setAgents(prev => [...prev, newAgent]);
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
    } catch (error) {
      console.error('Invalid JSON in custom configuration:', error);
      alert('Please check your custom headers and configuration for valid JSON format');
    }
  };

  const toggleAgentStatus = (id: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id 
        ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' }
        : agent
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-600">Universal Agent Registration System</h1>
        <p className="text-gray-600">Connect any agent, service, or data source to your platform</p>
      </div>

      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Agent registered successfully! Test the connection to activate it.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Register Agent
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Agents
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Register New Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                        <Key className="h-4 w-4 mr-2" />
                        Generate
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

                <Button onClick={handleSubmit} className="w-full">
                  Register Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registered Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Agent</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Communication</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.description}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {agent.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{agent.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <Badge variant="secondary">{agent.category}</Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <Badge className={getStatusColor(agent.status)}>
                            {agent.status}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="text-sm">
                            <div>{agent.communicationMethod}</div>
                            <div className="text-gray-500">{agent.payloadFormat}</div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testConnection(agent.id)}
                              disabled={testingAgent === agent.id}
                            >
                              <TestTube className="h-4 w-4 mr-1" />
                              {testingAgent === agent.id ? 'Testing...' : 'Test'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAgentStatus(agent.id)}
                            >
                              {agent.status === 'active' ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  {new Set(agents.flatMap(a => a.dataTypes)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Agent Configuration Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                      </div>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                      <div><strong>Category:</strong> {agent.category}</div>
                      <div><strong>Version:</strong> {agent.version}</div>
                      <div><strong>Communication:</strong> {agent.communicationMethod}</div>
                      <div><strong>Format:</strong> {agent.payloadFormat}</div>
                      <div><strong>Auth:</strong> {agent.authMethod}</div>
                      <div><strong>Endpoint:</strong> {agent.webhookUrl}</div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-sm"><strong>Data Types:</strong></div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.dataTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {agent.tags.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm"><strong>Tags:</strong></div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
