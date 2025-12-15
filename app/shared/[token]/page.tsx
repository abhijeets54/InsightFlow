'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import ChartDisplay from '@/components/dashboard/ChartDisplay';

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadSharedDashboard();
  }, [token]);

  const loadSharedDashboard = async (pwd?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/share/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: token,
          password: pwd || password,
        }),
      });

      const data = await response.json();

      if (response.status === 401 && data.requiresPassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load dashboard');
      }

      setDashboardData(data);
      setRequiresPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSharedDashboard(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-forest-200 border-t-forest-600 mx-auto"></div>
          <p className="mt-4 text-neutral-900 font-semibold">Loading shared dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="inline-block p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Dashboard Not Found
          </h2>
          <p className="text-neutral-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-forest-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">
              Password Protected
            </h2>
            <p className="text-neutral-600">
              This dashboard requires a password to view
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border-2 border-neutral-300 rounded-lg focus:border-forest-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!password}
              className="w-full px-4 py-3 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Access Dashboard
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}
        </Card>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { share, dataset } = dashboardData;

  return (
    <div className="min-h-screen bg-jasmine-500">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-900 mb-1">
                {share.title}
              </h1>
              {share.description && (
                <p className="text-neutral-600">{share.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{share.views.toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Shared {new Date(share.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all font-semibold flex items-center gap-2"
            >
              Create Your Own
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dataset Info */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-forest-50 to-forest-100">
            <div className="text-center">
              <p className="text-sm text-neutral-600 mb-1">Dataset</p>
              <p className="text-xl font-bold text-neutral-900">{dataset.name}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-navy-50 to-navy-100">
            <div className="text-center">
              <p className="text-sm text-neutral-600 mb-1">Rows</p>
              <p className="text-xl font-bold text-neutral-900">{dataset.rowCount.toLocaleString()}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-maroon-50 to-maroon-100">
            <div className="text-center">
              <p className="text-sm text-neutral-600 mb-1">Columns</p>
              <p className="text-xl font-bold text-neutral-900">{dataset.columnCount}</p>
            </div>
          </Card>
        </div>

        {/* Visualizations */}
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">
            Data Insights
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <h3 className="text-lg font-display font-bold text-neutral-900 mb-4">
              Data Distribution
            </h3>
            <div className="bg-gradient-to-br from-white to-jasmine-50 p-4 rounded-lg">
              <ChartDisplay
                type="bar"
                data={dataset.sampleRows}
                title="Bar Chart"
              />
            </div>
          </Card>

          <Card className="shadow-soft">
            <h3 className="text-lg font-display font-bold text-neutral-900 mb-4">
              Trend Analysis
            </h3>
            <div className="bg-gradient-to-br from-white to-navy-50 p-4 rounded-lg">
              <ChartDisplay
                type="line"
                data={dataset.sampleRows}
                title="Line Chart"
              />
            </div>
          </Card>

          <Card className="shadow-soft">
            <h3 className="text-lg font-display font-bold text-neutral-900 mb-4">
              Area Analysis
            </h3>
            <div className="bg-gradient-to-br from-white to-forest-50 p-4 rounded-lg">
              <ChartDisplay
                type="area"
                data={dataset.sampleRows}
                title="Area Chart"
              />
            </div>
          </Card>

          <Card className="shadow-soft">
            <h3 className="text-lg font-display font-bold text-neutral-900 mb-4">
              Composition
            </h3>
            <div className="bg-gradient-to-br from-white to-maroon-50 p-4 rounded-lg">
              <ChartDisplay
                type="pie"
                data={dataset.sampleRows.slice(0, 10)}
                title="Pie Chart"
              />
            </div>
          </Card>
        </div>

        {/* Powered By Banner */}
        <div className="mt-8 p-4 bg-gradient-to-r from-jasmine-100 to-jasmine-50 border border-jasmine-300 rounded-lg text-center">
          <p className="text-sm text-neutral-800">
            Powered by <span className="font-bold">InsightFlow</span> - Create your own dashboards for free
          </p>
        </div>
      </div>
    </div>
  );
}
