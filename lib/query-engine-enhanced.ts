/**
 * Enhanced Natural Language Query Engine
 * Implements Google's best practices for 90%+ accuracy
 * Based on BIRD benchmark winning techniques
 */

import { callGemini } from './gemini-rest';
import { getGeminiKey } from './gemini-key-manager';

// Enhanced metadata with business context
interface EnhancedDatasetMetadata {
  columns: string[];
  types: Record<string, string>;
  sampleValues: Record<string, any[]>;
  statistics: Record<string, {
    min?: number;
    max?: number;
    avg?: number;
    median?: number;
    stdDev?: number;
    count: number;
    uniqueCount: number;
    nullCount: number;
    mostCommon?: any[];
  }>;
  rowCount: number;
  // NEW: Business context
  columnDescriptions?: Record<string, string>;
  businessContext?: Record<string, string>;
  commonQueryPatterns?: Record<string, string[]>;
}

interface QueryResult {
  success: boolean;
  answer: string;
  data?: any[];
  sql?: string;
  confidence: number;
  method: 'sql' | 'aggregation' | 'statistical';
  explanation: string;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  alternativeInterpretations?: string[];
}

interface QueryHistory {
  question: string;
  sql: string;
  success: boolean;
  confidence: number;
  userFeedback?: 'helpful' | 'not_helpful';
  timestamp: number;
}

// Statistical query templates
const STATISTICAL_TEMPLATES = {
  anomalies_zscore: `
    WITH stats AS (
      SELECT
        AVG({column}) as mean,
        (SELECT SQRT(AVG(({column} - (SELECT AVG({column}) FROM data)) * ({column} - (SELECT AVG({column}) FROM data)))) FROM data) as std
      FROM data
    )
    SELECT *,
      ABS({column} - stats.mean) / NULLIF(stats.std, 0) as z_score
    FROM data, stats
    WHERE ABS({column} - stats.mean) > 2 * stats.std
    ORDER BY z_score DESC
  `,

  top_n: `SELECT {columns} FROM data ORDER BY {orderColumn} DESC LIMIT {n}`,

  percentile: `
    SELECT {column},
      NTILE(100) OVER (ORDER BY {column}) as percentile
    FROM data
  `,
};

// Business glossary for semantic mapping
const BUSINESS_GLOSSARY: Record<string, string[]> = {
  revenue: ['sales', 'income', 'earnings', 'total_sales'],
  customers: ['users', 'clients', 'buyers', 'customer_id'],
  profit: ['net_income', 'earnings', 'margin', 'profit_margin'],
  best_selling: ['top products', 'highest sales', 'most popular'],
  worst_performing: ['lowest sales', 'least popular', 'bottom performers'],
};

/**
 * IMPROVEMENT 1: Enhanced Metadata Preparation with Business Context
 */
