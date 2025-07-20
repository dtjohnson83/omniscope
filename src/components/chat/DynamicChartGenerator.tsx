import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartData {
  [key: string]: any;
}

interface DynamicChartGeneratorProps {
  data: ChartData[];
  chartType: string;
  width?: number;
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export const DynamicChartGenerator: React.FC<DynamicChartGeneratorProps> = ({ 
  data, 
  chartType, 
  width = 400, 
  height = 300 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
        <p className="text-muted-foreground">No data available for visualization</p>
      </div>
    );
  }

  // Get the first non-id key for the data field
  const dataKeys = Object.keys(data[0]).filter(key => key !== 'id' && key !== 'name');
  const primaryDataKey = dataKeys[0];
  const categoryKey = data[0].name !== undefined ? 'name' : Object.keys(data[0])[0];

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'column':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={categoryKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={categoryKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={primaryDataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={categoryKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={primaryDataKey} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2">
        <span className="text-xs text-muted-foreground capitalize">
          {chartType} Chart
        </span>
      </div>
      {renderChart()}
    </div>
  );
};