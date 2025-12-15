/**
 * Page Context Collectors
 * Captures page-specific context to personalize AI chat responses
 */

export interface BasePageContext {
  pageType: 'analytics' | 'visualizations' | 'general';
  timestamp: number;
  sessionId: string;
  userActivity: ActivityLog[];
  focusArea?: string;
}

export interface ActivityLog {
  timestamp: number;
  action: 'viewed' | 'clicked' | 'hovered' | 'changed' | 'expanded' | 'collapsed';
  target: string;
  metadata?: any;
}

export interface AnalyticsContext extends BasePageContext {
  pageType: 'analytics';
  insights: {
    type: string;
    title: string;
    description: string;
    impact: string;
  }[];
  forecast: {
    available: boolean;
    trend?: string;
    confidence?: number;
    summary?: string;
    predictions?: any[];
  } | null;
  statistics: {
    rowCount: number;
    columnCount: number;
    columns: string[];
    dateRange?: string;
    keyMetrics?: Record<string, any>;
  };
  visiblePanels: string[];
  timeOnPage: number;
}

export interface VisualizationsContext extends BasePageContext {
  pageType: 'visualizations';
  currentChart: {
    type: string;
    columns: string[];
    aggregation?: string;
    dataPoints: number;
    topValues?: any[];
    visibleRange?: { min: any; max: any };
  };
  appliedFilters: {
    column: string;
    operator: string;
    value: any;
    value2?: any;
  }[];
  selectedColumns: string[];
  chartData: any[];
  recommendations: string[];
  chartHistory: string[];
  comparisonMode: boolean;
}

// Session management
let currentSessionId: string | null = null;
let activityLog: ActivityLog[] = [];
let pageLoadTime: number = Date.now();

export function initializeSession(): string {
  if (!currentSessionId) {
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  pageLoadTime = Date.now();
  activityLog = [];
  return currentSessionId;
}

export function getSessionId(): string {
  if (!currentSessionId) {
    return initializeSession();
  }
  return currentSessionId;
}

export function trackActivity(action: ActivityLog['action'], target: string, metadata?: any) {
  activityLog.push({
    timestamp: Date.now(),
    action,
    target,
    metadata,
  });

  // Keep only last 50 activities
  if (activityLog.length > 50) {
    activityLog = activityLog.slice(-50);
  }
}

export function getActivityLog(): ActivityLog[] {
  return [...activityLog];
}

export function getRecentActivity(limit: number = 10): ActivityLog[] {
  return activityLog.slice(-limit);
}

/**
 * Analytics Page Context Collector
 */
export function collectAnalyticsContext(
  insights: any[],
  forecastData: any | null,
  uploadedData: any,
  visiblePanels: string[] = []
): AnalyticsContext {
  const timeOnPage = Math.floor((Date.now() - pageLoadTime) / 1000);

  // Process insights
  const processedInsights = insights.map((insight) => ({
    type: insight.type || 'general',
    title: insight.title || 'Insight',
    description: insight.description || '',
    impact: insight.impact || 'medium',
  }));

  // Process forecast
  const forecast = forecastData
    ? {
        available: true,
        trend: forecastData.trend || 'stable',
        confidence: forecastData.confidence || 0.5,
        summary: forecastData.summary || 'Forecast available',
        predictions: forecastData.predictions || [],
      }
    : null;

  // Detect date range from data
  const dateRange = detectDateRange(uploadedData?.preview?.fullData || uploadedData?.preview?.sampleRows || []);

  // Extract key metrics
  const keyMetrics = extractKeyMetrics(uploadedData?.preview?.fullData || uploadedData?.preview?.sampleRows || []);

  return {
    pageType: 'analytics',
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userActivity: getRecentActivity(10),
    focusArea: detectFocusArea(visiblePanels),

    insights: processedInsights,
    forecast,
    statistics: {
      rowCount: uploadedData?.preview?.rowCount || 0,
      columnCount: uploadedData?.preview?.columnCount || 0,
      columns: uploadedData?.preview?.columns || [],
      dateRange,
      keyMetrics,
    },
    visiblePanels,
    timeOnPage,
  };
}

/**
 * Visualizations Page Context Collector
 */
export function collectVisualizationsContext(
  chartType: string,
  selectedColumns: string[],
  chartData: any[],
  filters: any[] = [],
  aggregation: string = 'none',
  chartHistory: string[] = []
): VisualizationsContext {
  // Get top values from chart data
  const topValues = getTopValuesFromChart(chartData, selectedColumns[0]);

  // Generate recommendations
  const recommendations = generateChartRecommendations(chartType, selectedColumns, chartData.length);

  return {
    pageType: 'visualizations',
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userActivity: getRecentActivity(10),

    currentChart: {
      type: chartType,
      columns: selectedColumns,
      aggregation,
      dataPoints: chartData.length,
      topValues,
      visibleRange: getVisibleRange(chartData, selectedColumns[1]),
    },
    appliedFilters: filters.map((f) => ({
      column: f.column,
      operator: f.operator,
      value: f.value,
      value2: f.value2,
    })),
    selectedColumns,
    chartData: chartData, // Full dataset for context
    recommendations,
    chartHistory,
    comparisonMode: false,
  };
}

/**
 * Helper: Detect date range from data
 */
function detectDateRange(data: any[]): string | undefined {
  if (!data || data.length === 0) return undefined;

  // Look for date columns
  const dateColumns = Object.keys(data[0] || {}).filter((col) =>
    /date|time|timestamp/i.test(col)
  );

  if (dateColumns.length === 0) return undefined;

  const dateCol = dateColumns[0];
  const dates = data
    .map((row) => new Date(row[dateCol]))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return undefined;

  const minDate = dates[0].toLocaleDateString();
  const maxDate = dates[dates.length - 1].toLocaleDateString();

  return `${minDate} - ${maxDate}`;
}

/**
 * Helper: Extract key metrics from data
 */
function extractKeyMetrics(data: any[]): Record<string, any> {
  if (!data || data.length === 0) return {};

  const metrics: Record<string, any> = {};
  const columns = Object.keys(data[0] || {});

  // Find numeric columns and calculate totals/averages
  columns.forEach((col) => {
    const values = data.map((row) => row[col]).filter((v) => !isNaN(parseFloat(v)));

    if (values.length > 0) {
      const numbers = values.map((v) => parseFloat(v));
      metrics[`total_${col}`] = numbers.reduce((a, b) => a + b, 0);
      metrics[`avg_${col}`] = metrics[`total_${col}`] / numbers.length;
      metrics[`max_${col}`] = Math.max(...numbers);
      metrics[`min_${col}`] = Math.min(...numbers);
    }
  });

  return metrics;
}

/**
 * Helper: Detect what section user is focused on
 */
function detectFocusArea(visiblePanels: string[]): string {
  const recentActivity = getRecentActivity(5);

  // Check recent clicks/hovers
  const recentTargets = recentActivity.map((a) => a.target);

  if (recentTargets.some((t) => t.includes('forecast'))) return 'Forecast Panel';
  if (recentTargets.some((t) => t.includes('insight'))) return 'Insights Panel';
  if (recentTargets.some((t) => t.includes('stats'))) return 'Statistics Cards';

  // Fallback to visible panels
  if (visiblePanels.includes('forecast')) return 'Forecast Panel';
  if (visiblePanels.includes('insights')) return 'Insights Panel';

  return 'Overview';
}

/**
 * Helper: Get top values from chart data
 */
function getTopValuesFromChart(data: any[], column: string): any[] {
  if (!data || data.length === 0 || !column) return [];

  const values = data.map((row) => row[column]);
  const uniqueValues = [...new Set(values)];

  // For numeric data, get top 5 highest
  if (!isNaN(parseFloat(values[0]))) {
    return uniqueValues
      .map((v) => parseFloat(v))
      .sort((a, b) => b - a)
      .slice(0, 5);
  }

  // For categorical data, get top 5 most frequent
  const counts: Record<string, number> = {};
  values.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value]) => value);
}

