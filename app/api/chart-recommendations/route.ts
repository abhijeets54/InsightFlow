import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, columns, sampleData } = await request.json();

    if (!datasetId || !userId || !columns || !sampleData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Analyze data types and characteristics
    const analysis = analyzeDataCharacteristics(columns, sampleData);

    // Generate AI recommendations
    const prompt = `You are a data visualization expert. Analyze this dataset and recommend the 3-4 best chart types.

Dataset Information:
- Columns: ${columns.join(', ')}
- Total Rows: ${sampleData.length}

Data Analysis:
${JSON.stringify(analysis, null, 2)}

Sample Data (first 3 rows):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

For each recommendation, provide:
1. Chart type (bar/line/area/pie/scatter)
2. Title (short, descriptive)
3. Reason (why this chart is good for this data)
4. Confidence (high/medium/low)
5. Icon (emoji representing the chart type)
6. Columns (array of column names to use)

Return ONLY a JSON array:
[
  {
    "type": "line",
    "title": "Time Series Trend",
    "reason": "Your data has temporal patterns best shown with line charts",
    "confidence": "high",
    "icon": "📈",
    "columns": ["Date", "Sales"]
  }
]`;

    // Try to use AI for recommendations, fallback to rule-based
    let recommendations = [];
    const apiKey = getGeminiKey('CHART_RECOMMENDATIONS');

    if (apiKey) {
      try {
        const aiResponse = await callGemini(prompt, apiKey);
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        } else {
          recommendations = generateFallbackRecommendations(analysis, columns);
        }
      } catch (parseError) {
        console.error('Failed to parse AI recommendations:', parseError);
        recommendations = generateFallbackRecommendations(analysis, columns);
      }
    } else {
      console.warn('No Gemini API keys available, using rule-based recommendations');
      recommendations = generateFallbackRecommendations(analysis, columns);
    }

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Chart recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function analyzeDataCharacteristics(columns: string[], data: any[]) {
  const analysis: any = {
    totalColumns: columns.length,
    columnTypes: {},
    hasDateColumn: false,
    hasNumericColumns: false,
    hasCategoricalColumns: false,
  };

  columns.forEach((col) => {
    const sampleValues = data.slice(0, 10).map((row) => row[col]).filter((v) => v !== null && v !== '');

    // Detect type
    const isNumeric = sampleValues.every((v) => !isNaN(parseFloat(v)));
    const isDate = sampleValues.some((v) => !isNaN(Date.parse(v)));

    if (isDate) {
      analysis.columnTypes[col] = 'date';
      analysis.hasDateColumn = true;
    } else if (isNumeric) {
      analysis.columnTypes[col] = 'numeric';
      analysis.hasNumericColumns = true;

      // Calculate numeric stats
      const numbers = sampleValues.map((v) => parseFloat(v));
      analysis.columnTypes[col + '_stats'] = {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: numbers.reduce((sum, n) => sum + n, 0) / numbers.length,
      };
    } else {
      analysis.columnTypes[col] = 'categorical';
      analysis.hasCategoricalColumns = true;

      // Count unique values
      const unique = new Set(sampleValues);
      analysis.columnTypes[col + '_unique'] = unique.size;
    }
  });

  return analysis;
}

function generateFallbackRecommendations(analysis: any, columns: string[]): any[] {
  const recommendations = [];

  const numericCols = columns.filter((col) => analysis.columnTypes[col] === 'numeric');
  const categoricalCols = columns.filter((col) => analysis.columnTypes[col] === 'categorical');
  const dateCols = columns.filter((col) => analysis.columnTypes[col] === 'date');

  // Recommendation 1: Time series if date + numeric
  if (dateCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'line',
      title: 'Time Series Trend Analysis',
      reason: 'Your dataset contains temporal data perfect for tracking changes over time',
      confidence: 'high',
      icon: '📈',
      columns: [dateCols[0], ...numericCols.slice(0, 2)],
    });
  }

  // Recommendation 2: Bar chart for categorical + numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'bar',
      title: 'Category Comparison',
      reason: 'Bar charts excel at comparing values across different categories',
      confidence: 'high',
      icon: '📊',
      columns: [categoricalCols[0], ...numericCols.slice(0, 2)],
    });
  }

  // Recommendation 3: Pie chart for categorical breakdown
  if (categoricalCols.length > 0) {
    const lowCardinalityCol = categoricalCols.find((col) => {
      const uniqueCount = analysis.columnTypes[col + '_unique'];
      return uniqueCount && uniqueCount <= 8;
    });

    if (lowCardinalityCol && numericCols.length > 0) {
      recommendations.push({
        type: 'pie',
        title: 'Distribution Breakdown',
        reason: 'Pie charts show proportions effectively for categories with few values',
        confidence: 'medium',
        icon: '🥧',
        columns: [lowCardinalityCol, numericCols[0]],
      });
    }
  }

  // Recommendation 4: Area chart for cumulative trends
  if (dateCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'area',
      title: 'Cumulative Growth Pattern',
      reason: 'Area charts highlight magnitude and cumulative trends over time',
      confidence: 'medium',
      icon: '📉',
      columns: [dateCols[0], ...numericCols.slice(0, 1)],
    });
  }

  // Recommendation 5: Scatter for numeric correlation
  if (numericCols.length >= 2) {
    recommendations.push({
      type: 'scatter',
      title: 'Correlation Analysis',
      reason: 'Scatter plots reveal relationships between two numeric variables',
      confidence: numericCols.length >= 3 ? 'high' : 'medium',
      icon: '⚫',
      columns: numericCols.slice(0, 2),
    });
  }

  // Default: Bar chart if nothing else
  if (recommendations.length === 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'bar',
      title: 'Data Overview',
      reason: 'A bar chart provides a clear overview of your numeric data',
      confidence: 'low',
      icon: '📊',
      columns: numericCols.slice(0, 3),
    });
  }

  return recommendations.slice(0, 4);
}
