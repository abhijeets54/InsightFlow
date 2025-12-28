'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';

interface ChartNarrativeProps {
  chartType: string;
  data: any[];
  columns: string[];
  filters?: any[];
  aiModeEnabled?: boolean;
  onNarrativeGenerated?: (narrative: any) => void;
}

export default function ChartNarrative({ chartType, data, columns, filters, aiModeEnabled = false, onNarrativeGenerated }: ChartNarrativeProps) {
  const [narrative, setNarrative] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate cache key based on chart type and data signature
  const getCacheKey = () => {
    const columnsStr = columns && columns.length > 0 ? columns.join('_') : 'no_columns';
    const dataSignature = `${data?.length || 0}_${columnsStr}`;
    return `chart_narrative_${chartType}_${dataSignature}`;
  };

  // Early return if required props are missing
  if (!data || !columns || columns.length === 0) {
    return null;
  }

  // Load cached narrative on mount or when chart type changes
  useEffect(() => {
    if (!aiModeEnabled) {
      setNarrative(null);
      return;
    }

    const cacheKey = getCacheKey();
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;

        // Cache valid for 24 hours
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log(`[ChartNarrative] ✅ Loaded cached insights for ${chartType}`);
          setNarrative(parsedCache.narrative);
          // Notify parent of cached narrative
          if (onNarrativeGenerated) {
            onNarrativeGenerated(parsedCache.narrative);
          }
          return;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (err) {
      console.error('[ChartNarrative] Cache load error:', err);
    }
  }, [chartType, data?.length, columns?.length, aiModeEnabled]);

  // Removed auto-generation to prevent 429 errors on Gemini API
  // useEffect(() => {
  //   generateNarrative();
  // }, [chartType, data, columns]);

  const generateNarrative = async () => {
    if (!data || data.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const analysisSize = Math.min(data.length, 500);
      const response = await fetch('/api/narrative-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType,
          data: data.slice(0, analysisSize), // Limit data size for API
          columns,
          filters,
          metadata: {
            totalRows: data.length,
            analyzedRows: analysisSize,
            isSampled: data.length > analysisSize,
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (result.success || result.fallback) {
        setNarrative(result.narrative);

        // Notify parent component
        if (onNarrativeGenerated) {
          onNarrativeGenerated(result.narrative);
        }

        // Cache the narrative
        const cacheKey = getCacheKey();
        try {
          const cacheData = {
            narrative: result.narrative,
            timestamp: Date.now(),
            chartType,
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(`[ChartNarrative] 💾 Cached insights for ${chartType}`);
        } catch (cacheErr) {
          console.warn('[ChartNarrative] Failed to cache insights:', cacheErr);
        }
      } else {
        throw new Error(result.error || 'Failed to generate narrative');
      }
    } catch (err: any) {
      console.error('[Chart Narrative] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <div className="flex items-center gap-3 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Generating AI Insights...</p>
            <p className="text-xs text-gray-500">Analyzing your data patterns</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-amber-50 border-amber-200 shadow-soft">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Could not generate AI insights</p>
            <p className="text-xs text-amber-700 mt-1">{error}</p>
            <button
              onClick={generateNarrative}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Card>
    );
  }

  // Don't show if AI mode is disabled
  if (!aiModeEnabled) {
    return null;
  }

  if (!narrative) {
    return (
      <Card className="shadow-large bg-gradient-to-br from-white to-purple-50 border-2 border-dashed border-purple-300">
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Chart Insights</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            Generate intelligent insights about this specific chart's patterns, trends, and anomalies using Gemini 2.0
          </p>
          <button
            onClick={generateNarrative}
            disabled={!data || data.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Chart Insights
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Click to analyze this AI-generated chart with additional insights
          </p>
        </div>
      </Card>
    );
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">High Confidence</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Medium Confidence</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">Low Confidence</span>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return '🔴 High Impact';
      case 'medium': return '🟡 Medium Impact';
      default: return '🔵 Low Impact';
    }
  };

  return (
    <Card className="shadow-large bg-gradient-to-br from-white to-blue-50">
      {/* AI Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">AI-Powered Insights</h3>
            <p className="text-xs text-gray-500">
              Generated with Gemini 2.0
              {data && data.length > 500 && (
                <span className="ml-1 text-amber-600">• Analyzed 500 of {data.length.toLocaleString()} rows</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={generateNarrative}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Title & Summary */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{narrative.title}</h2>
        <p className="text-gray-700 leading-relaxed">{narrative.summary}</p>
      </div>

      {/* Key Insights */}
      {narrative.keyInsights && narrative.keyInsights.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Key Insights
          </h4>
          <div className="space-y-2">
            {narrative.keyInsights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start gap-2 bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                <span className="text-blue-600 font-bold mt-0.5">{index + 1}.</span>
                <p className="text-sm text-gray-700 flex-1">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {narrative.trends && (
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              {getTrendIcon(narrative.trends.direction)} Trend Analysis
            </h4>
            {getConfidenceBadge(narrative.trends.confidence)}
          </div>
          <p className="text-sm text-gray-700">{narrative.trends.description}</p>
        </div>
      )}

      {/* Anomalies */}
      {narrative.anomalies && narrative.anomalies.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            Anomalies Detected
          </h4>
          <div className="space-y-2">
            {narrative.anomalies.map((anomaly: any, index: number) => (
              <div key={index} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800">{anomaly.description}</p>
                  <span className="text-xs text-amber-700">{getImpactBadge(anomaly.impact)}</span>
                </div>
                {anomaly.value && (
                  <p className="text-xs text-gray-600">Value: <span className="font-mono font-semibold">{anomaly.value}</span></p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {narrative.recommendations && narrative.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Recommendations
          </h4>
          <div className="space-y-2">
            {narrative.recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-2 bg-green-50 rounded-lg p-3 border border-green-200">
                <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-gray-700 flex-1">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context/Caveats */}
      {narrative.context && (
        <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
          <p className="flex items-start gap-1">
            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{narrative.context}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
