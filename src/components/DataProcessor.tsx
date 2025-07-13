import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, BarChart3, PieChart, TrendingUp, Volume2 } from 'lucide-react';
import Navigation from './Navigation';

interface DataItem {
  [key: string]: any;
}

interface ChartData {
  name: string;
  value: number;
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

  const generateSummary = (data: DataItem[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const totalRecords = data.length;
      const fields = data.length > 0 ? Object.keys(data[0]) : [];
      const numericFields = fields.filter(field => 
        data.some(item => typeof item[field] === 'number')
      );
      
      let summaryText = `Dataset contains ${totalRecords} records with ${fields.length} fields.\n`;
      summaryText += `Fields: ${fields.join(', ')}\n`;
      
      if (numericFields.length > 0) {
        summaryText += `\nNumeric analysis:\n`;
        numericFields.forEach(field => {
          const values = data.map(item => item[field]).filter(val => typeof val === 'number');
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          summaryText += `- ${field}: Average = ${avg.toFixed(2)}, Total = ${sum}\n`;
        });
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
        name: item.name || item.label || `Item ${index + 1}`,
        value: item[numericFields[0]]
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
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-analysis-results.json';
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
          <p className="text-gray-600">Upload, analyze, and visualize your data with AI-powered insights</p>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {error}
            </AlertDescription>
          </Alert>
        )}

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
                  Upload or paste data to see AI-generated summary
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
      </div>
    </div>
  );
}
