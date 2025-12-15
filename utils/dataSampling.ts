/**
 * Data Sampling Utilities for Large Datasets
 * All algorithms are 100% FREE - no API calls required
 *
 * Algorithms:
 * 1. LTTB (Largest Triangle Three Buckets) - for time-series data
 * 2. Smart Categorical Sampling - for categorical data
 * 3. Stratified Sampling - ensures representation across categories
 */

export interface SamplingResult {
  data: any[];
  originalCount: number;
  sampledCount: number;
  algorithm: string;
}

/**
 * Largest Triangle Three Buckets (LTTB) Algorithm
 *
 * Industry-standard downsampling for time-series visualization
 * Used by: Grafana, Plotly, Trading View, and other major platforms
 *
 * Benefits:
 * - Preserves visual shape of data
 * - Keeps peaks, valleys, and inflection points
 * - Deterministic (same input = same output)
 *
 * @param data - Full dataset
 * @param threshold - Target number of points (e.g., 1000)
 * @param xKey - Column name for X-axis (optional, uses index if not provided)
 * @param yKey - Column name for Y-axis (required)
 * @returns Downsampled data with threshold points
 */
export function downsampleLTTB(
  data: any[],
  threshold: number,
  xKey?: string,
  yKey?: string
): any[] {
  // If data is smaller than threshold, return as-is
  if (data.length <= threshold) {
    return data;
  }

  // Auto-detect numeric column if yKey not provided
  if (!yKey) {
    const firstRow = data[0];
    const numericCol = Object.keys(firstRow).find(key => {
      const val = firstRow[key];
      return typeof val === 'number' || !isNaN(Number(val));
    });
    yKey = numericCol || Object.keys(firstRow)[1] || Object.keys(firstRow)[0];
  }

  const sampled: any[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Always include the first point
  sampled.push(data[0]);

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (for triangle area)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = Math.min(avgRangeEnd - avgRangeStart, data.length - avgRangeStart);

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < Math.min(avgRangeEnd, data.length); j++) {
      const xVal = xKey ? (data[j][xKey] || j) : j;
      const yVal = Number(data[j][yKey] || 0);
      avgX += xVal;
      avgY += yVal;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;

    // Point a (previous selected point)
    const pointAX = xKey ? (sampled[sampled.length - 1][xKey] || sampled.length - 1) : sampled.length - 1;
    const pointAY = Number(sampled[sampled.length - 1][yKey] || 0);

    let maxArea = -1;
    let maxAreaPoint = data[rangeStart];

    // Find point in current bucket that forms largest triangle
    for (let j = rangeStart; j < Math.min(rangeEnd, data.length); j++) {
      const pointX = xKey ? (data[j][xKey] || j) : j;
      const pointY = Number(data[j][yKey] || 0);

      // Calculate triangle area using coordinates
      const area = Math.abs(
        (pointAX - avgX) * (pointY - pointAY) -
        (pointAX - pointX) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[j];
      }
    }

    sampled.push(maxAreaPoint);
  }

  // Always include the last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Smart sampling for categorical/mixed data
 *
 * Strategy:
 * - Evenly distributed sampling across dataset
 * - Ensures representation from beginning, middle, and end
 * - Better than random sampling for ordered data
 *
 * @param data - Full dataset
 * @param maxPoints - Maximum points to return
 * @returns Evenly sampled data
 */
export function smartCategoricalSample(data: any[], maxPoints: number = 1000): any[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const samples: any[] = [];
  const interval = data.length / maxPoints;

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * interval);
    samples.push(data[index]);
  }

  // Always include last point if not already included
  if (samples[samples.length - 1] !== data[data.length - 1]) {
    samples[samples.length - 1] = data[data.length - 1];
  }

  return samples;
}

/**
 * Stratified sampling - ensures representation across categories
 *
 * Useful when you have categorical data and want to ensure
 * each category is represented proportionally in the sample
 *
 * @param data - Full dataset
 * @param stratifyColumn - Column to stratify by
 * @param maxPoints - Maximum points to return
 * @returns Stratified sample
 */
