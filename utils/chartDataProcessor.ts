/**
 * Chart Data Processing Utilities
 *
 * Handles smart aggregation, sampling, and data preparation for different chart types.
 * Based on industry best practices:
 * - Pie charts: 5-7 slices max
 * - Bar charts: 30-50 bars max
 * - Line/Area: 1000-5000 points (LTTB sampling)
 * - Scatter: 10K-50K points
 */

import { autoSample } from './dataSampling';

// Chart-specific limits (based on research and best practices)
const CHART_LIMITS = {
  pie: 7,           // Max 7 slices (+ Others)
  bar: 30,          // Max 30 bars (+ Others)
  line: 2000,       // Max 2000 points (LTTB sampling)
  area: 2000,       // Max 2000 points (LTTB sampling)
  scatter: 10000,   // Max 10K points
  'stacked-bar': 20 // Max 20 categories for stacked
};

interface AggregationResult {
  data: any[];
  originalCount: number;
  displayCount: number;
  hasOthers: boolean;
  method: string;
}

/**
 * Smart aggregation for categorical charts (pie, bar)
 * Groups by category, shows top N, aggregates rest as "Others"
 */
export function aggregateCategoricalData(
  data: any[],
  categoryColumn: string,
  valueColumn: string,
  chartType: 'pie' | 'bar' | 'stacked-bar' = 'bar',
  aggregationMethod: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'
): AggregationResult {
  const limit = CHART_LIMITS[chartType];

  // Group by category
  const grouped: Record<string, number[]> = {};

  data.forEach(row => {
    const category = String(row[categoryColumn] || 'Unknown');
    const value = parseFloat(row[valueColumn]) || 0;

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(value);
  });

  // Aggregate each category
  const aggregated = Object.entries(grouped).map(([category, values]) => {
    let aggregatedValue: number;

    switch (aggregationMethod) {
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      default:
        aggregatedValue = values.reduce((a, b) => a + b, 0);
    }

    return {
      [categoryColumn]: category,
      [valueColumn]: aggregatedValue,
      _count: values.length, // Keep count for reference
    };
  });

  // Sort by value (descending)
  aggregated.sort((a, b) => b[valueColumn] - a[valueColumn]);

  const originalCount = aggregated.length;
  let hasOthers = false;
  let processedData = aggregated;

  // If more than limit, create "Others" category
  if (aggregated.length > limit) {
    const topN = aggregated.slice(0, limit);
    const rest = aggregated.slice(limit);

    // Aggregate "Others"
    const othersValue = rest.reduce((sum, item) => sum + item[valueColumn], 0);
    const othersCount = rest.reduce((sum, item) => sum + item._count, 0);

    processedData = [
      ...topN,
      {
        [categoryColumn]: 'Others',
        [valueColumn]: othersValue,
        _count: othersCount,
        _isOthers: true,
      }
    ];

    hasOthers = true;
  }

  return {
    data: processedData,
    originalCount,
    displayCount: processedData.length,
    hasOthers,
    method: `${aggregationMethod} (grouped by ${categoryColumn})`,
  };
}

/**
 * Smart sampling for time-series charts (line, area)
 * Uses LTTB algorithm to preserve visual shape
 */
export function sampleTimeSeriesData(
  data: any[],
  columns: string[],
  chartType: 'line' | 'area' = 'line'
): AggregationResult {
  const limit = CHART_LIMITS[chartType];

  if (data.length <= limit) {
    return {
      data,
      originalCount: data.length,
      displayCount: data.length,
      hasOthers: false,
      method: 'Full data (no sampling needed)',
    };
  }

  // Use existing LTTB sampling
  const samplingResult = autoSample(data, columns, limit);

  return {
    data: samplingResult.data,
    originalCount: data.length,
    displayCount: samplingResult.sampledCount,
    hasOthers: false,
    method: `${samplingResult.algorithm} (${data.length} → ${samplingResult.sampledCount} points)`,
  };
}

/**
 * Smart processing for scatter plots
 * Can handle more points, but still limit for performance
 */
export function processScatterData(
  data: any[],
  xColumn: string,
  yColumn: string
): AggregationResult {
  const limit = CHART_LIMITS.scatter;

  if (data.length <= limit) {
    return {
      data,
      originalCount: data.length,
      displayCount: data.length,
      hasOthers: false,
      method: 'Full data',
    };
  }

  // For scatter, use smart sampling (preserving outliers)
  const samplingResult = autoSample(data, [xColumn, yColumn], limit);

  return {
    data: samplingResult.data,
    originalCount: data.length,
    displayCount: samplingResult.sampledCount,
    hasOthers: false,
    method: `${samplingResult.algorithm} (preserving outliers)`,
  };
}

/**
 * Main function: Process data for any chart type
 * Automatically applies best processing method based on chart type
 */
