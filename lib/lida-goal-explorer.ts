/**
 * LIDA GOAL EXPLORER Module
 * Suggests visualization goals and questions based on dataset summary
 *
 * Purpose: Help users discover insights by suggesting what to visualize
 * Benefits: Proactive guidance, exploration assistance, question generation
 */

import { callGemini } from './gemini-rest';
import { getGeminiKey } from './gemini-key-manager';
import { DatasetSummary } from './lida-summarizer';

export interface VisualizationGoal {
  index: number;
  question: string;
  visualization: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
  estimated_insight: string;
}

/**
 * Generate visualization goals based on dataset summary
 */
export async function exploreVisualizationGoals(
  summary: DatasetSummary,
  numGoals: number = 5,
  persona?: 'default' | 'business' | 'data_scientist' | 'executive'
): Promise<VisualizationGoal[]> {
  console.log('[LIDA Goal Explorer] Generating', numGoals, 'visualization goals for:', summary.name);

  const apiKey = getGeminiKey('LIDA_GOAL_EXPLORER');
  if (!apiKey) {
    console.warn('[LIDA Goal Explorer] No API key, using fallback goals');
    return generateFallbackGoals(summary, numGoals);
  }

  try {
    const prompt = buildGoalExplorerPrompt(summary, numGoals, persona);
    const response = await callGemini(prompt, apiKey);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const goals: VisualizationGoal[] = JSON.parse(jsonMatch[0]);

    console.log('[LIDA Goal Explorer] ✅ Generated', goals.length, 'goals');
    return goals;
  } catch (error) {
    console.error('[LIDA Goal Explorer] Error:', error);
    return generateFallbackGoals(summary, numGoals);
  }
}

/**
 * Build the Goal Explorer prompt
 */
function buildGoalExplorerPrompt(
  summary: DatasetSummary,
  numGoals: number,
  persona?: string
): string {
  const personaContext = getPersonaContext(persona);

  return `You are a data visualization expert helping users explore their dataset.

${personaContext}

DATASET SUMMARY:
Name: ${summary.name}
Description: ${summary.dataset_description}
Size: ${summary.size.rows} rows × ${summary.size.columns} columns

FIELDS:
${summary.fields.slice(0, 15).map(f => `
- ${f.column}
  Type: ${f.properties.semantic_type} (${f.properties.dtype})
  Unique Values: ${f.properties.num_unique_values}
  ${f.properties.min !== undefined ? `Range: ${f.properties.min} to ${f.properties.max}` : ''}
  Samples: ${f.properties.samples.slice(0, 3).join(', ')}
`).join('\n')}

STATISTICS:
- Numeric Columns: ${Object.keys(summary.statistics.numeric_columns).join(', ') || 'None'}
- Categorical Columns: ${Object.keys(summary.statistics.categorical_columns).join(', ') || 'None'}
- Temporal Columns: ${summary.statistics.temporal_columns.join(', ') || 'None'}

TASK:
Generate ${numGoals} visualization goals that would help users understand and explore this dataset.
Each goal should be a specific question that can be answered with a visualization.

PRIORITIZE:
1. High-impact insights (trends, outliers, correlations)
2. Questions relevant to the data domain
3. Mix of simple and complex visualizations
4. Coverage of different field types

For each goal, provide:
- index: Goal number (1 to ${numGoals})
- question: A clear, specific question to answer
- visualization: Recommended chart type (bar, line, scatter, pie, heatmap, etc.)
- rationale: Why this goal is important (1 sentence)
- priority: 'high' | 'medium' | 'low'
- complexity: 'simple' | 'moderate' | 'complex'
- estimated_insight: What insight this might reveal (1 sentence)

Return ONLY a JSON array, no other text:
[
  {
    "index": 1,
    "question": "What is the distribution of X across categories?",
    "visualization": "bar",
    "rationale": "Understanding category distribution is fundamental",
    "priority": "high",
    "complexity": "simple",
    "estimated_insight": "May reveal which categories dominate the dataset"
  }
]`;
}

/**
 * Get persona-specific context
 */
function getPersonaContext(persona?: string): string {
  switch (persona) {
    case 'business':
      return 'You are helping a business analyst. Focus on KPIs, trends, comparisons, and actionable insights.';
    case 'data_scientist':
      return 'You are helping a data scientist. Focus on distributions, correlations, outliers, and statistical patterns.';
    case 'executive':
      return 'You are helping an executive. Focus on high-level trends, summaries, and strategic insights.';
    default:
      return 'You are helping a general user. Balance simplicity with depth, focusing on the most interesting patterns.';
  }
}

/**
 * Generate fallback goals without AI
 */
