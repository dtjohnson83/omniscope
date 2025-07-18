// src/components/EnhancedDataProcessor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Database, TrendingUp, Activity, Upload, Mic, MicOff, Play, Volume2, Settings, Sparkles, Brain, Download, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { aiService, type AIAnalysisRequest, type AIAnalysisResponse } from '@/lib/aiService';
import { AISettings } from './AISettings';

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

const EnhancedDataProcessor: React.FC = () => {
  // Existing state
  const [agentData, setAgentData] = useState<ProcessedData[]>([]);
  const [selectedData, setSelectedData] = useState<ProcessedData | null>(null);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    errors: 0,
    avgResponseTime: 0
  });

  // Enhanced AI state
  const [jsonData, setJsonData] = useState(null);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<AIAnalysisResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioResponse, setAudioResponse] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [analysisType, setAnalysisType] = useState<'summary' | 'insights' | 'decisions' | 'correlation' | 'prediction'>('insights');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
    fetchProcessedData();
    const interval = setInterval(fetchProcessedData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      initializeAI();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const initializeAI = async () => {
    if (user) {
      try {
        await aiService.initialize(user.id);
      } catch (error) {
        console.error('Error initializing AI service:', error);
      }
    }
  };

  const fetchProcessedData = async () => {
    try {
      const { data: agentData, error } = await supabase
        .from('agent_data')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setAgentData(agentData || []);
      
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

  // Voice Recognition (existing)
  const startVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNaturalLanguageQuery(transcript);
    };

    recognition.onerror = (event: any) => {
      setError(`Voice recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.start();
  }, []);

  // Text to Speech (existing)
  const speakResponse = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      setAudioResponse(text);
    }
  }, []);

  // File Upload Handler (existing)
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setJsonData(data);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Enhanced Natural Language Processing with AI
  const processNaturalLanguageQuery = useCallback(async () => {
    if (!jsonData || !naturalLanguageQuery.trim()) {
      setError('Please upload data and enter a query');
      return;
    }

    if (!aiService.isConfigured()) {
      setError('Please configure an AI provider in Settings to use advanced analysis');
      setShowAISettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setAiAnalysisResults(null);

    try {
      // First do the basic analysis
      const basicAnalysis = analyzeDataWithQuery(jsonData, naturalLanguageQuery);
      setAnalysisResults(basicAnalysis);

      // Then enhance with AI
      const aiRequest: AIAnalysisRequest = {
        data: jsonData,
        query: naturalLanguageQuery,
        analysisType: analysisType,
        context: `User is analyzing ${Array.isArray(jsonData) ? jsonData.length : 1} record(s)`
      };

      const aiResults = await aiService.analyzeData(aiRequest);
      setAiAnalysisResults(aiResults);

      // Generate audio response from AI summary
      const responseText = `Based on AI analysis: ${aiResults.summary}. Key insight: ${aiResults.insights[0] || 'Analysis completed'}`;
      speakResponse(responseText);

      toast({
        title: 'AI Analysis Complete',
        description: `Analysis by ${aiResults.provider} with ${(aiResults.confidence * 100).toFixed(1)}% confidence`,
      });

    } catch (error) {
      console.error('Error in AI analysis:', error);
      
      // Fallback to basic analysis
      const basicAnalysis = analyzeDataWithQuery(jsonData, naturalLanguageQuery);
      setAnalysisResults(basicAnalysis);
      
      setError(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Showing basic analysis instead.`);
      
      const fallbackResponse = generateTextualResponse(basicAnalysis);
      speakResponse(fallbackResponse);
    } finally {
      setIsProcessing(false);
    }
  }, [jsonData, naturalLanguageQuery, analysisType, speakResponse]);

  // Generate comprehensive report
  const generateReport = async () => {
    if (!aiAnalysisResults || !jsonData) return;
    
    setIsGeneratingReport(true);
    try {
      const report = await aiService.generateReport(jsonData, aiAnalysisResults);
      
      // Download report
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-analysis-report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Report Generated',
        description: 'Analysis report downloaded successfully'
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Basic data analysis (existing logic)
  const analyzeDataWithQuery = (data: any, query: string) => {
    const queryLower = query.toLowerCase();
    const dataArray = Array.isArray(data) ? data : [data];
    
    let chartType = 'bar';
    let aggregationType = 'count';
    let groupByField = null;
    let numericField = null;
    let insights: string[] = [];

    // Smart query parsing
    if (queryLower.includes('trend') || queryLower.includes('over time')) chartType = 'line';
    if (queryLower.includes('distribution') || queryLower.includes('breakdown')) chartType = 'pie';
    if (queryLower.includes('average')) aggregationType = 'average';
    if (queryLower.includes('sum') || queryLower.includes('total')) aggregationType = 'sum';

    // Auto-detect fields
    if (dataArray.length > 0) {
      const sampleItem = dataArray[0];
      const fields = Object.keys(sampleItem);
      
      const numericFields = fields.filter(field => typeof sampleItem[field] === 'number');
      const categoricalFields = fields.filter(field => 
        typeof sampleItem[field] === 'string' && 
        new Set(dataArray.map(item => item[field])).size < dataArray.length * 0.5
      );

      // Smart field detection based on query
      for (const field of fields) {
        if (queryLower.includes(field.toLowerCase())) {
          if (numericFields.includes(field)) {
            numericField = field;
          } else if (categoricalFields.includes(field)) {
            groupByField = field;
          }
        }
      }

      if (!numericField && numericFields.length > 0) numericField = numericFields[0];
      if (!groupByField && categoricalFields.length > 0) groupByField = categoricalFields[0];
    }

    // Generate chart data
    let chartData: any[] = [];
    if (groupByField && numericField) {
      const grouped = dataArray.reduce((acc: any, item: any) => {
        const key = item[groupByField] || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item[numericField] || 0);
        return acc;
      }, {});

      chartData = Object.entries(grouped).map(([key, values]: [string, any]) => {
        let value;
        switch (aggregationType) {
          case 'average':
            value = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            break;
          case 'sum':
            value = values.reduce((a: number, b: number) => a + b, 0);
            break;
          case 'max':
            value = Math.max(...values);
            break;
          case 'min':
            value = Math.min(...values);
            break;
          default:
            value = values.length;
        }
        return { name: key, value: Math.round(value * 100) / 100 };
      }).sort((a, b) => b.value - a.value);
    }

    // Generate insights
    if (chartData.length > 0) {
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const highest = chartData[0];
      const lowest = chartData[chartData.length - 1];
      
      insights = [
        `📊 Total ${aggregationType} of ${numericField}: ${total}`,
        `🏆 Highest ${groupByField}: ${highest.name} (${highest.value})`,
        `📉 Lowest ${groupByField}: ${lowest.name} (${lowest.value})`,
        `📈 Average per ${groupByField}: ${Math.round((total / chartData.length) * 100) / 100}`,
        `💡 Performance gap: ${Math.round(((highest.value - lowest.value) / highest.value) * 100)}% difference`
      ];
    }

    return {
      chartType,
      chartData,
      aggregationType,
      groupByField,
      numericField,
      insights,
      summary: `Analysis of ${dataArray.length} records, grouped by ${groupByField}, measuring ${numericField}`
    };
  };

  const generateTextualResponse = (analysis: any) => {
    if (!analysis.chartData.length) {
      return "I couldn't find relevant data to analyze based on your query.";
    }

    const { chartData, aggregationType, groupByField, numericField } = analysis;
    
    let response = `Based on your data analysis, here are the key findings: `;
    response += `The ${aggregationType} of ${numericField} across different ${groupByField} values shows that `;
    response += `${chartData[0].name} has the highest value at ${chartData[0].value}, `;
    response += `while ${chartData[chartData.length - 1].name} has the lowest at ${chartData[chartData.length - 1].value}. `;
    response += `I recommend focusing on the top performers and investigating improvement opportunities for underperformers.`;

    return response;
  };

  const renderChart = (analysis: any) => {
    if (!analysis || !analysis.chartData.length) return null;

    const { chartType, chartData } = analysis;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI-Powered Data Processor
          </h1>
          <p className="text-gray-600 mt-2">Advanced analysis with AI insights and decision recommendations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAISettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            AI Settings
          </Button>
          <Button onClick={fetchProcessedData} disabled={isProcessing}>
            {isProcessing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* AI Provider Status */}
      {user && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span className="font-medium">AI Status:</span>
              {aiService.isConfigured() ? (
                <Badge className="bg-green-100 text-green-800">
                  Connected ({aiService.getConfiguredProviders().join(', ')})
                </Badge>
              ) : (
                <Badge variant="outline">
                  No AI providers configured
                </Badge>
              )}
            </div>
            {!aiService.isConfigured() && (
              <Button size="sm" onClick={() => setShowAISettings(true)}>
                Setup AI
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards (existing) */}
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

      <Tabs defaultValue="interactive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interactive">🤔 Ask Questions</TabsTrigger>
          <TabsTrigger value="results">📊 Analysis Results</TabsTrigger>
          <TabsTrigger value="ai-insights">🧠 AI Insights</TabsTrigger>
          <TabsTrigger value="agent-data">🤖 Agent Data</TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Data & Ask Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload JSON File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="text-center py-2">
                <span className="text-gray-400">— OR —</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Paste JSON Data</label>
                <Textarea
                  placeholder='{"sales": [{"month": "Jan", "revenue": 1000}, {"month": "Feb", "revenue": 1200}]}'
                  className="min-h-32"
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      setJsonData(data);
                      setError(null);
                    } catch (err) {
                      // Don't set error on every keystroke
                    }
                  }}
                />
              </div>

              {jsonData && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Data loaded! {Array.isArray(jsonData) ? jsonData.length : 1} record(s)
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Analysis Type</Label>
                  <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="insights">Insights</SelectItem>
                      <SelectItem value="decisions">Decisions</SelectItem>
                      <SelectItem value="correlation">Correlation</SelectItem>
                      <SelectItem value="prediction">Prediction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Ask About Your Data</label>
                  <Textarea
                    placeholder="What trends do you see in the sales data over time? What decisions should I make?"
                    value={naturalLanguageQuery}
                    onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startVoiceRecognition}
                    disabled={isListening}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={processNaturalLanguageQuery}
                disabled={!jsonData || !naturalLanguageQuery.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={66} className="w-full" />
                  <p className="text-sm text-gray-600">Processing your query with AI...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {analysisResults ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Visual Analysis
                  {audioResponse && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speakResponse(audioResponse)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(analysisResults)}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">{analysisResults.summary}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analysis Yet</h3>
                <p className="text-gray-600">Upload data and ask a question to see visual results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          {aiAnalysisResults ? (
            <div className="space-y-4">
              {/* AI Summary */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      AI Analysis Summary
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {aiAnalysisResults.provider}
                      </Badge>
                      <Badge variant="outline">
                        {(aiAnalysisResults.confidence * 100).toFixed(1)}% confidence
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{aiAnalysisResults.summary}</p>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={generateReport}
                      disabled={isGeneratingReport}
                      className="flex items-center gap-2"
                    >
                      {isGeneratingReport ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Generate Report
                    </Button>
                    {audioResponse && (
                      <Button
                        variant="outline"
                        onClick={() => speakResponse(aiAnalysisResults.summary)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>🔍 Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aiAnalysisResults.insights.map((insight: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="text-sm font-medium">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Decisions */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aiAnalysisResults.decisions.map((decision: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                        <Badge className="bg-green-100 text-green-800">{index + 1}</Badge>
                        <span className="text-sm font-medium">{decision}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Visualization Suggestions */}
              {aiAnalysisResults.visualizationSuggestions && aiAnalysisResults.visualizationSuggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Visualization Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiAnalysisResults.visualizationSuggestions.map((suggestion: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{suggestion.chartType}</Badge>
                            <span className="text-sm font-medium">
                              Fields: {suggestion.dataFields.join(', ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{suggestion.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Analysis Yet</h3>
                <p className="text-gray-600">Complete an analysis to see AI-powered insights and recommendations.</p>
                {!aiService.isConfigured() && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowAISettings(true)}
                  >
                    Configure AI Provider
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agent-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Data Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentData.map((item) => (
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedData(item)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Settings Modal */}
      {showAISettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">AI Provider Settings</h2>
                <Button variant="outline" onClick={() => setShowAISettings(false)}>
                  Close
                </Button>
              </div>
              <AISettings />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedDataProcessor;
