'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import ChartDisplay from '@/components/dashboard/ChartDisplay';
import AdvancedChartDisplay from '@/components/dashboard/AdvancedChartDisplay';
import ColumnSelector from '@/components/ui/ColumnSelector';
import ShareButton from '@/components/ui/ShareButton';
import ChartRecommendations from '@/components/dashboard/ChartRecommendations';
import Toast from '@/components/ui/Toast';
import ContextAwareChatAssistant from '@/components/dashboard/ContextAwareChatAssistant';
import FilterPanel from '@/components/dashboard/FilterPanel';
import { useDataStore } from '@/store/useDataStore';
import {
  initializeSession,
  collectVisualizationsContext,
  trackActivity,
  VisualizationsContext
} from '@/lib/context-collectors';
import { processChartData, autoDetectColumns } from '@/utils/chartDataProcessor';
import AIChartGenerator from '@/components/AIChartGenerator';
import LIDAPanel from '@/components/LIDAPanel';
import SmartChartDisplay from '@/components/SmartChartDisplay';

export default function VisualizationsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { uploadedData, getFullData } = useDataStore();
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap'>('bar');
  const router = useRouter();

  // Helper to get the full dataset
  const getDataForVisualization = () => {
    return getFullData() || uploadedData?.preview?.sampleRows || [];
  };

  // Column selection state
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [aggregationMethod, setAggregationMethod] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Context tracking state
  const [chartHistory, setChartHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [pageContext, setPageContext] = useState<VisualizationsContext | null>(null);

  // AI Mode state
  const [useAIMode, setUseAIMode] = useState(true); // Default to AI mode ON
  const [aiSpec, setAiSpec] = useState<any>(null);
  const [showLIDAPanel, setShowLIDAPanel] = useState(false);

  const chartTypes = [
    { id: 'bar', name: 'Bar Chart', icon: '📊', color: 'from-forest-500 to-forest-600' },
    { id: 'line', name: 'Line Chart', icon: '📈', color: 'from-navy-500 to-navy-600' },
    { id: 'area', name: 'Area Chart', icon: '📉', color: 'from-maroon-500 to-maroon-600' },
    { id: 'pie', name: 'Pie Chart', icon: '🥧', color: 'from-rose-500 to-rose-600' },
    { id: 'scatter', name: 'Scatter Plot', icon: '⚡', color: 'from-cyan-500 to-cyan-600' },
    { id: 'stacked-bar', name: 'Stacked Bar', icon: '📋', color: 'from-teal-500 to-teal-600' },
    { id: 'box-plot', name: 'Box Plot', icon: '📦', color: 'from-indigo-500 to-indigo-600' },
    { id: 'heatmap', name: 'Correlation Matrix', icon: '🔥', color: 'from-orange-500 to-orange-600' },
  ];

  useEffect(() => {
    initializeSession();
    checkUser();
    trackActivity('viewed', 'visualizations_page');
  }, []);

  // Update page context whenever chart/filters change
  useEffect(() => {
    if (uploadedData) {
      const visualizationData = getDataForVisualization();
      const chartData = getFilteredData(visualizationData);
      const context = collectVisualizationsContext(
        selectedChartType,
        selectedColumns,
        chartData,
        filters,
        aggregationMethod,
        chartHistory
      );
      setPageContext(context);
    }
  }, [selectedChartType, selectedColumns, filteredData, filters, uploadedData, aggregationMethod, chartHistory]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleExportChart = () => {
    setToastMessage('Chart export feature coming soon!');
    setShowToast(true);
  };

  const handleChartTypeChange = (newType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap') => {
    const previousType = selectedChartType;
    setSelectedChartType(newType);
    setChartHistory(prev => [...prev, newType]);
    trackActivity('changed', 'chart_type', { from: previousType, to: newType });
  };

  const handleFilterChange = (newFilteredData: any[]) => {
    setFilteredData(newFilteredData);
    trackActivity('changed', 'filters', { dataPoints: newFilteredData.length });
  };

  const handleColumnsChange = (newColumns: string[]) => {
    setSelectedColumns(newColumns);
    trackActivity('changed', 'columns', { columns: newColumns });
  };

  // Auto-select first 3 numeric columns on data load
  useEffect(() => {
    if (uploadedData?.preview?.columns && selectedColumns.length === 0) {
      const numericColumns = uploadedData.preview.columns.filter((_col: string, idx: number) => {
        const type = uploadedData.preview.types?.[idx] || '';
        return type.toLowerCase().includes('number') || type.toLowerCase().includes('numeric');
      });

      const defaultSelection = numericColumns.slice(0, 3);
      if (defaultSelection.length > 0) {
        setSelectedColumns(defaultSelection);
      } else {
        // If no numeric columns, just select first 3
        setSelectedColumns(uploadedData.preview.columns.slice(0, 3));
      }
    }
  }, [uploadedData]);

  // Get filtered data based on filter panel and selected columns
  const getFilteredData = (data: any[]) => {
    // Use filtered data from FilterPanel if available, otherwise use original data
    const sourceData = filteredData.length > 0 ? filteredData : data;

    if (selectedColumns.length === 0) return sourceData;
    return sourceData.map(row => {
      const filtered: any = {};
      selectedColumns.forEach(col => {
        filtered[col] = row[col];
      });
      return filtered;
    });
  };

  // 🆕 NEW: Get processed chart data with smart aggregation/sampling
  const getProcessedChartData = (data: any[]) => {
    const rawData = getFilteredData(data);

    if (rawData.length === 0) return { data: [], info: null };

    // Auto-detect columns if not manually selected
    const detectedColumns = autoDetectColumns(rawData, selectedChartType);

    // Process data based on chart type
    const result = processChartData(rawData, selectedChartType, {
      categoryColumn: detectedColumns.categoryColumn || selectedColumns[0],
      valueColumn: detectedColumns.valueColumn || selectedColumns[1],
      xColumn: detectedColumns.xColumn || undefined,
      yColumn: detectedColumns.yColumn || undefined,
      aggregationMethod: aggregationMethod,
      columns: selectedColumns,
    });

    console.log(`[Visualizations] Processed chart data:`, {
      chartType: selectedChartType,
      originalRows: result.originalCount,
      displayRows: result.displayCount,
      method: result.method,
      hasOthers: result.hasOthers,
    });

    return {
      data: result.data,
      info: {
        originalCount: result.originalCount,
        displayCount: result.displayCount,
        hasOthers: result.hasOthers,
        method: result.method,
      },
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-forest-200 border-t-forest-600 mx-auto"></div>
          <p className="mt-4 text-neutral-900 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500">
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">
              Visualizations
            </h1>
            <p className="text-neutral-600">
              Create and customize beautiful data visualizations
            </p>
            {uploadedData && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Visualizing {getDataForVisualization().length.toLocaleString()} data points
                {uploadedData?.preview?.isComplete === false && (
                  <span className="ml-1 text-amber-700">(Sampled using {uploadedData?.preview?.samplingMethod || 'Smart Sampling'} from {uploadedData?.preview?.rowCount?.toLocaleString()} total rows)</span>
                )}
              </div>
            )}
          </div>
          {uploadedData && user && (
            <ShareButton
              datasetId={uploadedData.datasetId}
              userId={user.id}
              datasetName={uploadedData.preview.columns[0] || 'Visualizations Dashboard'}
            />
          )}
        </div>

        {!uploadedData ? (
          <Card className="text-center py-12 shadow-medium">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Data Available</h3>
            <p className="text-neutral-600 mb-6">
              Upload a dataset first to create visualizations
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large font-semibold"
            >
              Go to Dashboard
            </button>
          </Card>
        ) : (
          <>
            {/* Data Warning if truncated */}
            {uploadedData?.preview?.isComplete === false && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Large Dataset - Using Intelligent Sampling</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Your dataset has {uploadedData?.preview?.rowCount?.toLocaleString()} rows.
                      Visualizations use intelligent sampling ({uploadedData?.preview?.samplingMethod || "LTTB"}) for optimal performance.
                      AI analysis uses the complete dataset.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Panel */}
            {uploadedData && (
              <FilterPanel
                columns={uploadedData.preview.columns}
                data={uploadedData.preview.fullData || uploadedData.preview.sampleRows || []}
                onFilterChange={handleFilterChange}
                onColumnsChange={handleColumnsChange}
              />
            )}

            {/* Column Selection and Aggregation Controls */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  Select Columns to Visualize
                </label>
                <ColumnSelector
                  columns={uploadedData?.preview?.columns || []}
                  types={uploadedData?.preview?.types || []}
                  selectedColumns={selectedColumns}
                  onSelectionChange={setSelectedColumns}
                  maxColumns={10}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  Aggregation Method
                </label>
                <select
                  value={aggregationMethod}
                  onChange={(e) => setAggregationMethod(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:border-forest-500 transition-all shadow-soft"
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
                <p className="text-xs text-neutral-600 mt-2">
                  How to aggregate values when grouping data
                </p>
              </div>
            </div>

            {/* AI Chart Recommendations */}
            {uploadedData && user && selectedColumns.length > 0 && (
              <ChartRecommendations
                datasetId={uploadedData.datasetId}
                userId={user.id}
                columns={uploadedData.preview.columns}
                data={uploadedData.preview.fullData || uploadedData.preview.sampleRows || []}
                onApplyRecommendation={(type, cols) => {
                  setSelectedChartType(type as any);
                  setSelectedColumns(cols);
                }}
              />
            )}

            {/* AI Mode Toggle */}
            <div className="mb-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-neutral-900 mb-1">
                      AI-Powered Auto-Visualization
                    </label>
                    <p className="text-xs text-neutral-600">
                      Let AI analyze your data and automatically generate optimal chart configurations
                    </p>
                  </div>
                  <button
                    onClick={() => setUseAIMode(!useAIMode)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      useAIMode ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        useAIMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {useAIMode && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-purple-900">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                      <span className="font-medium">
                        Charts will be auto-generated using LIDA AI (2-4 second load time)
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Controls */}
            <div className="mb-6">
              {/* Chart Type Selector */}
              <Card>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Chart Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {chartTypes.map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => setSelectedChartType(chart.id as any)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedChartType === chart.id
                          ? 'border-forest-500 bg-gradient-to-br from-forest-50 to-jasmine-100 shadow-medium'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{chart.icon}</span>
                        <span className={`text-sm font-semibold ${
                          selectedChartType === chart.id ? 'text-forest-700' : 'text-neutral-700'
                        }`}>
                          {chart.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Main Chart Display */}
            {selectedColumns.length === 0 ? (
              <Card className="text-center py-12 shadow-medium mb-6">
                <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
                  <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Select Columns to Visualize</h3>
                <p className="text-neutral-600">
                  Choose at least one column from the dropdown above to start creating visualizations
                </p>
              </Card>
            ) : (
              <Card className="mb-6 shadow-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-neutral-900">
                      {chartTypes.find(c => c.id === selectedChartType)?.name}
                    </h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      {selectedColumns.length} column{selectedColumns.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportChart}
                      className="px-4 py-2 bg-white border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all duration-200 shadow-soft hover:shadow-medium font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                    </button>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Customize
                    </button>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-jasmine-50 p-8 rounded-xl border border-neutral-200">
                  {loadingCharts ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-forest-200 border-t-forest-600"></div>
                    </div>
                  ) : useAIMode && uploadedData && user ? (
                    // AI-Powered Smart Chart
                    <SmartChartDisplay
                      chartType={selectedChartType}
                      chartName={chartTypes.find(c => c.id === selectedChartType)?.name || 'Chart'}
                      datasetId={uploadedData.datasetId}
                      userId={user.id}
                      data={getDataForVisualization()}
                      columns={uploadedData.preview.columns}
                    />
                  ) : (() => {
                    // Manual Mode (original behavior)
                    const processed = getProcessedChartData(getDataForVisualization());
                    const isAdvanced = ['scatter', 'stacked-bar', 'box-plot', 'heatmap'].includes(selectedChartType);
                    
                    return (
                      <>
                        {isAdvanced ? (
                          <AdvancedChartDisplay
                            type={selectedChartType}
                            data={processed.data}
                            title={chartTypes.find(c => c.id === selectedChartType)?.name}
                          />
                        ) : (
                          <ChartDisplay
                            type={selectedChartType as 'line' | 'bar' | 'pie' | 'scatter' | 'area'}
                            data={processed.data}
                            title={chartTypes.find(c => c.id === selectedChartType)?.name}
                          />
                        )}
                        {processed.info && (
                          <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-blue-900 font-medium">
                                Showing {processed.info.displayCount.toLocaleString()} of {processed.info.originalCount.toLocaleString()}
                                {processed.info.hasOthers && <span className="ml-1">(top categories + Others)</span>}
                              </span>
                              <span className="text-blue-700 text-xs ml-2">• {processed.info.method}</span>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Card>
            )}

            {/* Chart Gallery */}
            {selectedColumns.length > 0 && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">
                    All Visualizations
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartTypes.map((chart, index) => {
                    const gradients = [
                      'from-neutral-50 to-primary-50',
                      'from-neutral-50 to-accent-teal-50',
                      'from-neutral-50 to-secondary-50',
                      'from-neutral-50 to-accent-coral-50'
                    ];

                    const rawData = getDataForVisualization();

                    // Process data for this specific chart type
                    const detectedColumns = autoDetectColumns(getFilteredData(rawData), chart.id as any);
                    const processed = processChartData(getFilteredData(rawData), chart.id as any, {
                      categoryColumn: detectedColumns.categoryColumn || selectedColumns[0],
                      valueColumn: detectedColumns.valueColumn || selectedColumns[1],
                      xColumn: detectedColumns.xColumn || undefined,
                      yColumn: detectedColumns.yColumn || undefined,
                      aggregationMethod: aggregationMethod,
                      columns: selectedColumns,
                    });

                    return (
                      <Card key={chart.id} className="hover:shadow-medium transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{chart.icon}</span>
                            <h3 className="text-lg font-display font-bold text-neutral-900">
                              {chart.name}
                            </h3>
                          </div>
                          <button
                            onClick={() => setSelectedChartType(chart.id as any)}
                            className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-soft font-medium"
                          >
                            Focus
                          </button>
                        </div>
                        <div className={`bg-gradient-to-br ${gradients[index]} p-6 rounded-xl border border-neutral-200`}>
                          {loadingCharts ? (
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600"></div>
                            </div>
                          ) : useAIMode && uploadedData && user ? (
                            // AI mode for gallery charts
                            <SmartChartDisplay
                              chartType={chart.id as any}
                              chartName={chart.name}
                              datasetId={uploadedData.datasetId}
                              userId={user.id}
                              data={rawData}
                              columns={uploadedData.preview.columns}
                            />
                          ) : (
                            // Manual mode for gallery charts
                            <>
                              <ChartDisplay
                                type={chart.id as any}
                                data={processed.data}
                                title={chart.name}
                              />
                              {processed.hasOthers && (
                                <div className="mt-2 text-xs text-gray-600 text-center">
                                  Showing top {processed.displayCount - 1} + Others
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* Chart Info Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
                <div className="text-center">
                  <div className="inline-block p-3 bg-white rounded-lg shadow-sm mb-2">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-700">Charts Available</p>
                  <p className="text-2xl font-bold text-neutral-900">{chartTypes.length}</p>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200">
                <div className="text-center">
                  <div className="inline-block p-3 bg-white rounded-lg shadow-sm mb-2">
                    <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-700">Data Points</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {uploadedData?.preview?.rowCount?.toLocaleString() || 0}
                  </p>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-navy-50 to-navy-100 border-navy-200 shadow-soft">
                <div className="text-center">
                  <div className="inline-block p-3 bg-white rounded-lg shadow-sm mb-2">
                    <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-700">Dimensions</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {uploadedData?.preview?.columnCount || 0}
                  </p>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-maroon-50 to-rose-100 border-maroon-200 shadow-soft">
                <div className="text-center">
                  <div className="inline-block p-3 bg-white rounded-lg shadow-sm mb-2">
                    <svg className="w-6 h-6 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-700">Sample Size</p>
                  <p className="text-lg font-bold text-neutral-900 truncate px-2">
                    {uploadedData?.preview?.fullData?.length || uploadedData?.preview?.sampleRows?.length || 0} rows
                  </p>
                </div>
              </Card>
            </div>

            {/* LIDA AI Panel - Advanced Visualization Explorer */}
            {uploadedData && user && !useAIMode && (
              <div className="mt-8">
                <LIDAPanel
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  onApplySpec={(spec) => {
                    // Apply the AI-generated chart specification
                    setAiSpec(spec);
                    
                    // Validate chart type before setting
                    const validChartTypes: ('bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap')[] = [
                      'bar', 'line', 'area', 'pie', 'scatter', 'stacked-bar', 'box-plot', 'heatmap'
                    ];
                    const chartTypeStr = String(spec.chart_type);
                    if (validChartTypes.includes(chartTypeStr as any)) {
                      setSelectedChartType(chartTypeStr as 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap');
                    } else {
                      // Fallback to bar chart if type is not supported
                      setSelectedChartType('bar');
                    }

                    // Extract and apply columns from spec
                    if (spec.columns) {
                      const cols = Object.values(spec.columns).filter((v): v is string =>
                        typeof v === 'string' && v.length > 0
                      );
                      if (cols.length > 0) {
                        setSelectedColumns(cols);
                      }
                    }

                    // Apply aggregation if specified
                    if (spec.aggregation?.method) {
                      setAggregationMethod(spec.aggregation.method);
                    }

                    setToastMessage(`Applied AI recommendation: ${spec.title}`);
                    setShowToast(true);
                  }}
                />
              </div>
            )}

            {/* Context-Aware Chat Assistant */}
            {uploadedData && user && pageContext && (
              <div className="mt-8">
                <ContextAwareChatAssistant
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  dataPreview={uploadedData.preview.fullData || uploadedData.preview.sampleRows || []}
                  pageContext={pageContext}
                  onContextUpdate={(activity) => trackActivity('clicked', 'chat', { activity })}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      {uploadedData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/analytics"
              className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">📊 Analytics</h3>
                  <p className="text-forest-100 text-sm mt-1">View comprehensive analytics</p>
                </div>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>

            <Link
              href="/ai-assistant"
              className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">🤖 AI Assistant</h3>
                  <p className="text-forest-100 text-sm mt-1">Ask questions about data</p>
                </div>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />

      {showToast && (
        <Toast
          message={toastMessage}
          type="info"
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
