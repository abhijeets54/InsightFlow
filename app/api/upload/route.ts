import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { parseFile, validateFile } from '@/utils/dataParser';
import { analyzeDataQuality, generateAnomalyAlerts } from '@/utils/dataQuality';
import { autoSample } from '@/utils/dataSampling';
import { cacheDataset } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Create upload record with processing status
    const { data: uploadData, error: uploadError } = await supabase
      .from('data_uploads')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase(),
        status: 'processing',
      })
      .select()
      .single();

    if (uploadError) {
      console.error('Upload record creation error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      );
    }

    try {
      // Parse the file
      const parsedData = await parseFile(file);

      // NEW: Analyze data quality (100% FREE - no API calls!)
      const qualityReport = analyzeDataQuality(parsedData.rows, parsedData.columns);
      const anomalyAlerts = generateAnomalyAlerts(qualityReport, parsedData.rows);

      console.log('Data Quality Score:', qualityReport.overallScore);
      console.log('Anomaly Alerts:', anomalyAlerts.length);

      // Update upload record with parsed data
      const { error: updateError } = await supabase
        .from('data_uploads')
        .update({
          rows_count: parsedData.rowCount,
          columns_count: parsedData.columnCount,
          status: 'ready',
          raw_data: parsedData.rows.slice(0, 100), // Store first 100 rows as preview
        })
        .eq('id', uploadData.id);

      if (updateError) {
        console.error('Upload update error:', updateError);
        throw updateError;
      }

      // Create dataset record
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          upload_id: uploadData.id,
          user_id: userId,
          dataset_name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          column_names: parsedData.columns,
          column_types: parsedData.types,
          data_rows: parsedData.rows.map(row => JSON.stringify(row)),
        })
        .select()
        .single();

      if (datasetError) {
        console.error('Dataset creation error:', datasetError);
        throw datasetError;
      }

      // Cache the FULL dataset in Redis (all rows, no sampling)
      // TTL: 7 days for dataset cache
      const DATASET_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
      try {
        await cacheDataset(
          userId,
          datasetData.id,
          {
            rows: parsedData.rows, // Full dataset - all rows
            columns: parsedData.columns,
            types: parsedData.types,
            rowCount: parsedData.rowCount,
            columnCount: parsedData.columnCount,
          },
          DATASET_CACHE_TTL
        );
        console.log(`[Upload] ✅ Cached full dataset in Redis: ${parsedData.rowCount} rows for dataset ${datasetData.id}`);
      } catch (redisError) {
        // Redis is optional - log error but don't fail the upload
        console.warn('[Upload] ⚠️ Failed to cache dataset in Redis:', redisError);
      }

      // Determine how much data to send to client
      // Use intelligent sampling for large datasets instead of just "first 1000"
      const MAX_ROWS_FOR_CLIENT = 1000;
      let fullDataForClient: any[];
      let samplingMethod: string;

      if (parsedData.rows.length <= MAX_ROWS_FOR_CLIENT) {
        // Small dataset: send everything
        fullDataForClient = parsedData.rows;
        samplingMethod = "Full Data";
      } else {
        // Large dataset: use intelligent downsampling (LTTB or smart sampling)
        console.log(`Large dataset detected (${parsedData.rows.length} rows). Applying intelligent sampling...`);

        const samplingResult = autoSample(
          parsedData.rows,
          parsedData.columns,
          MAX_ROWS_FOR_CLIENT
        );

        fullDataForClient = samplingResult.data;
        samplingMethod = samplingResult.algorithm;

        console.log(`Sampled ${parsedData.rows.length} rows to ${samplingResult.sampledCount} points using ${samplingMethod}`);
      }

      return NextResponse.json({
        success: true,
        uploadId: uploadData.id,
        datasetId: datasetData.id,
        preview: {
          columns: parsedData.columns,
          types: parsedData.types,
          rowCount: parsedData.rowCount,
          columnCount: parsedData.columnCount,
          sampleRows: parsedData.rows.slice(0, 10), // Small sample for preview
          fullData: fullDataForClient, // NEW: Full data for charts (up to 1000 rows)
          isComplete: parsedData.rows.length <= MAX_ROWS_FOR_CLIENT,
          samplingMethod, // Flag if truncated
        },
        // NEW: Include data quality analysis
        qualityReport: {
          score: qualityReport.overallScore,
          missingValues: qualityReport.missingValues,
          duplicates: qualityReport.duplicates,
          outliers: qualityReport.outliers.length,
          recommendations: qualityReport.recommendations,
        },
        anomalyAlerts, // NEW: Proactive anomaly detection
      });
    } catch (parseError: any) {
      // Update upload status to error
      await supabase
        .from('data_uploads')
        .update({ status: 'error' })
        .eq('id', uploadData.id);

      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