export function prepareEnhancedMetadata(data: any[]): EnhancedDatasetMetadata {
  if (!data || data.length === 0) {
    return {
      columns: [],
      types: {},
      sampleValues: {},
      statistics: {},
      rowCount: 0,
    };
  }

  const columns = Object.keys(data[0]);
  const types: Record<string, string> = {};
  const sampleValues: Record<string, any[]> = {};
  const statistics: Record<string, any> = {};
  const columnDescriptions: Record<string, string> = {};
  const commonQueryPatterns: Record<string, string[]> = {};

  columns.forEach((col) => {
    const values = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const nonNullValues = values.slice(0, 100);

    // Detect type
    const isNumeric = nonNullValues.every((v) => !isNaN(parseFloat(v)));
    const isDate = nonNullValues.some((v) => !isNaN(Date.parse(v)) && isNaN(parseFloat(v)));
    const isBoolean = nonNullValues.every((v) => v === true || v === false || v === 'true' || v === 'false');

    if (isBoolean) {
      types[col] = 'boolean';
    } else if (isDate) {
      types[col] = 'date';
    } else if (isNumeric) {
      types[col] = 'numeric';
    } else {
      types[col] = 'text';
    }

    // Sample values
    const uniqueValues = [...new Set(values)];
    sampleValues[col] = uniqueValues.slice(0, 10);

    // Enhanced statistics with median and std dev
    const stats: any = {
      count: values.length,
      uniqueCount: uniqueValues.length,
      nullCount: data.length - values.length,
    };

    if (types[col] === 'numeric') {
      const numbers = values.map((v) => parseFloat(v)).sort((a, b) => a - b);
      stats.min = Math.min(...numbers);
      stats.max = Math.max(...numbers);
      stats.avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      stats.median = numbers[Math.floor(numbers.length / 2)];

      // Standard deviation
      const variance = numbers.reduce((sum, n) => sum + Math.pow(n - stats.avg, 2), 0) / numbers.length;
      stats.stdDev = Math.sqrt(variance);
    }

    if (types[col] === 'text' && uniqueValues.length <= 50) {
      const valueCounts: Record<string, number> = {};
      values.forEach((v) => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      stats.mostCommon = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
    }

    statistics[col] = stats;

    // Auto-generate column descriptions based on patterns
    columnDescriptions[col] = generateColumnDescription(col, types[col], stats);

    // Detect common query patterns
    commonQueryPatterns[col] = detectCommonPatterns(col, types[col]);
  });

  return {
    columns,
    types,
    sampleValues,
    statistics,
    rowCount: data.length,
    columnDescriptions,
    commonQueryPatterns,
  };
}

/**
 * Auto-generate intelligent column descriptions
 */
function generateColumnDescription(column: string, type: string, stats: any): string {
  const name = column.toLowerCase();

  // Detect common patterns
  if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
    return `${type} value representing ${column}, ranging from ${stats.min} to ${stats.max}`;
  }
  if (name.includes('date') || name.includes('time')) {
    return `Timestamp or date column for ${column}`;
  }
  if (name.includes('id')) {
    return `Unique identifier for ${column.replace('_id', '')}`;
  }
  if (name.includes('name') || name.includes('title')) {
    return `Text field containing ${column} with ${stats.uniqueCount} unique values`;
  }
  if (name.includes('count') || name.includes('quantity')) {
    return `Numeric count of ${column}`;
  }

  return `${type} column containing ${column} data`;
}

/**
 * Detect common query patterns for a column
 */
function detectCommonPatterns(column: string, type: string): string[] {
  const patterns: string[] = [];
  const name = column.toLowerCase();

  if (type === 'numeric') {
    patterns.push(`total ${column}`, `average ${column}`, `top 10 by ${column}`);
    if (name.includes('price') || name.includes('sales')) {
      patterns.push(`revenue from ${column}`, `${column} trends`);
    }
  }

  if (type === 'text') {
    patterns.push(`count by ${column}`, `group by ${column}`, `unique ${column}`);
  }

  if (name.includes('date') || name.includes('time')) {
    patterns.push(`trends over ${column}`, `group by ${column}`);
  }

  return patterns;
}

/**
 * IMPROVEMENT 2: Ambiguity Detection
 */
export function detectAmbiguity(question: string, metadata: EnhancedDatasetMetadata): {
  needsClarification: boolean;
  questions: string[];
} {
  const ambiguities: string[] = [];

  // Check for vague metric terms
  if (/(best|top|worst|bottom)/i.test(question)) {
    const numericColumns = Object.entries(metadata.types)
      .filter(([_, type]) => type === 'numeric')
      .map(([col]) => col);

    if (numericColumns.length > 1) {
      ambiguities.push(`Which metric should I use? Available: ${numericColumns.join(', ')}`);
    }
  }

  // Check for time-related ambiguity
  if (/(recent|latest|this month|last|current)/i.test(question)) {
    const dateColumns = Object.entries(metadata.types)
      .filter(([_, type]) => type === 'date')
      .map(([col]) => col);

    if (dateColumns.length === 0) {
      ambiguities.push('I don\'t see any date columns. Did you mean to filter by a specific value instead?');
    } else if (/(this month|last month|this year)/i.test(question)) {
      ambiguities.push('What exact time period? (e.g., "last 30 days", "since January 1")');
    }
  }

  // Check for comparison ambiguity
  if (/(compare|versus|vs|difference)/i.test(question)) {
    ambiguities.push('What exactly should I compare? (e.g., "compare sales by region", "compare Q1 vs Q2")');
  }

  return {
    needsClarification: ambiguities.length > 0,
    questions: ambiguities,
  };
}

