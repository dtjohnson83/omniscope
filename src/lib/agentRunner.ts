
import { supabase } from '@/integrations/supabase/client';
import { AgentExecutionService } from './agent/executionService';
import { AgentSchedulerService } from './agent/schedulerService';
import { AgentStatsService } from './agent/statsService';
import type { AgentExecution } from './agent/types';

export type { AgentExecution } from './agent/types';

export class AgentRunner {
  private isRunning = false;
  private executionService = new AgentExecutionService();
  private schedulerService = new AgentSchedulerService();
  private statsService = new AgentStatsService();

  async startScheduler(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🤖 Agent Runner started');
    
    this.schedulerService.executeScheduledAgents();
    setInterval(() => {
      this.schedulerService.executeScheduledAgents();
    }, 60000);
  }

  async executeAgent(agent: any): Promise<AgentExecution> {
    const result = await this.executionService.executeAgent(agent);
    await this.statsService.updateAgentStats(agent.id, result.success, result.response_time_ms);
    return result;
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
