'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { getNumericColumns } from '@/lib/statistical-utils';

interface DashboardSummaryProps {
  data: any[];
  chartType: string;
  selectedColumns: string[];
}

export default function DashboardSummary({ data, chartType, selectedColumns }: DashboardSummaryProps) {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (data.length > 0) {
      generateSummary();
    }
  }, [data, chartType, selectedColumns]);

  const generateSummary = () => {
    const numericCols = getNumericColumns(data);
    const stats: any = {
      totalRows: data.length,
      totalColumns: Object.keys(data[0]).length,
      numericColumns: numericCols.length,
      selectedColumns: selectedColumns.length,
      chartType
    };

    // Calculate quick stats for numeric columns
    numericCols.slice(0, 3).forEach(col => {
      const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          trend: values[values.length - 1] > values[0] ? 'up' : 'down'
        };
      }
    });

    setSummary(stats);
  };

  if (!summary) return null;

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '📈' : '📉';
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return '📊';
      case 'line': return '📈';
      case 'pie': return '🥧';
      case 'area': return '📉';
      case 'scatter': return '⚫';
      case 'heatmap': return '🌡️';
      case 'box-plot': return '📦';
      default: return '📊';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Main Summary Card */}
      <Card className="md:col-span-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-large">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Dashboard Summary</p>
            <h2 className="text-3xl font-bold mb-2">
              {summary.totalRows.toLocaleString()} Records
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                {summary.totalColumns} columns
              </span>
              <span className="flex items-center gap-1">
                {getChartIcon(summary.chartType)} {summary.chartType}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Numeric Columns Card */}
      <Card className="bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-medium">
        <div className="flex items-center justify-between mb-2">
          <p className="text-green-100 text-sm font-medium">Numeric Data</p>
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold mb-1">{summary.numericColumns}</div>
        <p className="text-sm text-green-100">Quantitative columns</p>
      </Card>

      {/* Selected Columns Card */}
      <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-medium">
        <div className="flex items-center justify-between mb-2">
          <p className="text-orange-100 text-sm font-medium">Visualizing</p>
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold mb-1">{summary.selectedColumns}</div>
        <p className="text-sm text-orange-100">Active columns</p>
      </Card>

      {/* Quick Stats for Top Columns */}
      {Object.keys(summary).filter(k => summary[k].avg !== undefined).length > 0 && (
        <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(summary)
            .filter(k => summary[k].avg !== undefined)
            .slice(0, 3)
            .map((col, index) => (
              <Card key={index} className="hover:shadow-medium transition-shadow border-l-4 border-blue-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Column</p>
                    <h4 className="text-sm font-bold text-gray-900 truncate">{col}</h4>
                  </div>
                  <span className="text-2xl">{getTrendIcon(summary[col].trend)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Average</p>
                    <p className="font-semibold text-gray-900">{summary[col].avg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Median</p>
                    <p className="font-semibold text-gray-900">{summary[col].median.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Min</p>
                    <p className="font-semibold text-gray-900">{summary[col].min.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Max</p>
                    <p className="font-semibold text-gray-900">{summary[col].max.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Range</span>
                    <span className="font-semibold text-gray-900">
                      {(summary[col].max - summary[col].min).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
