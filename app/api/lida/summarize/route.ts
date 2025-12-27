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

    // Fetch dataset from Redis first
    let dataset = await getCachedDataset(userId, datasetId);

    // If not in Redis, try to fetch from Supabase
    if (!dataset) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: datasetRecord, error: dbError } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', datasetId)
          .eq('user_id', userId)
          .single();

        if (dbError || !datasetRecord) {
          return NextResponse.json(
            { error: 'Dataset not found in cache or database' },
            { status: 404 }
          );
        }

        // Reconstruct dataset from DB
        dataset = {
          rows: datasetRecord.data_rows || [],
          columns: datasetRecord.column_names || [],
          types: datasetRecord.column_types || [],
          rowCount: datasetRecord.data_rows?.length || 0,
          columnCount: datasetRecord.column_names?.length || 0,
        };

        console.log(`[LIDA Summary] Retrieved dataset from DB for ${datasetId}`);
      } catch (dbError) {
        console.error('[LIDA Summary] DB fetch error:', dbError);
        return NextResponse.json(
          { error: 'Failed to retrieve dataset' },
          { status: 500 }
        );
      }
    }

    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dataset is empty' },
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
