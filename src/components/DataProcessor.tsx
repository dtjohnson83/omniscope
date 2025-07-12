import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Play, Volume2, BarChart3, FileText, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface DataStructure {
  title: string;
  values: number[];
  labels: string[];
}

interface ChartData {
  name: string;
  value: number;
}

export default function DataProcessor() {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<DataStructure | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Sample data for demonstration
  const sampleData = {
    title: "Quarterly Sales Data",
    values: [120, 190, 300, 500, 200, 300],
    labels: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const validateAndParseData = (input: string): DataStructure | null => {
    try {
      const data = JSON.parse(input);
      
      // Validate structure
      if (!data.title || typeof data.title !== 'string') {
        throw new Error('Missing or invalid "title" field (must be a string)');
      }
      
      if (!Array.isArray(data.values) || !data.values.every((v: any) => typeof v === 'number')) {
        throw new Error('Missing or invalid "values" field (must be an array of numbers)');
      }
      
      if (!Array.isArray(data.labels) || !data.labels.every((l: any) => typeof l === 'string')) {
        throw new Error('Missing or invalid "labels" field (must be an array of strings)');
      }
      
      if (data.values.length !== data.labels.length) {
        throw new Error('Values and labels arrays must have the same length');
      }
      
      return data as DataStructure;
    } catch (err) {
      throw new Error(`JSON parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const processData = async () => {
    if (!jsonInput.trim()) {
      setError('Please enter JSON data');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const data = validateAndParseData(jsonInput);
      setParsedData(data);
      
      showNotification('success', `Processed "${data.title}" with ${data.values.length} data points`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process data';
      setError(errorMessage);
      setParsedData(null);
      
      showNotification('error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTextSummary = (): string => {
    if (!parsedData) return '';
    
    const { title, values, labels } = parsedData;
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);
    
    return `Data Summary for "${title}": 
    Total data points: ${values.length}
    Sum of all values: ${total.toFixed(2)}
    Average value: ${average.toFixed(2)}
    Highest value: ${max} (${labels[maxIndex]})
    Lowest value: ${min} (${labels[minIndex]})
    Data range: ${labels.join(', ')}`;
  };

  const speakSummary = () => {
    if (!parsedData || isSpeaking) return;

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      showNotification('error', "Your browser doesn't support text-to-speech");
      return;
    }

    const summary = generateTextSummary();
    const utterance = new SpeechSynthesisUtterance(summary);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      showNotification('error', "Failed to speak the summary");
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const loadSampleData = () => {
    setJsonInput(JSON.stringify(sampleData, null, 2));
    setError('');
  };

  const prepareChartData = (): ChartData[] => {
    if (!parsedData) return [];
    return parsedData.labels.map((label, index) => ({
      name: label,
      value: parsedData.values[index]
    }));
  };

  const renderChart = () => {
    const data = prepareChartData();
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50">
            <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            JSON Data Processor
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Process JSON data with text summaries, voice output, and interactive visualizations
          </p>
        </div>

        {/* Data Input */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Input
            </CardTitle>
            <CardDescription>
              Enter JSON data in the format: {`{ "title": "string", "values": [numbers], "labels": [strings] }`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="json-input">JSON Data</Label>
              <Textarea
                id="json-input"
                placeholder="Enter your JSON data here..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[120px] font-mono"
              />
            </div>
            
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={processData} 
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Process Data
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={loadSampleData}>
                <FileText className="mr-2 h-4 w-4" />
                Load Sample
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {parsedData && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Text Summary */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Text Summary
                </CardTitle>
                <CardDescription>Automated data analysis and insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-gray-700">
                    {generateTextSummary()}
                  </pre>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={isSpeaking ? stopSpeaking : speakSummary}
                    variant={isSpeaking ? "destructive" : "default"}
                    size="sm"
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {isSpeaking ? 'Stop Speaking' : 'Speak Summary'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Chart Visualization */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Visualization
                </CardTitle>
                <CardDescription>Interactive charts and graphs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                  {['bar', 'line', 'pie'].map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType(type as 'bar' | 'line' | 'pie')}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)} Chart
                    </Button>
                  ))}
                </div>
                
                <div className="w-full">
                  {renderChart()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success indicator */}
        {parsedData && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Data processed successfully!</p>
                <p className="text-sm text-green-600">
                  All three output formats are now available: text summary, voice output, and chart visualization.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
