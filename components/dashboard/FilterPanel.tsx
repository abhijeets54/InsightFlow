'use client';

import { useState, useEffect } from 'react';
import Card from '../ui/Card';

interface Filter {
  id: string;
  column: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'notEmpty';
  value: string | number;
  value2?: string | number; // For "between" operator
}

interface FilterPanelProps {
  columns: string[];
  data: any[];
  onFilterChange: (filteredData: any[]) => void;
  onColumnsChange: (columns: string[]) => void;
}

export default function FilterPanel({
  columns,
  data,
  onFilterChange,
  onColumnsChange,
}: FilterPanelProps) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Apply filters whenever they change
  useEffect(() => {
    if (filters.length === 0) {
      onFilterChange(data);
      return;
    }

    const filtered = data.filter((row) => {
      return filters.every((filter) => {
        const value = row[filter.column];

        switch (filter.operator) {
          case 'equals':
            return String(value).toLowerCase() === String(filter.value).toLowerCase();
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater':
            return parseFloat(value) > parseFloat(String(filter.value));
          case 'less':
            return parseFloat(value) < parseFloat(String(filter.value));
          case 'between':
            return (
              parseFloat(value) >= parseFloat(String(filter.value)) &&
              parseFloat(value) <= parseFloat(String(filter.value2 || filter.value))
            );
          case 'notEmpty':
            return value !== null && value !== undefined && value !== '';
          default:
            return true;
        }
      });
    });

    onFilterChange(filtered);
  }, [filters, data]);

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      column: columns[0],
      operator: 'equals',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const clearFilters = () => {
    setFilters([]);
  };

  if (!expanded) {
    return (
      <Card className="mb-6 shadow-medium">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-lg font-display font-bold text-neutral-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters & Saved Views
              {filters.length > 0 && (
                <span className="px-2 py-0.5 bg-forest-500 text-white text-xs rounded-full">
                  {filters.length} active
                </span>
              )}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Filter your data and save custom views
            </p>
          </div>
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-large border-2 border-forest-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters & Saved Views
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            Create custom filters and save your favorite views
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Active Filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-neutral-900">Active Filters</h4>
          <div className="flex gap-2">
            <button
              onClick={addFilter}
              className="px-3 py-1 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all text-sm font-semibold"
            >
              + Add Filter
            </button>
            {filters.length > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-all text-sm font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {filters.length === 0 ? (
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
            <p className="text-sm text-neutral-600">No active filters. Click "Add Filter" to start.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.id} className="flex gap-2 items-start p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                {/* Column */}
                <select
                  value={filter.column}
                  onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater">Greater than</option>
                  <option value="less">Less than</option>
                  <option value="between">Between</option>
                  <option value="notEmpty">Not empty</option>
                </select>

                {/* Value(s) */}
                {filter.operator !== 'notEmpty' && (
                  <>
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                    />
                    {filter.operator === 'between' && (
                      <input
                        type="text"
                        value={filter.value2 || ''}
                        onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                        placeholder="Max value"
                        className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
                      />
                    )}
                  </>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </Card>
  );
}
