'use client';

import { useState } from 'react';
import { useLIDA } from '@/hooks/useLIDA';
import { VisualizationGoal } from '@/lib/lida-goal-explorer';
import { EvaluatedSpecification } from '@/lib/lida-visgenerator';

interface LIDAPanelProps {
  datasetId: string;
  userId: string;
  onApplySpec?: (spec: EvaluatedSpecification) => void;
}

export default function LIDAPanel({ datasetId, userId, onApplySpec }: LIDAPanelProps) {
  const {
    summary,
    goals,
    specifications,
    loading,
    error,
    generateSummary,
    exploreGoals,
    generateSpec,
    generateAllSpecs,
    setSpecifications,
  } = useLIDA({ datasetId, userId });

  const [selectedGoal, setSelectedGoal] = useState<VisualizationGoal | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<EvaluatedSpecification | null>(null);
  const [activeTab, setActiveTab] = useState<'goals' | 'specs'>('goals');

  const handleGenerateSummary = async () => {
    await generateSummary(true);
  };

  const handleExploreGoals = async () => {
    await exploreGoals(3, 'default');
  };

  const handleGenerateSpec = async (goal: VisualizationGoal) => {
    setSelectedGoal(goal);
    const spec = await generateSpec(goal, true);
    if (spec) {
      // Add the spec to the specifications array
      setSpecifications(prev => {
        // Check if spec for this goal already exists
        const existingIndex = prev.findIndex(s =>
          s.title === spec.title || s.description === spec.description
        );
        if (existingIndex >= 0) {
          // Replace existing spec
          const updated = [...prev];
          updated[existingIndex] = spec;
          return updated;
        } else {
          // Add new spec
          return [...prev, spec];
        }
      });
      setSelectedSpec(spec);
      setActiveTab('specs');
    }
  };

  const handleGenerateAllSpecs = async () => {
    await generateAllSpecs(true);
    setActiveTab('specs');
  };

  const handleApplySpec = (spec: EvaluatedSpecification) => {
    if (onApplySpec) {
      onApplySpec(spec);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-large border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-neutral-900">AI-Powered Insights</h2>
            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full font-semibold shadow-md">
              Generated with Gemini 2.0
            </span>
          </div>
          <p className="text-sm text-neutral-600">Powered by LIDA - Let AI analyze your data and suggest optimal visualizations with intelligent insights</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Generate Summary */}
      {!summary && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Start with Dataset Analysis</h3>
          <p className="mt-2 text-sm text-gray-500">
            LIDA will analyze your dataset and generate a comprehensive summary
          </p>
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyze Dataset'}
          </button>
        </div>
      )}

      {/* Step 2: Show Summary & Explore Goals */}
      {summary && goals.length === 0 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dataset Summary</h3>
            <p className="text-sm text-gray-700 mb-4">{summary.dataset_description}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Rows:</span>
                <span className="ml-2 font-semibold text-gray-900">{summary.size.rows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Columns:</span>
                <span className="ml-2 font-semibold text-gray-900">{summary.size.columns}</span>
              </div>
              <div>
                <span className="text-gray-600">Numeric Fields:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {Object.keys(summary.statistics.numeric_columns).length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center py-6">
            <button
              onClick={handleExploreGoals}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {loading ? 'Exploring...' : 'Explore Visualization Goals'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Show Goals & Generate Specs */}
      {goals.length > 0 && (
        <div>
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'goals'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Visualization Goals ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'specs'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Chart Specifications ({specifications.length})
            </button>
          </div>

          {activeTab === 'goals' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateAllSpecs}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : `Generate All ${goals.length} Charts`}
                </button>
              </div>

              {goals.map((goal) => (
                <div
                  key={goal.index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors cursor-pointer"
                  onClick={() => handleGenerateSpec(goal)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500">#{goal.index}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {goal.visualization}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{goal.question}</h4>
                      <p className="text-sm text-gray-600">{goal.rationale}</p>
                      <p className="text-xs text-gray-500 mt-2 italic">{goal.estimated_insight}</p>
                    </div>
                    <button
                      className="ml-4 px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateSpec(goal);
                      }}
                    >
                      Generate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              {specifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No specifications generated yet. Click "Generate" on a goal or generate all charts.
                </div>
              ) : (
                specifications.map((spec, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">
                            {spec.chart_type}
                          </span>
                          <span className={`text-lg font-bold ${getScoreColor(spec.evaluation.score)}`}>
                            {spec.evaluation.score}/100
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{spec.title}</h4>
                        <p className="text-sm text-gray-600">{spec.description}</p>
                      </div>
                      <button
                        onClick={() => handleApplySpec(spec)}
                        className="ml-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Apply Chart
                      </button>
                    </div>

                    {/* Evaluation Details */}
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Data Fit:</span>
                          <span className="ml-1 font-semibold">{(spec.evaluation.data_fitness * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Clarity:</span>
                          <span className="ml-1 font-semibold">{(spec.evaluation.clarity_score * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Insight:</span>
                          <span className="ml-1 font-semibold">{(spec.evaluation.insight_potential * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {spec.evaluation.strengths.length > 0 && (
                        <div className="text-xs">
                          <span className="text-green-600 font-semibold">Strengths:</span>
                          <span className="ml-1 text-gray-700">{spec.evaluation.strengths.join(', ')}</span>
                        </div>
                      )}

                      {spec.evaluation.improvements.length > 0 && (
                        <div className="text-xs">
                          <span className="text-blue-600 font-semibold">Suggestions:</span>
                          <span className="ml-1 text-gray-700">{spec.evaluation.improvements.join(', ')}</span>
                        </div>
                      )}

                      <div className="text-xs bg-gray-50 rounded p-2">
                        <span className="text-gray-600">Columns:</span>
                        <span className="ml-1 text-gray-900 font-mono">
                          {JSON.stringify(spec.columns, null, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
