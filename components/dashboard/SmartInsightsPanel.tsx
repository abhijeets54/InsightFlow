'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';

interface Insight {
  type: 'trend' | 'outlier' | 'correlation' | 'summary';
  icon: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  color: string;
}

interface SmartInsightsPanelProps {
  datasetId: string;
  userId: string;
  data: any[];
  onInsightsGenerated?: (insights: Insight[]) => void;
}

export default function SmartInsightsPanel({ datasetId, userId, data, onInsightsGenerated }: SmartInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load cached insights from localStorage on mount, or generate if not cached
  useEffect(() => {
    if (datasetId && data && data.length > 0) {
      const cacheKey = `insights_${datasetId}_${userId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { insights: cachedInsights, timestamp } = JSON.parse(cached);
          setInsights(cachedInsights);
          setLastUpdated(timestamp);
          // Notify parent of cached insights
          if (onInsightsGenerated) {
            onInsightsGenerated(cachedInsights);
          }
        } catch (error) {
          console.error('Error loading cached insights:', error);
          // If cache is corrupted, generate fresh insights
          generateInsights();
        }
      } else {
        // No cache found, generate insights
        generateInsights();
      }
    }
  }, [datasetId, userId, data]);

  const generateInsights = async () => {
    if (!data || data.length === 0) {
      console.warn('No data available for insights');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          userId,
          sampleData: data, // Send full dataset
        }),
      });

      const result = await response.json();

      if (response.ok && result.insights) {
        setInsights(result.insights);

        // Cache insights in localStorage
        const timestamp = new Date().toISOString();
        const cacheKey = `insights_${datasetId}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          insights: result.insights,
          timestamp
        }));
        setLastUpdated(timestamp);

        // Notify parent of new insights
        if (onInsightsGenerated) {
          onInsightsGenerated(result.insights);
        }
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-semibold text-blue-900">Smart Insights ({insights.length})</span>
          </div>
          <svg className="w-5 h-5 text-blue-600 transform group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-blue-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Smart Insights
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            AI-powered insights automatically detected from your data
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
          <span className="ml-3 text-blue-700">Analyzing your data...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-blue-700">Generating insights...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 bg-white rounded-lg border-2 ${
                insight.impact === 'high'
                  ? 'border-red-300'
                  : insight.impact === 'medium'
                  ? 'border-orange-300'
                  : 'border-green-300'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${insight.color}`}>
                  <span className="text-2xl">{insight.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-neutral-900 mb-1">{insight.title}</h4>
                  <p className="text-sm text-neutral-700">{insight.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        insight.impact === 'high'
                          ? 'bg-red-100 text-red-700'
                          : insight.impact === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {insight.impact.toUpperCase()} IMPACT
                    </span>
                    <span className="text-xs text-neutral-500 capitalize">{insight.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={generateInsights}
          disabled={loading}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate Insights
        </button>
        {lastUpdated && (
          <p className="text-xs text-blue-700">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
}
