/**
 * LIDA SUMMARIZER Module
 * Generates compact, informative dataset summaries for AI processing
 *
 * Purpose: Reduce 100K token datasets to 2K token summaries
 * Benefits: Faster AI processing, lower API costs, better context window usage
 */

import { callGemini } from './gemini-rest';
import { getGeminiKey } from './gemini-key-manager';

export interface DatasetSummary {
  name: string;
  file_name: string;
  dataset_description: string;
  fields: FieldSummary[];
  field_names: string[];
  semantic_types: Record<string, string>;
  data_types: Record<string, string>;
  size: {
    rows: number;
    columns: number;
  };
  sample_data: any[];
  statistics: {
    numeric_columns: Record<string, NumericStats>;
    categorical_columns: Record<string, CategoricalStats>;
    temporal_columns: string[];
  };
}

export interface FieldSummary {
  column: string;
  properties: {
    dtype: string;
    semantic_type: string;
    samples: any[];
    num_unique_values: number;
    missing_values: number;
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    std?: number;
  };
}

interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  quartiles: [number, number, number];
}

interface CategoricalStats {
  unique_values: number;
  top_values: Array<{ value: string; count: number }>;
  distribution: 'uniform' | 'skewed' | 'highly_skewed';
}

/**
 * Generate a comprehensive dataset summary for LIDA processing
 */
export async function generateDatasetSummary(
  data: any[],
  columns: string[],
  fileName: string,
  useAI: boolean = true
): Promise<DatasetSummary> {
  console.log('[LIDA Summarizer] Generating summary for dataset:', fileName);

  // Step 1: Analyze data types and semantic types
  const fieldSummaries = columns.map(column => analyzeField(data, column));

  // Step 2: Generate statistics
  const numericColumns: Record<string, NumericStats> = {};
  const categoricalColumns: Record<string, CategoricalStats> = {};
  const temporalColumns: string[] = [];

  fieldSummaries.forEach(field => {
    if (field.properties.semantic_type === 'quantitative') {
      numericColumns[field.column] = {
        min: field.properties.min!,
        max: field.properties.max!,
        mean: field.properties.mean!,
        median: field.properties.median!,
        std: field.properties.std!,
        quartiles: calculateQuartiles(data, field.column),
      };
    } else if (field.properties.semantic_type === 'nominal' || field.properties.semantic_type === 'ordinal') {
      categoricalColumns[field.column] = analyzeCategorical(data, field.column);
    } else if (field.properties.semantic_type === 'temporal') {
      temporalColumns.push(field.column);
    }
  });

  // Step 3: Sample data (first 5 and last 5 rows)
  const sampleData = [
    ...data.slice(0, 5),
    ...(data.length > 10 ? data.slice(-5) : []),
  ];

  // Step 4: Build base summary
  const baseSummary: DatasetSummary = {
    name: fileName.replace(/\.[^/.]+$/, ''),
    file_name: fileName,
    dataset_description: '', // Will be filled by AI or default
    fields: fieldSummaries,
    field_names: columns,
    semantic_types: Object.fromEntries(
      fieldSummaries.map(f => [f.column, f.properties.semantic_type])
    ),
    data_types: Object.fromEntries(
      fieldSummaries.map(f => [f.column, f.properties.dtype])
    ),
    size: {
      rows: data.length,
      columns: columns.length,
    },
    sample_data: sampleData,
    statistics: {
      numeric_columns: numericColumns,
      categorical_columns: categoricalColumns,
      temporal_columns: temporalColumns,
    },
  };

  // Step 5: Enhance with AI description (optional)
  if (useAI) {
    try {
      const aiDescription = await generateAIDescription(baseSummary);
      baseSummary.dataset_description = aiDescription;
    } catch (error) {
      console.warn('[LIDA Summarizer] AI description failed, using default:', error);
      baseSummary.dataset_description = generateDefaultDescription(baseSummary);
    }
  } else {
    baseSummary.dataset_description = generateDefaultDescription(baseSummary);
  }

  console.log('[LIDA Summarizer] ✅ Summary generated:', {
    rows: baseSummary.size.rows,
    columns: baseSummary.size.columns,
    numericCols: Object.keys(numericColumns).length,
    categoricalCols: Object.keys(categoricalColumns).length,
  });

  return baseSummary;
}

/**
 * Analyze a single field to determine its type and properties
 */
function analyzeField(data: any[], column: string): FieldSummary {
  const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
  const uniqueValues = new Set(values);
  const missingCount = data.length - values.length;

  // Sample values
  const samples = Array.from(uniqueValues).slice(0, 5);

  // Detect data type
  const dtype = detectDataType(values);
  const semanticType = detectSemanticType(values, dtype, uniqueValues.size);

  // Calculate numeric statistics if applicable
  let min, max, mean, median, std;
  if (semanticType === 'quantitative') {
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (numericValues.length > 0) {
      min = Math.min(...numericValues);
      max = Math.max(...numericValues);
      mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      median = calculateMedian(numericValues);
      std = calculateStdDev(numericValues, mean);
    }
  }

  return {
    column,
    properties: {
      dtype,
      semantic_type: semanticType,
      samples,
      num_unique_values: uniqueValues.size,
      missing_values: missingCount,
      min,
      max,
      mean,
      median,
      std,
    },
  };
}

