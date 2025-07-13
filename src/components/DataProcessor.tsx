import React, { useState, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Upload, Play, FileText, BarChart3, PieChart, TrendingUp, Zap, Download, RefreshCw, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';
import Navigation from './Navigation';

const JSONDataProcessor = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef(null);

  const sampleData = {
    title: "Monthly Sales Data",
    values: [120, 190, 300, 500, 200, 300, 450, 600, 800, 700, 900, 1100],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    categories: ["Electronics", "Clothing", "Books", "Home", "Sports"],
    categoryValues: [2500, 1800, 900, 1200, 600]
  };

  const addToHistory = (data) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevData = history[historyIndex - 1];
      setParsedData(prevData);
      setJsonInput(JSON.stringify(prevData, null, 2));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextData = history[historyIndex + 1];
      setParsedData(nextData);
      setJsonInput(JSON.stringify(nextData, null, 2));
    }
  };

  const validateAndParseJSON = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return { success: true, data: parsed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const processData = () => {
    if (!jsonInput.trim()) {
      setError('Please enter JSON data');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    setTimeout(() => {
      const result = validateAndParseJSON(jsonInput);
      
      if (result.success) {
        setParsedData(result.data);
        addToHistory(result.data);
        setSuccess('JSON data processed successfully!');
        setError('');
      } else {
        setError(`JSON parsing error: ${result.error}`);
        setParsedData(null);
      }
      setProcessing(false);
    }, 500);
  };

  const loadSample = () => {
    const formattedSample = JSON.stringify(sampleData, null, 2);
    setJsonInput(formattedSample);
    setParsedData(sampleData);
    addToHistory(sampleData);
    setError('');
    setSuccess('Sample data loaded successfully!');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setJsonInput(content);
        const result = validateAndParseJSON(content);
        if (result.success) {
          setParsedData(result.data);
          addToHistory(result.data);
          setSuccess('File uploaded and processed successfully!');
          setError('');
        } else {
          setError(`File parsing error: ${result.error}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const formatJSON = () => {
    if (jsonInput) {
      const result = validateAndParseJSON(jsonInput);
      if (result.success) {
        setJsonInput(JSON.stringify(result.data, null, 2));
        setSuccess('JSON formatted successfully!');
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadData = (format) => {
    if (!parsedData) return;
    
    let content, filename, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(parsedData, null, 2);
        filename = 'data.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        content = convertToCSV(parsedData);
        filename = 'data.csv';
        mimeType = 'text/csv';
        break;
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    if (data.labels && data.values) {
      const headers = ['Label', 'Value'];
      const rows = data.labels.map((label, index) => [label, data.values[index]]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    return JSON.stringify(data);
  };

  const generateSummary = () => {
    if (!parsedData) return '';
    
    let summary = '';
    
    if (parsedData.title) {
      summary += `Dataset: ${parsedData.title}\n`;
    }
    
    if (parsedData.values && Array.isArray(parsedData.values)) {
      const values = parsedData.values;
      const total = values.reduce((sum, val) => sum + val, 0);
      const avg = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      summary += `\nStatistics:\n`;
      summary += `- Total: ${total}\n`;
      summary += `- Average: ${avg.toFixed(2)}\n`;
      summary += `- Maximum: ${max}\n`;
      summary += `- Minimum: ${min}\n`;
      summary += `- Count: ${values.length}\n`;
    }
    
    if (parsedData.labels && Array.isArray(parsedData.labels)) {
      summary += `\nLabels: ${parsedData.labels.length} items\n`;
    }
    
    return summary;
  };

  const prepareChartData = () => {
    if (!parsedData) return [];
    
    if (parsedData.values && parsedData.labels) {
      return parsedData.labels.map((label, index) => ({
        name: label,
        value: parsedData.values[index] || 0,
        x: index,
        y: parsedData.values[index] || 0
      }));
    }
    
    if (parsedData.categoryValues && parsedData.categories) {
      return parsedData.categories.map((category, index) => ({
        name: category,
        value: parsedData.categoryValues[index] || 0,
        x: index,
        y: parsedData.categoryValues[index] || 0
      }));
    }
    
    return [];
  };

  const renderChart = () => {
    const data = prepareChartData();
    if (!data.length) return null;

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
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
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis dataKey="y" />
              <Tooltip />
              <Scatter name="Data Points" data={data} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-800 mb-2">JSON Data Processor</h1>
            <p className="text-gray-600">Advanced JSON processing with visualizations, summaries, and interactive features</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Data Input
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Undo"
                  >
                    <RefreshCw className="w-4 h-4 rotate-180" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Redo"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Enter JSON data or upload a file
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                  <button
                    onClick={formatJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Format
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Enter JSON data...'
                className="w-full h-64 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex gap-4 mt-4">
                <button
                  onClick={processData}
                  disabled={processing}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {processing ? 'Processing...' : 'Process Data'}
                </button>
                <button
                  onClick={loadSample}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Load Sample
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}
            </div>

            {/* Output Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Analysis & Visualization</h2>
                {parsedData && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadData('json')}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                    <button
                      onClick={() => downloadData('csv')}
                      className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                )}
              </div>

              {parsedData ? (
                <div className="space-y-6">
                  {/* Chart Type Selector */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        chartType === 'bar' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Bar Chart
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        chartType === 'line' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Line Chart
                    </button>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        chartType === 'pie' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <PieChart className="w-4 h-4" />
                      Pie Chart
                    </button>
                    <button
                      onClick={() => setChartType('scatter')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        chartType === 'scatter' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      Scatter Plot
                    </button>
                  </div>

                  {/* Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    {renderChart()}
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Data Summary</h3>
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                      {generateSummary()}
                    </pre>
                  </div>

                  {/* Raw Data Preview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Raw Data</h3>
                    <pre className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                      {JSON.stringify(parsedData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Process JSON data to see visualization and analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSONDataProcessor;