function generateFallbackGoals(summary: DatasetSummary, numGoals: number): VisualizationGoal[] {
  const goals: VisualizationGoal[] = [];
  let index = 1;

  // Goal 1: Overview
  if (summary.size.rows > 0) {
    goals.push({
      index: index++,
      question: `What does the overall structure of ${summary.name} look like?`,
      visualization: 'table',
      rationale: 'Understanding the data structure is the first step',
      priority: 'high',
      complexity: 'simple',
      estimated_insight: 'Shows the basic layout and types of data available',
    });
  }

  // Goal 2: Categorical distribution
  const categoricalCols = Object.keys(summary.statistics.categorical_columns);
  if (categoricalCols.length > 0 && goals.length < numGoals) {
    const col = categoricalCols[0];
    goals.push({
      index: index++,
      question: `What is the distribution of ${col}?`,
      visualization: 'bar',
      rationale: 'Category distribution reveals data balance and dominant groups',
      priority: 'high',
      complexity: 'simple',
      estimated_insight: `Shows which ${col} values are most common`,
    });
  }

  // Goal 3: Numeric trends
  const numericCols = Object.keys(summary.statistics.numeric_columns);
  if (numericCols.length > 0 && goals.length < numGoals) {
    const col = numericCols[0];
    goals.push({
      index: index++,
      question: `How does ${col} vary across the dataset?`,
      visualization: 'line',
      rationale: 'Visualizing numeric variation helps identify trends and patterns',
      priority: 'high',
      complexity: 'simple',
      estimated_insight: `Reveals trends, spikes, or stability in ${col}`,
    });
  }

  // Goal 4: Time series (if temporal data exists)
  if (summary.statistics.temporal_columns.length > 0 && numericCols.length > 0 && goals.length < numGoals) {
    const timeCol = summary.statistics.temporal_columns[0];
    const valueCol = numericCols[0];
    goals.push({
      index: index++,
      question: `How has ${valueCol} changed over time (${timeCol})?`,
      visualization: 'area',
      rationale: 'Time-series analysis reveals growth, seasonality, and trends',
      priority: 'high',
      complexity: 'moderate',
      estimated_insight: `Shows temporal patterns and trends in ${valueCol}`,
    });
  }

  // Goal 5: Correlation (if multiple numeric columns)
  if (numericCols.length >= 2 && goals.length < numGoals) {
    const col1 = numericCols[0];
    const col2 = numericCols[1];
    goals.push({
      index: index++,
      question: `Is there a relationship between ${col1} and ${col2}?`,
      visualization: 'scatter',
      rationale: 'Correlation analysis uncovers hidden relationships',
      priority: 'medium',
      complexity: 'moderate',
      estimated_insight: `May reveal positive, negative, or no correlation between variables`,
    });
  }

  // Goal 6: Categorical breakdown
  if (categoricalCols.length >= 2 && goals.length < numGoals) {
    const col1 = categoricalCols[0];
    const col2 = categoricalCols[1];
    goals.push({
      index: index++,
      question: `How do ${col1} and ${col2} relate?`,
      visualization: 'stacked-bar',
      rationale: 'Multi-dimensional categorical analysis reveals segment patterns',
      priority: 'medium',
      complexity: 'moderate',
      estimated_insight: `Shows how ${col2} is distributed within each ${col1} category`,
    });
  }

  // Goal 7: Statistical distribution
  if (numericCols.length > 0 && goals.length < numGoals) {
    const col = numericCols[0];
    const stats = summary.statistics.numeric_columns[col];
    goals.push({
      index: index++,
      question: `What is the statistical distribution of ${col}?`,
      visualization: 'histogram',
      rationale: 'Distribution analysis reveals data spread, skewness, and outliers',
      priority: 'medium',
      complexity: 'moderate',
      estimated_insight: `Shows if ${col} is normally distributed or skewed (range: ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)})`,
    });
  }

  return goals.slice(0, numGoals);
}

/**
 * Enrich goals with dataset-specific context
 */
export function enrichGoalWithContext(
  goal: VisualizationGoal,
  summary: DatasetSummary
): VisualizationGoal {
  // Add suggested columns based on the goal's visualization type
  const enriched = { ...goal };

  // This can be extended to add more context like:
  // - Suggested columns for the visualization
  // - Data filters to apply
  // - Recommended aggregations
  // - Expected chart configuration

  return enriched;
}

/**
 * Filter goals by priority
 */
export function filterGoalsByPriority(
  goals: VisualizationGoal[],
  priority: 'high' | 'medium' | 'low'
): VisualizationGoal[] {
  return goals.filter(g => g.priority === priority);
}

/**
 * Sort goals by complexity (simple first)
 */
export function sortGoalsByComplexity(goals: VisualizationGoal[]): VisualizationGoal[] {
  const complexityOrder = { simple: 1, moderate: 2, complex: 3 };
  return [...goals].sort((a, b) => complexityOrder[a.complexity] - complexityOrder[b.complexity]);
}
