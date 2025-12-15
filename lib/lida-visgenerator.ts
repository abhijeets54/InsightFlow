/**
 * LIDA VISGENERATOR Module
 * Generates optimal chart configurations with AI self-evaluation
 *
 * Purpose: Automatically select best chart type, columns, and settings
 * Benefits: Optimal visualizations, self-healing configs, intelligent defaults
 */

import { callGemini } from './gemini-rest';
import { getGeminiKey } from './gemini-key-manager';
import { DatasetSummary } from './lida-summarizer';
import { VisualizationGoal } from './lida-goal-explorer';

export interface ChartSpecification {
  chart_type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'heatmap' | 'histogram';
  columns: {
    x?: string;
    y?: string | string[];
    category?: string;
    value?: string;
    size?: string;
    color?: string;
  };
  aggregation?: {
    method: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
  };
  filters?: Array<{
    column: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';
    value: any;
  }>;
  title: string;
  description: string;
  rationale: string;
  confidence: number; // 0-1, AI's confidence in this config
  alternative_charts?: string[]; // Other chart types that could work
}

export interface EvaluatedSpecification extends ChartSpecification {
  evaluation: {
    score: number; // 0-100
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    data_fitness: number; // How well the chart fits the data
    clarity_score: number; // How clear/readable the chart will be
    insight_potential: number; // How much insight it can provide
  };
}

/**
 * Generate chart specification for a visualization goal
 */
export async function generateChartSpec(
  goal: VisualizationGoal,
  summary: DatasetSummary,
  selfEvaluate: boolean = true
): Promise<EvaluatedSpecification> {
  console.log('[LIDA VisGenerator] Generating chart spec for:', goal.question);

  const apiKey = getGeminiKey('LIDA_VISGENERATOR');
  if (!apiKey) {
    console.warn('[LIDA VisGenerator] No API key, using fallback spec');
    return generateFallbackSpec(goal, summary);
  }

  try {
    // Step 1: Generate initial chart specification
    const spec = await generateInitialSpec(goal, summary, apiKey);

    // Step 2: Self-evaluate and improve (optional)
    if (selfEvaluate) {
      return await evaluateAndImproveSpec(spec, summary, apiKey);
    }

    // Return with basic evaluation
    return {
      ...spec,
      evaluation: {
        score: 70,
        strengths: ['AI-generated configuration'],
        weaknesses: ['Not self-evaluated'],
        improvements: ['Enable self-evaluation for better results'],
        data_fitness: 0.7,
        clarity_score: 0.7,
        insight_potential: 0.7,
      },
    };
  } catch (error) {
    console.error('[LIDA VisGenerator] Error:', error);
    return generateFallbackSpec(goal, summary);
  }
}

/**
 * Generate initial chart specification using AI
 */
