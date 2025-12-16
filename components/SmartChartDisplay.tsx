'use client';

import { useState, useEffect } from 'react';
import ChartDisplay from './dashboard/ChartDisplay';
import AdvancedChartDisplay from './dashboard/AdvancedChartDisplay';
import { processChartData } from '@/utils/chartDataProcessor';

interface SmartChartDisplayProps {
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap';
  chartName: string;
  datasetId: string;
  userId: string;
  data: any[];
  columns: string[];
}

export default function SmartChartDisplay({
  chartType,
  chartName,
  datasetId,
  userId,
  data,
  columns,
}: SmartChartDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is an advanced chart type
  const isAdvancedChart = ['scatter', 'stacked-bar', 'box-plot', 'heatmap'].includes(chartType);

  useEffect(() => {
    getAIRecommendation();
  }, [chartType, datasetId]);

  const getAIRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[SmartChart] Getting AI recommendation for ${chartType}...`);

      // Call AI to get chart-specific recommendation
      const response = await fetch('/api/chart-ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType,
          chartName,
          datasetId,
          userId,
          columns,
          sampleData: data.slice(0, 100), // Send first 100 rows for quick analysis
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI recommendation');

      const result = await response.json();
      console.log(`[SmartChart] ✅ AI config received for ${chartType}:`, result.config);

      setAiConfig(result.config);

      // For advanced charts, use raw data or minimal processing
      if (isAdvancedChart) {
        // Advanced charts handle their own data processing internally
        setChartData(data);
      } else {
        // For basic charts (bar, line, area, pie), use processChartData
        const basicChartType = chartType as 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar';
        const processedResult = processChartData(data, basicChartType, {
          categoryColumn: result.config.xColumn || result.config.categoryColumn || columns[0],
          valueColumn: result.config.yColumn || result.config.valueColumn || columns[1],
          xColumn: result.config.xColumn,
          yColumn: result.config.yColumn,
          aggregationMethod: result.config.aggregation || 'sum',
          columns: result.config.selectedColumns || columns,
        });

        setChartData(processedResult.data);
      }

    } catch (err: any) {
      console.error('[SmartChart] Error:', err);
      setError(err.message);
      // Fallback to raw data
      setChartData(data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="w-12 h-12 bg-purple-400 rounded-full"></div>
          </div>
          <svg className="w-12 h-12 text-purple-600 animate-pulse relative" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-700">AI analyzing {chartName}...</p>
        <div className="flex gap-1 mt-2">
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-gray-500 mt-1">Showing basic chart</p>
        <ChartDisplay 
          type={chartType as 'bar' | 'line' | 'area' | 'pie' | 'scatter'} 
          data={data} 
          title={chartName} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI Badge - Above chart */}
      {aiConfig && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-gray-900 mb-1">{aiConfig.title || 'AI Optimized'}</p>
              <p className="text-gray-700">{aiConfig.recommendation}</p>
              {aiConfig.selectedColumns && (
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">Columns:</span> {aiConfig.selectedColumns.join(', ')}
                </p>
              )}
              {aiConfig.rationale && (
                <p className="text-gray-600 mt-1 italic text-xs">{aiConfig.rationale}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Container - Fixed height to prevent overflow */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white" style={{ height: '500px', maxHeight: '500px' }}>
        {isAdvancedChart ? (
          <AdvancedChartDisplay
            type={chartType as 'bar' | 'line' | 'pie' | 'heatmap' | 'scatter' | 'area' | 'stacked-bar' | 'box-plot'}
            data={chartData}
            title={aiConfig?.title || chartName}
            xKey={aiConfig?.xColumn}
            yKey={aiConfig?.yColumn}
            groupKey={aiConfig?.stackByColumn || aiConfig?.colorByColumn}
          />
        ) : (
          <ChartDisplay
            type={chartType as 'bar' | 'line' | 'area' | 'pie' | 'scatter'}
            data={chartData}
            title={aiConfig?.title || chartName}
          />
        )}
      </div>
    </div>
  );
}
