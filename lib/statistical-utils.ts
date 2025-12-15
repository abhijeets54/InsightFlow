/**
 * Statistical Utilities for Advanced Data Visualization
 * Provides functions for correlation analysis, outlier detection, and statistical calculations
 */

export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  mean: number;
  stdDev: number;
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
  significantPairs: Array<{
    col1: string;
    col2: string;
    correlation: number;
    strength: 'strong' | 'moderate' | 'weak';
    direction: 'positive' | 'negative';
  }>;
}

export interface AnomalyDetectionResult {
  value: number;
  index: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  originalData: any;
}

/**
 * Calculate box plot statistics for a dataset
 */
export function calculateBoxPlot(values: number[]): BoxPlotData {
  if (values.length === 0) {
    return {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      outliers: [],
      mean: 0,
      stdDev: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Calculate quartiles
  const median = sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n / 4)];
  const q3 = sorted[Math.floor((3 * n) / 4)];

  // Calculate IQR and outlier boundaries
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Find outliers and true min/max
  const outliers: number[] = [];
  let min = sorted[0];
  let max = sorted[n - 1];

  sorted.forEach(value => {
    if (value < lowerBound || value > upperBound) {
      outliers.push(value);
    } else {
      if (value < min || min < lowerBound) min = value;
      if (value > max || max > upperBound) max = value;
    }
  });

  // Calculate mean and standard deviation
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    min,
    q1,
    median,
    q3,
    max,
    outliers,
    mean,
    stdDev
  };
}

/**
 * Calculate correlation coefficient between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  if (denominatorX === 0 || denominatorY === 0) return 0;

  return numerator / Math.sqrt(denominatorX * denominatorY);
}

/**
 * Generate correlation matrix for multiple columns
 */
export function generateCorrelationMatrix(
  data: any[],
  numericColumns: string[]
): CorrelationMatrix {
  const n = numericColumns.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const significantPairs: CorrelationMatrix['significantPairs'] = [];

  // Extract numeric values for each column
  const columnData: Record<string, number[]> = {};
  numericColumns.forEach(col => {
    columnData[col] = data
      .map(row => parseFloat(row[col]))
      .filter(val => !isNaN(val));
  });

  // Calculate correlation for each pair
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const correlation = calculateCorrelation(
          columnData[numericColumns[i]],
          columnData[numericColumns[j]]
        );
        matrix[i][j] = correlation;

        // Track significant correlations (avoid duplicates)
        if (i < j && Math.abs(correlation) > 0.3) {
          const absCorr = Math.abs(correlation);
          significantPairs.push({
            col1: numericColumns[i],
            col2: numericColumns[j],
            correlation,
            strength: absCorr > 0.7 ? 'strong' : absCorr > 0.5 ? 'moderate' : 'weak',
            direction: correlation > 0 ? 'positive' : 'negative'
          });
        }
      }
    }
  }

  // Sort significant pairs by correlation strength
  significantPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    columns: numericColumns,
    matrix,
    significantPairs
  };
}

/**
 * Detect anomalies using z-score method
 */
export function detectAnomalies(
  data: any[],
  column: string,
  threshold: number = 2.5
): AnomalyDetectionResult[] {
  const values = data
    .map((row, index) => ({ value: parseFloat(row[column]), index, row }))
    .filter(item => !isNaN(item.value));

  if (values.length === 0) return [];

  // Calculate mean and standard deviation
  const mean = values.reduce((sum, item) => sum + item.value, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return [];

  // Calculate z-scores and identify anomalies
  return values.map(item => {
    const zScore = Math.abs((item.value - mean) / stdDev);
    const isAnomaly = zScore > threshold;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (zScore > 4) severity = 'high';
    else if (zScore > 3) severity = 'medium';

    return {
      value: item.value,
      index: item.index,
      zScore,
      isAnomaly,
      severity,
      originalData: item.row
    };
  }).filter(result => result.isAnomaly);
}

/**
 * Calculate linear regression line
 */
export function calculateLinearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  r2: number;
  equation: string;
} {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0, r2: 0, equation: 'y = 0' };
  }

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const correlation = calculateCorrelation(x, y);
  const r2 = correlation * correlation;

  // Generate equation
  const sign = intercept >= 0 ? '+' : '';
  const equation = `y = ${slope.toFixed(2)}x ${sign}${intercept.toFixed(2)}`;

  return { slope, intercept, r2, equation };
}

/**
 * Extract numeric columns from dataset
 */
export function getNumericColumns(data: any[]): string[] {
  if (data.length === 0) return [];

  const firstRow = data[0];
  const numericCols: string[] = [];

  Object.keys(firstRow).forEach(key => {
    const values = data.slice(0, 100).map(row => row[key]);
    const numericValues = values.filter(val => !isNaN(parseFloat(val)) && val !== null && val !== '');

    // If >80% of values are numeric, consider it numeric
    if (numericValues.length / values.length > 0.8) {
      numericCols.push(key);
    }
  });

  return numericCols;
}

/**
 * Calculate percentiles
 */
export function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
