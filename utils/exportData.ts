import * as XLSX from 'xlsx';

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string = 'data.csv') {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Convert array of objects to CSV
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values with commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export data to Excel (XLSX) format
 */
export function exportToExcel(data: any[], filename: string = 'data.xlsx') {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Generate Excel file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], filename: string = 'data.json') {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Export chart as image (PNG)
 */
export function exportChartAsImage(chartElement: HTMLElement, filename: string = 'chart.png') {
  // This would require html2canvas library for proper implementation
  // For now, we'll provide a placeholder
  alert('Chart export as image feature requires html2canvas library. Coming soon!');
}

/**
 * Export data as PDF (requires jsPDF)
 */
export function exportToPDF(data: any[], title: string = 'Data Export', filename: string = 'data.pdf') {
  // This would require jsPDF library for proper implementation
  // For now, we'll provide a placeholder
  alert('PDF export feature requires jsPDF library. Coming soon!');
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format data for export by converting dates and handling nulls
 */
export function formatDataForExport(data: any[]): any[] {
  return data.map(row => {
    const formatted: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        formatted[key] = '';
      } else if (value instanceof Date) {
        formatted[key] = value.toISOString();
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
}
