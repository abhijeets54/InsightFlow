'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import ContextAwareChatAssistant from '@/components/dashboard/ContextAwareChatAssistant';
import { useDataStore } from '@/store/useDataStore';
import { BasePageContext } from '@/lib/context-collectors';

export default function AIAssistantPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { uploadedData, getFullData } = useDataStore();
  const router = useRouter();

  // Combined context from all pages (contains analytics, visualizations, and dataset)
  const [unifiedContext, setUnifiedContext] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  // Load and combine context from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const analyticsCtx = sessionStorage.getItem('analytics_context');
      const visualizationsCtx = sessionStorage.getItem('visualizations_context');

      let combined: any = {
        pageType: 'general',
        timestamp: Date.now(),
        sessionId: Date.now().toString(),
        userActivity: [],
      };

      if (analyticsCtx) {
        try {
          const parsedAnalytics = JSON.parse(analyticsCtx);
          combined.analytics = parsedAnalytics;
        } catch (e) {
          console.error('Failed to parse analytics context:', e);
        }
      }

      if (visualizationsCtx) {
        try {
          const parsedViz = JSON.parse(visualizationsCtx);
          combined.visualizations = parsedViz;
        } catch (e) {
          console.error('Failed to parse visualizations context:', e);
        }
      }

      // Add full dataset to context
      if (uploadedData) {
        combined.fullDataset = getFullData() || uploadedData.preview?.sampleRows || [];
        combined.datasetMetadata = {
          rowCount: uploadedData.preview?.rowCount,
          columnCount: uploadedData.preview?.columnCount,
          columns: uploadedData.preview?.columns,
        };
      }

      setUnifiedContext(combined);
    }
  }, [uploadedData]);

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
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">
            AI Assistant
          </h1>
          <p className="text-neutral-600">
            Ask questions about your data in natural language and get instant AI-powered insights
          </p>
        </div>

        {!uploadedData ? (
          <Card className="text-center py-12 shadow-medium">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Data Available</h3>
            <p className="text-neutral-600 mb-6">
              Upload a dataset first to start asking questions
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

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-forest-50 to-forest-100 border-forest-200 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Instant Insights</h3>
                    <p className="text-sm text-neutral-700">Get answers in seconds</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-navy-50 to-navy-100 border-navy-200 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Natural Language</h3>
                    <p className="text-sm text-neutral-700">Ask in plain English</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-maroon-50 to-rose-100 border-maroon-200 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <svg className="w-6 h-6 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Powered by Gemini</h3>
                    <p className="text-sm text-neutral-700">Google's advanced AI</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Context Indicator */}
            {unifiedContext && (unifiedContext.analytics || unifiedContext.visualizations) && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">Enhanced AI Context Active</p>
                    <p className="text-xs text-blue-700 mt-1">
                      AI has access to:
                      {unifiedContext.analytics && ' Analytics insights & forecasts'}
                      {unifiedContext.analytics && unifiedContext.visualizations && ' •'}
                      {unifiedContext.visualizations && ' Visualization data & chart insights'}
                      {' • Full dataset'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Chat Interface */}
            <Card className="shadow-medium">
              <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">
                  Chat with Your Data
                </h2>
                <p className="text-neutral-600 text-sm">
                  Try asking: "What are the top 5 values?", "Show me trends", "Calculate the average"
                  {unifiedContext?.analytics && ", \"Summarize the forecast insights\""}
                  {unifiedContext?.visualizations && ", \"What patterns did the charts reveal?\""}
                </p>
              </div>

              <ContextAwareChatAssistant
                datasetId={uploadedData?.datasetId}
                userId={user.id}
                dataPreview={getFullData() || uploadedData?.preview?.fullData || uploadedData?.preview?.sampleRows || []}
                pageContext={unifiedContext}
              />
            </Card>

            {/* Tips Section */}
            <div className="mt-8">
              <h3 className="text-xl font-display font-bold text-neutral-900 mb-4">
                Tips for Better Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Be Specific</h4>
                      <p className="text-sm text-neutral-600">
                        Instead of "show data", try "show the top 10 rows sorted by price"
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Ask for Analysis</h4>
                      <p className="text-sm text-neutral-600">
                        Request summaries, averages, trends, or comparisons
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Filter Your Data</h4>
                      <p className="text-sm text-neutral-600">
                        Use conditions like "where status is active" or "greater than 100"
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📈</span>
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-1">Request Visualizations</h4>
                      <p className="text-sm text-neutral-600">
                        Ask for charts or graphs to visualize your insights
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
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
              href="/visualizations"
              className="bg-forest-700 hover:bg-forest-800 text-white rounded-lg p-4 transition-colors duration-200 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">📈 Visualizations</h3>
                  <p className="text-forest-100 text-sm mt-1">Create beautiful charts</p>
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
