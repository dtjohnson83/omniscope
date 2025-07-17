
import { supabase } from '@/integrations/supabase/client';

export class AgentStatsService {
  async updateAgentStats(agentId: string, success: boolean, responseTime: number): Promise<void> {
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
}
