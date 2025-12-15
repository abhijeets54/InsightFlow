'use client';

import { useState } from 'react';
import Toast from './Toast';

interface ColumnSelectorProps {
  columns: string[];
  types?: string[];
  selectedColumns?: string[];
  onSelectionChange: (selected: string[]) => void;
  maxColumns?: number;
}

export default function ColumnSelector({
  columns,
  types = [],
  selectedColumns = [],
  onSelectionChange,
  maxColumns,
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleToggleColumn = (column: string) => {
    const newSelection = selectedColumns.includes(column)
      ? selectedColumns.filter(c => c !== column)
      : [...selectedColumns, column];

    if (maxColumns && newSelection.length > maxColumns) {
      setToastMessage(`You can select up to ${maxColumns} columns`);
      setShowToast(true);
      return;
    }

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === columns.length) {
      onSelectionChange([]);
    } else {
      const allCols = maxColumns ? columns.slice(0, maxColumns) : columns;
      onSelectionChange(allCols);
    }
  };

  const getColumnType = (column: string): string => {
    const index = columns.indexOf(column);
    return types[index] || 'unknown';
  };

  const getTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'number':
      case 'numeric':
        return '🔢';
      case 'string':
      case 'text':
        return '📝';
      case 'date':
      case 'datetime':
        return '📅';
      case 'boolean':
        return '✓';
      default:
        return '📊';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg text-left hover:border-forest-500 transition-all shadow-soft flex items-center justify-between"
      >
        <span className="text-sm font-medium text-neutral-700">
          {selectedColumns.length === 0
            ? 'Select columns to visualize'
            : `${selectedColumns.length} column${selectedColumns.length > 1 ? 's' : ''} selected`}
        </span>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border-2 border-neutral-300 rounded-lg shadow-large max-h-96 overflow-y-auto">
          {/* Header with Select All */}
          <div className="sticky top-0 bg-gradient-to-r from-forest-50 to-navy-50 border-b border-neutral-200 p-3">
            <button
              onClick={handleSelectAll}
              className="text-sm font-semibold text-forest-700 hover:text-forest-800 transition-colors flex items-center gap-2"
            >
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                selectedColumns.length === columns.length
                  ? 'bg-forest-500 border-forest-500'
                  : 'border-neutral-400'
              }`}>
                {selectedColumns.length === columns.length && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {selectedColumns.length === columns.length ? 'Deselect All' : 'Select All'}
              {maxColumns && ` (max ${maxColumns})`}
            </button>
          </div>

          {/* Column List */}
          <div className="p-2">
            {columns.map((column, index) => {
              const isSelected = selectedColumns.includes(column);
              const colType = getColumnType(column);

              return (
                <button
                  key={column}
                  onClick={() => handleToggleColumn(column)}
                  className={`w-full px-3 py-2 rounded-lg text-left transition-all mb-1 flex items-center justify-between ${
                    isSelected
                      ? 'bg-forest-100 border-2 border-forest-300'
                      : 'hover:bg-neutral-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-forest-500 border-forest-500'
                        : 'border-neutral-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <span className={`text-sm font-medium flex-1 ${
                      isSelected ? 'text-forest-900' : 'text-neutral-700'
                    }`}>
                      {column}
                    </span>

                    <span className="text-xs px-2 py-1 bg-white rounded border border-neutral-200 flex items-center gap-1">
                      <span>{getTypeIcon(colType)}</span>
                      <span className="text-neutral-600">{colType}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 p-3 flex justify-between items-center">
            <span className="text-xs text-neutral-600">
              {selectedColumns.length} of {columns.length} selected
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-forest-500 text-white text-sm rounded-lg hover:bg-forest-600 transition-all font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          type="error"
          duration={2000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
