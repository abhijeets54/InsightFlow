import { NextRequest, NextResponse } from 'next/server';
import { generateChartSpec, generateMultipleSpecs } from '@/lib/lida-visgenerator';
import { DatasetSummary } from '@/lib/lida-summarizer';
import { VisualizationGoal } from '@/lib/lida-goal-explorer';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

/**
 * POST /api/lida/generate
 * Generate chart specifications using LIDA VisGenerator
 */
export async function POST(request: NextRequest) {
  try {
    const {
      goal,
      goals,
      summary,
      selfEvaluate = true,
    }: {
      goal?: VisualizationGoal;
      goals?: VisualizationGoal[];
      summary: DatasetSummary;
      selfEvaluate?: boolean;
    } = await request.json();

    if (!summary || !summary.name) {
      return NextResponse.json(
        { error: 'Dataset summary is required' },
        { status: 400 }
      );
    }

    if (!goal && !goals) {
      return NextResponse.json(
        { error: 'Either goal or goals array is required' },
        { status: 400 }
      );
    }

    // Single goal mode
    if (goal) {
      const cacheKey = `lida:spec:${summary.name}:${goal.index}:${selfEvaluate}`;

      // Check cache
      try {
        const cachedSpec = await getCachedAIResponse(cacheKey);
        if (cachedSpec) {
          console.log(`[LIDA Generate] ✅ Cache HIT for goal ${goal.index}`);
          return NextResponse.json({
            success: true,
            specification: cachedSpec,
            cached: true,
          });
        }
      } catch (cacheError) {
        console.warn('[LIDA Generate] Cache check failed:', cacheError);
      }

      console.log(`[LIDA Generate] Generating spec for goal: "${goal.question}"`);

      const spec = await generateChartSpec(goal, summary, selfEvaluate);

      // Cache the spec (6 hours)
      try {
        const SPEC_CACHE_TTL = 6 * 60 * 60; // 6 hours
        await cacheAIResponse(cacheKey, spec, SPEC_CACHE_TTL);
        console.log(`[LIDA Generate] ✅ Cached spec (score: ${spec.evaluation.score})`);
      } catch (cacheError) {
        console.warn('[LIDA Generate] Failed to cache spec:', cacheError);
      }

      return NextResponse.json({
        success: true,
        specification: spec,
        cached: false,
      });
    }

    // Multiple goals mode
    if (goals) {
      const cacheKey = `lida:specs:${summary.name}:${goals.length}:${selfEvaluate}`;

      // Check cache
      try {
        const cachedSpecs = await getCachedAIResponse(cacheKey);
        if (cachedSpecs) {
          console.log(`[LIDA Generate] ✅ Cache HIT for ${goals.length} goals`);
          return NextResponse.json({
            success: true,
            specifications: cachedSpecs,
            cached: true,
          });
        }
      } catch (cacheError) {
        console.warn('[LIDA Generate] Cache check failed:', cacheError);
      }

      console.log(`[LIDA Generate] Generating specs for ${goals.length} goals`);

      const specs = await generateMultipleSpecs(goals, summary, selfEvaluate);

      // Cache the specs (6 hours)
      try {
        const SPEC_CACHE_TTL = 6 * 60 * 60; // 6 hours
        await cacheAIResponse(cacheKey, specs, SPEC_CACHE_TTL);
        console.log(`[LIDA Generate] ✅ Cached ${specs.length} specs`);
      } catch (cacheError) {
        console.warn('[LIDA Generate] Failed to cache specs:', cacheError);
      }

      return NextResponse.json({
        success: true,
        specifications: specs,
        cached: false,
      });
    }
  } catch (error: any) {
    console.error('[LIDA Generate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chart specifications' },
      { status: 500 }
    );
  }
}
