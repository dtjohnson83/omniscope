import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, TrendingUp, Users, Calendar } from 'lucide-react';

interface SemanticInsight {
  id: string;
  insight_type: string;
  insight_description: string;
  insight_data: any;
  involved_agents: string[];
  confidence_score: number;
  created_at: string;
}

interface InsightStats {
  type: string;
  count: number;
  avgConfidence: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#fbbf24', '#34d399', '#f87171'];

export const InsightsDashboard: React.FC = () => {
  const [insights, setInsights] = useState<SemanticInsight[]>([]);
  const [insightStats, setInsightStats] = useState<InsightStats[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<SemanticInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSemanticInsights();
  }, []);

  const fetchSemanticInsights = async () => {
    try {
      setIsLoading(true);
      const { data: insightsData, error } = await supabase
        .from('semantic_insights')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInsights(insightsData || []);
      
      // Calculate insight type statistics
      const typeStats = (insightsData || []).reduce((acc, insight) => {
        const existing = acc.find(stat => stat.type === insight.insight_type);
        if (existing) {
          existing.count++;
          existing.avgConfidence = (existing.avgConfidence + (insight.confidence_score || 0)) / 2;
        } else {
          acc.push({
            type: insight.insight_type,
            count: 1,
            avgConfidence: insight.confidence_score || 0
          });
        }
        return acc;
      }, [] as InsightStats[]);

      setInsightStats(typeStats);
    } catch (error) {
      console.error('Error fetching semantic insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch semantic insights',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare timeline data for insights discovery
  const timelineData = insights
    .slice(0, 20)
    .reverse()
    .map((insight, index) => ({
      time: new Date(insight.created_at).toLocaleDateString(),
      count: index + 1,
      confidence: insight.confidence_score || 0
    }));

  // Calculate overall stats
  const stats = {
    total: insights.length,
    avgConfidence: insights.length > 0 
      ? insights.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / insights.length 
      : 0,
    uniqueTypes: insightStats.length,
    totalAgents: new Set(insights.flatMap(i => i.involved_agents || [])).size
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
          <h2 className="text-2xl font-bold">Semantic Insights</h2>
          <p className="text-muted-foreground">AI-generated insights from data analysis</p>
        </div>
        <Button onClick={fetchSemanticInsights} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Total Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence.toFixed(2)}</div>
            <Progress value={stats.avgConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Insight Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueTypes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Involved Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Insight Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={insightStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {insightStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insight Discovery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insight Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Insight Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insightStats.map((stat) => (
              <div key={stat.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{stat.type}</Badge>
                  <span className="text-sm font-medium">{stat.count} insights</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Confidence: {stat.avgConfidence.toFixed(2)}
                </div>
                <Progress value={stat.avgConfidence * 100} className="mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.slice(0, 5).map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{insight.insight_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Confidence: {insight.confidence_score?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{insight.insight_description}</p>
                    <div className="text-xs text-muted-foreground">
                      <p>Agents: {insight.involved_agents?.length || 0}</p>
                      <p>Created: {new Date(insight.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInsight(insight)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insight Details Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Insight Details</h3>
                <Button variant="outline" onClick={() => setSelectedInsight(null)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Badge className="mt-1">{selectedInsight.insight_type}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence Score</label>
                    <p className="text-sm mt-1">{selectedInsight.confidence_score?.toFixed(3) || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedInsight.insight_description}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Involved Agents</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedInsight.involved_agents?.map((agentId, index) => (
                      <Badge key={index} variant="outline">
                        {agentId.slice(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedInsight.insight_data && (
                  <div>
                    <label className="text-sm font-medium">Supporting Data</label>
                    <pre className="bg-muted p-3 rounded text-xs mt-1 overflow-auto max-h-40">
                      {JSON.stringify(selectedInsight.insight_data, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Generated At</label>
                  <p className="text-sm mt-1">{new Date(selectedInsight.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};