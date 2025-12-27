import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, data } = await request.json();

    console.log('[ColumnStats] Request received:', { datasetId, userId, dataLength: data?.length });

    if (!datasetId || !userId || !data || !Array.isArray(data) || data.length === 0) {
      console.error('[ColumnStats] Invalid request:', { datasetId, userId, dataType: typeof data, dataLength: data?.length });
      return NextResponse.json(
        { error: 'Missing required fields or invalid data' },
        { status: 400 }
      );
    }

    if (!data[0] || typeof data[0] !== 'object') {
      console.error('[ColumnStats] Invalid data format:', data[0]);
      return NextResponse.json(
        { error: 'Data must be an array of objects' },
        { status: 400 }
      );
    }

    // Check Redis cache first
    const cacheKey = `column_stats:${datasetId}`;
    try {
      const cachedResponse = await getCachedAIResponse(cacheKey);
      if (cachedResponse) {
        console.log(`[ColumnStats] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          columns: cachedResponse.columns,
          reasoning: cachedResponse.reasoning,
          cached: true,
        });
      }
      console.log(`[ColumnStats] Cache MISS for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[ColumnStats] Redis cache error:', cacheError);
    }

    // Get all column names and analyze data
    const allColumns = Object.keys(data[0] || {});
    const sampleSize = Math.min(5, data.length);
    const sampleData = data.slice(0, sampleSize);

    // Calculate statistics for each numeric column
    const columnStats: any = {};
    allColumns.forEach(col => {
      try {
        const values = data.map((row: any) => row[col]);
        const numericValues = values.filter((v: any) => !isNaN(parseFloat(v)) && v !== null && v !== '');
        const isNumeric = numericValues.length / values.length > 0.8;

        if (isNumeric && numericValues.length > 0) {
          const nums = numericValues.map((v: any) => parseFloat(v));
          const sorted = [...nums].sort((a, b) => a - b);
          columnStats[col] = {
            type: 'numeric',
            min: Math.min(...nums),
            max: Math.max(...nums),
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: calculateStdDev(nums),
            variance: calculateVariance(nums),
            count: nums.length
          };
        }
      } catch (error) {
        console.error(`[ColumnStats] Error processing column ${col}:`, error);
        // Skip this column
      }
    });

    const numericColumns = Object.keys(columnStats);

    if (numericColumns.length === 0) {
      return NextResponse.json({
        success: true,
        columns: [],
        reasoning: 'No numeric columns found in dataset',
      });
    }

    // Generate AI prompt
    const prompt = `Analyze this dataset and intelligently select the 2-3 MOST IMPORTANT numeric columns to display statistics for in a dashboard summary.

Dataset Overview:
- Total Rows: ${data.length}
- Total Numeric Columns: ${numericColumns.length}
- Available Columns: ${numericColumns.join(', ')}

Column Statistics:
${Object.entries(columnStats).map(([col, stats]: [string, any]) => {
  return `${col}:
  - Min: ${stats.min.toFixed(2)}
  - Max: ${stats.max.toFixed(2)}
  - Average: ${stats.avg.toFixed(2)}
  - Median: ${stats.median.toFixed(2)}
  - Std Dev: ${stats.stdDev.toFixed(2)}
  - Variance: ${stats.variance.toFixed(2)}`;
}).join('\n\n')}

Sample Data (first ${sampleSize} rows):
${JSON.stringify(sampleData, null, 2)}

TASK: Select 2-3 NUMERIC columns that would be MOST VALUABLE for a dashboard summary:
- Prioritize business-critical metrics (sales, revenue, engagement, performance)
- Avoid technical/system columns (IDs, timestamps, internal codes)
- Select columns with meaningful variance that tell a story
- Consider columns that represent key performance indicators (KPIs)
- Prefer columns that business users would care about

Return ONLY a JSON object with this structure:
{
  "columns": ["column1", "column2"],
  "reasoning": "Brief explanation of why these specific columns were chosen for dashboard display"
}

Return ONLY valid JSON, no other text.`;

    // Get API key from multi-key manager
    const apiKey = getGeminiKey('CONTEXT_ANALYTICS');
    if (!apiKey) {
      console.warn('No Gemini API keys available, using fallback column selection');
      const fallbackColumns = selectFallbackColumns(numericColumns, columnStats);
      return NextResponse.json({
        success: true,
        columns: fallbackColumns,
        reasoning: 'Auto-selected based on variance and business relevance heuristics',
      });
    }

    const aiResponse = await callGemini(prompt, apiKey);

    // Parse AI response
    let selectedColumns = [];
    let reasoning = '';
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedColumns = parsed.columns || [];
        reasoning = parsed.reasoning || '';
      } else {
        selectedColumns = selectFallbackColumns(numericColumns, columnStats);
        reasoning = 'Fallback: Auto-selected based on heuristics';
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      selectedColumns = selectFallbackColumns(numericColumns, columnStats);
      reasoning = 'Fallback: Auto-selected based on heuristics';
    }

    // Validate selected columns exist
    const validColumns = selectedColumns.filter((col: string) => columnStats[col]);

    // Ensure we have 2-3 columns
    if (validColumns.length === 0 || validColumns.length > 3) {
      const fallbackColumns = selectFallbackColumns(numericColumns, columnStats);
      return NextResponse.json({
        success: true,
        columns: fallbackColumns,
        reasoning: 'Fallback: Normalized column count',
      });
    }

    // Cache the result (24 hour TTL)
    try {
      const AI_CACHE_TTL = 24 * 60 * 60; // 24 hours
      await cacheAIResponse(cacheKey, { columns: validColumns, reasoning }, AI_CACHE_TTL);
      console.log(`[ColumnStats] ✅ Cached selection for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[ColumnStats] Failed to cache result:', cacheError);
    }

    return NextResponse.json({
      success: true,
      columns: validColumns,
      reasoning,
      cached: false,
    });
  } catch (error) {
    console.error('Column stats selection error:', error);
    return NextResponse.json(
      { error: 'Failed to select columns' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateStdDev(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateVariance(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
}

// Fallback selection based on heuristics
function selectFallbackColumns(numericColumns: string[], columnStats: any): string[] {
  // Score each column
  const scored = numericColumns.map(col => {
    const stats = columnStats[col];
    const lowerCol = col.toLowerCase();

    let score = 0;

    // Business relevance (higher is better)
    if (lowerCol.includes('sales') || lowerCol.includes('revenue') || lowerCol.includes('profit')) score += 100;
    if (lowerCol.includes('amount') || lowerCol.includes('total') || lowerCol.includes('count')) score += 80;
    if (lowerCol.includes('rate') || lowerCol.includes('percentage') || lowerCol.includes('ratio')) score += 70;
    if (lowerCol.includes('price') || lowerCol.includes('cost') || lowerCol.includes('value')) score += 60;

    // Penalize technical columns (lower is worse)
    if (lowerCol.includes('id') || lowerCol.includes('key')) score -= 100;
    if (lowerCol.includes('timestamp') || lowerCol.includes('created') || lowerCol.includes('updated')) score -= 80;
    if (lowerCol.includes('index') || lowerCol.includes('position')) score -= 60;

    // Variance score (columns with more variance are more interesting)
    const range = stats.max - stats.min;
    const normalizedVariance = range > 0 ? stats.stdDev / range : 0;
    score += normalizedVariance * 50;

    return { col, score };
  });

  // Sort by score and take top 2-3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(3, scored.length)).map(s => s.col);
}
