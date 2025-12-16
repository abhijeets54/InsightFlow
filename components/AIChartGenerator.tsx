'use client';

import { useState, useEffect } from 'react';
import ChartDisplay from './dashboard/ChartDisplay';
import AdvancedChartDisplay from './dashboard/AdvancedChartDisplay';
import { processChartData } from '@/utils/chartDataProcessor';

interface AIChartGeneratorProps {
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar';
  datasetId: string;
  userId: string;
  data: any[];
  columns: string[];
  onSpecGenerated?: (spec: any) => void;
}

export default function AIChartGenerator({
  chartType,
  datasetId,
  userId,
  data,
  columns,
  onSpecGenerated,
}: AIChartGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [spec, setSpec] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    generateAIChart();
  }, [chartType, datasetId]);

  const generateAIChart = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Generate summary (or use cached)
      console.log(`[AI Chart] Step 1: Generating summary for ${chartType}...`);
      const summaryRes = await fetch('/api/lida/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, userId, useAI: true }),
      });

      if (!summaryRes.ok) throw new Error('Failed to generate summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary);

      console.log(`[AI Chart] Summary ${summaryData.cached ? 'cached' : 'generated'}`);

      // Step 2: Generate a goal specific to this chart type
      console.log(`[AI Chart] Step 2: Generating goal for ${chartType}...`);
      const goal = {
        index: 1,
        question: `What is the best way to visualize this data using a ${chartType} chart?`,
        visualization: chartType,
        rationale: `User wants to see ${chartType} visualization`,
        priority: 'high' as const,
        complexity: 'simple' as const,
        estimated_insight: `Optimal ${chartType} chart configuration`,
      };

      // Step 3: Generate AI specification
      console.log(`[AI Chart] Step 3: Generating ${chartType} specification...`);
      const specRes = await fetch('/api/lida/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          summary: summaryData.summary,
          selfEvaluate: true,
        }),
      });

      if (!specRes.ok) throw new Error('Failed to generate specification');
      const specData = await specRes.json();
      const generatedSpec = specData.specification;

      console.log(`[AI Chart] ✅ Spec generated (score: ${generatedSpec.evaluation.score}):`, generatedSpec);
      setSpec(generatedSpec);

      if (onSpecGenerated) {
        onSpecGenerated(generatedSpec);
      }

      // Step 4: Process data with AI recommendations
      console.log(`[AI Chart] Step 4: Processing data with AI config...`);
      const processedResult = processChartData(data, chartType, {
        categoryColumn: generatedSpec.columns.category || generatedSpec.columns.x || columns[0],
        valueColumn: generatedSpec.columns.value || generatedSpec.columns.y || columns[1],
        xColumn: generatedSpec.columns.x,
        yColumn: generatedSpec.columns.y,
        aggregationMethod: generatedSpec.aggregation?.method || 'sum',
        columns: columns,
      });

      setChartData(processedResult.data);
      console.log(`[AI Chart] ✅ Chart ready: ${processedResult.displayCount} data points`);

    } catch (err: any) {
      console.error('[AI Chart] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative">
          {/* Animated AI brain icon */}
          <div className="absolute inset-0 animate-ping">
            <div className="w-16 h-16 bg-purple-400 rounded-full opacity-20"></div>
          </div>
          <div className="relative">
            <svg className="w-16 h-16 text-purple-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-center">
          <p className="text-lg font-semibold text-gray-900">AI is analyzing your data...</p>
          <p className="text-sm text-gray-600">Generating optimal {chartType} chart configuration</p>
          <div className="flex items-center justify-center gap-1 mt-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-semibold text-gray-900 mb-2">Failed to generate AI chart</p>
        <p className="text-sm text-gray-600">{error}</p>
        <button
          onClick={generateAIChart}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!spec || chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data to display</div>;
  }

  return (
    <div className="space-y-4">
      {/* AI Recommendation Badge */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">AI-Optimized Configuration</h4>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                spec.evaluation.score >= 80 ? 'bg-green-100 text-green-700' :
                spec.evaluation.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                Score: {spec.evaluation.score}/100
              </span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                Confidence: {(spec.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{spec.description}</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">Data Fit:</span>
                <span className="ml-1 font-semibold text-gray-900">
                  {(spec.evaluation.data_fitness * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">Clarity:</span>
                <span className="ml-1 font-semibold text-gray-900">
                  {(spec.evaluation.clarity_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="text-gray-600">Insight:</span>
                <span className="ml-1 font-semibold text-gray-900">
                  {(spec.evaluation.insight_potential * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            {spec.evaluation.strengths.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-green-600 font-semibold">✓ </span>
                <span className="text-gray-700">{spec.evaluation.strengths.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        {chartType === 'stacked-bar' ? (
          <AdvancedChartDisplay
            type={chartType}
            data={chartData}
            title={spec.title}
          />
        ) : (
          <ChartDisplay
            type={chartType as 'bar' | 'line' | 'area' | 'pie' | 'scatter'}
            data={chartData}
            title={spec.title}
          />
        )}
      </div>

      {/* AI Rationale */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-2">Why this configuration?</h5>
        <p className="text-sm text-gray-700">{spec.rationale}</p>
        {spec.aggregation && (
          <div className="mt-2 text-xs text-gray-600">
            <span className="font-semibold">Aggregation:</span> {spec.aggregation.method}
            {spec.aggregation.groupBy && <span> grouped by {spec.aggregation.groupBy}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
