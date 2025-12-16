import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';
import { calculateDatasetStatistics } from '@/utils/dataStatistics';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, sampleData } = await request.json();

    if (!datasetId || !userId || !sampleData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check Redis cache first
    const cacheKey = `insights:${datasetId}`;
    try {
      const cachedInsights = await getCachedAIResponse(cacheKey);
      if (cachedInsights) {
        console.log(`[Insights] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          insights: cachedInsights,
          cached: true,
        });
      }
      console.log(`[Insights] Cache MISS for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Insights] Redis cache error:', cacheError);
    }

    // Calculate statistics
    const columns = Object.keys(sampleData[0] || {});
    const stats = calculateDatasetStatistics(sampleData, columns);

    // Generate AI prompt
    const prompt = `Analyze this COMPLETE dataset and generate 4-6 actionable insights. Focus on trends, outliers, correlations, and key findings across ALL ${stats.totalRows} data points.

Dataset Statistics (FULL DATASET):
- Total Rows: ${stats.totalRows}
- Total Columns: ${stats.totalColumns}
- Column Names: ${columns.join(', ')}

Column Statistics (calculated from all ${stats.totalRows} rows):
${columns.slice(0, 5).map((col) => {
  const colStats = stats.columnStats.find(cs => cs.column === col);
  if (!colStats) return '';
  return `${col}: Min=${colStats.min}, Max=${colStats.max}, Avg=${colStats.mean?.toFixed(2)}`;
}).join('\n')}

Sample Data (first 3 rows for reference):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

IMPORTANT: Base your analysis on the statistics calculated from all ${stats.totalRows} data points, not just the sample shown above.

For each insight, provide:
1. Type (trend/outlier/correlation/summary)
2. Icon (emoji)
3. Title (short, 5-7 words)
4. Description (one sentence, actionable)
5. Impact (high/medium/low)

Format your response as JSON array:
[
  {
    "type": "trend",
    "icon": "📈",
    "title": "Sales increasing by 23%",
    "description": "Revenue shows strong upward trend over the past month",
    "impact": "high",
    "color": "bg-green-100"
  }
]

Return ONLY the JSON array, no other text.`;

    // Get API key from multi-key manager
    const apiKey = getGeminiKey('INSIGHTS');
    if (!apiKey) {
      console.warn('No Gemini API keys available, using fallback insights');
      const insights = generateFallbackInsights(stats, columns, sampleData);
      return NextResponse.json({
        success: true,
        insights,
      });
    }

    const aiResponse = await callGemini(prompt, apiKey);

    // Try to extract JSON from response
    let insights = [];
    try {
      // Look for JSON array in response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: generate basic insights from stats
        insights = generateFallbackInsights(stats, columns, sampleData);
      }
    } catch (parseError) {
      console.error('Failed to parse AI insights:', parseError);
      insights = generateFallbackInsights(stats, columns, sampleData);
    }

    // Cache the insights for future requests (24 hour TTL)
    try {
      const AI_CACHE_TTL = 24 * 60 * 60; // 24 hours
      await cacheAIResponse(cacheKey, insights, AI_CACHE_TTL);
      console.log(`[Insights] ✅ Cached insights for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[Insights] Failed to cache insights:', cacheError);
    }

    return NextResponse.json({
      success: true,
      insights,
      cached: false,
    });
  } catch (error) {
    console.error('Insights generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

function generateFallbackInsights(stats: any, columns: string[], data: any[]): any[] {
  const insights = [];

  // Summary insight
  insights.push({
    type: 'summary',
    icon: '📊',
    title: `Dataset contains ${stats.totalRows.toLocaleString()} records`,
    description: `Analyzing ${stats.totalColumns} columns with ${stats.totalRows} data points`,
    impact: 'medium',
    color: 'bg-blue-100',
  });

  // Find numeric columns with high variance
  const numericCols = columns.filter((col) => {
    const colStats = stats.columnStats[col];
    return colStats && typeof colStats.min === 'number';
  });

  if (numericCols.length > 0) {
    const firstNumCol = numericCols[0];
    const colStats = stats.columnStats[firstNumCol];

    if (colStats.max > colStats.min * 2) {
      insights.push({
        type: 'outlier',
        icon: '⚠️',
        title: `High variance detected in ${firstNumCol}`,
        description: `Values range from ${colStats.min.toFixed(2)} to ${colStats.max.toFixed(2)}`,
        impact: 'medium',
        color: 'bg-orange-100',
      });
    }

    // Trend insight
    const values = data.map((row) => parseFloat(row[firstNumCol]) || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) > 5) {
      insights.push({
        type: 'trend',
        icon: change > 0 ? '📈' : '📉',
        title: `${firstNumCol} ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
        description: `${change > 0 ? 'Positive' : 'Negative'} trend detected in recent data`,
        impact: Math.abs(change) > 20 ? 'high' : 'medium',
        color: change > 0 ? 'bg-green-100' : 'bg-red-100',
      });
    }
  }

  // Data completeness insight
  const missingValues = columns.reduce((sum, col) => {
    return sum + data.filter((row) => !row[col] || row[col] === '').length;
  }, 0);

  const completeness = ((data.length * columns.length - missingValues) / (data.length * columns.length)) * 100;

  if (completeness < 95) {
    insights.push({
      type: 'outlier',
      icon: '🔍',
      title: `Data is ${completeness.toFixed(1)}% complete`,
      description: `${missingValues} missing values detected across all columns`,
      impact: completeness < 80 ? 'high' : 'low',
      color: 'bg-yellow-100',
    });
  } else {
    insights.push({
      type: 'summary',
      icon: '✅',
      title: 'High data quality detected',
      description: `Dataset is ${completeness.toFixed(1)}% complete with minimal missing values`,
      impact: 'low',
      color: 'bg-green-100',
    });
  }

  return insights.slice(0, 6);
}
