import { supabase } from './supabase';

export interface AgentExecution {
  agent_id: string;
  success: boolean;
  response_data?: any;
  error_message?: string;
  response_time_ms: number;
  response_size_bytes: number;
}

export class AgentRunner {
  private isRunning = false;

  async startScheduler(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🤖 Agent Runner started');
    
    this.executeScheduledAgents();
    setInterval(() => {
      this.executeScheduledAgents();
    }, 60000);
  }

  private async executeScheduledAgents(): Promise<void> {
    try {
      const now = new Date();
      
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('schedule_enabled', true)
        .or(`next_execution.is.null,next_execution.lte.${now.toISOString()}`);

      if (error) {
        console.error('Error fetching scheduled agents:', error);
        return;
      }

      if (agents && agents.length > 0) {
        console.log(`📋 Found ${agents.length} agents to execute`);
        
        for (const agent of agents) {
          await this.executeAgent(agent);
        }
      }
    } catch (error) {
      console.error('Error in executeScheduledAgents:', error);
    }
  }

  async executeAgent(agent: any): Promise<AgentExecution> {
    const startTime = Date.now();
    console.log(`🏃 Executing agent: ${agent.name}`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Omniscope-Agent-Runner/1.0'
      };

      if (agent.auth_method === 'api_key' && agent.api_key) {
        headers['Authorization'] = `Bearer ${agent.api_key}`;
      } else if (agent.auth_method === 'bearer_token' && agent.api_key) {
        headers['Authorization'] = `Bearer ${agent.api_key}`;
      }

      if (agent.custom_headers) {
        Object.assign(headers, agent.custom_headers);
      }

      const response = await fetch(agent.webhook_url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(30000)
      });

      const responseText = await response.text();
      const responseData = response.headers.get('content-type')?.includes('application/json') 
        ? JSON.parse(responseText) 
        : responseText;

      const responseTime = Date.now() - startTime;
      const responseSize = new Blob([responseText]).size;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.storeAgentData(agent, {
        raw_response: responseData,
        processed_data: this.processResponse(responseData, agent),
        status: 'success',
        response_time_ms: responseTime,
        response_size_bytes: responseSize
      });

      await this.updateAgentStats(agent.id, true, responseTime);

      console.log(`✅ Agent ${agent.name} executed successfully (${responseTime}ms)`);

      return {
        agent_id: agent.id,
        success: true,
        response_data: responseData,
        response_time_ms: responseTime,
        response_size_bytes: responseSize
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Agent ${agent.name} failed:`, errorMessage);

      await this.storeAgentData(agent, {
        status: 'error',
        error_message: errorMessage,
        response_time_ms: responseTime,
        response_size_bytes: 0
      });

      await this.updateAgentStats(agent.id, false, responseTime);

      return {
        agent_id: agent.id,
        success: false,
        error_message: errorMessage,
        response_time_ms: responseTime,
        response_size_bytes: 0
      };
    }
  }

  private async storeAgentData(agent: any, data: {
    raw_response?: any;
    processed_data?: any;
    status: string;
    error_message?: string;
    response_time_ms: number;
    response_size_bytes: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('agent_data')
      .insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        ...data
      });

    if (error) {
      console.error('Error storing agent data:', error);
    }
  }

  private async updateAgentStats(agentId: string, success: boolean, responseTime: number): Promise<void> {
    const now = new Date();
    
    const { data: agent } = await supabase
      .from('agents')
      .select('schedule_frequency')
      .eq('id', agentId)
      .single();

    const nextExecution = new Date(now.getTime() + (agent?.schedule_frequency || 60) * 60000);

    // First, get current counts
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('execution_count, success_count, failure_count')
      .eq('id', agentId)
      .single();

    const updateData: any = {
      last_execution: now.toISOString(),
      next_execution: nextExecution.toISOString(),
      execution_count: (currentAgent?.execution_count || 0) + 1
    };

    if (success) {
      updateData.success_count = (currentAgent?.success_count || 0) + 1;
    } else {
      updateData.failure_count = (currentAgent?.failure_count || 0) + 1;
    }

    const { error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId);

    if (error) {
      console.error('Error updating agent stats:', error);
    }
  }

  private processResponse(rawResponse: any, agent: any): any {
    try {
      const processed: any = {
        timestamp: new Date().toISOString(),
        agent_name: agent.name,
        data_types: agent.data_types || []
      };

      if (typeof rawResponse === 'object' && rawResponse !== null) {
        const numericFields = this.extractNumericFields(rawResponse);
        if (Object.keys(numericFields).length > 0) {
          processed.metrics = numericFields;
        }

        const textFields = this.extractTextFields(rawResponse);
        if (Object.keys(textFields).length > 0) {
          processed.content = textFields;
        }

        processed.response_structure = this.analyzeStructure(rawResponse);
      }

      return processed;
    } catch (error) {
      console.error('Error processing response:', error);
      return { error: 'Failed to process response', raw: rawResponse };
    }
  }

  private extractNumericFields(obj: any, prefix = ''): Record<string, number> {
    const numeric: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'number') {
        numeric[fieldName] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(numeric, this.extractNumericFields(value, fieldName));
      }
    }
    
    return numeric;
  }

  private extractTextFields(obj: any, prefix = ''): Record<string, string> {
    const textFields: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string' && value.length > 0) {
        textFields[fieldName] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(textFields, this.extractTextFields(value, fieldName));
      }
    }
    
    return textFields;
  }

  private analyzeStructure(obj: any): any {
    return {
      type: Array.isArray(obj) ? 'array' : typeof obj,
      keys: typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
      array_length: Array.isArray(obj) ? obj.length : undefined
    };
  }

  async executeAgentNow(agentId: string): Promise<AgentExecution> {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return this.executeAgent(agent);
  }
}

export const agentRunner = new AgentRunner();
