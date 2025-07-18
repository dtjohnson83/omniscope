import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, TrendingUp, Database } from 'lucide-react';

interface SemanticEntity {
  id: string;
  entity_type: string;
  entity_value: string;
  confidence_score: number;
  field_source: string;
  created_at: string;
  agent_data_id: string;
}

interface EntityStats {
  type: string;
  count: number;
  avgConfidence: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#fbbf24', '#34d399', '#f87171'];

export const SemanticEntitiesView: React.FC = () => {
  const [entities, setEntities] = useState<SemanticEntity[]>([]);
  const [entityStats, setEntityStats] = useState<EntityStats[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SemanticEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSemanticEntities();
  }, []);

  const fetchSemanticEntities = async () => {
    try {
      setIsLoading(true);
      const { data: entitiesData, error } = await supabase
        .from('semantic_entities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setEntities(entitiesData || []);
      
      // Calculate entity type statistics
      const typeStats = (entitiesData || []).reduce((acc, entity) => {
        const existing = acc.find(stat => stat.type === entity.entity_type);
        if (existing) {
          existing.count++;
          existing.avgConfidence = (existing.avgConfidence + entity.confidence_score) / 2;
        } else {
          acc.push({
            type: entity.entity_type,
            count: 1,
            avgConfidence: entity.confidence_score || 0
          });
        }
        return acc;
      }, [] as EntityStats[]);

      setEntityStats(typeStats);
    } catch (error) {
      console.error('Error fetching semantic entities:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch semantic entities',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceData = entities
    .filter(e => e.confidence_score)
    .reduce((acc, entity) => {
      const range = Math.floor(entity.confidence_score * 10) / 10;
      const key = `${range.toFixed(1)}-${(range + 0.1).toFixed(1)}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const confidenceChartData = Object.entries(confidenceData).map(([range, count]) => ({
    range,
    count
  }));

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
          <h2 className="text-2xl font-bold">Semantic Entities</h2>
          <p className="text-muted-foreground">Extracted entities and their analysis</p>
        </div>
        <Button onClick={fetchSemanticEntities} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Entity Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entityStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entities.length > 0 
                ? (entities.reduce((acc, e) => acc + (e.confidence_score || 0), 0) / entities.length).toFixed(2)
                : '0.00'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entity Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={entityStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {entityStats.map((entry, index) => (
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
            <CardTitle>Confidence Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={confidenceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Entity Type Details */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Types Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entityStats.map((stat) => (
              <div key={stat.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{stat.type}</Badge>
                  <span className="text-sm font-medium">{stat.count} entities</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Confidence: {stat.avgConfidence.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Entities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Entities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entities.slice(0, 10).map((entity) => (
              <div key={entity.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>{entity.entity_type}</Badge>
                      <span className="text-sm font-medium">{entity.entity_value}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Confidence: {entity.confidence_score?.toFixed(2) || 'N/A'}</p>
                      <p>Source: {entity.field_source || 'Unknown'}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entity Details Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Entity Details</h3>
                <Button variant="outline" onClick={() => setSelectedEntity(null)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Badge className="mt-1">{selectedEntity.entity_type}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Value</label>
                    <p className="text-sm mt-1">{selectedEntity.entity_value}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence Score</label>
                    <p className="text-sm mt-1">{selectedEntity.confidence_score?.toFixed(3) || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Field Source</label>
                    <p className="text-sm mt-1">{selectedEntity.field_source || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Extracted At</label>
                    <p className="text-sm mt-1">{new Date(selectedEntity.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Agent Data ID</label>
                    <p className="text-sm mt-1 font-mono text-xs">{selectedEntity.agent_data_id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};