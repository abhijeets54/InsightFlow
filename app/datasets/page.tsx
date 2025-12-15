'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useDataStore } from '@/store/useDataStore';

export default function DatasetsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { uploadedData, clearData } = useDataStore();
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

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    clearData();
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">
              My Datasets
            </h1>
            <p className="text-neutral-600">
              Manage and organize your uploaded data files
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New Dataset
          </Button>
        </div>

        {/* Datasets Grid */}
        {!uploadedData ? (
          <Card className="text-center py-12 shadow-medium">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-jasmine-100 rounded-xl mb-4">
              <svg className="w-16 h-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">No datasets yet</h3>
            <p className="text-neutral-600 mb-6">
              Upload your first dataset to get started
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large font-semibold"
            >
              Upload Dataset
            </button>
          </Card>
        ) : (
          <>
            {/* Single Dataset Card */}
            <Card className="hover:shadow-large transition-all duration-200 shadow-soft max-w-2xl">
              {/* File Icon Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-forest-100 to-navy-100 rounded-lg shadow-soft">
                  <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-forest-100 text-forest-700 text-xs font-semibold rounded-full uppercase">
                  CSV
                </span>
              </div>

              {/* File Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                  Current Dataset
                </h3>
                <p className="text-sm text-neutral-600">
                  Uploaded {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-xs text-neutral-600 mb-1">Rows</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {uploadedData?.preview?.rowCount?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-600 mb-1">Columns</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {uploadedData?.preview?.columnCount || 0}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </Card>

            {/* Stats Summary */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-forest-50 to-forest-100 border-forest-200 shadow-soft">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-700 mb-1">Total Rows</p>
                  <p className="text-3xl font-bold text-neutral-900">{uploadedData?.preview?.rowCount?.toLocaleString() || 0}</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-navy-50 to-navy-100 border-navy-200 shadow-soft">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-700 mb-1">Total Columns</p>
                  <p className="text-3xl font-bold text-neutral-900">
                    {uploadedData?.preview?.columnCount || 0}
                  </p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-maroon-50 to-rose-100 border-maroon-200 shadow-soft">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-700 mb-1">Dataset Size</p>
                  <p className="text-3xl font-bold text-neutral-900">
                    {(uploadedData?.preview?.fullData || uploadedData?.preview?.sampleRows)?.length || 0}
                  </p>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
