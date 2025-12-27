import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, data } = await request.json();

    if (!datasetId || !userId || !data || data.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check Redis cache first
    const cacheKey = `correlation:${datasetId}`;
    try {
      const cachedResponse = await getCachedAIResponse(cacheKey);
      if (cachedResponse) {
        console.log(`[Correlation] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          columns: cachedResponse.columns,
          cached: true,
        });
      }
      console.log(`[Correlation] Cache MISS for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Correlation] Redis cache error:', cacheError);
    }

    // Get all column names and sample data
    const allColumns = Object.keys(data[0] || {});
    const sampleSize = Math.min(5, data.length);
    const sampleData = data.slice(0, sampleSize);

    // Calculate basic statistics for each column
    const columnStats: any = {};
    allColumns.forEach(col => {
      const values = data.map((row: any) => row[col]);
      const numericValues = values.filter((v: any) => !isNaN(parseFloat(v)) && v !== null && v !== '');
      const isNumeric = numericValues.length / values.length > 0.8;

      if (isNumeric) {
        const nums = numericValues.map((v: any) => parseFloat(v));
        columnStats[col] = {
          type: 'numeric',
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
          count: nums.length
        };
      } else {
        const uniqueValues = new Set(values.filter((v: any) => v !== null && v !== ''));
        columnStats[col] = {
          type: 'categorical',
          uniqueCount: uniqueValues.size,
          count: values.length
        };
      }
    });

    // Generate AI prompt
    const prompt = `Analyze this dataset and intelligently select the MOST RELEVANT numeric columns for correlation analysis.

Dataset Overview:
- Total Rows: ${data.length}
- Total Columns: ${allColumns.length}
- All Columns: ${allColumns.join(', ')}

Column Statistics:
${Object.entries(columnStats).map(([col, stats]: [string, any]) => {
  if (stats.type === 'numeric') {
    return `${col}: Type=Numeric, Min=${stats.min.toFixed(2)}, Max=${stats.max.toFixed(2)}, Avg=${stats.avg.toFixed(2)}`;
  } else {
    return `${col}: Type=Categorical, Unique Values=${stats.uniqueCount}`;
  }
}).join('\n')}

Sample Data (first ${sampleSize} rows):
${JSON.stringify(sampleData, null, 2)}

TASK: Select 4-8 NUMERIC columns that would provide the MOST MEANINGFUL correlation insights:
- Prioritize numeric columns with business significance
- Avoid ID columns, timestamps, or irrelevant technical fields
- Select columns that likely have interesting relationships
- Consider columns with meaningful variance
- Prefer columns that represent key metrics or KPIs

Return ONLY a JSON object with this exact structure:
{
  "columns": ["column1", "column2", "column3", ...],
  "reasoning": "Brief explanation of why these columns were selected"
}

Return ONLY valid JSON, no other text.`;

    // Get API key from multi-key manager
    const apiKey = getGeminiKey('CONTEXT_ANALYTICS');
    if (!apiKey) {
      console.warn('No Gemini API keys available, using fallback column selection');
      const fallbackColumns = selectFallbackColumns(allColumns, columnStats);
      return NextResponse.json({
        success: true,
        columns: fallbackColumns,
        reasoning: 'Auto-selected numeric columns based on heuristics',
      });
    }

    const aiResponse = await callGemini(prompt, apiKey);

    // Parse AI response
    let selectedColumns = [];
    let reasoning = '';
    try {
      // Look for JSON object in response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedColumns = parsed.columns || [];
        reasoning = parsed.reasoning || '';
      } else {
        // Fallback
        selectedColumns = selectFallbackColumns(allColumns, columnStats);
        reasoning = 'Fallback: Auto-selected numeric columns';
      }
    } catch (parseError) {
      console.error('Failed to parse AI correlation response:', parseError);
      selectedColumns = selectFallbackColumns(allColumns, columnStats);
      reasoning = 'Fallback: Auto-selected numeric columns';
    }

    // Validate that selected columns exist and are numeric
    const validColumns = selectedColumns.filter((col: string) =>
      columnStats[col] && columnStats[col].type === 'numeric'
    );

    // Ensure we have at least 2 columns
    if (validColumns.length < 2) {
      const fallbackColumns = selectFallbackColumns(allColumns, columnStats);
      return NextResponse.json({
        success: true,
        columns: fallbackColumns,
        reasoning: 'Fallback: Insufficient valid columns from AI',
      });
    }

    // Cache the result (24 hour TTL)
    try {
      const AI_CACHE_TTL = 24 * 60 * 60; // 24 hours
      await cacheAIResponse(cacheKey, { columns: validColumns, reasoning }, AI_CACHE_TTL);
      console.log(`[Correlation] ✅ Cached column selection for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Correlation] Failed to cache result:', cacheError);
    }

    return NextResponse.json({
      success: true,
      columns: validColumns,
      reasoning,
      cached: false,
    });
  } catch (error) {
    console.error('Correlation analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze correlations' },
      { status: 500 }
    );
  }
}

// Fallback column selection based on heuristics
function selectFallbackColumns(allColumns: string[], columnStats: any): string[] {
  // Get all numeric columns
  const numericColumns = allColumns.filter(col =>
    columnStats[col] && columnStats[col].type === 'numeric'
  );

  // Filter out likely ID or timestamp columns
  const relevantColumns = numericColumns.filter(col => {
    const lowerCol = col.toLowerCase();
    return !lowerCol.includes('id') &&
           !lowerCol.includes('timestamp') &&
           !lowerCol.includes('created') &&
           !lowerCol.includes('updated') &&
           !lowerCol.includes('_at');
  });

  // Return up to 8 columns
  return relevantColumns.length > 0
    ? relevantColumns.slice(0, 8)
    : numericColumns.slice(0, 8);
}
