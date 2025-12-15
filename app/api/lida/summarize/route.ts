import { NextRequest, NextResponse } from 'next/server';
import { generateDatasetSummary } from '@/lib/lida-summarizer';
import { getCachedDataset } from '@/lib/redis';
import { cacheAIResponse, getCachedAIResponse } from '@/lib/redis';

/**
 * POST /api/lida/summarize
 * Generate LIDA dataset summary
 */
export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, useAI = true } = await request.json();

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `lida:summary:${datasetId}:${useAI ? 'ai' : 'basic'}`;
    try {
      const cachedSummary = await getCachedAIResponse(cacheKey);
      if (cachedSummary) {
        console.log(`[LIDA Summary] ✅ Cache HIT for dataset ${datasetId}`);
        return NextResponse.json({
          success: true,
          summary: cachedSummary,
          cached: true,
        });
      }
    } catch (cacheError) {
      console.warn('[LIDA Summary] Cache check failed:', cacheError);
    }

    // Fetch dataset from Redis or DB
    const dataset = await getCachedDataset(userId, datasetId);

    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found or empty' },
        { status: 404 }
      );
    }

    console.log(`[LIDA Summary] Generating summary for dataset ${datasetId} (${dataset.rows.length} rows)`);

    // Generate summary
    const summary = await generateDatasetSummary(
      dataset.rows,
      dataset.columns,
      `dataset_${datasetId}`,
      useAI
    );

    // Cache the summary (24 hours)
    try {
      const SUMMARY_CACHE_TTL = 24 * 60 * 60; // 24 hours
      await cacheAIResponse(cacheKey, summary, SUMMARY_CACHE_TTL);
      console.log(`[LIDA Summary] ✅ Cached summary for dataset ${datasetId}`);
    } catch (cacheError) {
      console.warn('[LIDA Summary] Failed to cache summary:', cacheError);
    }

    return NextResponse.json({
      success: true,
      summary,
      cached: false,
    });
  } catch (error: any) {
    console.error('[LIDA Summary] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
