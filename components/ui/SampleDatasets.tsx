'use client';

import { useState } from 'react';
import Card from './Card';
import Toast from './Toast';

interface SampleDataset {
  id: string;
  name: string;
  description: string;
  icon: string;
  file: string;
  rows: number;
  columns: number;
  color: string;
}

const sampleDatasets: SampleDataset[] = [
  {
    id: 'sales',
    name: 'Sales Data',
    description: 'Product sales across regions with revenue, units, and profit metrics',
    icon: '💰',
    file: '/sample-datasets/sales-data.csv',
    rows: 50,
    columns: 8,
    color: 'from-forest-50 to-forest-100',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Orders',
    description: 'Online store transactions with customer, product, and payment details',
    icon: '🛒',
    file: '/sample-datasets/ecommerce-data.csv',
    rows: 50,
    columns: 11,
    color: 'from-navy-50 to-navy-100',
  },
  {
    id: 'marketing',
    name: 'Marketing Campaigns',
    description: 'Digital marketing performance across channels with ROI and conversion rates',
    icon: '📊',
    file: '/sample-datasets/marketing-data.csv',
    rows: 50,
    columns: 11,
    color: 'from-maroon-50 to-maroon-100',
  },
  {
    id: 'financial',
    name: 'Financial Transactions',
    description: 'Personal finance tracking with income, expenses, and account balances',
    icon: '💳',
    file: '/sample-datasets/financial-data.csv',
    rows: 55,
    columns: 8,
    color: 'from-rose-50 to-rose-100',
  },
  {
    id: 'spotify',
    name: 'Spotify Tracks',
    description: 'Music streaming data with audio features, popularity, and artist information',
    icon: '🎵',
    file: '/sample-datasets/spotify-data.csv',
    rows: 50,
    columns: 17,
    color: 'from-jasmine-100 to-jasmine-200',
  },
];

interface SampleDatasetsProps {
  onLoad: (file: File) => void;
  userId: string;
}

export default function SampleDatasets({ onLoad, userId }: SampleDatasetsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleLoadSample = async (dataset: SampleDataset) => {
    setLoading(dataset.id);

    try {
      // Fetch the CSV file from public directory
      const response = await fetch(dataset.file);
      const csvText = await response.text();

      // Convert to File object
      const blob = new Blob([csvText], { type: 'text/csv' });
      const file = new File([blob], `${dataset.id}-sample.csv`, { type: 'text/csv' });

      // Pass to parent upload handler
      onLoad(file);
    } catch (error) {
      console.error('Error loading sample dataset:', error);
      setToastMessage('Failed to load sample dataset. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-8" data-tour="sample-datasets">
      <div className="mb-4">
        <h3 className="text-lg font-display font-bold text-neutral-900 mb-1">
          Try Sample Datasets
        </h3>
        <p className="text-sm text-neutral-600">
          No data? No problem! Load a sample dataset to explore all features instantly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleDatasets.map((dataset) => (
          <Card
            key={dataset.id}
            className={`bg-gradient-to-br ${dataset.color} border-2 border-neutral-200 hover:border-forest-400 transition-all cursor-pointer group ${
              loading === dataset.id ? 'opacity-50' : ''
            }`}
            onClick={() => !loading && handleLoadSample(dataset)}
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl">{dataset.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-neutral-900 mb-1 group-hover:text-forest-700 transition-colors">
                  {dataset.name}
                </h4>
                <p className="text-xs text-neutral-700 mb-3 line-clamp-2">
                  {dataset.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-neutral-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{dataset.rows} rows</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                    </svg>
                    <span>{dataset.columns} cols</span>
                  </div>
                </div>
              </div>
            </div>

            {loading === dataset.id && (
              <div className="mt-3 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-forest-200 border-t-forest-600"></div>
                <span className="ml-2 text-xs text-neutral-700">Loading...</span>
              </div>
            )}

            {!loading && (
              <div className="mt-3 flex items-center justify-center text-xs font-semibold text-forest-600 group-hover:text-forest-700 transition-colors">
                Click to load
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-jasmine-50 to-neutral-50 border border-jasmine-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-neutral-700 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-neutral-700">
            <span className="font-semibold">Pro tip:</span> Sample datasets are perfect for testing features like AI chat, column filtering, and visualizations
          </p>
        </div>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
