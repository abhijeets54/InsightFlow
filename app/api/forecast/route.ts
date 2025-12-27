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

    // Use AI-powered column selection if columns not provided
    let actualDateColumn = dateColumn;
    let actualValueColumn = valueColumn;
    let industry = 'general';
    let columnSelectionReasoning = '';

    if (!actualDateColumn || !actualValueColumn) {
      try {
        // Call AI column selection API
        const columnSelectionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/forecast-column-selection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datasetId, userId }),
        });

        if (columnSelectionResponse.ok) {
          const columnSelection = await columnSelectionResponse.json();
          actualDateColumn = actualDateColumn || columnSelection.dateColumn;
          actualValueColumn = actualValueColumn || columnSelection.valueColumn;
          industry = columnSelection.industry || 'general';
          columnSelectionReasoning = columnSelection.reasoning || '';
          console.log('[Forecast] AI selected columns:', { actualDateColumn, actualValueColumn, industry });
        } else {
          throw new Error('AI column selection failed');
        }
      } catch (error) {
        console.error('[Forecast] AI column selection error, using fallback:', error);
        // Fallback to old method
        if (!actualDateColumn) {
          const dateCols = detectDateColumns(dataRows);
          actualDateColumn = dateCols[0] || dataset.column_names[0];
        }
        if (!actualValueColumn) {
          const numericCols = detectNumericColumns(dataRows);
          actualValueColumn = numericCols[0] || dataset.column_names[1];
        }
      }
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

    // Calculate historical patterns
    const historicalAvg = values.reduce((a, b) => a + b, 0) / values.length;
    const historicalMin = Math.min(...values);
    const historicalMax = Math.max(...values);
    const historicalRange = historicalMax - historicalMin;

    // Calculate variance and standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - historicalAvg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / historicalAvg) * 100;

    // Calculate growth rate
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const totalGrowth = ((lastValue - firstValue) / firstValue) * 100;
    const periodsCount = values.length - 1;
    const avgGrowthRate = periodsCount > 0 ? totalGrowth / periodsCount : 0;

    // Detect volatility
    let volatility = 'low';
    if (coefficientOfVariation > 50) volatility = 'high';
    else if (coefficientOfVariation > 20) volatility = 'moderate';

    // Detect seasonality (simple check for repeating patterns)
    let seasonalityPattern = 'none detected';
    if (values.length >= 7) {
      // Check for weekly patterns
      const weeklyAvg = values.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
      let weeklyPatternCount = 0;
      for (let i = 7; i < values.length; i += 7) {
        const weekAvg = values.slice(i, Math.min(i + 7, values.length)).reduce((a, b) => a + b, 0) / 7;
        if (Math.abs(weekAvg - weeklyAvg) < stdDev * 0.5) weeklyPatternCount++;
      }
      if (weeklyPatternCount > 2) seasonalityPattern = 'weekly pattern detected';
    }

    // Perform forecast with confidence intervals
    const forecasts = forecastLinear(values, Math.min(periods, 90)); // Max 90 days

    // Add confidence bounds (95% confidence interval)
    const forecastsWithBounds = forecasts.map((f, idx) => {
      const periodMultiplier = 1 + (idx * 0.1); // Uncertainty increases over time
      const margin = stdDev * 1.96 * periodMultiplier; // 95% CI
      return {
        ...f,
        lowerBound: f.predicted - margin,
        upperBound: f.predicted + margin,
        confidence: margin / f.predicted < 0.2 ? 'high' : margin / f.predicted < 0.5 ? 'medium' : 'low'
      };
    });

    // Generate forecast data points
    const forecastPoints = generateForecastPoints(timeSeries, forecastsWithBounds, 'daily');

    // Combine historical + forecast
    const allPoints = [...timeSeries, ...forecastPoints];

    // Get date range
    const firstDate = timeSeries[0]?.date || 'N/A';
    const lastDate = timeSeries[timeSeries.length - 1]?.date || 'N/A';

    // Generate AI insights with enhanced context
    const forecastSummary = formatForecastSummary(forecasts, actualValueColumn);

    const aiPrompt = `You are a ${industry} business analyst reviewing forecast data for ${actualValueColumn}.

DATASET CONTEXT:
- Industry: ${industry}
- Metric Being Forecasted: ${actualValueColumn}
- Column Selection Reasoning: ${columnSelectionReasoning || 'Auto-selected'}
- Historical Period: ${timeSeries.length} data points
- Date Range: ${firstDate} to ${lastDate}

HISTORICAL PATTERNS:
- Average Value: ${historicalAvg.toFixed(2)}
- Range: ${historicalMin.toFixed(2)} to ${historicalMax.toFixed(2)}
- Standard Deviation: ${stdDev.toFixed(2)}
- Volatility: ${volatility} (CV: ${coefficientOfVariation.toFixed(1)}%)
- Total Growth: ${totalGrowth.toFixed(1)}%
- Avg Growth Rate per Period: ${avgGrowthRate.toFixed(2)}%
- Seasonality: ${seasonalityPattern}

FORECAST RESULTS:
${forecastSummary}

Forecast Horizon: ${periods} periods ahead
Forecast Trend: ${forecasts[0]?.trend || 'unknown'}
Expected Change: ${forecasts[forecasts.length - 1]?.changePercent.toFixed(1)}%

TASK: Provide 5-7 actionable business insights in this exact format:

INSIGHTS:
- **Trend Interpretation**: [What's happening with ${actualValueColumn} and why based on historical patterns]
- **Business Impact**: [Specific business implications - revenue, risk, opportunities]
- **Confidence Assessment**: [How reliable is this forecast based on data quality and volatility]
- **Recommended Actions**: [Specific actions the business should take based on this forecast]
- **Risk Factors**: [Key assumptions and what could invalidate this forecast]
- **${industry}-Specific Insight**: [Industry-specific observation or recommendation]

Keep each bullet point to 1-2 sentences. Be specific and actionable. Focus on business value.

Return ONLY the INSIGHTS section with bullet points, no other text.`;

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
      industry: industry,
      columnSelectionReasoning: columnSelectionReasoning,
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
      historicalPatterns: {
        average: historicalAvg,
        min: historicalMin,
        max: historicalMax,
        range: historicalRange,
        stdDev: stdDev,
        volatility: volatility,
        growthRate: avgGrowthRate,
        totalGrowth: totalGrowth,
        seasonality: seasonalityPattern,
        dataQuality: coefficientOfVariation < 20 ? 'high' : coefficientOfVariation < 50 ? 'medium' : 'low',
      },
      confidenceBounds: {
        enabled: true,
        method: '95% confidence interval',
        description: 'Uncertainty increases over forecast horizon',
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
