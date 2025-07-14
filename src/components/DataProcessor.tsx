import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, BarChart3, PieChart, TrendingUp, Volume2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navigation from './Navigation';

interface DataItem {
  [key: string]: any;
}

interface ChartData {
  name: string;
  value: number;
}

interface Agent {
  id: string;
  name: string;
  data_types: string[];
  status: string;
  webhook_url: string;
  category: string;
  description: string;
}

interface AgentData {
  id: string;
  agent_id: string;
  processed_data: any;
  collected_at: string;
  status: string;
  agents: Agent;
}

const sampleData = [
  { name: 'Jan', value: 400, sales: 240, profit: 160 },
  { name: 'Feb', value: 300, sales: 456, profit: 180 },
  { name: 'Mar', value: 200, sales: 320, profit: 120 },
  { name: 'Apr', value: 278, sales: 280, profit: 200 },
  { name: 'May', value: 189, sales: 190, profit: 140 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DataProcessor() {
  const [jsonData, setJsonData] = useState('');
  const [parsedData, setParsedData] = useState<DataItem[]>([]);
  const [summary, setSummary] = useState('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Agent-related state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingAgentData, setLoadingAgentData] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'manual' | 'agent'>('manual');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadAgents();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('Failed to load agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadAgentData = async (agentId: string) => {
    setLoadingAgentData(true);
    try {
      const { data, error } = await supabase
        .from('agent_data')
        .select(`
          *,
          agents(id, name, data_types, status, webhook_url, category, description)
        `)
        .eq('agent_id', agentId)
        .order('collected_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAgentData(data || []);
    } catch (error) {
      console.error('Error loading agent data:', error);
      setError('Failed to load agent data');
    } finally {
      setLoadingAgentData(false);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    if (agentId) {
      loadAgentData(agentId);
    } else {
      setAgentData([]);
    }
  };

  const processAgentData = (agentDataItem: AgentData) => {
    try {
      const data = agentDataItem.processed_data;
      let processedArray: DataItem[] = [];
      
      // Convert agent data to array format for processing
      if (Array.isArray(data)) {
        processedArray = data;
      } else if (typeof data === 'object' && data !== null) {
        processedArray = [data];
      } else {
        processedArray = [{ value: data, name: 'Data Point' }];
      }

      setParsedData(processedArray);
      setJsonData(JSON.stringify(data, null, 2));
      generateSummary(processedArray, agentDataItem.agents);
      generateChartData(processedArray);
      setError('');
    } catch (error) {
      console.error('Error processing agent data:', error);
      setError('Failed to process agent data');
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setJsonData(content);
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setParsedData(parsed);
            generateSummary(parsed);
            generateChartData(parsed);
            setError('');
          } else {
            setError('Data must be an array of objects');
          }
        } catch (error) {
          setError('Invalid JSON format');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleJsonInput = () => {
    if (!jsonData.trim()) {
      setError('Please enter JSON data');
      return;
    }

    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed)) {
        setParsedData(parsed);
        generateSummary(parsed);
        generateChartData(parsed);
        setError('');
      } else {
        setError('Data must be an array of objects');
      }
    } catch (error) {
      setError('Invalid JSON format');
    }
  };

  const generateSummary = (data: DataItem[], agent?: Agent) => {
    setIsProcessing(true);
    setTimeout(() => {
      const totalRecords = data.length;
      const fields = data.length > 0 ? Object.keys(data[0]) : [];
      const numericFields = fields.filter(field => 
        data.some(item => typeof item[field] === 'number')
      );
      
      let summaryText = '';
      
      if (agent) {
        summaryText += `Data from agent: ${agent.name}\n`;
        summaryText += `Agent category: ${agent.category}\n`;
        summaryText += `Data types: ${agent.data_types.join(', ')}\n\n`;
      }
      
      summaryText += `Dataset contains ${totalRecords} records with ${fields.length} fields.\n`;
      summaryText += `Fields: ${fields.join(', ')}\n`;
      
      if (numericFields.length > 0) {
        summaryText += `\nNumeric analysis:\n`;
        numericFields.forEach(field => {
          const values = data.map(item => item[field]).filter(val => typeof val === 'number');
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            summaryText += `- ${field}: Average = ${avg.toFixed(2)}, Total = ${sum}, Min = ${min}, Max = ${max}\n`;
          }
        });
      }
      
      if (agent) {
        summaryText += `\nData collected at: ${new Date().toLocaleString()}\n`;
        summaryText += `Agent status: ${agent.status}\n`;
      }
      
      setSummary(summaryText);
      setIsProcessing(false);
    }, 1500);
  };

  const generateChartData = (data: DataItem[]) => {
    if (data.length === 0) return;
    
    const firstItem = data[0];
    const numericFields = Object.keys(firstItem).filter(key => 
      typeof firstItem[key] === 'number'
    );
    
    if (numericFields.length > 0) {
      const chartData = data.slice(0, 10).map((item, index) => ({
        name: item.name || item.label || item.timestamp || `Item ${index + 1}`,
        value: item[numericFields[0]] || 0
      }));
      setChartData(chartData);
    }
  };

  const speakSummary = () => {
    if ('speechSynthesis' in window && summary) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    } else {
      setError('Speech synthesis not supported in this browser');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const loadSampleData = () => {
    const sampleJson = JSON.stringify(sampleData, null, 2);
    setJsonData(sampleJson);
    setParsedData(sampleData);
    generateSummary(sampleData);
    generateChartData(sampleData);
    setError('');
  };

  const downloadResults = () => {
    const results = {
      originalData: parsedData,
      summary: summary,
      chartData: chartData,
      dataSource: dataSource,
      agent: selectedAgent ? agents.find(a => a.id === selectedAgent) : null,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-analysis-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-600">Universal Data Processor</h1>
          <p className="text-gray-600">Process data from your agents or upload/analyze your own data with AI-powered insights</p>
        </div>

        {/* Data Source Selection */}
        <div className="flex justify-center space-x-4">
          <Button
            variant={dataSource === 'manual' ? 'default' : 'outline'}
            onClick={() => setDataSource('manual')}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Manual Data
          </Button>
          <Button
            variant={dataSource === 'agent' ? 'default' : 'outline'}
            onClick={() => setDataSource('agent')}
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            Agent Data
          </Button>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {error}
            </AlertDescription>
          </Alert>
        )}

        {dataSource === 'agent' && user && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Select Agent Data Source
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAgents}
                    disabled={loadingAgents}
                    className="ml-auto"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingAgents ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Choose Agent</Label>
                  <Select value={selectedAgent} onValueChange={handleAgentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent to process data from" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{agent.category}</Badge>
                            {agent.name} - {agent.data_types.join(', ')}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {agents.length === 0 && !loadingAgents && (
                  <Alert>
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                      No active agents found. Please register and activate agents first.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedAgent && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Recent Data from Agent</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadAgentData(selectedAgent)}
                        disabled={loadingAgentData}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingAgentData ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                    
                    {loadingAgentData ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading agent data...</p>
                      </div>
                    ) : agentData.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No data available from this agent yet.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {agentData.map((dataItem) => (
                          <div key={dataItem.id} className="border rounded-lg p-3 bg-white">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm text-gray-600">
                                  {new Date(dataItem.collected_at).toLocaleString()}
                                </div>
                                <div className="text-sm mt-1">
                                  <Badge variant={dataItem.status === 'success' ? 'default' : 'destructive'}>
                                    {dataItem.status}
                                  </Badge>
                                  <span className="ml-2">
                                    Size: {JSON.stringify(dataItem.processed_data).length} bytes
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => processAgentData(dataItem)}
                              >
                                Process
                              </Button>
                            </div>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                                View Raw Data
                              </summary>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                                {JSON.stringify(dataItem.processed_data, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {dataSource === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Data Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload JSON File</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                </div>
                
                <div className="text-center">
                  <span className="text-sm text-gray-500">or</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Paste JSON Data</Label>
                  <Textarea
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    placeholder='[{"name": "Item 1", "value": 100}, {"name": "Item 2", "value": 200}]'
                    rows={8}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleJsonInput} className="flex-1">
                    Process Data
                  </Button>
                  <Button variant="outline" onClick={loadSampleData}>
                    Load Sample
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Summary
                  {summary && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={isSpeaking ? stopSpeaking : speakSummary}
                        disabled={!summary}
                      >
                        <Volume2 className="h-4 w-4" />
                        {isSpeaking ? 'Stop' : 'Speak'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={downloadResults}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Analyzing data...</p>
                    </div>
                  </div>
                ) : summary ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {dataSource === 'manual' ? 'Upload or paste data to see AI-generated summary' : 'Select an agent and process data to see AI-generated summary'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show summary for agent data source */}
        {dataSource === 'agent' && summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Summary
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={isSpeaking ? stopSpeaking : speakSummary}
                    disabled={!summary}
                  >
                    <Volume2 className="h-4 w-4" />
                    {isSpeaking ? 'Stop' : 'Speak'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadResults}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Analyzing data...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bar" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bar" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar Chart
                  </TabsTrigger>
                  <TabsTrigger value="pie" className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Pie Chart
                  </TabsTrigger>
                  <TabsTrigger value="line" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Line Chart
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bar">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="pie">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="line">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {!user && dataSource === 'agent' && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Please sign in to access agent data</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
