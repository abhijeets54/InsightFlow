# LIDA-Inspired AI-Powered Visualization Implementation

**Status**: 📝 Documentation - Ready to implement after Redis
**Priority**: Implement after REDIS.md
**Estimated Time**: 8-12 hours
**Cost**: $0/month (stays in free tier with 18 API keys)

---

## Table of Contents

1. [Overview](#overview)
2. [LIDA Architecture (Microsoft Research)](#lida-architecture)
3. [Our TypeScript Implementation](#our-typescript-implementation)
4. [Module 1: SUMMARIZER](#module-1-summarizer)
5. [Module 2: GOAL EXPLORER](#module-2-goal-explorer)
6. [Module 3: VISGENERATOR](#module-3-visgenerator)
7. [Module 4: INFOGRAPHER](#module-4-infographer-optional)
8. [API Key Strategy](#api-key-strategy)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Code Examples](#code-examples)
11. [Testing & Validation](#testing--validation)

---

## Overview

### What is LIDA?

**LIDA** (Automatic Generation of Visualizations and Infographics using LLMs) is a Microsoft Research project that uses AI to automatically generate optimal data visualizations.

**Research Paper**: [ACL 2023 - LIDA](https://aclanthology.org/2023.acl-demo.11/)
**GitHub**: [microsoft/lida](https://github.com/microsoft/lida)

### Why LIDA?

**Current Problem**:
- 1000 rows → 1000 pie slices = React crash
- Sending full dataset (100K tokens) to AI per chart = expensive & slow

**LIDA Solution**:
- Generate **summary** once (2K tokens)
- Use AI to recommend **best visualization approach**
- Apply to full dataset locally
- **3.5% error rate** on 2,200+ visualizations (Microsoft's testing)

### Our Approach

We're building a **TypeScript/Next.js implementation** inspired by LIDA, optimized for:
- ✅ Gemini API (not OpenAI)
- ✅ Next.js/React (not Python)
- ✅ Your existing chart libraries (Recharts, Nivo)
- ✅ Free tier optimization (18 API keys)

---

## LIDA Architecture

### The 4 Modules

```
┌─────────────────────────────────────────────────────────────┐
│                         LIDA SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SUMMARIZER (Once per dataset)                          │
│     ├─ Input: Raw dataset (1000 rows × 10 columns)         │
│     ├─ Output: Compact summary (~2K tokens)                │
│     └─ Used by: All other modules                          │
│                                                             │
│  2. GOAL EXPLORER (Optional, on-demand)                    │
│     ├─ Input: Summary                                      │
│     ├─ Output: Visualization goals/questions               │
│     └─ Example: "Show sales trend over time"              │
│                                                             │
│  3. VISGENERATOR (Per chart request)                       │
│     ├─ Input: Summary + Chart type + Goal                  │
│     ├─ Output: Visualization config (JSON)                 │
│     ├─ Submodules:                                         │
│     │   ├─ Code Scaffold Constructor                       │
│     │   ├─ Code Generator                                  │
│     │   ├─ Code Executor                                   │
│     │   └─ Self-evaluation & Auto-repair                   │
│     └─ Example: { groupBy: 'product', topN: 7, ... }      │
│                                                             │
│  4. INFOGRAPHER (Optional, future)                         │
│     ├─ Input: Chart image                                  │
│     ├─ Output: Styled infographic                          │
│     └─ Uses: Image generation models (Stable Diffusion)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Our TypeScript Implementation

### Technology Stack

**Backend**:
- Next.js API Routes (TypeScript)
- Google Gemini 2.5 Flash (1M token context)
- Redis (for caching summaries)

**Frontend**:
- React 19
- Recharts + Nivo (existing)
- Loading states for AI calls

**AI Integration**:
- 18 Gemini API keys (feature-specific pools)
- Circuit breaker pattern (already implemented)

---

## Module 1: SUMMARIZER

### Purpose

Convert large datasets into **compact, information-rich summaries** that AI can understand.

### What It Does

```
Input: Raw dataset (1000 rows × 10 columns, ~100K tokens)
  ↓
Process:
  1. Calculate statistics (min, max, avg, median, stddev, quartiles)
  2. Detect data types (numeric, categorical, date, boolean)
  3. Find cardinality (unique values per column)
  4. Extract top values & distributions
  5. Sample 10-50 representative rows
  6. Generate natural language summary
  ↓
Output: Compact summary (~2K tokens)
```

### Example Summary Output

```json
{
  "name": "Sales Dataset",
  "file_name": "sales_2024.csv",
  "dataset_description": "E-commerce sales data with 1,000 transactions across 10 columns",
  "fields": [
    {
      "column": "product",
      "dtype": "categorical",
      "semantic_type": "nominal",
      "unique_values": 50,
      "top_values": ["Product A", "Product B", "Product C"],
      "top_counts": [200, 150, 100],
      "missing": 0,
      "description": "Product name (50 unique products, most common: Product A with 200 sales)"
    },
    {
      "column": "sales",
      "dtype": "number",
      "semantic_type": "quantitative",
      "min": 100,
      "max": 10000,
      "mean": 2500,
      "median": 2000,
      "stddev": 1500,
      "q1": 1200,
      "q3": 3500,
      "missing": 5,
      "description": "Sales amount in USD (range: $100-$10,000, average: $2,500)"
    },
    {
      "column": "date",
      "dtype": "temporal",
      "semantic_type": "temporal",
      "min": "2024-01-01",
      "max": "2024-12-31",
      "range_days": 365,
      "description": "Transaction date (full year 2024)"
    }
  ],
  "sample_rows": [
    {"product": "Product A", "sales": 2500, "date": "2024-03-15"},
    {"product": "Product B", "sales": 1800, "date": "2024-03-16"},
    ...10 more rows...
  ],
  "natural_language_summary": "This dataset contains 1,000 e-commerce transactions spanning the year 2024. It includes 50 unique products with Product A being the most popular (200 sales). Sales amounts range from $100 to $10,000 with an average of $2,500. The data has minimal missing values (0.5%)."
}
```

### Implementation

**File**: `lib/lida/summarizer.ts`

```typescript
import { getServiceSupabase } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini-rest';
import { getGeminiKey } from '@/lib/gemini-key-manager';

interface FieldSummary {
  column: string;
  dtype: 'number' | 'categorical' | 'temporal' | 'boolean';
  semantic_type: 'quantitative' | 'nominal' | 'ordinal' | 'temporal';
  unique_values?: number;
  top_values?: any[];
  top_counts?: number[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stddev?: number;
  q1?: number;
  q3?: number;
  missing: number;
  description: string;
}

interface DatasetSummary {
  name: string;
  file_name: string;
  dataset_description: string;
  fields: FieldSummary[];
  sample_rows: any[];
  natural_language_summary: string;
  row_count: number;
  column_count: number;
}

export async function generateDatasetSummary(
  data: any[],
  columns: string[],
  datasetName: string
): Promise<DatasetSummary> {
  console.log('[SUMMARIZER] Generating dataset summary...');

  const fieldSummaries: FieldSummary[] = columns.map(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
    const missing = data.length - values.length;

    // Detect data type
    const sampleValue = values[0];
    let dtype: FieldSummary['dtype'];
    let semantic_type: FieldSummary['semantic_type'];

    if (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue))) {
      dtype = 'number';
      semantic_type = 'quantitative';

      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const sorted = numericValues.slice().sort((a, b) => a - b);

      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const stddev = Math.sqrt(
        numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
      );
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];

      return {
        column: col,
        dtype,
        semantic_type,
        min,
        max,
        mean,
        median,
        stddev,
        q1,
        q3,
        missing,
        description: `Numeric field (range: ${min.toFixed(2)}-${max.toFixed(2)}, avg: ${mean.toFixed(2)})`,
      };
    } else if (typeof sampleValue === 'boolean') {
      dtype = 'boolean';
      semantic_type = 'nominal';

      const truthy = values.filter(v => v === true || v === 'true').length;
      const falsy = values.length - truthy;

      return {
        column: col,
        dtype,
        semantic_type,
        unique_values: 2,
        top_values: [true, false],
        top_counts: [truthy, falsy],
        missing,
        description: `Boolean field (${truthy} true, ${falsy} false)`,
      };
    } else {
      // Check if temporal
      const stringValue = String(sampleValue).toLowerCase();
      if (stringValue.includes('date') || stringValue.includes('time') ||
          stringValue.match(/\d{4}-\d{2}-\d{2}/)) {
        dtype = 'temporal';
        semantic_type = 'temporal';
      } else {
        dtype = 'categorical';
        semantic_type = 'nominal';
      }

      // Count unique values
      const uniqueMap = new Map<any, number>();
      values.forEach(v => {
        uniqueMap.set(v, (uniqueMap.get(v) || 0) + 1);
      });

      const sorted = Array.from(uniqueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const top_values = sorted.map(([val]) => val);
      const top_counts = sorted.map(([, count]) => count);

      return {
        column: col,
        dtype,
        semantic_type,
        unique_values: uniqueMap.size,
        top_values,
        top_counts,
        missing,
        description: `Categorical field (${uniqueMap.size} unique values, most common: ${top_values[0]} with ${top_counts[0]} occurrences)`,
      };
    }
  });

  // Sample rows
  const sampleSize = Math.min(20, data.length);
  const step = Math.floor(data.length / sampleSize);
  const sample_rows = [];
  for (let i = 0; i < data.length; i += step) {
    if (sample_rows.length < sampleSize) {
      sample_rows.push(data[i]);
    }
  }

  // Generate natural language summary using Gemini
  const summaryPrompt = `
Analyze this dataset summary and provide a concise 2-3 sentence natural language description:

Dataset Name: ${datasetName}
Rows: ${data.length}
Columns: ${columns.length}

Field Summaries:
${fieldSummaries.map(f => `- ${f.column}: ${f.description}`).join('\n')}

Provide ONLY the natural language summary, no additional text.
`.trim();

  const geminiKey = getGeminiKey('DATASET_SUMMARY');
  const nlSummary = await callGeminiWithFallback(summaryPrompt, geminiKey);

  const summary: DatasetSummary = {
    name: datasetName,
    file_name: datasetName,
    dataset_description: nlSummary.trim(),
    fields: fieldSummaries,
    sample_rows,
    natural_language_summary: nlSummary.trim(),
    row_count: data.length,
    column_count: columns.length,
  };

  console.log('[SUMMARIZER] ✅ Summary generated:', {
    rows: summary.row_count,
    columns: summary.column_count,
    summarySize: JSON.stringify(summary).length,
  });

  return summary;
}
```

### When to Run

**Trigger**: Once per dataset upload
**Cache**: Store in Redis with 7-day TTL
**Cost**: 1 Gemini API call (~2K tokens)

---

## Module 2: GOAL EXPLORER

### Purpose

Automatically generate **meaningful visualization goals** based on the dataset.

### What It Does

```
Input: Dataset summary
  ↓
Process:
  1. Analyze data characteristics
  2. Generate relevant questions/hypotheses
  3. Suggest visualizations for each goal
  4. Provide rationale
  ↓
Output: List of visualization goals
```

### Example Goal Output

```json
[
  {
    "index": 0,
    "question": "What are the top-selling products?",
    "visualization": "bar chart showing product sales in descending order",
    "rationale": "With 50 unique products and sales data, a bar chart can effectively compare performance and identify top performers",
    "recommended_chart": "bar",
    "columns": ["product", "sales"],
    "aggregation": "sum"
  },
  {
    "index": 1,
    "question": "How do sales trend over time?",
    "visualization": "line chart showing daily sales totals",
    "rationale": "Temporal data spanning 365 days is best visualized as a time series to identify trends and seasonality",
    "recommended_chart": "line",
    "columns": ["date", "sales"],
    "aggregation": "sum"
  },
  {
    "index": 2,
    "question": "What is the distribution of sales amounts?",
    "visualization": "histogram showing frequency of sales ranges",
    "rationale": "Understanding the distribution helps identify typical transaction sizes and outliers",
    "recommended_chart": "bar",
    "columns": ["sales"],
    "aggregation": "count"
  }
]
```

### Implementation

**File**: `lib/lida/goal-explorer.ts`

```typescript
interface VisualizationGoal {
  index: number;
  question: string;
  visualization: string;
  rationale: string;
  recommended_chart: 'bar' | 'line' | 'area' | 'pie' | 'scatter';
  columns: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export async function exploreGoals(
  summary: DatasetSummary,
  n: number = 5
): Promise<VisualizationGoal[]> {
  console.log('[GOAL EXPLORER] Generating visualization goals...');

  const prompt = `
You are a data visualization expert. Given this dataset summary, generate ${n} meaningful visualization goals.

Dataset Summary:
${JSON.stringify(summary, null, 2)}

For each goal, provide:
1. A specific question the visualization answers
2. Description of the visualization
3. Rationale for why this visualization is appropriate
4. Recommended chart type (bar, line, area, pie, scatter)
5. Which columns to use
6. Aggregation method if needed (sum, avg, count, min, max)

Return a JSON array of goals following this structure:
[
  {
    "index": 0,
    "question": "...",
    "visualization": "...",
    "rationale": "...",
    "recommended_chart": "bar",
    "columns": ["col1", "col2"],
    "aggregation": "sum"
  }
]

Return ONLY the JSON array, no markdown formatting.
`.trim();

  const geminiKey = getGeminiKey('GOAL_EXPLORER');
  const response = await callGeminiWithFallback(prompt, geminiKey);

  try {
    const goals: VisualizationGoal[] = JSON.parse(response);
    console.log('[GOAL EXPLORER] ✅ Generated', goals.length, 'goals');
    return goals;
  } catch (error) {
    console.error('[GOAL EXPLORER] Failed to parse goals:', error);
    return [];
  }
}
```

### When to Run

**Trigger**: On-demand (user clicks "Suggest Visualizations")
**Cache**: Cache per dataset
**Cost**: 1 Gemini API call (~3K tokens)

---

## Module 3: VISGENERATOR

### Purpose

Generate **optimal visualization configuration** for a specific chart type.

### What It Does

```
Input:
  - Dataset summary
  - Chart type (bar, line, pie, etc.)
  - Optional: Visualization goal
  ↓
Process:
  1. Analyze data characteristics
  2. Determine best columns to visualize
  3. Choose aggregation method
  4. Decide on grouping/filtering
  5. Set display limits (top N)
  6. Generate executable config
  ↓
Output: Visualization config (JSON)
```

### Example Config Output

**Pie Chart** (1000 rows with 50 unique products):

```json
{
  "chart_type": "pie",
  "config": {
    "categoryColumn": "product",
    "valueColumn": "sales",
    "aggregation": "sum",
    "topN": 7,
    "includeOthers": true,
    "sortBy": "value_desc",
    "title": "Top 7 Products by Total Sales",
    "description": "Showing the 7 best-selling products (by total sales) with remaining products grouped as 'Others'",
    "rationale": "With 50 unique products, showing all would create an unreadable pie chart. Top 7 + Others provides clear insights while maintaining readability."
  },
  "preprocessing": {
    "filters": [],
    "transformations": []
  },
  "metadata": {
    "expected_slices": 8,
    "estimated_render_time": "fast",
    "data_coverage": "70-80% in top 7",
    "warnings": []
  }
}
```

**Line Chart** (1000 time-series rows):

```json
{
  "chart_type": "line",
  "config": {
    "xColumn": "date",
    "yColumn": "sales",
    "aggregation": "sum",
    "groupBy": "day",
    "sampling": "lttb",
    "maxPoints": 365,
    "title": "Daily Sales Trend Over Time",
    "description": "Time series showing total daily sales across 2024",
    "rationale": "Temporal data with clear date column suggests time-series visualization. Daily aggregation provides meaningful granularity for yearly data."
  },
  "preprocessing": {
    "filters": [],
    "transformations": [
      {
        "type": "date_aggregation",
        "column": "date",
        "granularity": "day"
      }
    ]
  },
  "metadata": {
    "expected_points": 365,
    "estimated_render_time": "fast",
    "data_coverage": "100%",
    "warnings": []
  }
}
```

### Implementation

**File**: `lib/lida/visgenerator.ts`

```typescript
interface VisualizationConfig {
  chart_type: string;
  config: any;
  preprocessing: {
    filters: any[];
    transformations: any[];
  };
  metadata: {
    expected_slices?: number;
    expected_points?: number;
    estimated_render_time: 'instant' | 'fast' | 'moderate' | 'slow';
    data_coverage: string;
    warnings: string[];
  };
}

export async function generateVisualization(
  summary: DatasetSummary,
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter',
  goal?: VisualizationGoal
): Promise<VisualizationConfig> {
  console.log('[VISGENERATOR] Generating visualization config for', chartType);

  const prompt = `
You are a data visualization expert. Generate an optimal configuration for a ${chartType} chart.

Dataset Summary:
${JSON.stringify(summary, null, 2)}

${goal ? `Visualization Goal:\n${JSON.stringify(goal, null, 2)}\n` : ''}

Chart Type: ${chartType}

Based on best practices:
- Pie charts: max 7 slices (+ Others for remaining)
- Bar charts: max 30 bars (+ Others for remaining)
- Line/Area charts: max 2000 points (use LTTB sampling if needed)
- Scatter plots: max 10,000 points

Generate a JSON configuration that includes:
1. Which columns to use (categoryColumn, valueColumn, xColumn, yColumn)
2. Aggregation method (sum, avg, count, min, max)
3. TopN limit if applicable
4. Whether to include "Others" category
5. Sorting strategy
6. Title and description
7. Rationale for choices
8. Preprocessing steps (filters, transformations)
9. Metadata (expected slices/points, render time estimate, data coverage)

Return a JSON object following this structure:
{
  "chart_type": "${chartType}",
  "config": {
    "categoryColumn": "...",
    "valueColumn": "...",
    "aggregation": "sum",
    "topN": 7,
    "includeOthers": true,
    "sortBy": "value_desc",
    "title": "...",
    "description": "...",
    "rationale": "..."
  },
  "preprocessing": {
    "filters": [],
    "transformations": []
  },
  "metadata": {
    "expected_slices": 8,
    "estimated_render_time": "fast",
    "data_coverage": "70-80%",
    "warnings": []
  }
}

Return ONLY the JSON object, no markdown formatting.
`.trim();

  const geminiKey = getGeminiKey(`${chartType.toUpperCase()}_CHART`);
  const response = await callGeminiWithFallback(prompt, geminiKey);

  try {
    const config: VisualizationConfig = JSON.parse(response);
    console.log('[VISGENERATOR] ✅ Generated config:', config.config.title);
    return config;
  } catch (error) {
    console.error('[VISGENERATOR] Failed to parse config:', error);
    // Fallback to smart aggregation
    throw error;
  }
}
```

### Submodules

#### 3.1 Code Executor

**File**: `lib/lida/executor.ts`

```typescript
import { processChartData } from '@/utils/chartDataProcessor';

export function executeVisualizationConfig(
  config: VisualizationConfig,
  fullData: any[]
): { data: any[]; metadata: any } {
  console.log('[EXECUTOR] Applying visualization config to data...');

  const { chart_type, config: vizConfig } = config;

  // Apply preprocessing
  let processedData = fullData;

  // Apply filters
  if (config.preprocessing.filters.length > 0) {
    config.preprocessing.filters.forEach(filter => {
      processedData = processedData.filter(row => {
        // Apply filter logic
        return true; // Placeholder
      });
    });
  }

  // Apply transformations
  if (config.preprocessing.transformations.length > 0) {
    config.preprocessing.transformations.forEach(transform => {
      // Apply transformation logic
    });
  }

  // Use existing processChartData with AI-generated config
  const result = processChartData(processedData, chart_type as any, {
    categoryColumn: vizConfig.categoryColumn,
    valueColumn: vizConfig.valueColumn,
    xColumn: vizConfig.xColumn,
    yColumn: vizConfig.yColumn,
    aggregationMethod: vizConfig.aggregation,
  });

  console.log('[EXECUTOR] ✅ Executed visualization config');

  return {
    data: result.data,
    metadata: {
      ...config.metadata,
      actualPoints: result.displayCount,
      originalPoints: result.originalCount,
    },
  };
}
```

#### 3.2 Self-Evaluation & Auto-Repair

**File**: `lib/lida/evaluator.ts`

```typescript
export async function evaluateVisualization(
  config: VisualizationConfig,
  executionResult: any
): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for common issues
  if (config.chart_type === 'pie' && executionResult.metadata.actualPoints > 10) {
    issues.push('Too many pie slices (>10)');
    suggestions.push('Reduce topN to 7 or fewer');
  }

  if (executionResult.metadata.actualPoints === 0) {
    issues.push('No data after processing');
    suggestions.push('Check filters and column names');
  }

  // Check data coverage
  const coverage = executionResult.metadata.actualPoints / executionResult.metadata.originalPoints;
  if (coverage < 0.5) {
    issues.push('Low data coverage (<50%)');
    suggestions.push('Consider increasing topN or removing filters');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

export async function repairVisualization(
  config: VisualizationConfig,
  issues: string[]
): Promise<VisualizationConfig> {
  // Auto-repair logic
  const repairedConfig = { ...config };

  if (issues.includes('Too many pie slices (>10)')) {
    repairedConfig.config.topN = 7;
  }

  return repairedConfig;
}
```

### When to Run

**Trigger**: Per chart render (with caching)
**Cache**: Cache by (datasetId, chartType, goalId)
**Cost**: 1 Gemini API call per unique chart config (~3-4K tokens)

---

## Module 4: INFOGRAPHER (Optional)

### Purpose

Generate **stylized infographics** from chart images using image generation models.

### What It Does

```
Input: Chart image (PNG/SVG)
  ↓
Process:
  1. Apply visual style (minimalist, corporate, playful, etc.)
  2. Add decorative elements
  3. Enhance typography
  4. Add data callouts
  ↓
Output: Stylized infographic
```

### Implementation Status

**Phase 1 (Current)**: ❌ Not implementing
**Phase 2 (Future)**: ✅ Consider if needed

**Rationale**:
- Requires Stable Diffusion or DALL-E (extra cost)
- Your charts already look professional with Recharts/Nivo
- Focus on core functionality first

---

## API Key Strategy

### Distribution (18 Total Keys)

```bash
# ========================================
# LIDA Modules (4 keys)
# ========================================

# Module 1: SUMMARIZER (1 key)
GEMINI_API_KEY_DATASET_SUMMARY_1=AIzaSyAEhlfzrUKet0-WawwdiY4i1M_S3i7wlSk

# Module 2: GOAL EXPLORER (1 key)
GEMINI_API_KEY_GOAL_EXPLORER_1=AIzaSyCDKVPcJ-MEKNpvmJbsRfpfD414d24vvec

# Module 3: VISGENERATOR - Chart-Specific (4 keys)
GEMINI_API_KEY_PIE_CHART_1=AIzaSyDB1TQSFBxu-UwMLbx04rtnYvo7Ncxc5pg
GEMINI_API_KEY_BAR_CHART_1=AIzaSyCfpvII_AGU8FgJkFoxiCyUL52WxXfeSPo
GEMINI_API_KEY_LINE_CHART_1=AIzaSyAUYLExtQ4ku3Ll2zw_dJzDhXvzmRJ6x6o
GEMINI_API_KEY_SCATTER_CHART_1=AIzaSyAyHvUQ-aNPQf6qbw2TNMWKN5NUD8CMEwE

# ========================================
# Existing Features (Keep as-is, 10 keys)
# ========================================

GEMINI_API_KEY_INSIGHTS_1=xxx
GEMINI_API_KEY_FORECAST_1=xxx
GEMINI_API_KEY_CHART_RECOMMENDATIONS_1=xxx
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_1=xxx
GEMINI_API_KEY_NATURAL_LANGUAGE_QUERY_2=xxx
GEMINI_API_KEY_CONTEXT_ANALYTICS_1=xxx
GEMINI_API_KEY_CONTEXT_VISUALIZATIONS_1=xxx
GEMINI_API_KEY_NARRATIVE_GENERATION_1=xxx
GEMINI_API_KEY_ANOMALY_DETECTION_1=xxx
GEMINI_API_KEY_CORRELATION_ANALYSIS_1=xxx

# ========================================
# Overflow Pool (2 keys for future features)
# ========================================

GEMINI_API_KEY_OVERFLOW_1=AIzaSyBmimLhCv5wB2-fLK3j4jXejBK9piGTqjo
GEMINI_API_KEY_OVERFLOW_2=AIzaSyACvVXKPTUt2sR9gUez5btjEgPa_GdTKpI
```

### Capacity Calculation

```
LIDA Features:
- Summarizer: 1 key × 250 req/day = 250 summaries/day
- Goal Explorer: 1 key × 250 req/day = 250 explorations/day
- VisGenerator: 4 keys × 250 req/day = 1,000 chart configs/day

Total LIDA Capacity: ~250 datasets/day (1 summary + 4 charts each)

Existing Features: 10 keys × 250 req/day = 2,500 req/day

Combined Total: 18 keys × 250 req/day = 4,500 requests/day
User Capacity: 500-1,000 users/day easily
```

---

## Implementation Roadmap

### Phase 1: Core Setup (2 hours)

**Tasks**:
1. ✅ Create LIDA module structure
   - `lib/lida/summarizer.ts`
   - `lib/lida/goal-explorer.ts`
   - `lib/lida/visgenerator.ts`
   - `lib/lida/executor.ts`

2. ✅ Update Gemini key manager
   - Add new key types (DATASET_SUMMARY, GOAL_EXPLORER, etc.)
   - Update `.env.local` with 8 new keys

3. ✅ Create API endpoints
   - `/api/lida/summarize` (POST)
   - `/api/lida/goals` (POST)
   - `/api/lida/generate` (POST)

### Phase 2: SUMMARIZER (2 hours)

**Tasks**:
1. ✅ Implement statistical analysis
2. ✅ Implement Gemini integration for NL summary
3. ✅ Update upload API to call summarizer
4. ✅ Cache summary in Redis

**Testing**:
- Upload 1000-row dataset
- Verify summary is compact (~2K tokens)
- Check Redis caching

### Phase 3: VISGENERATOR (3 hours)

**Tasks**:
1. ✅ Implement config generator
2. ✅ Implement executor
3. ✅ Integrate with existing chart components
4. ✅ Add loading states to UI

**Testing**:
- Request pie chart → Should get topN=7 config
- Request line chart → Should get LTTB sampling config
- Verify charts render correctly

### Phase 4: GOAL EXPLORER (2 hours)

**Tasks**:
1. ✅ Implement goal generation
2. ✅ Add "Suggest Visualizations" button
3. ✅ Display goals in UI
4. ✅ Allow clicking goal to generate chart

**Testing**:
- Click "Suggest" → Should get 5 meaningful goals
- Click goal → Should generate appropriate chart

### Phase 5: Polish & Optimization (3 hours)

**Tasks**:
1. ✅ Add error handling
2. ✅ Add self-evaluation
3. ✅ Add loading indicators
4. ✅ Add caching strategy
5. ✅ Add monitoring/logging

**Testing**:
- Error scenarios (invalid data, API failures)
- Cache hit rates
- Performance benchmarks

---

## Code Examples

### End-to-End Flow

```typescript
// ========================================
// 1. Upload & Summarize (Once)
// ========================================

// app/api/upload/route.ts
import { generateDatasetSummary } from '@/lib/lida/summarizer';
import { cacheDataset } from '@/lib/redis';

// After successful upload:
const summary = await generateDatasetSummary(
  parsedData.rows,
  parsedData.columns,
  file.name
);

// Cache summary in Redis
await redis.setex(
  `lida:summary:${datasetId}`,
  604800, // 7 days
  JSON.stringify(summary)
);

// ========================================
// 2. Explore Goals (On-demand)
// ========================================

// app/api/lida/goals/route.ts
import { exploreGoals } from '@/lib/lida/goal-explorer';

export async function POST(req: Request) {
  const { datasetId } = await req.json();

  // Get cached summary
  const summaryJson = await redis.get(`lida:summary:${datasetId}`);
  const summary = JSON.parse(summaryJson);

  // Generate goals
  const goals = await exploreGoals(summary, 5);

  return NextResponse.json({ goals });
}

// ========================================
// 3. Generate Visualization (Per chart)
// ========================================

// app/visualizations/page.tsx
const handleChartTypeChange = async (chartType) => {
  setLoadingChart(true);

  // Check cache first
  const cacheKey = `lida:viz:${datasetId}:${chartType}`;
  let config = await fetch(`/api/lida/get-cached?key=${cacheKey}`).then(r => r.json());

  if (!config) {
    // Generate new config
    const response = await fetch('/api/lida/generate', {
      method: 'POST',
      body: JSON.stringify({
        datasetId,
        chartType,
        goal: selectedGoal, // Optional
      }),
    });

    config = await response.json();

    // Cache for 1 hour
    await fetch('/api/lida/cache', {
      method: 'POST',
      body: JSON.stringify({ key: cacheKey, value: config, ttl: 3600 }),
    });
  }

  // Execute config on full dataset
  const fullData = getDataForVisualization();
  const result = executeVisualizationConfig(config, fullData);

  setChartData(result.data);
  setChartMetadata(result.metadata);
  setLoadingChart(false);
};

// ========================================
// 4. Render Chart with AI Config
// ========================================

<ChartDisplay
  type={chartType}
  data={chartData}
  title={config.config.title}
  description={config.config.description}
/>

{chartMetadata && (
  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
    <p className="text-sm text-blue-900">
      <strong>AI Optimization:</strong> {config.config.rationale}
    </p>
    <p className="text-xs text-blue-700 mt-1">
      Showing {chartMetadata.actualPoints} of {chartMetadata.originalPoints} data points
      • {chartMetadata.data_coverage} coverage
    </p>
  </div>
)}
```

---

## Testing & Validation

### Test Scenarios

#### Scenario 1: Large Categorical Dataset

```
Input: 1000 rows, 50 unique products
Chart: Pie
Expected: topN=7 + Others
Verify: 8 slices total, no React errors
```

#### Scenario 2: Time-Series Data

```
Input: 1000 rows, daily data over 1 year
Chart: Line
Expected: LTTB sampling to ~365 points
Verify: Smooth curve, all trends preserved
```

#### Scenario 3: High Cardinality

```
Input: 10,000 rows, 500 unique categories
Chart: Bar
Expected: topN=30 + Others
Verify: Readable chart, fast rendering
```

### Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Summary generation | <2 sec | <5 sec |
| Goal exploration | <3 sec | <7 sec |
| Viz config generation | <2 sec | <5 sec |
| Config execution | <100ms | <500ms |
| Total (first chart) | <5 sec | <10 sec |
| Total (cached) | <200ms | <1 sec |

### Success Metrics

- ✅ **Accuracy**: 95%+ charts render correctly
- ✅ **Performance**: 90%+ charts load in <5 seconds
- ✅ **Coverage**: Works for all chart types
- ✅ **User Satisfaction**: Positive feedback on suggestions
- ✅ **API Cost**: <$0.05 per dataset

---

## Cost Analysis

### Per Dataset

```
1 Upload:
  - Summary: 1 call × 2K tokens = $0.0001
  - Goal Explorer (optional): 1 call × 3K tokens = $0.00015
  - 4 Charts: 4 calls × 3K tokens = $0.0006

Total per dataset: ~$0.001 (0.1 cents)

With caching (subsequent visits):
  - 0 API calls = $0

Free Tier Capacity:
  - 18 keys × 250 req/day = 4,500 req/day
  - ~1,000 datasets/day (with 4 charts each)
  - Cost: $0
```

### Monthly (1,000 users)

```
Assumptions:
- 1,000 users
- 2 datasets per user
- 5 charts per dataset
- 50% cache hit rate

API Calls:
- Summaries: 2,000 × 1 = 2,000
- Viz configs: 2,000 × 5 × 0.5 = 5,000
Total: 7,000 calls

Free Tier: 18 keys × 250 × 30 = 135,000 calls/month

Result: Stays in free tier ✅
```

---

## Next Steps

### After Redis Implementation

1. **Review this document**
2. **Set up API keys** (add 8 new keys to `.env.local`)
3. **Implement Phase 1** (core setup)
4. **Test with sample dataset**
5. **Roll out to production**

### Monitoring

Track these metrics:
- API call count per key
- Cache hit rates
- Visualization accuracy
- User engagement with goals
- Error rates

---

## References

- **LIDA Paper**: https://aclanthology.org/2023.acl-demo.11/
- **LIDA GitHub**: https://github.com/microsoft/lida
- **LIDA Docs**: https://microsoft.github.io/lida/
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Our Redis Docs**: [REDIS.md](./REDIS.md)

---

**Status**: 📝 Ready to implement after Redis
**Priority**: High (solves the core visualization problem)
**Timeline**: 1-2 weeks (8-12 hours development + testing)
**Cost**: $0/month (free tier)

**Questions?** Review this doc and we'll implement step-by-step after Redis is complete.
