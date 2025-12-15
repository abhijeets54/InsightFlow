'use client';

import { useEffect, useState } from 'react';
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
        visiblePanels
      );
      setPageContext(context);
    }
  }, [insights, forecastData, uploadedData, visiblePanels]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);
    setLoading(false);
  };

  const handleInsightsGenerated = (generatedInsights: any[]) => {
    setInsights(generatedInsights);
    trackActivity('viewed', 'insights_panel', { count: generatedInsights.length });
  };

  const handleForecastGenerated = (forecast: any) => {
    setForecastData(forecast);
    trackActivity('viewed', 'forecast_panel');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
              Analytics Dashboard
            </h1>
            <p className="text-neutral-600">
              Comprehensive insights and visualizations for your data
            </p>
          </div>
          {uploadedData && user && (
            <div className="flex gap-3">
              <ExportButton
                data={uploadedData.preview.fullData || uploadedData.preview.sampleRows || []}
                chartRefs={[]}
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
          <Card className="text-center py-12 shadow-medium">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Data Yet</h3>
            <p className="text-neutral-600 mb-6">
              Upload your first dataset to start analyzing
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-forest-50 to-forest-100 border-forest-200 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Total Rows</p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {uploadedData?.preview?.rowCount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-navy-50 to-navy-100 border-navy-200 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Columns</p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {uploadedData?.preview?.columnCount || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-maroon-50 to-rose-100 border-maroon-200 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Data Points</p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {((uploadedData?.preview?.rowCount || 0) * (uploadedData?.preview?.columnCount || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-brown-50 to-brown-100 border-brown-200 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Dataset Size</p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {getDataForAnalytics().length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-brown-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

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

            {/* Smart Insights Panel */}
            {uploadedData && user && (
              <SmartInsightsPanel
                datasetId={uploadedData.datasetId}
                userId={user.id}
                data={getDataForAnalytics()}
                onInsightsGenerated={handleInsightsGenerated}
              />
            )}

            {/* AI Forecast Panel */}
            {uploadedData && user && (
              <ForecastPanel
                datasetId={uploadedData.datasetId}
                userId={user.id}
                columns={uploadedData.preview.columns}
                onForecastGenerated={handleForecastGenerated}
              />
            )}

            {/* Context-Aware Chat Assistant */}
            {uploadedData && user && pageContext && (
              <ContextAwareChatAssistant
                datasetId={uploadedData.datasetId}
                userId={user.id}
                dataPreview={getDataForAnalytics()}
                pageContext={pageContext}
                onContextUpdate={(activity) => trackActivity('clicked', 'chat', { activity })}
              />
            )}

          </>
        )}
      </div>

      {/* Navigation Buttons */}
      {uploadedData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/visualizations"
              className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">📈 Visualizations</h3>
                  <p className="text-forest-100 text-sm mt-1">Create charts and graphs</p>
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
    </div>
  );
}
