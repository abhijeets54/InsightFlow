'use client';

import { exportToCSV, exportToExcel, exportToJSON } from '@/utils/exportData';

interface DataTableProps {
  data: Record<string, any>[];
  columns: string[];
  maxRows?: number;
}

export default function DataTable({ data, columns, maxRows = 50 }: DataTableProps) {
  const displayData = data.slice(0, maxRows);

  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      switch (format) {
        case 'csv':
          exportToCSV(data, `data-export-${timestamp}.csv`);
          break;
        case 'excel':
          exportToExcel(data, `data-export-${timestamp}.xlsx`);
          break;
        case 'json':
          exportToJSON(data, `data-export-${timestamp}.json`);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Export Buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => handleExport('csv')}
          className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all shadow-soft hover:shadow-medium text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV
        </button>
        <button
          onClick={() => handleExport('excel')}
          className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all shadow-soft hover:shadow-medium text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
        <button
          onClick={() => handleExport('json')}
          className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all shadow-soft hover:shadow-medium text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          JSON
        </button>
      </div>

      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-neutral-200 rounded-xl shadow-soft">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-gradient-to-r from-primary-50 to-secondary-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {displayData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition-colors hover:bg-primary-50 ${
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                  }`}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900"
                    >
                      {row[column] !== null && row[column] !== undefined
                        ? String(row[column])
                        : <span className="text-neutral-400">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > maxRows && (
          <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-neutral-200">
            <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-neutral-700 font-medium">
              Showing {maxRows} of {data.length} rows
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
