import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Network, TrendingUp, Link, Filter } from 'lucide-react';

interface Correlation {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  correlation_type: string;
  correlation_strength: number;
  correlation_data: any;
  discovered_at: string;
}

interface AgentNode {
  id: string;
  name: string;
  data_count: number;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const CorrelationAnalyzer: React.FC = () => {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [selectedCorrelationType, setSelectedCorrelationType] = useState<string>('all');
  const [minStrength, setMinStrength] = useState<number>(0.3);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { toast } = useToast();

  useEffect(() => {
    fetchCorrelations();
    fetchAgents();
  }, []);

  useEffect(() => {
    generateNetworkGraph();
  }, [correlations, agents, selectedCorrelationType, minStrength]);

  const fetchCorrelations = async () => {
    try {
      const { data, error } = await supabase
        .from('data_correlations')
        .select('*')
        .order('correlation_strength', { ascending: false });

      if (error) throw error;
      setCorrelations(data || []);
    } catch (error) {
      console.error('Error fetching correlations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch correlations',
        variant: 'destructive'
      });
    }
  };

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('api_agents')
        .select('id, name');

      if (error) throw error;

      // Get data count for each agent
      const agentsWithCounts = await Promise.all(
        (data || []).map(async (agent) => {
          const { count } = await supabase
            .from('agent_data')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);

          return {
            id: agent.id,
            name: agent.name,
            data_count: count || 0
          };
        })
      );

      setAgents(agentsWithCounts);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agents',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNetworkGraph = useCallback(() => {
    const filteredCorrelations = correlations.filter(corr => 
      (selectedCorrelationType === 'all' || corr.correlation_type === selectedCorrelationType) &&
      corr.correlation_strength >= minStrength
    );

    // Create nodes from agents that have correlations
    const agentIds = new Set([
      ...filteredCorrelations.map(c => c.source_agent_id),
      ...filteredCorrelations.map(c => c.target_agent_id)
    ]);

    const graphNodes: Node[] = Array.from(agentIds).map((agentId, index) => {
      const agent = agents.find(a => a.id === agentId);
      const angle = (index / agentIds.size) * 2 * Math.PI;
      const radius = 200;
      
      return {
        id: agentId,
        position: { 
          x: 300 + Math.cos(angle) * radius, 
          y: 200 + Math.sin(angle) * radius 
        },
        data: { 
          label: agent?.name || `Agent ${agentId.slice(0, 8)}`,
          dataCount: agent?.data_count || 0
        },
        style: {
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px',
          padding: '10px',
          fontSize: '12px',
          width: 'auto',
          height: 'auto'
        }
      };
    });

    const graphEdges: Edge[] = filteredCorrelations.map((corr, index) => ({
      id: `${corr.source_agent_id}-${corr.target_agent_id}-${index}`,
      source: corr.source_agent_id,
      target: corr.target_agent_id,
      label: `${corr.correlation_type} (${corr.correlation_strength.toFixed(2)})`,
      style: {
        strokeWidth: Math.max(1, corr.correlation_strength * 5),
        stroke: corr.correlation_strength > 0.7 ? '#22c55e' : 
               corr.correlation_strength > 0.5 ? '#eab308' : '#ef4444'
      },
      animated: corr.correlation_strength > 0.7
    }));

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [correlations, agents, selectedCorrelationType, minStrength, setNodes, setEdges]);

  const correlationTypes = [...new Set(correlations.map(c => c.correlation_type))];

  const stats = {
    total: correlations.length,
    strong: correlations.filter(c => c.correlation_strength > 0.7).length,
    medium: correlations.filter(c => c.correlation_strength > 0.5 && c.correlation_strength <= 0.7).length,
    weak: correlations.filter(c => c.correlation_strength <= 0.5).length
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Correlation Analysis</h2>
          <p className="text-muted-foreground">Cross-agent data relationships and patterns</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCorrelations} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Total Correlations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Strong (&gt;0.7)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.strong}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link className="h-4 w-4 text-yellow-500" />
              Medium (0.5-0.7)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4 text-red-500" />
              Weak (&lt;0.5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.weak}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Network Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium mb-2 block">Correlation Type</label>
              <Select value={selectedCorrelationType} onValueChange={setSelectedCorrelationType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {correlationTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Min Strength: {minStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={minStrength}
                onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: '500px' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="top-right"
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Correlations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {correlations.slice(0, 10).map((correlation) => {
              const sourceAgent = agents.find(a => a.id === correlation.source_agent_id);
              const targetAgent = agents.find(a => a.id === correlation.target_agent_id);
              
              return (
                <div key={correlation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={correlation.correlation_strength > 0.7 ? 'default' : 
                                      correlation.correlation_strength > 0.5 ? 'secondary' : 'outline'}>
                          {correlation.correlation_type}
                        </Badge>
                        <span className="text-sm font-medium">
                          Strength: {correlation.correlation_strength.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          <strong>From:</strong> {sourceAgent?.name || correlation.source_agent_id.slice(0, 8)}
                          {' → '}
                          <strong>To:</strong> {targetAgent?.name || correlation.target_agent_id.slice(0, 8)}
                        </p>
                        <p>Discovered: {new Date(correlation.discovered_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};