export function processChartData(
  data: any[],
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar',
  options: {
    categoryColumn?: string;
    valueColumn?: string;
    xColumn?: string;
    yColumn?: string;
    aggregationMethod?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    columns?: string[];
  }
): AggregationResult {
  // Categorical charts (need aggregation)
  if (chartType === 'pie' || chartType === 'bar' || chartType === 'stacked-bar') {
    if (!options.categoryColumn || !options.valueColumn) {
      // Try to auto-detect columns
      const columns = Object.keys(data[0] || {});
      const categoryColumn = columns[0] || 'category';
      const valueColumn = columns[1] || 'value';

      console.warn(`[chartDataProcessor] Auto-detected columns: ${categoryColumn}, ${valueColumn}`);

      return aggregateCategoricalData(
        data,
        categoryColumn,
        valueColumn,
        chartType as 'pie' | 'bar' | 'stacked-bar',
        options.aggregationMethod || 'sum'
      );
    }

    return aggregateCategoricalData(
      data,
      options.categoryColumn,
      options.valueColumn,
      chartType as 'pie' | 'bar' | 'stacked-bar',
      options.aggregationMethod || 'sum'
    );
  }

  // Time-series charts (need sampling)
  if (chartType === 'line' || chartType === 'area') {
    const columns = options.columns || Object.keys(data[0] || {});
    return sampleTimeSeriesData(data, columns, chartType);
  }

  // Scatter plots
  if (chartType === 'scatter') {
    const xColumn = options.xColumn || Object.keys(data[0] || {})[0];
    const yColumn = options.yColumn || Object.keys(data[0] || {})[1];

    return processScatterData(data, xColumn, yColumn);
  }

  // Default: return as-is (should not reach here)
  return {
    data,
    originalCount: data.length,
    displayCount: data.length,
    hasOthers: false,
    method: 'No processing',
  };
}

/**
 * Get recommended chart types for given data
 * Based on data characteristics (categorical, numeric, time-series)
 */
export function getRecommendedChartTypes(
  data: any[],
  columns: string[]
): Array<{
  type: string;
  reason: string;
  confidence: number;
}> {
  if (!data || data.length === 0) {
    return [];
  }

  const recommendations: Array<{ type: string; reason: string; confidence: number }> = [];

  // Analyze data types
  const sampleRow = data[0];
  const numericColumns = columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'number' || !isNaN(parseFloat(value));
  });

  const categoricalColumns = columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'string' || typeof value === 'boolean';
  });

  // Detect if time-series (date column exists)
  const hasDateColumn = columns.some(col => {
    const value = String(sampleRow[col] || '').toLowerCase();
    return value.includes('date') || value.includes('time') || value.includes('year');
  });

  // Get unique values per column
  const uniqueValueCounts: Record<string, number> = {};
  columns.forEach(col => {
    const uniqueValues = new Set(data.map(row => row[col]));
    uniqueValueCounts[col] = uniqueValues.size;
  });

  // Recommendations logic

  // 1. Pie chart (if 1 categorical + 1 numeric, <20 unique categories)
  if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
    const catCol = categoricalColumns[0];
    if (uniqueValueCounts[catCol] <= 20) {
      recommendations.push({
        type: 'pie',
        reason: `Good for showing proportions of ${catCol} (${uniqueValueCounts[catCol]} categories)`,
        confidence: 0.8,
      });
    }
  }

  // 2. Bar chart (if categorical data)
  if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
    const catCol = categoricalColumns[0];
    recommendations.push({
      type: 'bar',
      reason: `Compare ${numericColumns[0]} across ${catCol} categories`,
      confidence: 0.9,
    });
  }

  // 3. Line chart (if time-series or sequential data)
  if (hasDateColumn && numericColumns.length >= 1) {
    recommendations.push({
      type: 'line',
      reason: `Visualize trends over time (${numericColumns.length} numeric columns)`,
      confidence: 0.95,
    });
  }

  // 4. Area chart (if time-series)
  if (hasDateColumn && numericColumns.length >= 1) {
    recommendations.push({
      type: 'area',
      reason: `Show cumulative trends over time`,
      confidence: 0.85,
    });
  }

  // 5. Scatter plot (if 2+ numeric columns)
  if (numericColumns.length >= 2) {
    recommendations.push({
      type: 'scatter',
      reason: `Explore correlation between ${numericColumns[0]} and ${numericColumns[1]}`,
      confidence: 0.8,
    });
  }

  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);

  return recommendations;
}

/**
 * Auto-detect best columns for visualization
 * Returns the most suitable category and value columns
 */
export function autoDetectColumns(
  data: any[],
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter'
): {
  categoryColumn: string | null;
  valueColumn: string | null;
  xColumn: string | null;
  yColumn: string | null;
} {
  if (!data || data.length === 0) {
    return {
      categoryColumn: null,
      valueColumn: null,
      xColumn: null,
      yColumn: null,
    };
  }

  const sampleRow = data[0];
  const columns = Object.keys(sampleRow);

  // Find categorical columns (strings, booleans)
  const categoricalColumns = columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'string' || typeof value === 'boolean';
  });

  // Find numeric columns
  const numericColumns = columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'number' || !isNaN(parseFloat(value));
  });

  // For categorical charts (pie, bar)
  if (chartType === 'pie' || chartType === 'bar') {
    return {
      categoryColumn: categoricalColumns[0] || columns[0],
      valueColumn: numericColumns[0] || columns[1],
      xColumn: null,
      yColumn: null,
    };
  }

  // For scatter plots
  if (chartType === 'scatter') {
    return {
      categoryColumn: null,
      valueColumn: null,
      xColumn: numericColumns[0] || columns[0],
      yColumn: numericColumns[1] || columns[1],
    };
  }

  // For time-series (line, area)
  const dateColumn = columns.find(col => {
    const value = String(sampleRow[col] || '').toLowerCase();
    return value.includes('date') || value.includes('time') || value.includes('year');
  });

  return {
    categoryColumn: dateColumn || columns[0],
    valueColumn: numericColumns[0] || columns[1],
    xColumn: dateColumn || columns[0],
    yColumn: numericColumns[0] || columns[1],
  };
}

export default {
  processChartData,
  aggregateCategoricalData,
  sampleTimeSeriesData,
  processScatterData,
  getRecommendedChartTypes,
  autoDetectColumns,
  CHART_LIMITS,
};
