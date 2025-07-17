import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Database, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AgentDataProcessor } from '@/lib/agent/dataProcessor';
import { SemanticProcessor } from '@/lib/semanticProcessor';

interface ProcessedData {
  id: string;
  agent_id: string;
  raw_response: any;
  processed_data: any;
  status: string;
  collected_at: string;
  response_time_ms: number;
  semantic_metadata?: any;
}

const DataProcessor: React.FC = () => {
  const [data, setData] = useState<ProcessedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedData, setSelectedData] = useState<ProcessedData | null>(null);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    errors: 0,
    avgResponseTime: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProcessedData();
    const interval = setInterval(fetchProcessedData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchProcessedData = async () => {
    try {
      const { data: agentData, error } = await supabase
        .from('agent_data')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setData(agentData || []);
      
      // Calculate processing stats
      const total = agentData?.length || 0;
      const processed = agentData?.filter(d => d.status === 'success').length || 0;
      const errors = agentData?.filter(d => d.status === 'error').length || 0;
      const avgResponseTime = agentData?.reduce((acc, d) => acc + (d.response_time_ms || 0), 0) / total || 0;
      
      setProcessingStats({ total, processed, errors, avgResponseTime });
    } catch (error) {
      console.error('Error fetching processed data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch processed data',
        variant: 'destructive'
      });
    }
  };

  const reprocessData = async (dataId: string) => {
    setIsLoading(true);
    try {
      const dataItem = data.find(d => d.id === dataId);
      if (!dataItem) throw new Error('Data item not found');

      const processor = new AgentDataProcessor();
      const semanticProcessor = new SemanticProcessor();
      
      // Reprocess the data
      const processedResult = processor.processResponse(dataItem.raw_response, []);
      const semanticData = await semanticProcessor.extractSemanticData(processedResult);
      
      // Update in database - cast semantic data to Json type
      const { error } = await supabase
        .from('agent_data')
        .update({
          processed_data: processedResult,
          semantic_metadata: semanticData as any
        })
        .eq('id', dataId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Data reprocessed successfully'
      });

      fetchProcessedData();
    } catch (error) {
      console.error('Error reprocessing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to reprocess data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Chart data preparation
  const chartData = data.slice(0, 20).reverse().map((item, index) => ({
    time: new Date(item.collected_at).toLocaleTimeString(),
    responseTime: item.response_time_ms || 0,
    status: item.status === 'success' ? 1 : 0
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Processor</h1>
          <p className="text-gray-600 mt-2">Monitor and analyze collected agent data</p>
        </div>
        <Button onClick={fetchProcessedData} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{processingStats.processed}</div>
            <Progress 
              value={(processingStats.processed / processingStats.total) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{processingStats.errors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(processingStats.avgResponseTime)}ms</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Processed Data</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(item.collected_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p><strong>Agent ID:</strong> {item.agent_id}</p>
                          <p><strong>Response Time:</strong> {item.response_time_ms}ms</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedData(item)}
                        >
                          View Details
                        </Button>
                        {item.status === 'error' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reprocessData(item.id)}
                            disabled={isLoading}
                          >
                            Reprocess
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="status" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Details Modal */}
      {selectedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Data Processing Details</h2>
                <Button variant="outline" onClick={() => setSelectedData(null)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedData.status)}
                      <Badge className={getStatusColor(selectedData.status)}>
                        {selectedData.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Collected At</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedData.collected_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Response Time</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedData.response_time_ms}ms</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Agent ID</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedData.agent_id}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Raw Response</label>
                  <pre className="bg-gray-100 p-3 rounded text-xs mt-1 overflow-auto max-h-40">
                    {JSON.stringify(selectedData.raw_response, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-sm font-medium">Processed Data</label>
                  <pre className="bg-gray-100 p-3 rounded text-xs mt-1 overflow-auto max-h-40">
                    {JSON.stringify(selectedData.processed_data, null, 2)}
                  </pre>
                </div>

                {selectedData.semantic_metadata && (
                  <div>
                    <label className="text-sm font-medium">Semantic Metadata</label>
                    <pre className="bg-gray-100 p-3 rounded text-xs mt-1 overflow-auto max-h-40">
                      {JSON.stringify(selectedData.semantic_metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataProcessor;
