/**
 * React Hook for LIDA AI-Powered Visualizations
 * Provides easy access to all 4 LIDA modules
 */

import { useState, useCallback } from 'react';
import { DatasetSummary } from '@/lib/lida-summarizer';
import { VisualizationGoal } from '@/lib/lida-goal-explorer';
import { EvaluatedSpecification } from '@/lib/lida-visgenerator';

interface UseLIDAOptions {
  datasetId: string;
  userId: string;
}

interface UseLIDAReturn {
  // State
  summary: DatasetSummary | null;
  goals: VisualizationGoal[];
  specifications: EvaluatedSpecification[];
  loading: boolean;
  error: string | null;

  // Actions
  generateSummary: (useAI?: boolean) => Promise<DatasetSummary | null>;
  exploreGoals: (numGoals?: number, persona?: string) => Promise<VisualizationGoal[]>;
  generateSpec: (goal: VisualizationGoal, selfEvaluate?: boolean) => Promise<EvaluatedSpecification | null>;
  generateAllSpecs: (selfEvaluate?: boolean) => Promise<EvaluatedSpecification[]>;
  setSpecifications: React.Dispatch<React.SetStateAction<EvaluatedSpecification[]>>;
  reset: () => void;
}

export function useLIDA({ datasetId, userId }: UseLIDAOptions): UseLIDAReturn {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [goals, setGoals] = useState<VisualizationGoal[]>([]);
  const [specifications, setSpecifications] = useState<EvaluatedSpecification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Step 1: Generate dataset summary
   */
  const generateSummary = useCallback(async (useAI: boolean = true): Promise<DatasetSummary | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lida/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, userId, useAI }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        console.log('[useLIDA] ✅ Summary generated:', data.cached ? '(cached)' : '(fresh)');
        return data.summary;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[useLIDA] Summary error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [datasetId, userId]);

  /**
   * Step 2: Explore visualization goals
   */
  const exploreGoals = useCallback(async (
    numGoals: number = 5,
    persona: string = 'default'
  ): Promise<VisualizationGoal[]> => {
    if (!summary) {
      setError('Summary must be generated first');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lida/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, numGoals, persona }),
      });

      if (!response.ok) {
        throw new Error('Failed to explore goals');
      }

      const data = await response.json();

      if (data.success) {
        setGoals(data.goals);
        console.log('[useLIDA] ✅ Goals explored:', data.goals.length, data.cached ? '(cached)' : '(fresh)');
        return data.goals;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[useLIDA] Goals error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [summary]);

  /**
   * Step 3: Generate single chart specification
   */
  const generateSpec = useCallback(async (
    goal: VisualizationGoal,
    selfEvaluate: boolean = true
  ): Promise<EvaluatedSpecification | null> => {
    if (!summary) {
      setError('Summary must be generated first');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lida/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, summary, selfEvaluate }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate specification');
      }

      const data = await response.json();

      if (data.success) {
        console.log('[useLIDA] ✅ Spec generated:', data.cached ? '(cached)' : '(fresh)', `Score: ${data.specification.evaluation.score}`);
        return data.specification;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[useLIDA] Spec error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [summary]);

  /**
   * Step 4: Generate specifications for all goals
   */
  const generateAllSpecs = useCallback(async (
    selfEvaluate: boolean = true
  ): Promise<EvaluatedSpecification[]> => {
    if (!summary || goals.length === 0) {
      setError('Summary and goals must be generated first');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lida/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, summary, selfEvaluate }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate specifications');
      }

      const data = await response.json();

      if (data.success) {
        setSpecifications(data.specifications);
        console.log('[useLIDA] ✅ All specs generated:', data.specifications.length, data.cached ? '(cached)' : '(fresh)');
        return data.specifications;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('[useLIDA] All specs error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [summary, goals]);

  /**
   * Reset all LIDA state
   */
  const reset = useCallback(() => {
    setSummary(null);
    setGoals([]);
    setSpecifications([]);
    setError(null);
  }, []);

  return {
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
    reset,
  };
}
