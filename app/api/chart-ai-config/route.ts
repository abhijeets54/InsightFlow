import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import { getCachedDataset, cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

/**
 * POST /api/chart-ai-config
 * Get AI-powered chart configuration for a specific chart type
 */
export async function POST(request: NextRequest) {
  try {
    const { chartType, chartName, datasetId, userId, columns, sampleData } = await request.json();

    if (!chartType || !datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `chart-config:${datasetId}:${chartType}`;
    try {
      const cachedConfig = await getCachedAIResponse(cacheKey);
      if (cachedConfig) {
        console.log(`[Chart AI Config] ✅ Cache HIT for ${chartType}`);
        return NextResponse.json({
          success: true,
          config: cachedConfig,
          cached: true,
        });
      }
    } catch (cacheError) {
      console.warn('[Chart AI Config] Cache check failed:', cacheError);
    }

    console.log(`[Chart AI Config] Generating config for ${chartType}...`);

    // Get full dataset from Redis
    let fullData = sampleData;
    try {
      const dataset = await getCachedDataset(userId, datasetId);
      if (dataset?.rows) {
        fullData = dataset.rows;
        console.log(`[Chart AI Config] Using full dataset: ${fullData.length} rows`);
      }
    } catch (err) {
      console.warn('[Chart AI Config] Could not fetch full dataset, using sample:', err);
    }

    // Build AI prompt based on chart type
    const prompt = buildChartPrompt(chartType, chartName, fullData, columns);

    // Get API key
    const apiKey = getGeminiKey('CHART_AI_CONFIG');
    if (!apiKey) {
      throw new Error('No CHART_AI_CONFIG API key available');
    }

    // Call AI
    const aiResponse = await callGemini(prompt, apiKey);

    // Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const config = JSON.parse(jsonMatch[0]);
    console.log(`[Chart AI Config] ✅ Config generated for ${chartType}`);

    // Cache for 6 hours
    try {
      const CACHE_TTL = 6 * 60 * 60; // 6 hours
      await cacheAIResponse(cacheKey, config, CACHE_TTL);
      console.log(`[Chart AI Config] ✅ Cached config for ${chartType}`);
    } catch (cacheError) {
      console.warn('[Chart AI Config] Failed to cache config:', cacheError);
    }

    return NextResponse.json({
      success: true,
      config,
      cached: false,
    });
  } catch (error: any) {
    console.error('[Chart AI Config] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chart configuration' },
      { status: 500 }
    );
  }
}

function buildChartPrompt(chartType: string, chartName: string, data: any[], columns: string[]): string {
  // Get dataset summary
  const rowCount = data.length;
  const sampleRows = data.slice(0, 5);

  // Analyze column types
  const columnInfo = columns.map(col => {
    const values = data.slice(0, 100).map(row => row[col]).filter(v => v != null);
    const uniqueCount = new Set(values).size;
    const sampleValues = Array.from(new Set(values)).slice(0, 5);

    // Detect type
    const isNumeric = values.every(v => !isNaN(parseFloat(v)));
    const isDate = values.some(v => !isNaN(Date.parse(v)));
    const type = isNumeric ? 'numeric' : isDate ? 'temporal' : 'categorical';

    return {
      name: col,
      type,
      uniqueCount,
      samples: sampleValues,
    };
  });

  const numericCols = columnInfo.filter(c => c.type === 'numeric').map(c => c.name);
  const categoricalCols = columnInfo.filter(c => c.type === 'categorical').map(c => c.name);
  const temporalCols = columnInfo.filter(c => c.type === 'temporal').map(c => c.name);

  // Chart-specific instructions
  const chartInstructions = {
    'bar': `Bar charts are best for comparing categories. Select:
- X-axis: categorical column (e.g., product names, regions)
- Y-axis: numeric column to aggregate (e.g., sales, count)
- Aggregation: sum, avg, or count
- Limit to top 30 categories for clarity`,

    'line': `Line charts show trends over time or continuous data. Select:
- X-axis: temporal column (dates) or ordered numeric column
- Y-axis: numeric column to track
- No aggregation needed (show all points or sampled)
- Good for showing change over time`,

    'area': `Area charts show cumulative trends. Select:
- X-axis: temporal column (dates) or ordered sequence
- Y-axis: numeric column to accumulate
- Emphasizes magnitude and volume
- Similar to line but with filled area`,

    'pie': `Pie charts show part-to-whole relationships. Select:
- Category column: categorical with 3-7 unique values
- Value column: numeric column to slice by
- Aggregation: sum or count
- WARNING: Limit to max 7 slices for readability`,

    'scatter': `Scatter plots show correlation between two variables. Select:
- X-axis: numeric column (independent variable)
- Y-axis: numeric column (dependent variable)
- Optional: color by categorical column
- Good for finding relationships and patterns
- Shows linear regression analysis automatically`,

    'stacked-bar': `Stacked bar charts show multi-series comparison. Select:
- X-axis: categorical column (primary grouping)
- Y-axis: multiple numeric columns to stack
- Shows breakdown within each category
- Best with 2-5 numeric columns for clarity`,

    'box-plot': `Box plots show statistical distribution. Select:
- Analyze: numeric columns (shows quartiles, median, outliers)
- Best for comparing distributions across multiple variables
- Shows min, Q1, median, Q3, max, and outliers
- Good for spotting data spread and anomalies
- Limit to 6 columns for readability`,

    'heatmap': `Heatmap shows correlation matrix between numeric variables. Select:
- Numeric columns: at least 2 columns (correlation analysis)
- Shows strength and direction of relationships
- Color-coded from -1 (negative) to +1 (positive correlation)
- Best with 3-8 numeric columns for readability
- Automatically generates correlation matrix`,
  };

  return `You are a data visualization expert. Analyze this dataset and recommend the BEST configuration for a ${chartType.toUpperCase()} chart.

DATASET INFORMATION:
- Total Rows: ${rowCount}
- Total Columns: ${columns.length}
- Numeric Columns: ${numericCols.join(', ') || 'None'}
- Categorical Columns: ${categoricalCols.join(', ') || 'None'}
- Temporal Columns: ${temporalCols.join(', ') || 'None'}

COLUMN DETAILS:
${columnInfo.map(c => `- ${c.name} (${c.type}): ${c.uniqueCount} unique values, samples: ${c.samples.slice(0, 3).join(', ')}`).join('\n')}

SAMPLE DATA (first 3 rows):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

CHART TYPE: ${chartName}
${chartInstructions[chartType as keyof typeof chartInstructions] || ''}

YOUR TASK:
1. Analyze which columns are BEST SUITED for this specific chart type
2. Consider data types, cardinality, and patterns
3. Recommend specific columns for X-axis, Y-axis, grouping, etc.
4. Suggest aggregation method if needed (sum, avg, count, min, max)
5. Provide a clear recommendation explaining WHY these choices work

IMPORTANT:
- Choose columns that make sense for ${chartType} visualization
- Consider data cardinality (don't use high-cardinality columns for pie charts)
- Ensure numeric columns are used for values/measurements
- Ensure categorical/temporal columns are used appropriately
- Provide actionable, specific recommendations

Return ONLY a JSON object (no markdown, no extra text):
{
  "title": "Clear chart title based on selected columns",
  "recommendation": "One sentence explaining why this configuration is optimal",
  "xColumn": "column name for X-axis" or null,
  "yColumn": "column name for Y-axis" or null,
  "categoryColumn": "column name for categories" or null,
  "valueColumn": "column name for values" or null,
  "stackByColumn": "column for stacking (stacked-bar only)" or null,
  "colorByColumn": "column for color coding (scatter only)" or null,
  "selectedColumns": ["col1", "col2"],
  "aggregation": "sum" | "avg" | "count" | "min" | "max" | null,
  "rationale": "2-3 sentence explanation of why these specific columns work best for this chart type",
  "warnings": ["warning1", "warning2"] or []
}`;
}
