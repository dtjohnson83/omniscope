import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Users, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface Agent {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  webhookUrl: string;
  apiKey: string;
  status: 'active' | 'inactive';
  registeredAt: Date;
}

// Mock data
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Weather Data Provider',
    description: 'Provides real-time weather data and forecasts',
    dataTypes: ['temperature', 'humidity', 'precipitation', 'wind'],
    webhookUrl: 'https://weather-agent.example.com/webhook',
    apiKey: 'wea_abc123def456',
    status: 'active',
    registeredAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Financial Markets Agent',
    description: 'Stock prices, market indices, and financial indicators',
    dataTypes: ['stock_prices', 'market_cap', 'volume', 'dividends'],
    webhookUrl: 'https://finance-agent.example.com/webhook',
    apiKey: 'fin_xyz789ghi012',
    status: 'active',
    registeredAt: new Date('2024-01-10')
  }
];

export default function AgentRegistrationSystem() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [activeView, setActiveView] = useState<'register' | 'manage' | 'overview'>('register');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataTypes: '',
    webhookUrl: '',
    apiKey: ''
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAgent: Agent = {
      id: (agents.length + 1).toString(),
      name: formData.name,
      description: formData.description,
      dataTypes: formData.dataTypes.split(',').map(type => type.trim()),
      webhookUrl: formData.webhookUrl,
      apiKey: formData.apiKey,
      status: 'active',
      registeredAt: new Date(),
    };

    setAgents(prev => [...prev, newAgent]);
    setFormData({
      name: '',
      description: '',
      dataTypes: '',
      webhookUrl: '',
      apiKey: ''
    });
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setActiveView('manage');
  };

  const toggleAgentStatus = (id: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id 
        ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' }
        : agent
    ));
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
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
            Agent registered successfully! You can now manage it in the Agent Management section.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveView('register')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeView === 'register' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="h-4 w-4" />
          Register Agent
        </button>
        <button
          onClick={() => setActiveView('manage')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeView === 'manage' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Manage Agents
        </button>
        <button
          onClick={() => setActiveView('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeView === 'overview' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="h-4 w-4" />
          Overview
        </button>
      </div>

      {/* Register View */}
      {activeView === 'register' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Register New Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Weather Data Provider"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    value={formData.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                    placeholder="https://your-agent.com/webhook"
                    type="url"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of what data this agent provides"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Types (comma-separated)</label>
                <Input
                  value={formData.dataTypes}
                  onChange={(e) => handleInputChange('dataTypes', e.target.value)}
                  placeholder="e.g., temperature, humidity, precipitation"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="Generated API key"
                    required
                  />
                  <Button type="button" onClick={generateApiKey} variant="outline">
                    Generate
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Register Agent
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Manage View */}
      {activeView === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Agents
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
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {agent.dataTypes.slice(0, 3).map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {agent.dataTypes.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{agent.dataTypes.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-2">
                    <div><strong>Webhook:</strong> {agent.webhookUrl}</div>
                    <div><strong>API Key:</strong> {agent.apiKey}</div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAgentStatus(agent.id)}
                  >
                    {agent.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <CardTitle className="text-lg">Data Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {new Set(agents.flatMap(a => a.dataTypes)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent Summary</CardTitle>
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
                    <div className="text-sm">
                      <div><strong>Data Types:</strong> {agent.dataTypes.join(', ')}</div>
                      <div><strong>Registered:</strong> {agent.registeredAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