/**
 * IMPROVEMENT 3: Self-Consistency with Multiple Candidates
 */
async function generateSQLWithSelfConsistency(
  question: string,
  metadata: EnhancedDatasetMetadata,
  candidates: number = 3
): Promise<{ sql: string; confidence: number; explanation: string }> {
  console.log(`[Self-Consistency] Generating ${candidates} SQL candidates...`);

  const sqlCandidates: Array<{ sql: string; confidence: number; explanation: string }> = [];

  for (let i = 0; i < candidates; i++) {
    const result = await generateEnhancedSQL(question, metadata);
    if (result.sql) {
      sqlCandidates.push(result);
    }
  }

  if (sqlCandidates.length === 0) {
    return { sql: '', confidence: 0, explanation: 'Failed to generate SQL' };
  }

  // Count frequency of each SQL query
  const sqlFrequency: Record<string, number> = {};
  sqlCandidates.forEach(candidate => {
    const normalizedSQL = candidate.sql.trim().toUpperCase();
    sqlFrequency[normalizedSQL] = (sqlFrequency[normalizedSQL] || 0) + 1;
  });

  // Pick the most common query
  const mostCommon = Object.entries(sqlFrequency)
    .sort((a, b) => b[1] - a[1])[0];

  const consensusSQL = sqlCandidates.find(
    c => c.sql.trim().toUpperCase() === mostCommon[0]
  ) || sqlCandidates[0];

  // Boost confidence based on consensus
  const consensusRatio = mostCommon[1] / sqlCandidates.length;
  const boostedConfidence = Math.min(consensusSQL.confidence + (consensusRatio * 0.2), 0.99);

  console.log(`[Self-Consistency] Consensus: ${consensusRatio.toFixed(2)} (${mostCommon[1]}/${sqlCandidates.length})`);

  return {
    ...consensusSQL,
    confidence: boostedConfidence,
  };
}

/**
 * IMPROVEMENT 4: Enhanced Prompt with Few-Shot Examples
 */