export function stratifiedSample(
  data: any[],
  stratifyColumn: string,
  maxPoints: number = 1000
): any[] {
  if (data.length <= maxPoints) {
    return data;
  }

  // Group data by category
  const groups = new Map<string, any[]>();
  data.forEach(row => {
    const category = String(row[stratifyColumn] || 'Unknown');
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(row);
  });

  // Calculate samples per group (proportional)
  const samples: any[] = [];
  groups.forEach((groupData, category) => {
    const proportion = groupData.length / data.length;
    const groupSampleSize = Math.max(1, Math.floor(maxPoints * proportion));

    // Sample from this group
    const interval = groupData.length / groupSampleSize;
    for (let i = 0; i < groupSampleSize && samples.length < maxPoints; i++) {
      const index = Math.floor(i * interval);
      samples.push(groupData[index]);
    }
  });

  return samples;
}

/**
 * Auto-detect best sampling strategy based on data characteristics
 *
 * @param data - Full dataset
 * @param columns - Column names
 * @param threshold - Target sample size
 * @returns Sampling result with metadata
 */
export function autoSample(
  data: any[],
  columns: string[],
  threshold: number = 1000
): SamplingResult {
  if (data.length <= threshold) {
    return {
      data,
      originalCount: data.length,
      sampledCount: data.length,
      algorithm: 'none',
    };
  }

  // Detect data characteristics
  const firstRow = data[0];
  const numericColumns = columns.filter(col => {
    const val = firstRow[col];
    return typeof val === 'number' || !isNaN(Number(val));
  });

  const hasMultipleNumeric = numericColumns.length >= 2;
  const hasTimeColumn = columns.some(col =>
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('time') ||
    col.toLowerCase().includes('timestamp')
  );

  // Choose best algorithm
  let sampledData: any[];
  let algorithm: string;

  if (hasTimeColumn && numericColumns.length > 0) {
    // Time-series data: use LTTB
    const timeCol = columns.find(col =>
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('time')
    );
    sampledData = downsampleLTTB(data, threshold, timeCol, numericColumns[0]);
    algorithm = 'LTTB';
  } else if (hasMultipleNumeric) {
    // Numeric data: use LTTB on first two numeric columns
    sampledData = downsampleLTTB(data, threshold, numericColumns[0], numericColumns[1]);
    algorithm = 'LTTB';
  } else {
    // Categorical/mixed: use smart categorical sampling
    sampledData = smartCategoricalSample(data, threshold);
    algorithm = 'Uniform';
  }

  return {
    data: sampledData,
    originalCount: data.length,
    sampledCount: sampledData.length,
    algorithm,
  };
}

/**
 * Aggregate data by category
 *
 * @param data - Full dataset
 * @param groupByColumn - Column to group by
 * @param valueColumn - Column to aggregate
 * @param method - Aggregation method
 * @returns Aggregated data
 */
export function aggregateByCategory(
  data: any[],
  groupByColumn: string,
  valueColumn: string,
  method: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'
): any[] {
  const groups = new Map<string, number[]>();

  // Group values
  data.forEach(row => {
    const key = String(row[groupByColumn] || 'Unknown');
    const value = Number(row[valueColumn] || 0);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(value);
  });

  // Aggregate
  const result: any[] = [];
  groups.forEach((values, key) => {
    let aggregatedValue: number;

    switch (method) {
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

    result.push({
      [groupByColumn]: key,
      [valueColumn]: aggregatedValue,
      _count: values.length,
    });
  });

  // Sort by value descending
  return result.sort((a, b) => b[valueColumn] - a[valueColumn]);
}

/**
 * Get top N categories by value
 *
 * @param data - Full dataset
 * @param categoryColumn - Category column
 * @param valueColumn - Value column
 * @param topN - Number of top categories
 * @param method - Aggregation method
 * @returns Top N categories
 */
export function getTopCategories(
  data: any[],
  categoryColumn: string,
  valueColumn: string,
  topN: number = 10,
  method: 'sum' | 'avg' | 'count' = 'sum'
): any[] {
  const aggregated = aggregateByCategory(data, categoryColumn, valueColumn, method);
  return aggregated.slice(0, topN);
}
