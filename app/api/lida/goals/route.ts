import { NextRequest, NextResponse } from 'next/server';
import { exploreVisualizationGoals } from '@/lib/lida-goal-explorer';
import { DatasetSummary } from '@/lib/lida-summarizer';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

/**
 * POST /api/lida/goals
 * Generate visualization goals using LIDA Goal Explorer
 */
export async function POST(request: NextRequest) {
  try {
    const {
      summary,
      numGoals = 5,
      persona = 'default'
    }: {
      summary: DatasetSummary;
      numGoals?: number;
      persona?: 'default' | 'business' | 'data_scientist' | 'executive';
    } = await request.json();

    if (!summary || !summary.name) {
      return NextResponse.json(
        { error: 'Dataset summary is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `lida:goals:${summary.name}:${numGoals}:${persona}`;
    try {
      const cachedGoals = await getCachedAIResponse(cacheKey);
      if (cachedGoals) {
        console.log(`[LIDA Goals] ✅ Cache HIT for ${summary.name}`);
        return NextResponse.json({
          success: true,
          goals: cachedGoals,
          cached: true,
        });
      }
    } catch (cacheError) {
      console.warn('[LIDA Goals] Cache check failed:', cacheError);
    }

    console.log(`[LIDA Goals] Generating ${numGoals} goals for: ${summary.name} (persona: ${persona})`);

    // Generate goals
    const goals = await exploreVisualizationGoals(summary, numGoals, persona);

    // Cache the goals (12 hours)
    try {
      const GOALS_CACHE_TTL = 12 * 60 * 60; // 12 hours
      await cacheAIResponse(cacheKey, goals, GOALS_CACHE_TTL);
      console.log(`[LIDA Goals] ✅ Cached ${goals.length} goals`);
    } catch (cacheError) {
      console.warn('[LIDA Goals] Failed to cache goals:', cacheError);
    }

    return NextResponse.json({
      success: true,
      goals,
      cached: false,
    });
  } catch (error: any) {
    console.error('[LIDA Goals] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate goals' },
      { status: 500 }
    );
  }
}