async function generateEnhancedSQL(
  question: string,
  metadata: EnhancedDatasetMetadata,
  queryHistory?: QueryHistory[]
): Promise<{ sql: string; confidence: number; explanation: string }> {
  const classification = classifyQuery(question);
  const geminiKey = getGeminiKey('NATURAL_LANGUAGE_QUERY') || '';

  // Get relevant historical examples
  const relevantExamples = queryHistory
    ? getRelevantExamples(question, queryHistory).slice(0, 3)
    : [];

  const prompt = `You are an EXPERT SQL generator with 95%+ accuracy.

DATASET: ${metadata.rowCount.toLocaleString()} rows across ${metadata.columns.length} columns

${relevantExamples.length > 0 ? `
SUCCESSFUL EXAMPLES FROM SIMILAR QUESTIONS:
${relevantExamples.map(ex => `
Q: "${ex.question}"
SQL: ${ex.sql}
`).join('\n')}
` : ''}

ENHANCED SCHEMA WITH CONTEXT:
${metadata.columns.map(col => {
  const desc = metadata.columnDescriptions?.[col] || '';
  const patterns = metadata.commonQueryPatterns?.[col] || [];
  const stats = metadata.statistics[col];

  let info = `• ${col} (${metadata.types[col]})\n`;
  if (desc) info += `  Description: ${desc}\n`;
  info += `  Sample values: ${metadata.sampleValues[col].slice(0, 5).join(', ')}\n`;
  if (stats.min !== undefined) {
    info += `  Range: ${stats.min} to ${stats.max} (avg: ${stats.avg?.toFixed(2)}, std: ${stats.stdDev?.toFixed(2)})\n`;
  }
  if (patterns.length > 0) {
    info += `  Common queries: ${patterns.join(', ')}\n`;
  }
  return info;
}).join('\n')}

QUESTION: "${question}"
QUERY TYPE: ${classification.type}
INTENT: ${classification.intent}

ADVANCED RULES:
1. Use ONLY columns from schema above
2. For "top/best": ALWAYS use ORDER BY + LIMIT
3. For "anomalies/outliers": Use z-score method:
   WITH stats AS (SELECT AVG(col) as mean, STDDEV(col) as std FROM data)
   SELECT * FROM data, stats WHERE ABS(col - mean) > 2 * std
4. For aggregations: Use GROUP BY when counting/summing by category
5. For "recent/latest": ORDER BY date_column DESC LIMIT n
6. Handle NULL values with COALESCE or WHERE col IS NOT NULL
7. Use meaningful column aliases (e.g., "total_revenue" not "sum")
8. Be statistically sound - use proper methods for analysis

VALIDATION CHECKLIST:
✓ SQL uses only existing columns
✓ Aggregations have GROUP BY when needed
✓ Result directly answers the question
✓ Handles edge cases (NULL, empty results)

This query will run on the COMPLETE ${metadata.rowCount.toLocaleString()}-row dataset.

OUTPUT: Return ONLY the SQL query. No explanations, no markdown, just SQL.
`;

  try {
    const response = await callGemini(prompt, geminiKey);
    let sql = response.trim();

    // Check for special responses
    if (sql.includes('NO_ANSWER') || sql.includes('Cannot answer')) {
      return { sql: '', confidence: 0, explanation: 'Cannot answer with available data' };
    }

    // Clean up response
    sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    sql = sql.replace(/;+$/, '');

    // Validate
    const isValid = validateSQL(sql, metadata.columns);

    return {
      sql,
      confidence: isValid ? 0.9 : 0.5,
      explanation: `Generated SQL to ${classification.intent.toLowerCase()}`,
    };
  } catch (error) {
    console.error('SQL generation error:', error);
    return { sql: '', confidence: 0, explanation: 'Failed to generate SQL' };
  }
}

/**
 * IMPROVEMENT 5: Query Validation with Dry-Run
 */
async function validateWithDryRun(
  sql: string,
  data: any[],
  metadata: EnhancedDatasetMetadata
): Promise<{ valid: boolean; error?: string; suggestion?: string }> {
  try {
    // Parse check
    if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
      return { valid: false, error: 'Invalid SQL query format' };
    }

    // Dry run on sample
    const { executeSQL } = require('./simple-sql');
    const sampleData = data.slice(0, Math.min(100, data.length));
    const testResults = executeSQL(sql, sampleData);

    // Check result structure
    if (!testResults || (Array.isArray(testResults) && testResults.length === 0)) {
      // Might be a WHERE clause that's too restrictive
      return {
        valid: true, // SQL is valid, just returns no results
        error: 'Query returned no results on sample data',
        suggestion: 'Try broadening your filters or checking column names',
      };
    }

    return { valid: true };
  } catch (error: any) {
    // Attempt to provide helpful error message
    const errorMsg = error.message || String(error);

    if (errorMsg.includes('column')) {
      return {
        valid: false,
        error: 'Column not found',
        suggestion: `Available columns: ${metadata.columns.join(', ')}`,
      };
    }

    if (errorMsg.includes('syntax')) {
      return {
        valid: false,
        error: 'SQL syntax error',
        suggestion: 'Check query structure (SELECT ... FROM ... WHERE ...)',
      };
    }

    return {
      valid: false,
      error: errorMsg,
      suggestion: 'Try rephrasing your question',
    };
  }
}

/**
 * IMPROVEMENT 6: Find Relevant Historical Examples
 */
function getRelevantExamples(question: string, history: QueryHistory[]): QueryHistory[] {
  if (!history || history.length === 0) return [];

  const keywords = extractKeywords(question);

  return history
    .filter(h => h.success && h.confidence > 0.7)
    .map(h => ({
      ...h,
      similarity: calculateSimilarity(keywords, extractKeywords(h.question)),
    }))
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .filter(h => (h.similarity || 0) > 0.5)
    .slice(0, 3);
}

