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
  onChartReady?: () => void; // Callback when chart is ready
}

// Cache helper functions
const getCacheKey = (datasetId: string, chartType: string) => {
  return `ai_chart_${datasetId}_${chartType}`;
};

const getFromCache = (datasetId: string, chartType: string) => {
  try {
    const key = getCacheKey(datasetId, chartType);
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - parsed.timestamp;
      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`[SmartChart] ✅ Using cached config for ${chartType}`);
        return parsed.config;
      } else {
        console.log(`[SmartChart] ⚠️ Cache expired for ${chartType}`);
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error('[SmartChart] Cache read error:', err);
  }
  return null;
};

const saveToCache = (datasetId: string, chartType: string, config: any) => {
  try {
    const key = getCacheKey(datasetId, chartType);
    const cacheData = {
      config,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[SmartChart] 💾 Cached config for ${chartType}`);
  } catch (err) {
    console.error('[SmartChart] Cache write error:', err);
  }
};

export default function SmartChartDisplay({
  chartType,
  chartName,
  datasetId,
  userId,
  data,
  columns,
  onChartReady,
}: SmartChartDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Determine if this is an advanced chart type
  const isAdvancedChart = ['scatter', 'stacked-bar', 'box-plot', 'heatmap'].includes(chartType);

  useEffect(() => {
    loadChartConfig();
  }, [chartType, datasetId]);

  const loadChartConfig = async (forceRegenerate = false) => {
    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setIsFromCache(false);

    // Try cache first unless forcing regeneration
    if (!forceRegenerate) {
      const cachedConfig = getFromCache(datasetId, chartType);
      if (cachedConfig) {
        setIsFromCache(true);
        applyChartConfig(cachedConfig);
        setLoading(false);
        return;
      }
    }

    // Generate new AI recommendation
    await getAIRecommendation();
  };

  const getAIRecommendation = async () => {
    try {
      console.log(`[SmartChart] Getting AI recommendation for ${chartType}...`);

      const response = await fetch('/api/chart-ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType,
          chartName,
          datasetId,
          userId,
          columns,
          sampleData: data.slice(0, 100),
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI recommendation');

      const result = await response.json();
      console.log(`[SmartChart] ✅ AI config received for ${chartType}:`, result.config);

      // Save to cache
      saveToCache(datasetId, chartType, result.config);

      // Apply config
      applyChartConfig(result.config);

    } catch (err: any) {
      console.error('[SmartChart] Error:', err);
      setError(err.message);
      setChartData(data);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const applyChartConfig = (config: any) => {
    setAiConfig(config);

    if (isAdvancedChart) {
      setChartData(data);
    } else {
      const basicChartType = chartType as 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar';
      const processedResult = processChartData(data, basicChartType, {
        categoryColumn: config.xColumn || config.categoryColumn || columns[0],
        valueColumn: config.yColumn || config.valueColumn || columns[1],
        xColumn: config.xColumn,
        yColumn: config.yColumn,
        aggregationMethod: config.aggregation || 'sum',
        columns: config.selectedColumns || columns,
      });

      setChartData(processedResult.data);
    }

    // Notify parent that chart is ready
    if (onChartReady) {
      onChartReady();
    }
  };

  const handleRegenerate = () => {
    loadChartConfig(true);
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{aiConfig.title || 'AI Optimized'}</p>
                  {isFromCache && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Cached
                    </span>
                  )}
                </div>
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

            {/* Regenerate Button */}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex-shrink-0 px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Regenerate chart with fresh AI analysis"
            >
              {regenerating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chart Container - Fixed height to prevent overflow */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white relative" style={{ height: '500px', maxHeight: '500px' }}>
        {regenerating && (
          <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping opacity-20">
                  <div className="w-10 h-10 bg-purple-400 rounded-full"></div>
                </div>
                <svg className="w-10 h-10 text-purple-600 animate-pulse relative" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">Regenerating chart...</p>
            </div>
          </div>
        )}
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
