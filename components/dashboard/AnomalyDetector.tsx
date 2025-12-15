'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';

interface AnomalyDetectorProps {
  data: any[];
  columns?: string[];
}

export default function AnomalyDetector({ data, columns }: AnomalyDetectorProps) {
  const [anomalies, setAnomalies] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (data.length > 0) {
      detectAnomalies();
    }
  }, [data]);

  const detectAnomalies = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/anomaly-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data.slice(0, 1000), // Analyze up to 1000 rows
          columns
        })
      });

      const result = await response.json();

      if (result.success) {
        setAnomalies(result);
        if (result.summary.totalAnomalies > 0) {
          setCollapsed(false); // Auto-expand if anomalies found
        }
      }
    } catch (error) {
      console.error('[Anomaly Detector] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-3 border-purple-200 border-t-purple-600"></div>
          <p className="text-sm font-medium text-gray-700">Scanning for anomalies...</p>
        </div>
      </Card>
    );
  }

  if (!anomalies || anomalies.summary.totalAnomalies === 0) {
    return (
      <Card className="bg-green-50 border-green-200 shadow-soft">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">No Significant Anomalies Detected</p>
            <p className="text-xs text-green-600">Your data appears clean and consistent</p>
          </div>
        </div>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 border-red-300';
      case 'medium': return 'text-orange-600 bg-orange-100 border-orange-300';
      default: return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟠';
      default: return '🟡';
    }
  };

  if (collapsed) {
    return (
      <Card className="shadow-medium border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 cursor-pointer hover:shadow-large transition-shadow" onClick={() => setCollapsed(false)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {anomalies.summary.totalAnomalies} Anomalies Detected
              </p>
              <p className="text-xs text-amber-700">
                Found in {anomalies.summary.columnsWithAnomalies} columns
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-large border-2 border-amber-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Anomaly Detection Report</h3>
            <p className="text-sm text-gray-600">
              {anomalies.summary.totalAnomalies} outliers found in {anomalies.summary.columnsWithAnomalies} columns
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Anomalies by Column */}
      <div className="space-y-4">
        {anomalies.anomalies.map((columnData: any, index: number) => (
          <div key={index} className="bg-white rounded-xl p-4 border-2 border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-800">
                📊 {columnData.column}
              </h4>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                {columnData.count} outlier{columnData.count > 1 ? 's' : ''}
              </span>
            </div>

            {/* Top Anomalies */}
            <div className="space-y-2">
              {columnData.anomalies.slice(0, 5).map((anomaly: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getSeverityIcon(anomaly.severity)}</span>
                    <div>
                      <p className="text-sm font-semibold">
                        Value: <span className="font-mono">{anomaly.value.toFixed(2)}</span>
                      </p>
                      <p className="text-xs opacity-75">
                        Z-Score: {anomaly.zScore.toFixed(2)} ({anomaly.zScore > 4 ? 'Extreme' : anomaly.zScore > 3 ? 'Very High' : 'High'} deviation)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase">{anomaly.severity}</p>
                  </div>
                </div>
              ))}
            </div>

            {columnData.count > 5 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                + {columnData.count - 5} more outliers
              </p>
            )}
          </div>
        ))}
      </div>

      {/* AI Explanations */}
      {anomalies.explanations && anomalies.explanations.explanations && (
        <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 border border-purple-200">
          <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Analysis
          </h4>

          <div className="space-y-3">
            {anomalies.explanations.explanations.map((exp: any, index: number) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  {exp.column}
                </p>
                <p className="text-sm text-gray-700 mb-2">{exp.explanation}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                    Likely: {exp.likelyReason.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600">→ {exp.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500 flex items-center gap-1 pt-4 border-t border-gray-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p>Anomalies detected using Z-score method (threshold: 2.5σ). Values beyond this threshold are statistical outliers.</p>
      </div>
    </Card>
  );
}