async function generateInitialSpec(
  goal: VisualizationGoal,
  summary: DatasetSummary,
  apiKey: string
): Promise<ChartSpecification> {
  const prompt = `You are a data visualization expert. Generate an optimal chart configuration.

GOAL:
Question: ${goal.question}
Suggested Visualization: ${goal.visualization}
Rationale: ${goal.rationale}

DATASET SUMMARY:
${JSON.stringify({
  name: summary.name,
  description: summary.dataset_description,
  size: summary.size,
  fields: summary.fields.map(f => ({
    name: f.column,
    type: f.properties.semantic_type,
    dtype: f.properties.dtype,
    unique: f.properties.num_unique_values,
    samples: f.properties.samples.slice(0, 3),
  })),
  statistics: {
    numeric: Object.keys(summary.statistics.numeric_columns),
    categorical: Object.keys(summary.statistics.categorical_columns),
    temporal: summary.statistics.temporal_columns,
  },
}, null, 2)}

TASK:
Generate a complete chart specification that best answers the goal question.

CHART TYPES AVAILABLE:
- bar: Categorical comparisons
- line: Trends over time or continuous data
- area: Cumulative trends
- pie: Part-to-whole relationships (max 7 slices)
- scatter: Correlation between two variables
- stacked-bar: Multi-dimensional categorical comparison
- heatmap: Intensity across two dimensions
- histogram: Distribution of numeric values

REQUIREMENTS:
1. Select the most appropriate chart_type
2. Choose the right columns for x, y, category, value, etc.
3. Determine if aggregation is needed (sum, avg, count, min, max)
4. Suggest filters if needed to focus the visualization
5. Provide a clear, descriptive title
6. Explain the rationale for your choices
7. Rate your confidence (0-1) in this configuration
8. Suggest alternative chart types if applicable

Return ONLY a JSON object, no other text:
{
  "chart_type": "bar",
  "columns": {
    "x": "category_column",
    "y": "value_column"
  },
  "aggregation": {
    "method": "sum",
    "groupBy": "category_column"
  },
  "filters": [],
  "title": "Clear, descriptive title",
  "description": "What this chart shows",
  "rationale": "Why this configuration is optimal",
  "confidence": 0.9,
  "alternative_charts": ["line", "area"]
}`;

  const response = await callGemini(prompt, apiKey);

  // Extract JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Self-evaluate and improve the chart specification
 */
async function evaluateAndImproveSpec(
  spec: ChartSpecification,
  summary: DatasetSummary,
  apiKey: string
): Promise<EvaluatedSpecification> {
  const prompt = `You are a data visualization critic. Evaluate and improve this chart specification.

CHART SPECIFICATION:
${JSON.stringify(spec, null, 2)}

DATASET CONTEXT:
${JSON.stringify({
  name: summary.name,
  size: summary.size,
  fields: summary.fields.map(f => f.column),
  numeric_cols: Object.keys(summary.statistics.numeric_columns),
  categorical_cols: Object.keys(summary.statistics.categorical_columns),
}, null, 2)}

EVALUATION CRITERIA:
1. **Data Fitness** (0-1): Does the chart type match the data types?
   - Are categorical columns used for categories?
   - Are numeric columns used for values?
   - Is aggregation necessary and correctly applied?

2. **Clarity Score** (0-1): Will the chart be readable and clear?
   - Not too many data points (pie max 7, bar max 30)?
   - Clear axis labels and titles?
   - Appropriate aggregation to reduce complexity?

3. **Insight Potential** (0-1): How much insight can this chart provide?
   - Does it answer the original question?
   - Does it reveal patterns, trends, or comparisons?
   - Is it the best chart type for this goal?

TASK:
1. Evaluate the specification on all criteria
2. Calculate an overall score (0-100)
3. Identify strengths (what works well)
4. Identify weaknesses (what could be better)
5. Suggest improvements (specific actionable changes)

Return ONLY a JSON object with the IMPROVED specification and evaluation:
{
  "chart_type": "improved_type_if_needed",
  "columns": { ... },
  "aggregation": { ... },
  "filters": [ ... ],
  "title": "improved_title",
  "description": "improved_description",
  "rationale": "improved_rationale",
  "confidence": 0.95,
  "alternative_charts": [...],
  "evaluation": {
    "score": 85,
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1"],
    "improvements": ["improvement 1", "improvement 2"],
    "data_fitness": 0.9,
    "clarity_score": 0.85,
    "insight_potential": 0.8
  }
}`;

  const response = await callGemini(prompt, apiKey);

  // Extract JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in evaluation response');
  }

  const evaluated: EvaluatedSpecification = JSON.parse(jsonMatch[0]);

  console.log('[LIDA VisGenerator] ✅ Spec evaluated:', {
    score: evaluated.evaluation.score,
    confidence: evaluated.confidence,
  });

  return evaluated;
}

/**
 * Generate fallback specification (no AI)
 */
