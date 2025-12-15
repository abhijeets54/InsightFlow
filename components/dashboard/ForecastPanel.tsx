'use client';

import { useState } from 'react';
import Card from '../ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ForecastPanelProps {
  datasetId: string;
  userId: string;
  columns: string[];
  onForecastGenerated?: (forecast: any) => void;
}

export default function ForecastPanel({ datasetId, userId, columns, onForecastGenerated }: ForecastPanelProps) {
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [periods, setPeriods] = useState(30);
  const [showPanel, setShowPanel] = useState(true);

  const handleGenerateForecast = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          userId,
          periods,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate forecast');
      }

      setForecastData(data.forecast);

      // Notify parent of new forecast
      if (onForecastGenerated) {
        onForecastGenerated(data.forecast);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-medium hover:shadow-large font-semibold flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        AI Forecast
      </button>
    );
  }

  return (
    <Card className="mt-6 shadow-large border-2 border-purple-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            AI-Powered Trend Forecasting
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            Predict future trends based on historical data using machine learning
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

      {!forecastData ? (
        <>
          {/* Controls */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-900 mb-2">
              Forecast Periods (Days)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={periods}
                onChange={(e) => setPeriods(Math.min(90, Math.max(1, parseInt(e.target.value) || 30)))}
                min="1"
                max="90"
                className="flex-1 px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleGenerateForecast}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Forecasting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Forecast
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-600 mt-2">
              Forecast up to 90 periods ahead. AI will analyze trends and predict future values.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-purple-900 mb-1">How AI Forecasting Works</p>
                <ul className="text-xs text-purple-800 space-y-1">
                  <li>• Analyzes historical patterns using linear regression</li>
                  <li>• Calculates trend direction and confidence levels</li>
                  <li>• Generates AI insights about business implications</li>
                  <li>• Works best with time-series data (sales, revenue, metrics)</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 mb-1">Trend</p>
                <p className="text-2xl font-bold text-purple-900 capitalize">{forecastData.summary.trend}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-blue-900 capitalize">{forecastData.summary.confidence}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 mb-1">Expected Change</p>
                <p className="text-2xl font-bold text-green-900">
                  {forecastData.summary.changePercent > 0 ? '+' : ''}
                  {forecastData.summary.changePercent.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 mb-1">Avg Predicted</p>
                <p className="text-2xl font-bold text-orange-900">{forecastData.summary.avgPredicted.toFixed(2)}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <h4 className="text-sm font-semibold text-neutral-900 mb-4">
                Historical Data + {forecastData.forecastPoints} Day Forecast
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData.data}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    name="Actual/Predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* AI Insights */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2">AI Insights</h4>
                  <div className="text-sm text-purple-800 whitespace-pre-line">
                    {forecastData.insights}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setForecastData(null)}
                className="flex-1 px-4 py-2 border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all font-semibold"
              >
                Generate New Forecast
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
