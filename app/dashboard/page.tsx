'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import FileUpload from '@/components/ui/FileUpload';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { useDataStore } from '@/store/useDataStore';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { uploadedData, setUploadedData } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

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

  const handleUploadSuccess = (data: any) => {
    setUploadedData(data);

    // Show success notification
    setToastMessage(`Successfully uploaded ${data.preview.rowCount.toLocaleString()} rows! Redirecting to analytics...`);
    setShowToast(true);

    // Redirect to analytics after 2 seconds
    setTimeout(() => {
      router.push('/analytics');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-jasmine-500/30 border-t-jasmine-500 mx-auto"></div>
          <p className="mt-4 text-jasmine-300 font-semibold">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Analytics',
      description: 'View AI-powered insights and trends',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: '/analytics',
      color: 'from-navy-600 to-navy-700',
      disabled: !uploadedData,
    },
    {
      title: 'Visualizations',
      description: 'Create stunning charts and graphs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      href: '/visualizations-advanced',
      color: 'from-maroon-600 to-maroon-700',
      disabled: !uploadedData,
    },
    {
      title: 'AI Assistant',
      description: 'Ask questions about your data',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      href: '/ai-assistant',
      color: 'from-forest-600 to-forest-700',
      disabled: !uploadedData,
    },
    {
      title: 'My Datasets',
      description: 'Manage all your uploaded files',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      href: '/datasets',
      color: 'from-brown-600 to-brown-700',
      disabled: false,
    },
  ];

  return (
    <div className="min-h-screen bg-jasmine-500 dark:bg-neutral-950">
      {/* Navigation */}
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header with gradient */}
        <div className="mb-12 animate-fade-in-up">
          <div className="inline-block px-5 py-2 bg-forest-600/20 border border-forest-600/50 text-forest-400 rounded-full text-sm font-semibold mb-6">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500"></span>
              </span>
              Workspace
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
            Welcome back, <span className="text-jasmine-400">{user.email.split('@')[0]}</span>
          </h1>
          <p className="text-xl text-neutral-400 max-w-3xl">
            Upload your data to unlock powerful analytics, beautiful visualizations, and AI-driven insights
          </p>
        </div>

        {/* Stats Overview */}
        {uploadedData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 animate-fade-in-up delay-100">
            <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white">{uploadedData.preview.rowCount?.toLocaleString() || 0}</div>
                  <div className="text-sm text-neutral-400 font-medium">Total Rows</div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-maroon-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white">{uploadedData.preview.columnCount || 0}</div>
                  <div className="text-sm text-neutral-400 font-medium">Columns</div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 hover-lift group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-forest-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-jasmine-400">Ready</div>
                  <div className="text-sm text-neutral-400 font-medium">Status</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-12 animate-fade-in-up delay-200" data-tour="upload-section">
          <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-jasmine-500 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                  Upload Your Data File
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Supports CSV, Excel, and JSON files up to 50MB
                </p>
              </div>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} userId={user.id} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12 animate-fade-in-up delay-300">
          <h2 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => !action.disabled && router.push(action.href)}
                disabled={action.disabled}
                className={`
                  group relative bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 text-left
                  transition-all duration-300 hover-lift
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-jasmine-500/50'}
                `}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 text-neutral-900 dark:text-white group-hover:scale-110 transition-transform duration-300`}>
                  {action.icon}
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{action.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{action.description}</p>
                {action.disabled && (
                  <div className="absolute top-4 right-4">
                    <div className="px-3 py-1 bg-neutral-800/80 border border-neutral-700/50 rounded-lg text-xs text-neutral-400 font-medium">
                      Upload data first
                    </div>
                  </div>
                )}
                {!action.disabled && (
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-jasmine-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Dataset Section */}
        <div className="animate-fade-in-up delay-400">
          <h2 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-6">
            Current Dataset
          </h2>

          {!uploadedData ? (
            <div className="bg-forest-900/40 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/30 rounded-2xl p-12 text-center">
              <div className="inline-block p-6 bg-neutral-100 dark:bg-forest-800/50 rounded-2xl mb-6">
                <svg className="w-20 h-20 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v6h6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">No Dataset Uploaded</h3>
              <p className="text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
                Upload your first dataset above to unlock all features including analytics, visualizations, and AI insights
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-neutral-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Supported formats: CSV, Excel, JSON
              </div>
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl overflow-hidden shadow-2xl hover-lift group">
              {/* Dataset Header */}
              <div className="bg-neutral-50 dark:bg-forest-800/80 backdrop-blur-xl px-8 py-6 border-b border-forest-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-jasmine-500 to-jasmine-600 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {uploadedData.preview.columns?.[0] || 'Dataset'}
                      </h3>
                      <p className="text-sm text-neutral-400 mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {uploadedData.preview.rowCount?.toLocaleString() || 0} rows
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          {uploadedData.preview.columnCount || 0} columns
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date().toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/analytics')}
                    className="px-6 py-3 bg-jasmine-500 text-forest-900 rounded-xl hover:bg-jasmine-400 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  >
                    Start Analysis
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Dataset Actions */}
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/analytics')}
                    className="flex items-center gap-4 p-5 bg-neutral-100 dark:bg-forest-800/50 hover:bg-neutral-200 dark:bg-forest-700/50 border border-neutral-200 dark:border-forest-700/30 hover:border-jasmine-500/50 rounded-xl transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 bg-navy-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold">View Analytics</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">AI insights & trends</div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/visualizations-advanced')}
                    className="flex items-center gap-4 p-5 bg-neutral-100 dark:bg-forest-800/50 hover:bg-neutral-200 dark:bg-forest-700/50 border border-neutral-200 dark:border-forest-700/30 hover:border-jasmine-500/50 rounded-xl transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 bg-maroon-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold">Create Charts</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">15+ chart types</div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/ai-assistant')}
                    className="flex items-center gap-4 p-5 bg-neutral-100 dark:bg-forest-800/50 hover:bg-neutral-200 dark:bg-forest-700/50 border border-neutral-200 dark:border-forest-700/30 hover:border-jasmine-500/50 rounded-xl transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 bg-forest-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold">Ask AI</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">Chat with your data</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