function generateFallbackSpec(goal: VisualizationGoal, summary: DatasetSummary): EvaluatedSpecification {
  const numericCols = Object.keys(summary.statistics.numeric_columns);
  const categoricalCols = Object.keys(summary.statistics.categorical_columns);
  const temporalCols = summary.statistics.temporal_columns;

  let spec: ChartSpecification;

  // Determine chart type and columns based on goal
  switch (goal.visualization) {
    case 'bar':
      spec = {
        chart_type: 'bar',
        columns: {
          x: categoricalCols[0] || summary.field_names[0],
          y: numericCols[0] || summary.field_names[1],
        },
        aggregation: {
          method: 'sum',
          groupBy: categoricalCols[0],
        },
        title: goal.question,
        description: `Bar chart showing ${numericCols[0] || 'values'} by ${categoricalCols[0] || 'category'}`,
        rationale: 'Bar charts are effective for categorical comparisons',
        confidence: 0.7,
        alternative_charts: ['pie', 'stacked-bar'],
      };
      break;

    case 'line':
    case 'area':
      spec = {
        chart_type: goal.visualization as any,
        columns: {
          x: temporalCols[0] || numericCols[0] || summary.field_names[0],
          y: numericCols[0] || summary.field_names[1],
        },
        title: goal.question,
        description: `${goal.visualization} chart showing trend over ${temporalCols[0] || 'sequence'}`,
        rationale: `${goal.visualization} charts are ideal for showing trends`,
        confidence: 0.7,
        alternative_charts: ['line', 'area', 'bar'],
      };
      break;

    case 'pie':
      spec = {
        chart_type: 'pie',
        columns: {
          category: categoricalCols[0] || summary.field_names[0],
          value: numericCols[0] || summary.field_names[1],
        },
        aggregation: {
          method: 'sum',
          groupBy: categoricalCols[0],
        },
        title: goal.question,
        description: `Pie chart showing distribution of ${categoricalCols[0] || 'categories'}`,
        rationale: 'Pie charts show part-to-whole relationships',
        confidence: 0.7,
        alternative_charts: ['bar'],
      };
      break;

    case 'scatter':
      spec = {
        chart_type: 'scatter',
        columns: {
          x: numericCols[0] || summary.field_names[0],
          y: numericCols[1] || summary.field_names[1],
        },
        title: goal.question,
        description: `Scatter plot showing relationship between ${numericCols[0]} and ${numericCols[1]}`,
        rationale: 'Scatter plots reveal correlations',
        confidence: 0.7,
        alternative_charts: ['line'],
      };
      break;

    default:
      spec = {
        chart_type: 'bar',
        columns: {
          x: summary.field_names[0],
          y: summary.field_names[1],
        },
        title: goal.question,
        description: 'Fallback bar chart',
        rationale: 'Default visualization',
        confidence: 0.5,
        alternative_charts: ['line', 'pie'],
      };
  }

  return {
    ...spec,
    evaluation: {
      score: 60,
      strengths: ['Basic configuration generated'],
      weaknesses: ['Not AI-optimized', 'Generic column selection'],
      improvements: ['Use AI for better column selection', 'Apply self-evaluation'],
      data_fitness: 0.6,
      clarity_score: 0.6,
      insight_potential: 0.6,
    },
  };
}

/**
 * Batch generate specifications for multiple goals
 */
export async function generateMultipleSpecs(
  goals: VisualizationGoal[],
  summary: DatasetSummary,
  selfEvaluate: boolean = true
): Promise<EvaluatedSpecification[]> {
  console.log('[LIDA VisGenerator] Generating specs for', goals.length, 'goals');

  const specs = await Promise.all(
    goals.map(goal => generateChartSpec(goal, summary, selfEvaluate))
  );

  console.log('[LIDA VisGenerator] ✅ Generated', specs.length, 'specifications');
  return specs;
}

/**
 * Filter specifications by evaluation score
 */
export function filterSpecsByScore(
  specs: EvaluatedSpecification[],
  minScore: number
): EvaluatedSpecification[] {
  return specs.filter(s => s.evaluation.score >= minScore);
}

/**
 * Sort specifications by score (best first)
 */
export function sortSpecsByScore(specs: EvaluatedSpecification[]): EvaluatedSpecification[] {
  return [...specs].sort((a, b) => b.evaluation.score - a.evaluation.score);
}
