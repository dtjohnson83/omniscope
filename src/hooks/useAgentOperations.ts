
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormData } from '@/components/agent-registration/types';
import { Tables } from '@/integrations/supabase/types';

// Updated Agent interface to match database schema exactly
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  data_types: string[] | null;
  webhook_url: string | null;
  api_key: string | null;
  status: string | null;
  auth_method: string | null;
  payload_format: string | null;
  communication_method: string | null;
  custom_headers: any;
  custom_config: any;
  tags: string[] | null;
  version: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  schedule_enabled: boolean | null;
  schedule_frequency: number | null;
  last_execution: string | null;
  next_execution: string | null;
  execution_count: number | null;
  success_count: number | null;
  failure_count: number | null;
}

export function useAgentOperations() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);

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
      throw error;
    }
  };

  const createAgent = async (formData: FormData, userId: string) => {
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
        status: 'inactive',
        auth_method: formData.authMethod,
        payload_format: formData.payloadFormat,
        communication_method: formData.communicationMethod,
        custom_headers: customHeaders,
        custom_config: customConfig,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        version: formData.version,
        user_id: userId
      };

      const { error } = await supabase
        .from('agents')
        .insert([newAgent]);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  };

  const testConnection = async (agentId: string) => {
    setTestingAgent(agentId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', agentId);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    } finally {
      setTestingAgent(null);
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
      throw error;
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  };

  return {
    agents,
    testingAgent,
    loadAgents,
    createAgent,
    testConnection,
    toggleAgentStatus,
    deleteAgent
  };
}
