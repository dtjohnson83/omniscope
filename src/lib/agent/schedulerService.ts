
import { supabase } from '@/integrations/supabase/client';
import { AgentExecutionService } from './executionService';
import { AgentStatsService } from './statsService';

export class AgentSchedulerService {
  private executionService = new AgentExecutionService();
  private statsService = new AgentStatsService();

  async executeScheduledAgents(): Promise<void> {
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
          const result = await this.executionService.executeAgent(agent);
          await this.statsService.updateAgentStats(agent.id, result.success, result.response_time_ms);
        }
      }
    } catch (error) {
      console.error('Error in executeScheduledAgents:', error);
    }
  }
}
