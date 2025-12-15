import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey, reportGeminiSuccess, reportGeminiFailure } from '@/lib/gemini-key-manager';
import { detectAnomalies } from '@/lib/statistical-utils';

export const maxDuration = 60;

/**
 * Anomaly Detection API
 * Detects outliers and unusual patterns in data using statistical methods + AI explanations
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { data, columns } = await request.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    // Detect anomalies using statistical methods
    const columnsToAnalyze = columns || Object.keys(data[0]);
    const allAnomalies: any[] = [];

    columnsToAnalyze.forEach((column: string) => {
      const columnAnomalies = detectAnomalies(data, column, 2.5);

      if (columnAnomalies.length > 0) {
        allAnomalies.push({
          column,
          anomalies: columnAnomalies,
          count: columnAnomalies.length
        });
      }
    });

    // Get AI explanation for top anomalies
    let aiExplanations: any = null;

    if (allAnomalies.length > 0) {
      aiExplanations = await generateAnomalyExplanations(allAnomalies, data);
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      anomalies: allAnomalies,
      explanations: aiExplanations,
      summary: {
        totalAnomalies: allAnomalies.reduce((sum, col) => sum + col.count, 0),
        columnsWithAnomalies: allAnomalies.length,
        dataPoints: data.length
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        responseTimeMs: responseTime
      }
    });

  } catch (error: any) {
    console.error('[Anomaly Detection] Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      anomalies: [],
      explanations: null
    }, { status: 500 });
  }
}

async function generateAnomalyExplanations(anomalies: any[], data: any[]) {
  try {
    const geminiKey = getGeminiKey('ANOMALY_DETECTION');

    if (!geminiKey) {
      return null;
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare top anomalies for AI analysis
    const topAnomalies = anomalies.slice(0, 5).map(col => ({
      column: col.column,
      topAnomalies: col.anomalies.slice(0, 3).map((a: any) => ({
        value: a.value,
        zScore: a.zScore,
        severity: a.severity
      }))
    }));

    const prompt = `You are a data analyst. Analyze these detected anomalies and provide brief explanations.

ANOMALIES DETECTED:
${JSON.stringify(topAnomalies, null, 2)}

SAMPLE DATA FOR CONTEXT:
${JSON.stringify(data.slice(0, 50), null, 2)}

For each anomaly, provide:
1. Possible explanation (1-2 sentences)
2. Whether it's likely a data quality issue or genuine outlier
3. Recommended action

Return JSON format:
{
  "explanations": [
    {
      "column": "column_name",
      "explanation": "Why this might be an outlier",
      "likelyReason": "data_error|genuine_outlier|seasonal|other",
      "action": "What to do about it"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse response
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);

    const parsed = JSON.parse(cleaned.trim());

    reportGeminiSuccess('ANOMALY_DETECTION', Date.now() - Date.now());

    return parsed;

  } catch (error) {
    console.error('[Anomaly Explanations] Error:', error);
    reportGeminiFailure('ANOMALY_DETECTION');
    return null;
  }
}
