import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import {
  forecastLinear,
  extractTimeSeries,
  generateForecastPoints,
  formatForecastSummary,
  detectNumericColumns,
  detectDateColumns,
} from '@/utils/forecasting';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, dateColumn, valueColumn, periods = 30 } = await request.json();

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check Redis cache first
    const cacheKey = `forecast:${datasetId}:${dateColumn || 'auto'}:${valueColumn || 'auto'}:${periods}`;
    try {
      const cachedForecast = await getCachedAIResponse(cacheKey);
      if (cachedForecast) {
        console.log(`[Forecast] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          forecast: cachedForecast,
          cached: true,
        });
      }
      console.log(`[Forecast] Cache MISS for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Forecast] Redis cache error:', cacheError);
    }

    const supabase = getServiceSupabase();

    // Fetch dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 403 }
      );
    }

    // Parse data rows
    const dataRows = dataset.data_rows.map((row: string) =>
      typeof row === 'string' ? JSON.parse(row) : row
    );

    // Auto-detect columns if not provided
    let actualDateColumn = dateColumn;
    let actualValueColumn = valueColumn;

    if (!actualDateColumn) {
      const dateCols = detectDateColumns(dataRows);
      actualDateColumn = dateCols[0] || dataset.column_names[0];
    }

    if (!actualValueColumn) {
      const numericCols = detectNumericColumns(dataRows);
      actualValueColumn = numericCols[0] || dataset.column_names[1];
    }

    // Extract time series
    const timeSeries = extractTimeSeries(dataRows, actualDateColumn, actualValueColumn);

    if (timeSeries.length < 2) {
      return NextResponse.json(
        { error: 'Not enough data points for forecasting (minimum 2 required)' },
        { status: 400 }
      );
    }

    // Get values for forecasting
    const values = timeSeries.map((point) => point.value);

    // Perform forecast
    const forecasts = forecastLinear(values, Math.min(periods, 90)); // Max 90 days

    // Generate forecast data points
    const forecastPoints = generateForecastPoints(timeSeries, forecasts, 'daily');

    // Combine historical + forecast
    const allPoints = [...timeSeries, ...forecastPoints];

    // Generate AI insights
    const forecastSummary = formatForecastSummary(forecasts, actualValueColumn);

    const aiPrompt = `Analyze this forecast and provide 3-5 actionable insights:

${forecastSummary}

Historical data points: ${timeSeries.length}
Forecast horizon: ${periods} periods

Provide insights in this format:
INSIGHTS:
- [Brief, actionable insight 1]
- [Brief, actionable insight 2]
- [Brief, actionable insight 3]

Keep each insight to one sentence. Focus on business implications.`;

    let aiInsights = 'Forecast generated. Trend analysis in progress.';

    try {
      const apiKey = getGeminiKey('FORECAST');
      if (!apiKey) {
        console.warn('No Gemini API keys available, skipping AI insights');
      } else {
        const aiResponse = await callGemini(aiPrompt, apiKey);
        const insightsMatch = aiResponse.match(/INSIGHTS:([\s\S]*)/);
        if (insightsMatch) {
          aiInsights = insightsMatch[1].trim();
        }
      }
    } catch (error) {
      console.error('AI insights error:', error);
      // Continue without AI insights
    }

    const forecastResult = {
      dateColumn: actualDateColumn,
      valueColumn: actualValueColumn,
      historicalPoints: timeSeries.length,
      forecastPoints: forecasts.length,
      data: allPoints,
      summary: {
        trend: forecasts[0].trend,
        confidence: forecasts[0].confidence,
        changePercent: forecasts[forecasts.length - 1].changePercent,
        avgPredicted:
          forecasts.reduce((sum, f) => sum + f.predicted, 0) / forecasts.length,
      },
      insights: aiInsights,
    };

    // Cache the forecast for future requests (12 hour TTL)
    try {
      const AI_CACHE_TTL = 12 * 60 * 60; // 12 hours
      await cacheAIResponse(cacheKey, forecastResult, AI_CACHE_TTL);
      console.log(`[Forecast] ✅ Cached forecast for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Forecast] Failed to cache forecast:', cacheError);
    }

    return NextResponse.json({
      success: true,
      forecast: forecastResult,
      cached: false,
    });
  } catch (error) {
    console.error('Forecast error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
