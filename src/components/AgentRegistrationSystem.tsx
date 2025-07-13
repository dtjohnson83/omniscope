
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from './Navigation';
import { AgentForm } from './agent-registration/AgentForm';
import { AgentList } from './agent-registration/AgentList';
import { AgentOverview } from './agent-registration/AgentOverview';
import { useAgentAuth } from '@/hooks/useAgentAuth';
import { useAgentOperations } from '@/hooks/useAgentOperations';
import { FormData } from './agent-registration/types';

export default function AgentRegistrationSystem() {
  const { user, loading, signIn, signOut } = useAgentAuth();
  const { agents, testingAgent, loadAgents, createAgent, testConnection, toggleAgentStatus, deleteAgent } = useAgentOperations();
  
  const [activeTab, setActiveTab] = useState('register');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
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

  useEffect(() => {
    if (user) {
      loadAgents().catch(error => setShowError('Failed to load agents'));
    }
  }, [user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowError('Please sign in to register agents');
      return;
    }

    try {
      await createAgent(formData, user.id);
      
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
      setShowError('Failed to register agent. Please check your JSON format.');
    }
  };

  const handleTestConnection = async (agentId: string) => {
    try {
      await testConnection(agentId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setShowError('Failed to test connection');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await deleteAgent(id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setShowError('Failed to delete agent');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
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
            <AgentForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onGenerateApiKey={generateApiKey}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <AgentList
              agents={agents}
              testingAgent={testingAgent}
              onTestConnection={handleTestConnection}
              onToggleStatus={toggleAgentStatus}
              onDeleteAgent={handleDeleteAgent}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <AgentOverview agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
