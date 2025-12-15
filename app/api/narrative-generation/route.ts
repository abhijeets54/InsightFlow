import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey, reportGeminiSuccess, reportGeminiFailure } from '@/lib/gemini-key-manager';

export const maxDuration = 60;

/**
 * AI Narrative Generation API
 * Generates human-readable insights and explanations for charts
 *
 * Features:
 * - Auto-explains chart patterns
 * - Identifies key insights
 * - Provides actionable recommendations
 * - Detects anomalies and trends
 * - Uses advanced load balancing with circuit breaker
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestBody: any;

  try {
    requestBody = await request.json();
    const {
      chartType,
      data,
      metadata,
      columns,
      filters
    } = requestBody;

    // Validate input
    if (!chartType || !data || data.length === 0) {
      return NextResponse.json(
        { error: 'Chart type and data are required' },
        { status: 400 }
      );
    }

    // Get API key using advanced load balancing
    const geminiKey = getGeminiKey('NARRATIVE_GENERATION');

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'No available API keys. All keys may be at capacity or unhealthy.' },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Use stable 2025 model

    // Calculate statistics from data
    const stats = calculateDataStatistics(data, columns);

    // Build context-rich prompt
    const prompt = buildNarrativePrompt(chartType, data, metadata, columns, filters, stats);

    // Generate narrative with timeout protection
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 25000)
      )
    ]) as any;

    const response = result.response;
    const narrativeText = response.text();

    // Parse structured response
    const narrative = parseNarrativeResponse(narrativeText);

    // Report success for circuit breaker
    const responseTime = Date.now() - startTime;
    reportGeminiSuccess('NARRATIVE_GENERATION', responseTime);

    return NextResponse.json({
      success: true,
      narrative,
      metadata: {
        chartType,
        dataPoints: data.length,
        generatedAt: new Date().toISOString(),
        responseTimeMs: responseTime
      }
    });

  } catch (error: any) {
    console.error('[Narrative Generation] Error:', error);

    // Report failure for circuit breaker
    reportGeminiFailure('NARRATIVE_GENERATION');

    // Fallback to basic narrative using already-parsed request body
    const fallbackNarrative = await generateFallbackNarrative(requestBody);

    return NextResponse.json({
      success: true, // Changed to true since we're providing a fallback
      error: error.message,
      narrative: fallbackNarrative,
      fallback: true
    });
  }
}

/**
 * Calculate statistics from data
 */
function calculateDataStatistics(data: any[], columns: string[] = []) {
  const stats: any = {
    rowCount: data.length,
    columns: columns.length > 0 ? columns : Object.keys(data[0] || {})
  };

  // Calculate min, max, avg for numeric columns
  stats.columns.forEach((col: string) => {
    const values = data
      .map(row => parseFloat(row[col]))
      .filter(v => !isNaN(v));

    if (values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      stats[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        range: Math.max(...values) - Math.min(...values),
        trend: values[values.length - 1] > values[0] ? 'increasing' : 'decreasing'
      };
    }
  });

  return stats;
}

/**
 * Build comprehensive prompt for narrative generation
 */