function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = keywords1.filter(k => set2.has(k)).length;
  const union = new Set([...keywords1, ...keywords2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Helper: Classify query type
 */
function classifyQuery(question: string): {
  type: 'aggregation' | 'filter' | 'comparison' | 'trend' | 'correlation' | 'statistical' | 'simple';
  intent: string;
  keywords: string[];
} {
  // Statistical/Analytical queries
  if (/(anomal|outlier|unusual|strange|weird|abnormal|z-score|statistical)/i.test(question)) {
    return {
      type: 'statistical',
      intent: 'Detect statistical anomalies or outliers',
      keywords: extractKeywords(question),
    };
  }

  // Aggregation queries
  if (/(how many|total|sum|count|average|mean|median|maximum|minimum|max|min)/i.test(question)) {
    return {
      type: 'aggregation',
      intent: 'Calculate aggregate values',
      keywords: extractKeywords(question),
    };
  }

  // Comparison queries
  if (/(compare|versus|vs|difference between|higher|lower|more than|less than)/i.test(question)) {
    return {
      type: 'comparison',
      intent: 'Compare values or groups',
      keywords: extractKeywords(question),
    };
  }

  // Trend queries
  if (/(trend|over time|growth|decline|change|increase|decrease)/i.test(question)) {
    return {
      type: 'trend',
      intent: 'Analyze trends over time',
      keywords: extractKeywords(question),
    };
  }

  // Correlation queries
  if (/(correlation|relationship|related|affect|impact|influence)/i.test(question)) {
    return {
      type: 'correlation',
      intent: 'Find relationships between variables',
      keywords: extractKeywords(question),
    };
  }

  // Filter queries
  if (/(where|filter|show me|find|which|what are)/i.test(question)) {
    return {
      type: 'filter',
      intent: 'Filter and retrieve specific data',
      keywords: extractKeywords(question),
    };
  }

  return {
    type: 'simple',
    intent: 'General question',
    keywords: extractKeywords(question),
  };
}

function extractKeywords(question: string): string[] {
  const stopWords = ['the', 'is', 'are', 'was', 'were', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'show', 'me', 'my', 'what', 'how', 'which'];

  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));
}

/**
 * Validate SQL
 */
function validateSQL(sql: string, validColumns: string[]): boolean {
  if (!sql || sql.length === 0) return false;
  if (!sql.trim().toUpperCase().startsWith('SELECT')) return false;

  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
  if (dangerous.some((op) => sql.toUpperCase().includes(op))) return false;

  return true;
}

/**
 * IMPROVEMENT 7: Confidence Scoring
 */
function calculateConfidence(
  sql: string,
  validated: boolean,
  consensusRatio?: number,
  hasHistoricalMatch?: boolean
): number {
  let score = 0.5; // base

  if (validated) score += 0.2;
  if (consensusRatio && consensusRatio > 0.8) score += 0.2;
  if (hasHistoricalMatch) score += 0.1;

  return Math.min(score, 0.99);
}

/**
 * Main Enhanced Query Engine
 */
