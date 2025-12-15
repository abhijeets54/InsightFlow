import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
  downsampleLTTB,
  smartCategoricalSample,
  aggregateByCategory,
  getTopCategories,
  autoSample,
} from '@/utils/dataSampling';

/**
 * Chart Data API - On-Demand Data Processing for Large Datasets
 *
 * This API fetches and processes data from the database on-demand
 * instead of loading everything into localStorage.
 *
 * Features:
 * - Smart downsampling (LTTB for time-series)
 * - Category aggregation
 * - Column filtering
 * - Multiple aggregation methods (sum, avg, count, min, max)
 *
 * All processing is FREE (server-side JavaScript)
 */

export async function POST(request: NextRequest) {
  try {
    const {
      datasetId,
      userId,
      chartType,
      xColumn,
      yColumn,
      aggregation = 'sum',
      topN = 1000,
      selectedColumns,
    } = await request.json();

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Fetch dataset from database
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

    // Parse ALL rows from database
    const allRows = dataset.data_rows.map((row: string) =>
      typeof row === 'string' ? JSON.parse(row) : row
    );

    const columns = dataset.column_names;

    console.log(`Processing ${allRows.length} rows for chart...`);

    // Filter by selected columns if provided
    let processedData = allRows;
    if (selectedColumns && selectedColumns.length > 0) {
      processedData = allRows.map((row: any) => {
        const filtered: any = {};
        selectedColumns.forEach((col: string) => {
          filtered[col] = row[col];
        });
        return filtered;
      });
    }

    // Process data based on chart type
    let chartData: any[];
    let processingMethod: string;
    let displayedPoints: number;

    if (chartType === 'pie') {
      // Pie chart: Top N categories
      if (!xColumn || !yColumn) {
        // Auto-detect: first categorical column + first numeric column
        const categoricalCol = columns[0];
        const numericCol = columns.find((col: string) => {
          const val = allRows[0][col];
          return typeof val === 'number' || !isNaN(Number(val));
        }) || columns[1];

        chartData = getTopCategories(processedData, categoricalCol, numericCol, topN, aggregation as any);
      } else {
        chartData = getTopCategories(processedData, xColumn, yColumn, topN, aggregation as any);
      }
      processingMethod = `Top ${chartData.length} by ${aggregation}`;
      displayedPoints = chartData.length;

    } else if (chartType === 'bar' && xColumn && yColumn) {
      // Bar chart: Aggregate by category
      chartData = aggregateByCategory(processedData, xColumn, yColumn, aggregation as any);

      // Limit to top N if too many categories
      if (chartData.length > topN) {
        chartData = chartData.slice(0, topN);
      }

      processingMethod = `Aggregated by ${xColumn} (${aggregation})`;
      displayedPoints = chartData.length;

    } else if ((chartType === 'line' || chartType === 'area') && yColumn) {
      // Line/Area chart: Use LTTB downsampling
      if (processedData.length > topN) {
        chartData = downsampleLTTB(processedData, topN, xColumn, yColumn);
        processingMethod = 'LTTB Downsampling';
      } else {
        chartData = processedData;
        processingMethod = 'Full Data';
      }
      displayedPoints = chartData.length;

    } else {
      // Auto-detect best sampling strategy
      const result = autoSample(processedData, selectedColumns || columns, topN);
      chartData = result.data;
      processingMethod = result.algorithm;
      displayedPoints = result.sampledCount;
    }

    return NextResponse.json({
      success: true,
      data: chartData,
      metadata: {
        originalRowCount: allRows.length,
        displayedPoints,
        processingMethod,
        columns: selectedColumns || columns,
        chartType,
        aggregation,
      },
    });

  } catch (error: any) {
    console.error('Chart data error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chart data' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - returns dataset metadata without processing
 * Useful for getting available columns, row count, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('datasetId');
    const userId = searchParams.get('userId');

    if (!datasetId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('id, dataset_name, column_names, column_types')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (error || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Count rows
    const { data: fullDataset } = await supabase
      .from('datasets')
      .select('data_rows')
      .eq('id', datasetId)
      .single();

    const rowCount = fullDataset?.data_rows?.length || 0;

    return NextResponse.json({
      id: dataset.id,
      name: dataset.dataset_name,
      columns: dataset.column_names,
      types: dataset.column_types,
      rowCount,
    });

  } catch (error: any) {
    console.error('Get dataset metadata error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dataset metadata' },
      { status: 500 }
    );
  }
}
