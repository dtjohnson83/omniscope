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
  
  // Context-aware display state
  const [displayContext, setDisplayContext] = useState<'dashboard' | 'mobile' | 'meeting' | 'ambient'>('dashboard');

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
      
      // Context-aware summary formatting
      if (displayContext === 'mobile') {
        summaryText += `📱 Mobile Summary:\n${totalRecords} records, ${fields.length} fields\n`;
        if (numericFields.length > 0) {
          const firstField = numericFields[0];
          const values = data.map(item => item[firstField]).filter(val => typeof val === 'number');
          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            summaryText += `Key metric (${firstField}): ${avg.toFixed(1)} avg\n`;
          }
        }
      } else if (displayContext === 'meeting') {
        summaryText += `🏢 Meeting Brief:\n`;
        summaryText += `Dataset: ${totalRecords} records analyzed\n`;
        if (numericFields.length > 0) {
          summaryText += `Key insights:\n`;
          numericFields.slice(0, 2).forEach(field => {
            const values = data.map(item => item[field]).filter(val => typeof val === 'number');
            if (values.length > 0) {
              const sum = values.reduce((a, b) => a + b, 0);
              const avg = sum / values.length;
              summaryText += `• ${field}: ${avg.toFixed(2)} average, ${sum} total\n`;
            }
          });
        }
      } else if (displayContext === 'ambient') {
        summaryText += `🌐 Quick Glance:\n`;
        if (numericFields.length > 0) {
          const firstField = numericFields[0];
          const values = data.map(item => item[firstField]).filter(val => typeof val === 'number');
          if (values.length > 0) {
            const latest = values[0];
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            summaryText += `${firstField}: ${latest} (avg: ${avg.toFixed(1)})\n`;
          }
        }
        summaryText += `${totalRecords} data points\n`;
      } else {
        // Dashboard mode - full detail
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
      }
      
      if (agent && displayContext === 'dashboard') {
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
      displayContext: displayContext,
      agent: selectedAgent ? agents.find(a => a.id === selectedAgent) : null,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-analysis-results-${displayContext}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateQRCode = () => {
    const exportData = {
      summary: summary,
      chartData: chartData,
      context: displayContext,
      timestamp: new Date().toISOString()
    };
    
    const dataUrl = `data:application/json;base64,${btoa(JSON.stringify(exportData))}`;
    const qrData = `${window.location.origin}/view-data?data=${encodeURIComponent(dataUrl)}`;
    
    // Create QR code URL (using a free QR service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    // Open QR code in new window
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>QR Code - Share Data</title></head>
          <body style="display: flex; flex-direction: column; align-items: center; padding: 20px; font-family: sans-serif;">
            <h2>📱 Scan to View Data on Mobile</h2>
            <img src="${qrCodeUrl}" alt="QR Code" style="border: 1px solid #ddd; padding: 10px;">
            <p style="text-align: center; color: #666; margin-top: 20px;">
              Scan this QR code with your phone to view the processed data<br>
              Context: ${displayContext} mode
            </p>
          </body>
        </html>
      `);
    }
  };

  const sendToAmbientDisplay = () => {
    const ambientData = {
      type: 'data_visualization',
      context: 'ambient',
      summary: summary,
      chartData: chartData.slice(0, 5), // Limit for ambient display
      timestamp: new Date().toISOString(),
      displayDuration: 30 // seconds
    };

    // Simulate API call to ambient display
    console.log('Sending to ambient display:', ambientData);
    
    // Show success message
    alert(`📺 Data sent to ambient display!\n\nSummary: ${summary.slice(0, 100)}...\nDisplay duration: 30 seconds`);
  };

  const generateVoiceScript = () => {
    let voiceScript = summary;
    
    // Optimize for voice based on context
    if (displayContext === 'ambient') {
      const lines = summary.split('\n').filter(line => line.trim());
      voiceScript = lines.slice(0, 2).join('. ') + '.';
    } else if (displayContext === 'mobile') {
      voiceScript = summary.replace(/\n/g, '. ').replace(/\.\./g, '.');
    }
    
    const blob = new Blob([voiceScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-script-${displayContext}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateAPIEndpoint = () => {
    const apiData = {
      endpoint: `${window.location.origin}/api/data/${btoa(JSON.stringify({
        summary: summary,
        chartData: chartData,
        context: displayContext,
        timestamp: new Date().toISOString()
      }))}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Display-Context': displayContext
      },
      description: `API endpoint for ${displayContext} formatted data`
    };

    const blob = new Blob([JSON.stringify(apiData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-endpoint-${displayContext}.json`;
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

        {/* Context-Aware Display Controls */}
        {parsedData.length > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <h3 className="font-semibold text-purple-800">🖥️ Display Context</h3>
                <p className="text-sm text-purple-700">
                  Choose how to format this data for different environments
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant={displayContext === 'dashboard' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDisplayContext('dashboard');
                      if (parsedData.length > 0) generateSummary(parsedData);
                    }}
                    className="flex items-center gap-1"
                  >
                    🖥️ Dashboard
                  </Button>
                  <Button
                    variant={displayContext === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDisplayContext('mobile');
                      if (parsedData.length > 0) generateSummary(parsedData);
                    }}
                    className="flex items-center gap-1"
                  >
                    📱 Mobile
                  </Button>
                  <Button
                    variant={displayContext === 'meeting' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDisplayContext('meeting');
                      if (parsedData.length > 0) generateSummary(parsedData);
                    }}
                    className="flex items-center gap-1"
                  >
                    🏢 Meeting
                  </Button>
                  <Button
                    variant={displayContext === 'ambient' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDisplayContext('ambient');
                      if (parsedData.length > 0) generateSummary(parsedData);
                    }}
                    className="flex items-center gap-1"
                  >
                    🌐 Ambient
                  </Button>
                </div>
                <div className="text-xs text-purple-600">
                  {displayContext === 'dashboard' && '• Full detailed analysis with all metrics'}
                  {displayContext === 'mobile' && '• Condensed view optimized for small screens'}
                  {displayContext === 'meeting' && '• Key insights formatted for presentations'}
                  {displayContext === 'ambient' && '• Minimal glanceable information'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {error}
            </AlertDescription>
          </Alert>
        )}

        {dataSource === 'agent' && user && (
          <div className="space-y-4">
            {/* Quick Start Guide for Agent Data */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-green-800">🤖 Agent Data Processing</h3>
                  <p className="text-sm text-green-700">
                    1. Select an agent → 2. Choose data to analyze → 3. Click "Analyze & Visualize" → 4. Get AI insights + charts
                  </p>
                </div>
              </CardContent>
            </Card>
            
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
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">📋 How to use:</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Click "Analyze & Visualize" on any data item below to generate text summary, voice output, and interactive charts
                          </p>
                        </div>
                        
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {agentData.map((dataItem) => (
                            <div key={dataItem.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={dataItem.status === 'success' ? 'default' : 'destructive'}>
                                      {dataItem.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(dataItem.collected_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Data size: {JSON.stringify(dataItem.processed_data).length} bytes
                                  </div>
                                  
                                  {/* Quick data preview */}
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    <strong>Preview:</strong> {JSON.stringify(dataItem.processed_data).slice(0, 100)}...
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => processAgentData(dataItem)}
                                  className="flex-1"
                                >
                                  🔍 Analyze & Visualize
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setJsonData(JSON.stringify(dataItem.processed_data, null, 2));
                                    setDataSource('manual');
                                  }}
                                >
                                  📝 Edit
                                </Button>
                              </div>
                              
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                                  👁️ View Complete Raw Data
                                </summary>
                                <pre className="text-xs bg-gray-50 p-3 rounded mt-2 overflow-auto max-h-40 border">
                                  {JSON.stringify(dataItem.processed_data, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ))}
                        </div>
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
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                      ✅ Analysis Complete!
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Your agent data has been processed. Use the actions below to interact with your results.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Export to Different Surfaces - Only show once */}
        {parsedData.length > 0 && summary && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                📤 Export & Actions
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={isSpeaking ? stopSpeaking : speakSummary}
                    disabled={!summary}
                    className="bg-white"
                  >
                    <Volume2 className="h-4 w-4" />
                    {isSpeaking ? 'Stop' : 'Speak'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadResults} className="bg-white">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  Send your processed data to different devices and environments:
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateQRCode}
                    className="flex items-center gap-1 h-auto py-2 bg-white"
                  >
                    <span className="text-lg">📱</span>
                    <div className="text-left">
                      <div className="text-xs font-medium">Mobile</div>
                      <div className="text-xs text-gray-500">QR Code</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendToAmbientDisplay}
                    className="flex items-center gap-1 h-auto py-2 bg-white"
                  >
                    <span className="text-lg">🖥️</span>
                    <div className="text-left">
                      <div className="text-xs font-medium">Smart Display</div>
                      <div className="text-xs text-gray-500">Ambient</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateVoiceScript}
                    className="flex items-center gap-1 h-auto py-2 bg-white"
                  >
                    <span className="text-lg">🎤</span>
                    <div className="text-left">
                      <div className="text-xs font-medium">Voice Assistant</div>
                      <div className="text-xs text-gray-500">Script</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAPIEndpoint}
                    className="flex items-center gap-1 h-auto py-2 bg-white"
                  >
                    <span className="text-lg">🔗</span>
                    <div className="text-left">
                      <div className="text-xs font-medium">API Endpoint</div>
                      <div className="text-xs text-gray-500">JSON</div>
                    </div>
                  </Button>
                </div>
                
                <div className="text-xs text-green-600 space-y-1">
                  <div>📱 <strong>Mobile:</strong> Generates QR code for instant phone access</div>
                  <div>🖥️ <strong>Smart Display:</strong> Sends data to ambient displays (30s duration)</div>
                  <div>🎤 <strong>Voice Assistant:</strong> Downloads optimized voice script</div>
                  <div>🔗 <strong>API:</strong> Creates endpoint for AR/VR or custom integrations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Data Visualization
                <Badge variant="outline" className="ml-auto">
                  {parsedData.length} records • {displayContext} mode
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  🎯 {displayContext === 'dashboard' && 'Full dashboard view with interactive charts'}
                  {displayContext === 'mobile' && 'Mobile-optimized compact visualization'}
                  {displayContext === 'meeting' && 'Presentation-ready charts for meetings'}
                  {displayContext === 'ambient' && 'Simplified glanceable visualization'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Switch between chart types below. Hover over charts for detailed values.
                </p>
              </div>
              
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
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">📊 Bar chart showing comparative values</p>
                    <ResponsiveContainer 
                      width="100%" 
                      height={
                        displayContext === 'mobile' ? 200 :
                        displayContext === 'ambient' ? 150 :
                        displayContext === 'meeting' ? 350 : 300
                      }
                    >
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={displayContext === 'mobile' || displayContext === 'ambient' ? 10 : 12}
                        />
                        <YAxis fontSize={displayContext === 'mobile' || displayContext === 'ambient' ? 10 : 12} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="pie">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">🥧 Pie chart showing proportional distribution</p>
                    <ResponsiveContainer 
                      width="100%" 
                      height={
                        displayContext === 'mobile' ? 200 :
                        displayContext === 'ambient' ? 150 :
                        displayContext === 'meeting' ? 350 : 300
                      }
                    >
                      <RechartsPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={
                            displayContext === 'mobile' ? 60 :
                            displayContext === 'ambient' ? 50 :
                            displayContext === 'meeting' ? 100 : 80
                          }
                          fill="#8884d8"
                          dataKey="value"
                          label={displayContext !== 'ambient' ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="line">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">📈 Line chart showing trends over sequence</p>
                    <ResponsiveContainer 
                      width="100%" 
                      height={
                        displayContext === 'mobile' ? 200 :
                        displayContext === 'ambient' ? 150 :
                        displayContext === 'meeting' ? 350 : 300
                      }
                    >
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={displayContext === 'mobile' || displayContext === 'ambient' ? 10 : 12}
                        />
                        <YAxis fontSize={displayContext === 'mobile' || displayContext === 'ambient' ? 10 : 12} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={displayContext === 'meeting' ? 3 : 2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
              
              {chartData.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">📈 No numeric data found for charting</p>
                  <p className="text-xs text-gray-400 mt-1">Charts require numeric values in your data</p>
                </div>
              )}
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