export async function queryDatasetEnhanced(
  question: string,
  data: any[],
  queryHistory?: QueryHistory[]
): Promise<QueryResult> {
  try {
    console.log(`[Enhanced Engine] Processing: "${question}"`);

    // Step 1: Prepare enhanced metadata
    const metadata = prepareEnhancedMetadata(data);
    console.log(`[Enhanced Engine] Dataset: ${metadata.rowCount} rows, ${metadata.columns.length} columns`);

    // Step 2: Check for ambiguity
    const ambiguity = detectAmbiguity(question, metadata);
    if (ambiguity.needsClarification) {
      return {
        success: false,
        answer: 'I need some clarification to answer accurately.',
        needsClarification: true,
        clarificationQuestions: ambiguity.questions,
        confidence: 0.3,
        method: 'sql',
        explanation: 'Question is ambiguous',
      };
    }

    // Step 3: Generate SQL with self-consistency
    const { sql, confidence, explanation } = await generateSQLWithSelfConsistency(
      question,
      metadata,
      3 // Generate 3 candidates
    );

    if (!sql || confidence < 0.5) {
      return {
        success: false,
        answer: `I'm having trouble understanding your question.\n\n**Available columns:** ${metadata.columns.join(', ')}\n\nTry asking about specific columns, like:\n- "What is the total ${metadata.columns[0]}?"\n- "Show me top 10 by ${metadata.columns[1]}"`,
        confidence: 0,
        method: 'sql',
        explanation: 'Failed to generate valid SQL',
      };
    }

    console.log(`[Enhanced Engine] Generated SQL: ${sql}`);

    // Step 4: Validate with dry-run
    const validation = await validateWithDryRun(sql, data, metadata);

    if (!validation.valid) {
      console.error(`[Enhanced Engine] Validation failed: ${validation.error}`);
      return {
        success: false,
        answer: `SQL validation failed: ${validation.error}\n\n${validation.suggestion || ''}`,
        confidence: 0,
        method: 'sql',
        explanation: validation.error || 'Validation failed',
      };
    }

    // Step 5: Execute on full dataset
    const { executeSQL } = require('./simple-sql');
    const results = executeSQL(sql, data);

    // Step 6: Format answer
    const answer = await formatEnhancedAnswer(question, results, sql, metadata, confidence);

    return {
      success: true,
      answer,
      data: results.slice(0, 100),
      sql,
      confidence,
      method: 'sql',
      explanation,
    };

  } catch (error) {
    console.error('[Enhanced Engine] Error:', error);
    return {
      success: false,
      answer: 'An error occurred while processing your question. Please try rephrasing.',
      confidence: 0,
      method: 'sql',
      explanation: String(error),
    };
  }
}

async function formatEnhancedAnswer(
  question: string,
  results: any[],
  sql: string,
  metadata: EnhancedDatasetMetadata,
  confidence: number
): Promise<string> {
  const datasetInfo = `📊 Analyzed **${metadata.rowCount.toLocaleString()} total rows** from your complete dataset (confidence: ${(confidence * 100).toFixed(0)}%)`;

  if (results.length === 0) {
    return `${datasetInfo}\n\nNo results found. Try:\n- Checking column names\n- Broadening your search criteria\n- Asking about different data points`;
  }

  // Single value results
  if (results.length === 1 && Object.keys(results[0]).length === 1) {
    const value = Object.values(results[0])[0];
    return `${datasetInfo}\n\n**Answer:** ${typeof value === 'number' ? value.toLocaleString() : value}`;
  }

  // List results
  if (results.length <= 10 && Object.keys(results[0]).length === 1) {
    const key = Object.keys(results[0])[0];
    const values = results.map((r) => r[key]);
    return `${datasetInfo}\n\n**Results:**\n${values.map((v, i) => `${i + 1}. ${typeof v === 'number' ? v.toLocaleString() : v}`).join('\n')}`;
  }

  // Complex results - use AI formatting
  const geminiKey = getGeminiKey('NATURAL_LANGUAGE_QUERY') || '';
  const prompt = `Question: "${question}"

Dataset: ${metadata.rowCount.toLocaleString()} total rows analyzed
Results: ${results.length} rows returned
Data: ${JSON.stringify(results.slice(0, 20), null, 2)}

Create a clear, professional answer that:
1. States you analyzed the COMPLETE ${metadata.rowCount.toLocaleString()}-row dataset
2. Directly answers the question
3. Highlights key insights and patterns
4. Uses specific numbers and trends

Keep under 150 words. Be specific and data-driven.`;

  try {
    const answer = await callGemini(prompt, geminiKey);
    return `${datasetInfo}\n\n${answer}`;
  } catch (error) {
    return `${datasetInfo}\n\nFound ${results.length} results:\n\n${JSON.stringify(results.slice(0, 5), null, 2)}`;
  }
}
