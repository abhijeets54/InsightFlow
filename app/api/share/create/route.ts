import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const { datasetId, userId, title, description, password } = await request.json();

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Verify user owns the dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 403 }
      );
    }

    // Generate a unique share token (10 characters, URL-safe)
    const shareToken = nanoid(10);

    // Create share record
    const { data: share, error: shareError } = await supabase
      .from('shared_dashboards')
      .insert({
        dataset_id: datasetId,
        user_id: userId,
        share_token: shareToken,
        title: title || dataset.dataset_name,
        description: description || null,
        password: password || null,
        views: 0,
        is_active: true,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Share creation error:', shareError);
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      );
    }

    // Generate the public URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/${shareToken}`;

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        token: shareToken,
        url: shareUrl,
        title: share.title,
        description: share.description,
        hasPassword: !!password,
        createdAt: share.created_at,
      },
    });
  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
