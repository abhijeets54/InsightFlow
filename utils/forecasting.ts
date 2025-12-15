// AI-powered trend forecasting utilities
// Uses simple linear regression + AI insights

export interface ForecastResult {
  predicted: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export interface ForecastDataPoint {
  date: string;
  value: number;
  isPrediction?: boolean;
}

/**
 * Simple Linear Regression
 * Fits a line: y = mx + b
 */
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTotal += Math.pow(data[i] - yMean, 2);
    ssResidual += Math.pow(data[i] - predicted, 2);
  }

  const r2 = 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

/**
 * Forecast future values using linear regression
 */
export function forecastLinear(
  historicalData: number[],
  periodsAhead: number = 30
): ForecastResult[] {
  const { slope, intercept, r2 } = linearRegression(historicalData);
  const lastIndex = historicalData.length - 1;
  const lastValue = historicalData[lastIndex];

  const forecasts: ForecastResult[] = [];

  for (let i = 1; i <= periodsAhead; i++) {
    const predicted = slope * (lastIndex + i) + intercept;
    const changePercent = ((predicted - lastValue) / lastValue) * 100;

    // Determine confidence based on R²
    let confidence: 'high' | 'medium' | 'low';
    if (r2 > 0.8) confidence = 'high';
    else if (r2 > 0.5) confidence = 'medium';
    else confidence = 'low';

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) trend = 'stable';
    else if (slope > 0) trend = 'increasing';
    else trend = 'decreasing';

    forecasts.push({
      predicted: Math.max(0, predicted), // No negative predictions
      confidence,
      trend,
      changePercent,
    });
  }

  return forecasts;
}

/**
 * Detect numeric columns in dataset
 */
export function detectNumericColumns(data: any[]): string[] {
  if (!data || data.length === 0) return [];

  const firstRow = data[0];
  const numericCols: string[] = [];

  for (const key in firstRow) {
    const value = firstRow[key];
    if (typeof value === 'number' && !isNaN(value)) {
      numericCols.push(key);
    } else if (typeof value === 'string') {
      // Try to parse as number
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        numericCols.push(key);
      }
    }
  }

  return numericCols;
}

/**
 * Detect date/time columns
 */
export function detectDateColumns(data: any[]): string[] {
  if (!data || data.length === 0) return [];

  const firstRow = data[0];
  const dateCols: string[] = [];

  for (const key in firstRow) {
    const value = String(firstRow[key]).toLowerCase();

    // Check if column name suggests it's a date
    if (
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('day') ||
      key.toLowerCase().includes('month') ||
      key.toLowerCase().includes('year')
    ) {
      dateCols.push(key);
      continue;
    }

    // Try to parse as date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      dateCols.push(key);
    }
  }

  return dateCols;
}

/**
 * Extract time series data from dataset
 */
export function extractTimeSeries(
  data: any[],
  dateColumn: string,
  valueColumn: string
): ForecastDataPoint[] {
  const sorted = [...data].sort((a, b) => {
    const dateA = new Date(a[dateColumn]).getTime();
    const dateB = new Date(b[dateColumn]).getTime();
    return dateA - dateB;
  });

  return sorted.map((row) => ({
    date: String(row[dateColumn]),
    value: parseFloat(row[valueColumn]) || 0,
    isPrediction: false,
  }));
}

/**
 * Generate forecast data points
 */
export function generateForecastPoints(
  historicalData: ForecastDataPoint[],
  forecasts: ForecastResult[],
  frequency: 'daily' | 'weekly' | 'monthly' = 'daily'
): ForecastDataPoint[] {
  if (historicalData.length === 0) return [];

  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecastPoints: ForecastDataPoint[] = [];

  forecasts.forEach((forecast, i) => {
    const newDate = new Date(lastDate);

    if (frequency === 'daily') {
      newDate.setDate(lastDate.getDate() + i + 1);
    } else if (frequency === 'weekly') {
      newDate.setDate(lastDate.getDate() + (i + 1) * 7);
    } else if (frequency === 'monthly') {
      newDate.setMonth(lastDate.getMonth() + i + 1);
    }

    forecastPoints.push({
      date: newDate.toISOString().split('T')[0],
      value: forecast.predicted,
      isPrediction: true,
    });
  });

  return forecastPoints;
}

/**
 * Calculate moving average for smoothing
 */
export function calculateMovingAverage(data: number[], window: number = 7): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]); // Not enough data for average yet
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / window;
      result.push(avg);
    }
  }

  return result;
}

/**
 * Detect seasonality in data (simple approach)
 */
export function detectSeasonality(data: number[]): {
  hasSeason: boolean;
  period?: number;
} {
  if (data.length < 14) return { hasSeason: false };

  // Simple autocorrelation check for weekly pattern (7 days)
  const checkPeriod = 7;
  if (data.length < checkPeriod * 2) return { hasSeason: false };

  let correlation = 0;
  const n = Math.floor(data.length / checkPeriod);

  for (let i = 0; i < n - 1; i++) {
    const val1 = data[i * checkPeriod];
    const val2 = data[(i + 1) * checkPeriod];
    correlation += Math.abs(val1 - val2) / val1;
  }

  const avgVariation = correlation / (n - 1);

  // If variation is low, there's likely a pattern
  if (avgVariation < 0.2) {
    return { hasSeason: true, period: checkPeriod };
  }

  return { hasSeason: false };
}

/**
 * Format forecast summary for AI prompt
 */
export function formatForecastSummary(
  forecasts: ForecastResult[],
  columnName: string
): string {
  const avgPrediction = forecasts.reduce((sum, f) => sum + f.predicted, 0) / forecasts.length;
  const trend = forecasts[0].trend;
  const confidence = forecasts[0].confidence;
  const changePercent = forecasts[forecasts.length - 1].changePercent;

  return `
Forecast Summary for "${columnName}":
- Trend: ${trend}
- Confidence: ${confidence}
- Average predicted value: ${avgPrediction.toFixed(2)}
- Expected change over next ${forecasts.length} periods: ${changePercent.toFixed(2)}%
- First prediction: ${forecasts[0].predicted.toFixed(2)}
- Last prediction: ${forecasts[forecasts.length - 1].predicted.toFixed(2)}
  `.trim();
}
