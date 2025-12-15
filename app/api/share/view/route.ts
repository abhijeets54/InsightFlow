import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { shareToken, password } = await request.json();

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Fetch share record
    const { data: share, error: shareError } = await supabase
      .from('shared_dashboards')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share link not found or has been deactivated' },
        { status: 404 }
      );
    }

    // Check password if protected
    if (share.password && share.password !== password) {
      return NextResponse.json(
        { error: 'Incorrect password', requiresPassword: true },
        { status: 401 }
      );
    }

    // Fetch the dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', share.dataset_id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase
      .from('shared_dashboards')
      .update({ views: share.views + 1 })
      .eq('id', share.id);

    // Parse data rows
    const dataRows = dataset.data_rows.map((row: string) =>
      typeof row === 'string' ? JSON.parse(row) : row
    );

    // Return public dataset info (no sensitive data)
    return NextResponse.json({
      success: true,
      share: {
        title: share.title,
        description: share.description,
        views: share.views + 1,
        createdAt: share.created_at,
      },
      dataset: {
        name: dataset.dataset_name,
        columns: dataset.column_names,
        types: dataset.column_types,
        rowCount: dataset.row_count,
        columnCount: dataset.column_count,
        sampleRows: dataRows.slice(0, 100), // Send first 100 rows for public view
      },
    });
  } catch (error) {
    console.error('Share view error:', error);
    return NextResponse.json(
      { error: 'Failed to load shared dashboard' },
      { status: 500 }
    );
  }
}