/**
 * Helper: Get visible range from chart data
 */
function getVisibleRange(data: any[], column?: string): { min: any; max: any } | undefined {
  if (!data || data.length === 0 || !column) return undefined;

  const values = data.map((row) => row[column]).filter((v) => v !== null && v !== undefined);

  if (values.length === 0) return undefined;

  // For numeric data
  if (!isNaN(parseFloat(values[0]))) {
    const numbers = values.map((v) => parseFloat(v));
    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  }

  return undefined;
}

/**
 * Helper: Generate chart recommendations
 */
function generateChartRecommendations(chartType: string, columns: string[], dataPoints: number): string[] {
  const recommendations: string[] = [];

  // Based on chart type
  if (chartType === 'pie' && dataPoints > 10) {
    recommendations.push('Consider a bar chart for better readability with many categories');
  }

  if (chartType === 'bar' && columns.some((c) => /date|time/i.test(c))) {
    recommendations.push('Try a line chart to see trends over time');
  }

  if (chartType === 'line' && columns.length > 2) {
    recommendations.push('Add another metric for comparison (multi-line chart)');
  }

  // Based on data points
  if (dataPoints > 100) {
    recommendations.push('Consider filtering or aggregating data for clearer visualization');
  }

  if (dataPoints < 10) {
    recommendations.push('You might want to remove some filters to see more data');
  }

  // Generic suggestions
  recommendations.push('Ask me to recommend the best chart type for your data');

  return recommendations;
}

/**
 * Helper: Detect chart type change
 */
export function detectChartChange(previousType: string, newType: string): string {
  return `Changed from ${previousType} to ${newType} chart`;
}

/**
 * Context cache for performance
 */
const contextCache = new Map<string, { context: any; timestamp: number }>();

export function cacheContext(key: string, context: any, ttl: number = 60000) {
  contextCache.set(key, {
    context,
    timestamp: Date.now(),
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    contextCache.delete(key);
  }, ttl);
}

export function getCachedContext(key: string): any | null {
  const cached = contextCache.get(key);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > 60000) {
    contextCache.delete(key);
    return null;
  }

  return cached.context;
}
