'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import ShareButton from '@/components/ui/ShareButton';
import ExportButton from '@/components/ui/ExportButton';
import ForecastPanel from "@/components/dashboard/ForecastPanel";
import SmartInsightsPanel from "@/components/dashboard/SmartInsightsPanel";
import ContextAwareChatAssistant from "@/components/dashboard/ContextAwareChatAssistant";

import { useDataStore } from '@/store/useDataStore';
import {
  initializeSession,
  collectAnalyticsContext,
  trackActivity,
  AnalyticsContext
} from '@/lib/context-collectors';

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { uploadedData, getFullData } = useDataStore();
  const router = useRouter();

  // Helper to get the full dataset
  const getDataForAnalytics = () => {
    return getFullData() || uploadedData?.preview?.sampleRows || [];
  };

  // Context tracking state
  const [insights, setInsights] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [visiblePanels, setVisiblePanels] = useState<string[]>(['insights', 'forecast']);
  const [pageContext, setPageContext] = useState<AnalyticsContext | null>(null);

  // Store full data for context
  const [fullInsightsData, setFullInsightsData] = useState<any[]>([]);
  const [rawForecastData, setRawForecastData] = useState<any>(null);

  // Refs for chart export
  const insightsPanelRef = useRef<HTMLDivElement>(null);
  const forecastPanelRef = useRef<HTMLDivElement>(null);
  const chartRefs = [insightsPanelRef, forecastPanelRef] as React.RefObject<HTMLDivElement>[];

  useEffect(() => {
    initializeSession();
    checkUser();
    trackActivity('viewed', 'analytics_page');
  }, []);

  // Update page context whenever insights/forecast change
  useEffect(() => {
    if (uploadedData) {
      const context = collectAnalyticsContext(
        insights,
        forecastData,
        uploadedData,
        visiblePanels,
        fullInsightsData,
        rawForecastData
      );
      setPageContext(context);

      // Save to sessionStorage for cross-page access
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('analytics_context', JSON.stringify(context));
      }
    }
  }, [insights, forecastData, uploadedData, visiblePanels, fullInsightsData, rawForecastData]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);
    setLoading(false);
  };

  const handleInsightsGenerated = (generatedInsights: any[], fullData?: any) => {
    setInsights(generatedInsights);
    setFullInsightsData(fullData || generatedInsights);
    trackActivity('viewed', 'insights_panel', { count: generatedInsights.length });
  };

  const handleForecastGenerated = (forecast: any, rawData?: any) => {
    setForecastData(forecast);
    setRawForecastData(rawData || forecast);
    trackActivity('viewed', 'forecast_panel');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-jasmine-500/30 border-t-jasmine-500 mx-auto"></div>
          <p className="mt-4 text-jasmine-300 font-semibold">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500 dark:bg-neutral-950">
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between animate-fade-in-up">
          <div>
            <div className="inline-block px-5 py-2 bg-navy-600/20 border border-navy-600/50 text-navy-400 rounded-full text-sm font-semibold mb-6">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Advanced Analytics
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
              Analytics Dashboard
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl">
              AI-powered insights, trend forecasting, and comprehensive data analysis
            </p>
          </div>
          {uploadedData && user && (
            <div className="flex gap-3">
              <ExportButton
                data={(() => {
                  // Prepare comprehensive export data including insights and forecasts
                  const baseData = uploadedData.preview.fullData || uploadedData.preview.sampleRows || [];
                  const exportData = [...baseData];

                  // Add insights summary if available
                  if (fullInsightsData && fullInsightsData.length > 0) {
                    exportData.push({
                      '---': '--- AI INSIGHTS ---',
                      ...fullInsightsData.reduce((acc, insight, idx) => {
                        acc[`Insight ${idx + 1}`] = typeof insight === 'string' ? insight : insight.text || JSON.stringify(insight);
                        return acc;
                      }, {} as any)
                    });
                  }

                  // Add forecast data if available
                  if (rawForecastData) {
                    exportData.push({
                      '---': '--- FORECAST DATA ---',
                      ...rawForecastData
                    });
                  }

                  return exportData;
                })()}
                chartRefs={chartRefs}
                fileName="analytics-dashboard"
                title="Analytics Dashboard"
              />
              <ShareButton
                datasetId={uploadedData.datasetId}
                userId={user.id}
                datasetName={uploadedData.preview.columns[0] || 'Analytics Dashboard'}
              />
            </div>
          )}
        </div>

        {!uploadedData ? (
          <div className="bg-white/60 dark:bg-forest-900/40 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/30 rounded-3xl p-16 text-center animate-fade-in-up delay-100">
            <div className="inline-block p-8 bg-neutral-100 dark:bg-forest-800/50 rounded-2xl mb-8">
              <svg className="w-24 h-24 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">No Data to Analyze</h3>
            <p className="text-neutral-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Upload your first dataset to unlock powerful AI-driven analytics and insights
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-jasmine-500 text-forest-900 rounded-xl hover:bg-jasmine-400 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 inline-flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <>

            {/* Stats Grid with Glass Effect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in-up delay-100">
              <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-navy-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-400 mb-1">Total Rows</p>
                    <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {uploadedData?.preview?.rowCount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-navy-600/30 rounded-full overflow-hidden">
                  <div className="h-full bg-navy-500 rounded-full w-full"></div>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-maroon-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-400 mb-1">Columns</p>
                    <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {uploadedData?.preview?.columnCount || 0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-maroon-600/30 rounded-full overflow-hidden">
                  <div className="h-full bg-maroon-500 rounded-full w-3/4"></div>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-forest-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-400 mb-1">Data Points</p>
                    <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {((uploadedData?.preview?.rowCount || 0) * (uploadedData?.preview?.columnCount || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-forest-600/30 rounded-full overflow-hidden">
                  <div className="h-full bg-forest-500 rounded-full w-5/6"></div>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-jasmine-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-400 mb-1">Dataset Size</p>
                    <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {getDataForAnalytics().length || 0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-jasmine-600/30 rounded-full overflow-hidden">
                  <div className="h-full bg-jasmine-500 rounded-full w-full"></div>
                </div>
              </div>
            </div>

            {/* Data Warning if truncated */}
            {uploadedData?.preview?.isComplete === false && (
              <div className="mb-8 animate-fade-in-up delay-200">
                <div className="bg-amber-900/40 backdrop-blur-xl border border-amber-700/50 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-amber-300 mb-2">Large Dataset - Intelligent Sampling Active</p>
                      <p className="text-neutral-300 leading-relaxed">
                        Your dataset has <span className="font-bold text-neutral-900 dark:text-white">{uploadedData?.preview?.rowCount?.toLocaleString()}</span> rows.
                        Visualizations use intelligent sampling (<span className="font-semibold text-jasmine-400">{uploadedData?.preview?.samplingMethod || "LTTB"}</span>) for optimal performance.
                        AI analysis processes the complete dataset.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Insights Panel */}
            {uploadedData && user && (
              <div ref={insightsPanelRef} className="animate-fade-in-up delay-300">
                <SmartInsightsPanel
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  data={getDataForAnalytics()}
                  onInsightsGenerated={handleInsightsGenerated}
                />
              </div>
            )}

            {/* AI Forecast Panel */}
            {uploadedData && user && (
              <div ref={forecastPanelRef} className="animate-fade-in-up delay-400">
                <ForecastPanel
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  columns={uploadedData.preview.columns}
                  onForecastGenerated={handleForecastGenerated}
                />
              </div>
            )}

            {/* Context-Aware Chat Assistant */}
            {uploadedData && user && pageContext && (
              <div className="animate-fade-in-up delay-500">
                <ContextAwareChatAssistant
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  dataPreview={getDataForAnalytics()}
                  pageContext={pageContext}
                  onContextUpdate={(activity) => trackActivity('clicked', 'chat', { activity })}
                />
              </div>
            )}

          </>
        )}
      </div>

      {/* Quick Navigation with Modern Cards */}
      {uploadedData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up delay-600">
          <h2 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-6">Continue Your Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/visualizations-advanced"
              className="group relative bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-8 hover:border-jasmine-500/50 transition-all duration-300 hover-lift overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-maroon-600/10 rounded-full blur-3xl group-hover:bg-maroon-600/20 transition-all duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-maroon-600 to-maroon-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Visualizations</h3>
                    <p className="text-neutral-400 text-sm">Create stunning charts and graphs</p>
                  </div>
                  <svg className="w-6 h-6 text-jasmine-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Build interactive visualizations with 15+ chart types to tell compelling data stories
                </p>
              </div>
            </Link>

            <Link
              href="/ai-assistant"
              className="group relative bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-8 hover:border-jasmine-500/50 transition-all duration-300 hover-lift overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-forest-600/10 rounded-full blur-3xl group-hover:bg-forest-600/20 transition-all duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-forest-600 to-forest-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">AI Assistant</h3>
                    <p className="text-neutral-400 text-sm">Chat with your data using AI</p>
                  </div>
                  <svg className="w-6 h-6 text-jasmine-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Ask questions in natural language and get instant insights powered by Google Gemini
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
