'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import AdvancedChartDisplay from '@/components/dashboard/AdvancedChartDisplay';
import ChartNarrative from '@/components/dashboard/ChartNarrative';
import CorrelationHeatmap from '@/components/dashboard/CorrelationHeatmap';
import AnomalyDetector from '@/components/dashboard/AnomalyDetector';
import DashboardSummary from '@/components/dashboard/DashboardSummary';
import ColumnSelector from '@/components/ui/ColumnSelector';
import ShareButton from '@/components/ui/ShareButton';
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
import SmartChartDisplay from '@/components/SmartChartDisplay';
import LIDAPanel from '@/components/LIDAPanel';

export default function VisualizationsAdvancedPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { uploadedData, getFullData } = useDataStore();
  const router = useRouter();

  // Chart state - ALL chart types
  type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'stacked-bar' | 'box-plot' | 'heatmap';

  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [aggregationMethod, setAggregationMethod] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Context tracking
  const [chartHistory, setChartHistory] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [pageContext, setPageContext] = useState<VisualizationsContext | null>(null);

  // AI Mode state
  const [useAIMode, setUseAIMode] = useState(false); // Default AI mode OFF
  const [aiSpec, setAiSpec] = useState<any>(null);
  const [chartGenerated, setChartGenerated] = useState(false); // Track if AI chart is ready

  // LIDA applied spec state
  const [lidaAppliedSpec, setLidaAppliedSpec] = useState<any>(null);

  // Full context data for AI assistant
  const [chartInsights, setChartInsights] = useState<any>(null);
  const [lidaData, setLidaData] = useState<any>(null);
  const [chartNarrative, setChartNarrative] = useState<any>(null);

  // View toggles
  const [showAnomalies, setShowAnomalies] = useState(false);

  // ALL chart types - industry grade
  const chartTypes = [
    { id: 'bar', name: 'Bar Chart', icon: '📊', description: 'Compare categories', color: 'from-blue-500 to-blue-600' },
    { id: 'line', name: 'Line Chart', icon: '📈', description: 'Show trends over time', color: 'from-green-500 to-green-600' },
    { id: 'area', name: 'Area Chart', icon: '📉', description: 'Cumulative trends', color: 'from-purple-500 to-purple-600' },
    { id: 'pie', name: 'Pie Chart', icon: '🥧', description: 'Part-to-whole', color: 'from-pink-500 to-pink-600' },
    { id: 'scatter', name: 'Scatter Plot', icon: '⚫', description: 'Correlation analysis', color: 'from-indigo-500 to-indigo-600' },
    { id: 'stacked-bar', name: 'Stacked Bar', icon: '📚', description: 'Multi-series comparison', color: 'from-orange-500 to-orange-600' },
    { id: 'box-plot', name: 'Box Plot', icon: '📦', description: 'Distribution & outliers', color: 'from-teal-500 to-teal-600' },
    { id: 'heatmap', name: 'Correlation Matrix', icon: '🌡️', description: 'Relationship heatmap', color: 'from-red-500 to-red-600' },
  ];

  useEffect(() => {
    initializeSession();
    checkUser();
    trackActivity('viewed', 'visualizations_advanced_page');
  }, []);

  // Helper to get the full dataset
  const getDataForVisualization = () => {
    return getFullData() || uploadedData?.preview?.sampleRows || [];
  };

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
        chartHistory,
        useAIMode,
        chartInsights,
        lidaData,
        aiSpec,
        lidaAppliedSpec,
        chartNarrative
      );
      setPageContext(context);

      // Save to sessionStorage for cross-page access
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('visualizations_context', JSON.stringify(context));
      }
    }
  }, [selectedChartType, selectedColumns, filteredData, filters, uploadedData, aggregationMethod, chartHistory, useAIMode, chartInsights, lidaData, aiSpec, lidaAppliedSpec, chartNarrative]);

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

  const handleChartTypeChange = (newType: ChartType) => {
    const previousType = selectedChartType;
    setSelectedChartType(newType);
    setChartHistory(prev => [...prev, newType]);
    setChartGenerated(false); // Reset on chart type change
    trackActivity('changed', 'chart_type', { from: previousType, to: newType });
  };

  // Reset chartGenerated when AI mode changes
  useEffect(() => {
    if (!useAIMode) {
      setChartGenerated(false);
    }
  }, [useAIMode]);

  const handleFilterChange = (newFilteredData: any[]) => {
    setFilteredData(newFilteredData);
    trackActivity('changed', 'filters', { dataPoints: newFilteredData.length });
  };

  const handleColumnsChange = (newColumns: string[]) => {
    setSelectedColumns(newColumns);
    trackActivity('changed', 'columns', { columns: newColumns });
  };

  // Auto-select first 3 numeric columns
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
        setSelectedColumns(uploadedData.preview.columns.slice(0, 3));
      }
    }
  }, [uploadedData]);

  const getFilteredData = (data: any[]) => {
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

    console.log(`[Visualizations Advanced] Processed chart data:`, {
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
          <p className="mt-4 text-neutral-900 font-semibold">Loading advanced visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500">
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2 flex items-center gap-3">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Advanced Visualizations
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-full font-semibold shadow-lg">
                  AI-Powered
                </span>
              </h1>
              <p className="text-neutral-600">
                Industry-grade charts with AI narratives, anomaly detection, and statistical analysis
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
                datasetName="Advanced Visualizations Dashboard"
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowAnomalies(!showAnomalies)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                showAnomalies
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-amber-500'
              }`}
            >
              ⚠️ {showAnomalies ? 'Hide' : 'Detect'} Anomalies
            </button>
            <div className="ml-auto text-sm text-gray-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time analysis active</span>
            </div>
          </div>
        </div>

        {!uploadedData ? (
          <Card className="text-center py-12 shadow-medium">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Data Available</h3>
            <p className="text-neutral-600 mb-6">Upload a dataset to unlock advanced visualizations</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all shadow-medium hover:shadow-large font-semibold"
            >
              Go to Dashboard
            </button>
          </Card>
        ) : (
          <>
            {/* Dashboard Summary */}
            <DashboardSummary
              data={getDataForVisualization()}
              chartType={selectedChartType}
              selectedColumns={selectedColumns}
              datasetId={uploadedData.datasetId}
              userId={user.id}
            />

            {/* Anomaly Detection */}
            {showAnomalies && (
              <div className="mb-6">
                <AnomalyDetector
                  data={getDataForVisualization()}
                  columns={selectedColumns}
                />
              </div>
            )}

            {/* AI-Powered Correlation Matrix - Temporarily disabled */}
            {/* <Card className="mb-6 shadow-large">
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-6">
                AI-Powered Correlation Matrix
              </h2>
              <CorrelationHeatmap
                data={getDataForVisualization()}
                datasetId={uploadedData.datasetId}
                userId={user.id}
              />
            </Card> */}

            {/* Filter Panel */}
            {uploadedData && (
              <FilterPanel
                columns={uploadedData.preview.columns}
                data={getDataForVisualization()}
                onFilterChange={handleFilterChange}
                onColumnsChange={handleColumnsChange}
              />
            )}

            {/* Controls */}
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
              </div>
            </div>

            {/* AI Mode Toggle */}
            <Card className="mb-6 shadow-medium">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-neutral-900 mb-1">
                    🤖 AI-Powered Auto-Visualization
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
                      Each chart will be AI-optimized with best columns & settings (2-4 second load time)
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Chart Type Selector - ALL TYPES */}
            <Card className="mb-6 shadow-medium">
              <label className="block text-sm font-medium text-neutral-700 mb-4">
                Choose Chart Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {chartTypes.map((chart) => (
                  <button
                    key={chart.id}
                    onClick={() => handleChartTypeChange(chart.id as ChartType)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedChartType === chart.id
                        ? `border-transparent bg-gradient-to-br ${chart.color} text-white shadow-lg scale-105`
                        : 'border-neutral-200 hover:border-neutral-300 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-3xl mb-2 block">{chart.icon}</span>
                      <span className={`text-sm font-bold block ${selectedChartType === chart.id ? 'text-white' : 'text-neutral-900'}`}>
                        {chart.name}
                      </span>
                      <span className={`text-xs block mt-1 ${selectedChartType === chart.id ? 'text-white/80' : 'text-neutral-600'}`}>
                        {chart.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Main Visualization + AI Narrative */}
            {selectedColumns.length === 0 ? (
              <Card className="text-center py-12 shadow-medium mb-6">
                <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
                  <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">Select Columns to Visualize</h3>
                <p className="text-neutral-600">Choose at least one column from above to create beautiful charts</p>
              </Card>
            ) : (
              <div className="mb-6">
                {/* Chart - Full Width */}
                <Card className="shadow-large">
                    {useAIMode && uploadedData && user ? (
                      // AI Mode - Smart Chart Display
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-display font-bold text-neutral-900">
                            {chartTypes.find(c => c.id === selectedChartType)?.name}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                              AI-Optimized
                            </span>
                          </div>
                        </div>
                        <SmartChartDisplay
                          chartType={selectedChartType as any}
                          chartName={chartTypes.find(c => c.id === selectedChartType)?.name || 'Chart'}
                          datasetId={uploadedData.datasetId}
                          userId={user.id}
                          data={getDataForVisualization()}
                          columns={uploadedData.preview.columns}
                          onChartReady={() => setChartGenerated(true)}
                        />
                      </>
                    ) : (() => {
                      // Manual Mode - Original behavior
                      const processed = getProcessedChartData(getDataForVisualization());
                      return (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-display font-bold text-neutral-900">
                              {chartTypes.find(c => c.id === selectedChartType)?.name}
                            </h2>
                            <span className="text-sm text-gray-500">
                              {processed.info ? `${processed.info.displayCount} of ${processed.info.originalCount.toLocaleString()}` : processed.data.length} data points
                            </span>
                          </div>
                          <div className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-xl border border-neutral-200 overflow-hidden" style={{ height: '550px', maxHeight: '550px' }}>
                            <AdvancedChartDisplay
                              type={selectedChartType}
                              data={processed.data}
                              title={chartTypes.find(c => c.id === selectedChartType)?.name}
                            />
                          </div>
                          {processed.info && (
                            <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-blue-900 font-medium">
                                  Smart visualization: {processed.info.method}
                                  {processed.info.hasOthers && <span className="ml-2 text-xs">(grouped small categories as "Others")</span>}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                </Card>

                {/* AI-Powered Insights - Chart-Specific Narrative (Only in AI Mode) */}
                {selectedColumns.length > 0 && useAIMode && chartGenerated && (
                  <div className="mt-6">
                    {(() => {
                      const processed = getProcessedChartData(getDataForVisualization());
                      return (
                        <ChartNarrative
                          chartType={selectedChartType}
                          data={processed.data}
                          columns={selectedColumns}
                          filters={filters}
                          aiModeEnabled={useAIMode}
                          onNarrativeGenerated={(narrative) => setChartNarrative(narrative)}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* LIDA Applied Chart */}
            {lidaAppliedSpec && uploadedData && (
              <div className="mb-6">
                <Card className="shadow-large">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-neutral-900">
                        {lidaAppliedSpec.title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">{lidaAppliedSpec.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                          LIDA Generated
                        </span>
                        <span className={`text-sm font-bold ${lidaAppliedSpec.evaluation.score >= 80 ? 'text-green-600' : lidaAppliedSpec.evaluation.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          Score: {lidaAppliedSpec.evaluation.score}/100
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setLidaAppliedSpec(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-xl border border-neutral-200" style={{ height: '500px' }}>
                    <AdvancedChartDisplay
                      type={lidaAppliedSpec.chart_type as any}
                      data={getDataForVisualization()}
                      title={lidaAppliedSpec.title}
                      xKey={lidaAppliedSpec.columns?.x}
                      yKey={lidaAppliedSpec.columns?.y}
                      groupKey={lidaAppliedSpec.columns?.group}
                    />
                  </div>
                </Card>
              </div>
            )}

            {/* LIDA Panel - Advanced Visualization Explorer */}
            {uploadedData && user && (
              <div className="mt-8 mb-6">
                <LIDAPanel
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  onApplySpec={(spec) => {
                    console.log('[LIDA] Applying spec:', spec);
                    setLidaAppliedSpec(spec);
                    setLidaData(spec); // Store full LIDA data for context
                  }}
                />
              </div>
            )}

            {/* Context-Aware Chat */}
            {uploadedData && user && pageContext && (
              <div className="mt-8">
                <ContextAwareChatAssistant
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  dataPreview={getDataForVisualization()}
                  pageContext={pageContext}
                  onContextUpdate={(activity) => trackActivity('clicked', 'chat', { activity })}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {uploadedData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/analytics" className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md">
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

            <Link href="/ai-assistant" className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md">
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

      <Footer />

      {showToast && (
        <Toast message={toastMessage} type="info" duration={2000} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}
