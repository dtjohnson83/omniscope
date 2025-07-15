
import { supabase } from '@/integrations/supabase/client';
import type { AgentExecution, AgentDataStorage } from './types';
import { processAgentResponse } from './dataProcessor';

export class AgentExecutionService {
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
        processed_data: processAgentResponse(responseData, agent),
        status: 'success',
        response_time_ms: responseTime,
        response_size_bytes: responseSize
      });

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

      return {
        agent_id: agent.id,
        success: false,
        error_message: errorMessage,
        response_time_ms: responseTime,
        response_size_bytes: 0
      };
    }
  }

  private async storeAgentData(agent: any, data: AgentDataStorage): Promise<void> {
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
}
