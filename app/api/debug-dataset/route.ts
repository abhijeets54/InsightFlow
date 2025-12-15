import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * Debug endpoint to verify dataset storage and retrieval
 * GET /api/debug-dataset?userId=xxx&datasetId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const datasetId = searchParams.get('datasetId');

    const supabase = getServiceSupabase();

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('datasets')
      .select('id')
      .limit(1);

    if (tablesError) {
      return NextResponse.json({
        error: 'Database tables check failed',
        details: tablesError,
        message: 'Tables may not exist. Run supabase-schema.sql in Supabase SQL Editor.',
      });
    }

    // Get all datasets for user
    const { data: allDatasets, error: allError } = await supabase
      .from('datasets')
      .select('id, dataset_name, user_id, created_at')
      .eq('user_id', userId || '');

    // Get specific dataset if ID provided
    let specificDataset = null;
    if (datasetId) {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .eq('user_id', userId || '')
        .single();

      specificDataset = { data, error };
    }

    return NextResponse.json({
      success: true,
      tablesExist: true,
      userId,
      datasetId,
      allDatasets: {
        count: allDatasets?.length || 0,
        datasets: allDatasets,
        error: allError,
      },
      specificDataset,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
