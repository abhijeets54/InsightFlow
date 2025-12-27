import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId } = await request.json();

    console.log('[ForecastColumnSelection] Request received:', { datasetId, userId });

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check Redis cache first
    const cacheKey = `forecast_columns:${datasetId}`;
    try {
      const cachedResponse = await getCachedAIResponse(cacheKey);
      if (cachedResponse) {
        console.log(`[ForecastColumnSelection] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          ...cachedResponse,
          cached: true,
        });
      }
      console.log(`[ForecastColumnSelection] Cache MISS for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[ForecastColumnSelection] Redis cache error:', cacheError);
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

    if (!dataRows || dataRows.length === 0) {
      return NextResponse.json(
        { error: 'No data available in dataset' },
        { status: 400 }
      );
    }

    const allColumns = dataset.column_names || Object.keys(dataRows[0]);
    const sampleSize = Math.min(10, dataRows.length);
    const sampleData = dataRows.slice(0, sampleSize);

    // Analyze columns
    const columnAnalysis: any = {};
    allColumns.forEach((col: string) => {
      try {
        const values = dataRows.map((row: any) => row[col]);
        const nonNullValues = values.filter((v: any) => v !== null && v !== undefined && v !== '');

        // Check if date column
        const dateValues = nonNullValues.filter((v: any) => {
          const str = String(v);
          return /^\d{4}-\d{2}-\d{2}/.test(str) ||
                 /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) ||
                 !isNaN(Date.parse(str));
        });
        const isDate = dateValues.length / nonNullValues.length > 0.7;

        // Check if numeric column
        const numericValues = nonNullValues.filter((v: any) => !isNaN(parseFloat(v)));
        const isNumeric = numericValues.length / nonNullValues.length > 0.8;

        if (isDate) {
          columnAnalysis[col] = {
            type: 'date',
            coverage: (nonNullValues.length / values.length) * 100,
            sample: nonNullValues.slice(0, 3)
          };
        } else if (isNumeric) {
          const nums = numericValues.map((v: any) => parseFloat(v));
          const sorted = [...nums].sort((a, b) => a - b);
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
          const variance = nums.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / nums.length;

          columnAnalysis[col] = {
            type: 'numeric',
            min: Math.min(...nums),
            max: Math.max(...nums),
            avg: avg,
            median: sorted[Math.floor(sorted.length / 2)],
            variance: variance,
            stdDev: Math.sqrt(variance),
            coverage: (nonNullValues.length / values.length) * 100,
          };
        } else {
          const uniqueCount = new Set(nonNullValues).size;
          columnAnalysis[col] = {
            type: 'categorical',
            uniqueCount: uniqueCount,
            coverage: (nonNullValues.length / values.length) * 100,
          };
        }
      } catch (error) {
        console.error(`[ForecastColumnSelection] Error analyzing column ${col}:`, error);
      }
    });

    const dateColumns = Object.keys(columnAnalysis).filter(col => columnAnalysis[col].type === 'date');
    const numericColumns = Object.keys(columnAnalysis).filter(col => columnAnalysis[col].type === 'numeric');

    if (dateColumns.length === 0 || numericColumns.length === 0) {
      return NextResponse.json({
        success: true,
        dateColumn: allColumns[0],
        valueColumn: numericColumns[0] || allColumns[1],
        industry: 'general',
        reasoning: 'Insufficient date or numeric columns for AI analysis',
        confidence: 'low',
      });
    }

    // Generate AI prompt
    const prompt = `Analyze this dataset and intelligently select the BEST columns for time-series forecasting.

Dataset Overview:
- Total Rows: ${dataRows.length}
- Total Columns: ${allColumns.length}
- Date Columns Available: ${dateColumns.join(', ')}
- Numeric Columns Available: ${numericColumns.join(', ')}

Column Details:
${Object.entries(columnAnalysis).map(([col, stats]: [string, any]) => {
  if (stats.type === 'date') {
    return `${col} (DATE):
  - Coverage: ${stats.coverage.toFixed(1)}%
  - Sample: ${stats.sample.join(', ')}`;
  } else if (stats.type === 'numeric') {
    return `${col} (NUMERIC):
  - Range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}
  - Average: ${stats.avg.toFixed(2)}
  - Std Dev: ${stats.stdDev.toFixed(2)}
  - Variance: ${stats.variance.toFixed(2)}
  - Coverage: ${stats.coverage.toFixed(1)}%`;
  }
  return '';
}).filter(Boolean).join('\n\n')}

Sample Data (first ${sampleSize} rows):
${JSON.stringify(sampleData, null, 2)}

TASK: Select the BEST date column and value column for forecasting:

1. **Date Column Selection Criteria:**
   - Prefer columns with complete coverage (>95%)
   - Prefer chronological timestamps over IDs
   - Prefer actual date/time fields over indexes

2. **Value Column Selection Criteria:**
   - Prioritize business-critical metrics (revenue, sales, users, conversions, profit, engagement)
   - Avoid ID columns, indexes, or technical fields
   - Prefer columns with meaningful variance (not constant)
   - Prefer metrics that show trends over time

3. **Industry Detection:**
   - Based on column names and data patterns, identify the likely industry:
     - E-commerce: has product_id, order_value, cart, checkout
     - SaaS: has users, subscriptions, MRR, ARR, churn
     - Marketing: has clicks, impressions, CTR, conversions, campaigns
     - Finance: has transactions, balance, portfolio, revenue
     - Retail: has sales, inventory, customers, store
     - Analytics: has sessions, pageviews, events, engagement
     - General: if unclear

Return ONLY a JSON object with this exact structure:
{
  "dateColumn": "column_name",
  "valueColumn": "column_name",
  "industry": "industry_type",
  "reasoning": "Brief explanation of why these columns were selected and what metric is being forecasted",
  "confidence": "high|medium|low"
}

Return ONLY valid JSON, no other text.`;

    // Get API key from multi-key manager
    const apiKey = getGeminiKey('FORECAST');
    if (!apiKey) {
      console.warn('No Gemini API keys available, using fallback column selection');
      return NextResponse.json({
        success: true,
        dateColumn: dateColumns[0],
        valueColumn: selectBestNumericColumn(numericColumns, columnAnalysis),
        industry: 'general',
        reasoning: 'Auto-selected based on heuristics',
        confidence: 'medium',
      });
    }

    const aiResponse = await callGemini(prompt, apiKey);

    // Parse AI response
    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        dateColumn: dateColumns[0],
        valueColumn: selectBestNumericColumn(numericColumns, columnAnalysis),
        industry: 'general',
        reasoning: 'Fallback: Auto-selected based on heuristics',
        confidence: 'medium',
      };
    }

    // Validate selected columns exist
    if (!allColumns.includes(result.dateColumn)) {
      result.dateColumn = dateColumns[0];
    }
    if (!allColumns.includes(result.valueColumn)) {
      result.valueColumn = selectBestNumericColumn(numericColumns, columnAnalysis);
    }

    // Cache the result (24 hour TTL)
    try {
      const AI_CACHE_TTL = 24 * 60 * 60; // 24 hours
      await cacheAIResponse(cacheKey, result, AI_CACHE_TTL);
      console.log(`[ForecastColumnSelection] ✅ Cached selection for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[ForecastColumnSelection] Failed to cache result:', cacheError);
    }

    return NextResponse.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Forecast column selection error:', error);
    return NextResponse.json(
      { error: 'Failed to select forecast columns' },
      { status: 500 }
    );
  }
}

// Helper function to select best numeric column based on heuristics
function selectBestNumericColumn(numericColumns: string[], columnAnalysis: any): string {
  const scored = numericColumns.map(col => {
    const stats = columnAnalysis[col];
    const lowerCol = col.toLowerCase();
    let score = 0;

    // Business relevance scoring
    if (lowerCol.includes('revenue') || lowerCol.includes('sales') || lowerCol.includes('profit')) score += 100;
    if (lowerCol.includes('amount') || lowerCol.includes('total') || lowerCol.includes('value')) score += 80;
    if (lowerCol.includes('users') || lowerCol.includes('customers') || lowerCol.includes('subscribers')) score += 70;
    if (lowerCol.includes('count') || lowerCol.includes('quantity') || lowerCol.includes('volume')) score += 60;
    if (lowerCol.includes('rate') || lowerCol.includes('percentage') || lowerCol.includes('ratio')) score += 50;

    // Penalize technical columns
    if (lowerCol.includes('id') || lowerCol.includes('key') || lowerCol.includes('index')) score -= 100;

    // Variance score (more variance = more interesting to forecast)
    if (stats.variance > 0) {
      const cv = stats.stdDev / Math.abs(stats.avg); // Coefficient of variation
      score += Math.min(cv * 20, 30); // Cap variance bonus at 30
    }

    // Coverage bonus
    score += (stats.coverage / 100) * 10;

    return { col, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.col || numericColumns[0];
}
