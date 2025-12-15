'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartDisplayProps {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  data: any[];
  xKey?: string;
  yKey?: string;
  title?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ChartDisplay({
  type,
  data,
  xKey,
  yKey,
  title,
}: ChartDisplayProps) {
  // Debug logging
  console.log('ChartDisplay props:', { type, dataLength: data?.length, xKey, yKey, title });
  console.log('First data row:', data?.[0]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  // Auto-detect keys if not provided
  const keys = Object.keys(data[0]);
  console.log('Available keys:', keys);

  // Find numeric columns for better default Y axis
  const numericKeys = keys.filter(key => {
    const value = data[0][key];
    return !isNaN(Number(value)) && value !== null && value !== '';
  });

  const defaultXKey = xKey || keys[0];
  const defaultYKey = yKey || (numericKeys.length > 0 ? numericKeys[0] : keys[1] || keys[0]);

  console.log('Selected keys:', { defaultXKey, defaultYKey });

  // Process data to ensure numeric values are numbers
  const processedData = data.map(item => {
    const processed: any = { ...item };
    keys.forEach(key => {
      const value = item[key];
      // Try to convert to number if it looks like a number
      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        processed[key] = Number(value);
      }
    });
    return processed;
  });

  console.log('Processed data sample:', processedData[0]);
  console.log('X-axis values:', processedData.map(d => d[defaultXKey]).slice(0, 3));
  console.log('Y-axis values:', processedData.map(d => d[defaultYKey]).slice(0, 3));

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={defaultXKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={defaultYKey}
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={defaultXKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={defaultYKey} fill="#8884d8" />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={defaultXKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={defaultYKey}
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={processedData}
              dataKey={defaultYKey}
              nameKey={defaultXKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={defaultXKey} type="number" />
            <YAxis dataKey={defaultYKey} type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Data" data={processedData} fill="#8884d8" />
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full overflow-hidden p-4">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={title ? 420 : 460}>
        {renderChart()}
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-500">
        X-Axis: {defaultXKey} | Y-Axis: {defaultYKey} | Data points: {processedData.length}
      </div>
    </div>
  );
}
