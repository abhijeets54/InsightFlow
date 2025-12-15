'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface SavedQuery {
  id: string;
  user_id: string;
  query_text: string;
  query_name: string;
  created_at: string;
  dataset_id?: string;
}

interface SavedQueriesProps {
  userId: string;
  datasetId?: string;
  onSelectQuery?: (query: string) => void;
}

export default function SavedQueries({ userId, datasetId, onSelectQuery }: SavedQueriesProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuery, setNewQuery] = useState({ name: '', text: '' });

  useEffect(() => {
    loadSavedQueries();
  }, [userId]);

  const loadSavedQueries = async () => {
    try {
      // For now, use localStorage since we haven't created the saved_queries table in Supabase
      const saved = localStorage.getItem(`saved_queries_${userId}`);
      if (saved) {
        setQueries(JSON.parse(saved));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading saved queries:', error);
      setLoading(false);
    }
  };

  const handleSaveQuery = () => {
    if (!newQuery.name.trim() || !newQuery.text.trim()) {
      alert('Please provide both a name and query text');
      return;
    }

    const query: SavedQuery = {
      id: Date.now().toString(),
      user_id: userId,
      query_name: newQuery.name,
      query_text: newQuery.text,
      created_at: new Date().toISOString(),
      dataset_id: datasetId,
    };

    const updatedQueries = [...queries, query];
    setQueries(updatedQueries);
    localStorage.setItem(`saved_queries_${userId}`, JSON.stringify(updatedQueries));

    setNewQuery({ name: '', text: '' });
    setShowAddForm(false);
  };

  const handleDeleteQuery = (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    const updatedQueries = queries.filter(q => q.id !== queryId);
    setQueries(updatedQueries);
    localStorage.setItem(`saved_queries_${userId}`, JSON.stringify(updatedQueries));
  };

  const handleUseQuery = (query: SavedQuery) => {
    if (onSelectQuery) {
      onSelectQuery(query.query_text);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-600">Loading saved queries...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-neutral-900">Saved Queries</h3>
            <p className="text-sm text-neutral-600">Quick access to your favorite queries</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add Query'}
          </Button>
        </div>

        {/* Add Query Form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg border border-neutral-200">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Query Name
                </label>
                <input
                  type="text"
                  value={newQuery.name}
                  onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
                  placeholder="e.g., Top 10 Sales"
                  className="block w-full px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Query Text
                </label>
                <textarea
                  value={newQuery.text}
                  onChange={(e) => setNewQuery({ ...newQuery, text: e.target.value })}
                  placeholder="e.g., Show me the top 10 products by sales"
                  rows={3}
                  className="block w-full px-3 py-2 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveQuery}
                className="w-full"
              >
                Save Query
              </Button>
            </div>
          </div>
        )}

        {/* Queries List */}
        {queries.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block p-3 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl mb-3">
              <svg className="w-12 h-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-neutral-600 text-sm">No saved queries yet</p>
            <p className="text-neutral-500 text-xs mt-1">Save your frequently used queries for quick access</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queries.map((query) => (
              <div
                key={query.id}
                className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-neutral-900 text-sm mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span className="truncate">{query.query_name}</span>
                    </h4>
                    <p className="text-neutral-600 text-xs line-clamp-2">{query.query_text}</p>
                    <p className="text-neutral-500 text-xs mt-1">
                      {new Date(query.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleUseQuery(query)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Use this query"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteQuery(query.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete query"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