function buildNarrativePrompt(
  chartType: string,
  data: any[],
  metadata: any,
  columns: string[],
  filters: any[],
  stats: any
): string {
  const sampleData = data.slice(0, 20); // First 20 rows for context
  const lastData = data.slice(-5); // Last 5 rows for trends

  return `You are an expert data analyst. Generate a compelling, human-readable narrative for this ${chartType} chart.

DATA CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chart Type: ${chartType}
Data Points: ${data.length} rows
Columns: ${columns.join(', ')}
${filters && filters.length > 0 ? `Filters Applied: ${JSON.stringify(filters)}` : ''}

STATISTICS:
${JSON.stringify(stats, null, 2)}

SAMPLE DATA (First 20 rows):
${JSON.stringify(sampleData, null, 2)}

RECENT DATA (Last 5 rows):
${JSON.stringify(lastData, null, 2)}

TASK:
Generate a narrative analysis in JSON format with these exact fields:

{
  "title": "One-line summary (max 60 chars)",
  "summary": "2-3 sentence overview of what the chart shows",
  "keyInsights": [
    "Insight 1: Most important finding",
    "Insight 2: Second important finding",
    "Insight 3: Third important finding"
  ],
  "trends": {
    "direction": "increasing|decreasing|stable|mixed",
    "description": "Detailed trend analysis",
    "confidence": "high|medium|low"
  },
  "anomalies": [
    {
      "description": "What's unusual",
      "value": "The specific value/point",
      "impact": "high|medium|low"
    }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ],
  "context": "Additional context or caveats users should know"
}

GUIDELINES:
- Be conversational and engaging, not technical
- Focus on "what it means" not "what it is"
- Use specific numbers and percentages from the data
- Highlight unusual patterns or outliers
- Make recommendations actionable
- Keep it concise but insightful
- Avoid jargon unless necessary

OUTPUT: Return ONLY the JSON object, no markdown formatting.`;
}

/**
 * Parse narrative response from AI
 */
function parseNarrativeResponse(text: string): any {
  try {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    const parsed = JSON.parse(cleaned.trim());
    return parsed;
  } catch (error) {
    console.error('[Parse Narrative] Failed to parse JSON:', error);

    // Fallback: extract key information
    return {
      title: 'Data Insights',
      summary: text.substring(0, 200) + '...',
      keyInsights: [
        'Analysis generated successfully',
        'Review the data for detailed patterns',
        'Consider filtering to explore specific segments'
      ],
      trends: {
        direction: 'mixed',
        description: 'Multiple trends detected in the dataset',
        confidence: 'medium'
      },
      anomalies: [],
      recommendations: [
        'Explore different chart types to reveal patterns',
        'Apply filters to focus on specific data segments'
      ],
      context: 'Narrative generated with partial AI assistance'
    };
  }
}

/**
 * Generate fallback narrative when AI fails
 */
async function generateFallbackNarrative(body: any): Promise<any> {
  try {
    // If body is undefined (parsing failed), return minimal fallback
    if (!body) {
      return {
        title: 'Chart Visualization',
        summary: 'Displaying your data in an interactive chart format.',
        keyInsights: ['Chart generated successfully'],
        trends: { direction: 'mixed', description: 'Data visualized', confidence: 'low' },
        anomalies: [],
        recommendations: ['Explore the chart interactively'],
        context: 'Fallback narrative - unable to parse request'
      };
    }

    const { chartType, data, columns } = body;

    // Calculate basic statistics for better fallback
    const stats = calculateDataStatistics(data || [], columns || []);

    return {
      title: `${chartType || 'Chart'} Analysis`,
      summary: `This ${chartType || 'chart'} displays ${data?.length || 0} data points across ${columns?.length || 0} columns. The visualization helps identify patterns and trends in your data.`,
      keyInsights: [
        `Dataset contains ${data?.length || 0} records`,
        `${columns?.length || 0} variables are being visualized`,
        'Explore interactively by hovering over data points'
      ],
      trends: {
        direction: 'mixed',
        description: 'Multiple patterns present in the data',
        confidence: 'low'
      },
      anomalies: [],
      recommendations: [
        'Try different chart types to reveal patterns',
        'Apply filters to focus on specific segments',
        'Compare with historical data for context'
      ],
      context: 'Basic analysis generated. AI narrative temporarily unavailable.'
    };
  } catch (error) {
    console.error('[Fallback Narrative] Error:', error);
    return {
      title: 'Chart Visualization',
      summary: 'Displaying your data in an interactive chart format.',
      keyInsights: ['Chart generated successfully'],
      trends: { direction: 'mixed', description: 'Data visualized', confidence: 'low' },
      anomalies: [],
      recommendations: ['Explore the chart interactively'],
      context: 'Fallback narrative'
    };
  }
}
