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
      {/* Navigation */}
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">
            Dashboard
          </h1>
          <p className="text-neutral-600">
            Upload your data to get started with powerful analytics and AI insights
          </p>
        </div>

        {/* Upload Section */}
        <Card className="shadow-medium mb-6" data-tour="upload-section">
          <h2 className="text-2xl font-display font-bold mb-6 text-neutral-900">
            Upload Your Data File
          </h2>
          <FileUpload onUploadSuccess={handleUploadSuccess} userId={user.id} />
        </Card>

        {/* My Datasets Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold mb-6 text-neutral-900">
            My Datasets
          </h2>

          {!uploadedData ? (
            <Card className="text-center py-12 shadow-soft">
              <div className="inline-block p-4 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-xl mb-4">
                <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Datasets</h3>
              <p className="text-neutral-600 max-w-md mx-auto">
                Upload your first dataset above to get started with analytics and insights
              </p>
            </Card>
          ) : (
            <Card className="shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {uploadedData.preview.columns?.[0] || 'Dataset'}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    {uploadedData.preview.rowCount?.toLocaleString() || 0} rows • {uploadedData.preview.columnCount || 0} columns
                  </p>
                </div>
                <button
                  onClick={() => router.push('/analytics')}
                  className="px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-colors font-semibold"
                >
                  Analyze
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-3">
                Uploaded: {new Date().toLocaleDateString()}
              </p>
            </Card>
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
