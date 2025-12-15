import { NextRequest, NextResponse } from 'next/server';
import { getCachedDataset, extendDatasetTTL } from '@/lib/redis';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * GET /api/dataset/[id]
 * Fetches the full dataset from Redis cache or falls back to Supabase
 *
 * Query params:
 * - userId: User ID (required for authorization)
 * - extendTTL: Whether to extend the cache TTL (optional, default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const extendTTL = searchParams.get('extendTTL') !== 'false'; // Default true
    const datasetId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    if (!datasetId) {
      return NextResponse.json(
        { error: 'Dataset ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Dataset API] Fetching dataset ${datasetId} for user ${userId}`);

    // Try to get from Redis cache first
    try {
      const cachedData = await getCachedDataset(userId, datasetId);

      if (cachedData) {
        console.log(`[Dataset API] ✅ Cache HIT for dataset ${datasetId}: ${cachedData.rowCount} rows`);

        // Extend TTL if requested (default behavior)
        if (extendTTL) {
          const DATASET_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
          await extendDatasetTTL(userId, datasetId, DATASET_CACHE_TTL);
        }

        return NextResponse.json({
          success: true,
          source: 'cache',
          data: {
            rows: cachedData.rows,
            columns: cachedData.columns,
            types: cachedData.types,
            rowCount: cachedData.rowCount,
            columnCount: cachedData.columnCount,
          },
        });
      }

      console.log(`[Dataset API] ⚠️ Cache MISS for dataset ${datasetId}, falling back to database`);
    } catch (redisError) {
      console.warn('[Dataset API] Redis error, falling back to database:', redisError);
    }

    // Fallback: Fetch from Supabase
    const supabase = getServiceSupabase();

    // First verify the user owns this dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, user_id, column_names, column_types, data_rows')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (datasetError || !dataset) {
      console.error('[Dataset API] Dataset not found or unauthorized:', datasetError);
      return NextResponse.json(
        { error: 'Dataset not found or unauthorized' },
        { status: 404 }
      );
    }

    // Parse the data rows (stored as JSON strings in Supabase)
    const rows = dataset.data_rows.map((row: string) => {
      try {
        return typeof row === 'string' ? JSON.parse(row) : row;
      } catch (e) {
        console.warn('[Dataset API] Failed to parse row:', e);
        return row;
      }
    });

    const datasetData = {
      rows,
      columns: dataset.column_names,
      types: dataset.column_types,
      rowCount: rows.length,
      columnCount: dataset.column_names.length,
    };

    console.log(`[Dataset API] ✅ Fetched from database: ${rows.length} rows for dataset ${datasetId}`);

    // Try to re-cache in Redis for next time
    try {
      const { cacheDataset } = await import('@/lib/redis');
      const DATASET_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
      await cacheDataset(userId, datasetId, datasetData, DATASET_CACHE_TTL);
      console.log(`[Dataset API] ✅ Re-cached dataset ${datasetId} in Redis`);
    } catch (cacheError) {
      console.warn('[Dataset API] Failed to cache dataset:', cacheError);
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      data: datasetData,
    });

  } catch (error: any) {
    console.error('[Dataset API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