/**
 * Detect data type (string, number, boolean, date)
 */
function detectDataType(values: any[]): string {
  if (values.length === 0) return 'string';

  const sample = values.slice(0, 100);

  // Check for numbers
  const numericCount = sample.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
  if (numericCount / sample.length > 0.8) return 'number';

  // Check for booleans
  const boolCount = sample.filter(v =>
    v === true || v === false || v === 'true' || v === 'false' || v === 'TRUE' || v === 'FALSE'
  ).length;
  if (boolCount / sample.length > 0.8) return 'boolean';

  // Check for dates
  const dateCount = sample.filter(v => !isNaN(Date.parse(v))).length;
  if (dateCount / sample.length > 0.8) return 'date';

  return 'string';
}

/**
 * Detect semantic type (quantitative, nominal, ordinal, temporal)
 */
function detectSemanticType(values: any[], dtype: string, uniqueCount: number): string {
  if (dtype === 'date') return 'temporal';
  if (dtype === 'number') return 'quantitative';
  if (dtype === 'boolean') return 'nominal';

  // For strings, determine if nominal or ordinal based on unique values
  const ratio = uniqueCount / values.length;
  if (ratio < 0.05) return 'nominal'; // Low cardinality = categorical
  if (ratio > 0.9) return 'nominal'; // High cardinality = likely IDs or unique names

  return 'nominal';
}

/**
 * Analyze categorical column distribution
 */
function analyzeCategorical(data: any[], column: string): CategoricalStats {
  const valueCounts = new Map<string, number>();

  data.forEach(row => {
    const value = String(row[column] || 'N/A');
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });

  const topValues = Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  // Determine distribution
  const topPercent = topValues[0]?.count / data.length || 0;
  const distribution =
    topPercent > 0.7 ? 'highly_skewed' :
    topPercent > 0.3 ? 'skewed' : 'uniform';

  return {
    unique_values: valueCounts.size,
    top_values: topValues,
    distribution,
  };
}

/**
 * Calculate quartiles (Q1, Q2/median, Q3)
 */
function calculateQuartiles(data: any[], column: string): [number, number, number] {
  const values = data
    .map(row => parseFloat(row[column]))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);

  const q1Index = Math.floor(values.length * 0.25);
  const q2Index = Math.floor(values.length * 0.5);
  const q3Index = Math.floor(values.length * 0.75);

  return [values[q1Index], values[q2Index], values[q3Index]];
}

/**
 * Calculate median
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Generate AI-powered dataset description
 */
async function generateAIDescription(summary: DatasetSummary): Promise<string> {
  const apiKey = getGeminiKey('LIDA_SUMMARIZER');
  if (!apiKey) {
    throw new Error('No LIDA_SUMMARIZER API key available');
  }

  const prompt = `Analyze this dataset and provide a concise, informative description (2-3 sentences).

Dataset: ${summary.name}
Rows: ${summary.size.rows}
Columns: ${summary.size.columns}

Fields:
${summary.fields.slice(0, 10).map(f =>
  `- ${f.column} (${f.properties.semantic_type}): ${f.properties.num_unique_values} unique values, ${f.properties.samples.slice(0, 3).join(', ')}`
).join('\n')}

Sample Data:
${JSON.stringify(summary.sample_data.slice(0, 2), null, 2)}

Provide a description that explains:
1. What kind of data this is
2. What insights or analysis it might support
3. Key characteristics (temporal range, categories, metrics)

Description:`;

  const response = await callGemini(prompt, apiKey);
  return response.trim().replace(/^Description:\s*/i, '');
}

/**
 * Generate default description (no AI)
 */
function generateDefaultDescription(summary: DatasetSummary): string {
  const numericCols = Object.keys(summary.statistics.numeric_columns).length;
  const categoricalCols = Object.keys(summary.statistics.categorical_columns).length;
  const temporalCols = summary.statistics.temporal_columns.length;

  let desc = `Dataset with ${summary.size.rows.toLocaleString()} rows and ${summary.size.columns} columns. `;

  if (numericCols > 0) {
    desc += `Contains ${numericCols} numeric field${numericCols > 1 ? 's' : ''} for quantitative analysis. `;
  }

  if (categoricalCols > 0) {
    desc += `Includes ${categoricalCols} categorical field${categoricalCols > 1 ? 's' : ''} for grouping and segmentation. `;
  }

  if (temporalCols > 0) {
    desc += `Features ${temporalCols} temporal field${temporalCols > 1 ? 's' : ''} for time-series analysis.`;
  }

  return desc.trim();
}
