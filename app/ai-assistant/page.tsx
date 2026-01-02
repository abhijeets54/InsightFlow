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
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-jasmine-500/30 border-t-jasmine-500 mx-auto"></div>
          <p className="mt-4 text-jasmine-300 font-semibold">Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500 dark:bg-neutral-950">
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="mb-12 animate-fade-in-up">
          <div className="inline-block px-5 py-2 bg-forest-600/20 border border-forest-600/50 text-forest-400 rounded-full text-sm font-semibold mb-6">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              AI-Powered Assistant
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-white mb-4 leading-tight">
            Chat with Your Data
          </h1>
          <p className="text-xl text-neutral-400 max-w-3xl">
            Ask questions in natural language and get instant, intelligent answers powered by Google Gemini AI
          </p>
        </div>

        {!uploadedData ? (
          <div className="bg-forest-900/40 backdrop-blur-xl border border-forest-700/30 rounded-3xl p-16 text-center animate-fade-in-up delay-100">
            <div className="inline-block p-8 bg-forest-800/50 rounded-2xl mb-8">
              <svg className="w-24 h-24 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">No Dataset Connected</h3>
            <p className="text-neutral-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Upload a dataset first to start having intelligent conversations with your data
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

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up delay-100">
              <div className="bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-forest-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1 text-lg">Instant Insights</h3>
                    <p className="text-sm text-neutral-400">Get answers in under 2 seconds</p>
                  </div>
                </div>
              </div>

              <div className="bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1 text-lg">Natural Language</h3>
                    <p className="text-sm text-neutral-400">Ask questions in plain English</p>
                  </div>
                </div>
              </div>

              <div className="bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-6 hover-lift group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-jasmine-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1 text-lg">Powered by Gemini</h3>
                    <p className="text-sm text-neutral-400">Google's advanced AI model</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Indicator */}
            {unifiedContext && (unifiedContext.analytics || unifiedContext.visualizations) && (
              <div className="mb-8 animate-fade-in-up delay-200">
                <div className="bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-white mb-2">Enhanced Context Active</p>
                      <p className="text-neutral-300 leading-relaxed">
                        AI has access to:
                        {unifiedContext.analytics && <span className="inline-flex items-center gap-1 ml-1"><span className="text-jasmine-400 font-semibold">Analytics insights & forecasts</span></span>}
                        {unifiedContext.analytics && unifiedContext.visualizations && <span className="text-neutral-500 mx-2">•</span>}
                        {unifiedContext.visualizations && <span className="inline-flex items-center gap-1"><span className="text-jasmine-400 font-semibold">Visualization data</span></span>}
                        <span className="text-neutral-500 mx-2">•</span>
                        <span className="text-jasmine-400 font-semibold">Full dataset ({uploadedData.preview?.rowCount?.toLocaleString() || 0} rows)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Example Questions */}
            <div className="mb-8 animate-fade-in-up delay-300">
              <h2 className="text-2xl font-display font-bold text-white mb-4">Try asking:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "What are the top 3 trends in my data?",
                  "Which columns have the most missing values?",
                  "Can you identify any anomalies?",
                  "What's the correlation between X and Y?",
                  "Summarize the key insights from this dataset",
                  "What patterns do you see in the time series data?"
                ].map((question, index) => (
                  <div
                    key={index}
                    className="bg-forest-900/40 backdrop-blur-xl border border-forest-700/30 rounded-xl p-4 hover:border-jasmine-500/50 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-jasmine-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-neutral-300 group-hover:text-white transition-colors duration-300">{question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Chat Interface */}
            <div className="animate-fade-in-up delay-400">
              {unifiedContext && (
                <ContextAwareChatAssistant
                  datasetId={uploadedData.datasetId}
                  userId={user.id}
                  dataPreview={getFullData() || uploadedData.preview?.sampleRows || []}
                  pageContext={unifiedContext.analytics || unifiedContext.visualizations || {
                    pageType: 'general',
                    timestamp: Date.now(),
                    sessionId: Date.now().toString(),
                    insights: [],
                    forecast: { available: false },
                    statistics: {
                      columns: uploadedData.preview?.columns || [],
                      rowCount: uploadedData.preview?.rowCount || 0,
                      totalDataPoints: 0
                    },
                    userActivity: [],
                    currentChart: {
                      type: 'bar',
                      selectedColumns: [],
                      topValues: [],
                      dataPoints: 0
                    },
                    appliedFilters: [],
                    chartHistory: []
                  }}
                  onContextUpdate={() => {}}
                />
              )}
            </div>

            {/* Quick Links */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-500">
              <Link
                href="/analytics"
                className="group relative bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-8 hover:border-jasmine-500/50 transition-all duration-300 hover-lift overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-navy-600/10 rounded-full blur-3xl group-hover:bg-navy-600/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-navy-600 to-navy-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">View Analytics</h3>
                      <p className="text-neutral-400 text-sm">Explore AI-powered insights</p>
                    </div>
                    <svg className="w-6 h-6 text-jasmine-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                href="/visualizations-advanced"
                className="group relative bg-forest-900/60 backdrop-blur-xl border border-forest-700/50 rounded-2xl p-8 hover:border-jasmine-500/50 transition-all duration-300 hover-lift overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-maroon-600/10 rounded-full blur-3xl group-hover:bg-maroon-600/20 transition-all duration-500"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-maroon-600 to-maroon-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">Create Charts</h3>
                      <p className="text-neutral-400 text-sm">Build stunning visualizations</p>
                    </div>
                    <svg className="w-6 h-6 text-jasmine-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
