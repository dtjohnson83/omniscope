
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AgentForm } from './agent-registration/AgentForm';
import { AgentList } from './agent-registration/AgentList';
import { AgentOverview } from './agent-registration/AgentOverview';
import { useAgentOperations } from '@/hooks/useAgentOperations';
import { supabase } from '@/integrations/supabase/client';
import { FormData } from './agent-registration/types';

const AgentRegistrationSystem = () => {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
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
  const { toast } = useToast();
  const {
    agents,
    testingAgent,
    loadAgents,
    createAgent,
    testConnection,
    toggleAgentStatus,
    deleteAgent
  } = useAgentOperations();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user, loadAgents]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateApiKey = () => {
    const key = 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setFormData(prev => ({ ...prev, apiKey: key }));
  };

  const handleFormSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create an agent',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createAgent(data, user.id);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        category: '',
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
      toast({
        title: 'Success',
        description: 'Agent registered successfully!'
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to register agent',
        variant: 'destructive'
      });
    }
  };

  const handleTestConnection = async (agentId: string) => {
    try {
      await testConnection(agentId);
      toast({
        title: 'Success',
        description: 'Connection test successful!'
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'Connection test failed',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (agentId: string) => {
    try {
      await toggleAgentStatus(agentId);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      await deleteAgent(agentId);
      toast({
        title: 'Success',
        description: 'Agent deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete agent',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🤖 Universal Agent Platform</h1>
          <p className="text-gray-600 mt-2">Register and manage your data collection agents</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={!user}>
          Register Agent
        </Button>
      </div>

      {!user && (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please log in to register and manage agents.</p>
          </CardContent>
        </Card>
      )}

      {user && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AgentOverview agents={agents} />
          </TabsContent>

          <TabsContent value="agents">
            <AgentList
              agents={agents}
              testingAgent={testingAgent}
              onTestConnection={handleTestConnection}
              onToggleStatus={handleToggleStatus}
              onDeleteAgent={handleDeleteAgent}
            />
          </TabsContent>
        </Tabs>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Register New Agent</h2>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
              <AgentForm 
                formData={formData}
                onInputChange={handleInputChange}
                onGenerateApiKey={generateApiKey}
                onSubmit={handleFormSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentRegistrationSystem;
