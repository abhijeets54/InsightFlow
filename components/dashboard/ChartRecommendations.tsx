'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';

interface ChartRecommendation {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  title: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  icon: string;
  columns: string[];
}

interface ChartRecommendationsProps {
  datasetId: string;
  userId: string;
  columns: string[];
  data: any[];
  onApplyRecommendation?: (type: string, columns: string[]) => void;
}

export default function ChartRecommendations({
  datasetId,
  userId,
  columns,
  data,
  onApplyRecommendation,
}: ChartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ChartRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (showPanel && columns.length > 0 && data.length > 0) {
      generateRecommendations();
    }
  }, [showPanel, columns, data]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chart-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          userId,
          columns,
          sampleData: data,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setRecommendations(result.recommendations);
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-medium hover:shadow-large font-semibold flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        AI Chart Suggestions
      </button>
    );
  }

  return (
    <Card className="mb-6 shadow-large border-2 border-blue-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI-Powered Chart Recommendations
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            Smart suggestions based on your data characteristics
          </p>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-neutral-600">Analyzing your data...</p>
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-600">No recommendations available. Try selecting more columns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-medium cursor-pointer ${
                rec.confidence === 'high'
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
                  : rec.confidence === 'medium'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
                  : 'bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-300'
              }`}
              onClick={() => onApplyRecommendation?.(rec.type, rec.columns)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rec.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">{rec.title}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rec.confidence === 'high'
                          ? 'bg-green-200 text-green-800'
                          : rec.confidence === 'medium'
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {rec.confidence} confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <p className="text-xs text-neutral-700 mb-3">{rec.reason}</p>

              {/* Columns */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-neutral-900 mb-1">Recommended columns:</p>
                <div className="flex flex-wrap gap-1">
                  {rec.columns.slice(0, 3).map((col, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700"
                    >
                      {col}
                    </span>
                  ))}
                  {rec.columns.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700">
                      +{rec.columns.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyRecommendation?.(rec.type, rec.columns);
                }}
                className="w-full px-3 py-2 bg-white border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-all text-sm font-semibold"
              >
                Apply Recommendation
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-blue-900">How AI Recommendations Work</p>
            <p className="text-xs text-blue-800 mt-1">
              Our AI analyzes your data types, distributions, and relationships to suggest the most effective visualizations. Click any card to apply.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
