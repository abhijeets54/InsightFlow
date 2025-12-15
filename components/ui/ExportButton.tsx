'use client';

import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import Toast from './Toast';

interface ExportButtonProps {
  data: any[];
  chartRefs?: React.RefObject<HTMLDivElement>[];
  fileName?: string;
  title?: string;
}

export default function ExportButton({ data, chartRefs, fileName = 'export', title = 'Data Export' }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const exportToExcel = () => {
    setExporting(true);
    setExportType('excel');

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data');

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `${fileName}.xlsx`);

      setShowMenu(false);
    } catch (error) {
      console.error('Excel export error:', error);
      setToastMessage('Failed to export to Excel');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    setExportType('csv');

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data');

      // Generate CSV file and trigger download
      XLSX.writeFile(wb, `${fileName}.csv`);

      setShowMenu(false);
    } catch (error) {
      console.error('CSV export error:', error);
      setToastMessage('Failed to export to CSV');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const exportToPNG = async () => {
    if (!chartRefs || chartRefs.length === 0) {
      setToastMessage('No charts available to export');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setExporting(true);
    setExportType('png');

    try {
      const canvas = await html2canvas(chartRefs[0].current!, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });

      setShowMenu(false);
    } catch (error) {
      console.error('PNG export error:', error);
      setToastMessage('Failed to export to PNG');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    setExportType('pdf');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pageWidth / 2, 20, { align: 'center' });

      // Add date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

      let yPosition = 40;

      // If charts are provided, add them
      if (chartRefs && chartRefs.length > 0) {
        for (let i = 0; i < chartRefs.length; i++) {
          const chartRef = chartRefs[i];
          if (!chartRef.current) continue;

          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 20; // 10mm margin on each side
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Check if we need a new page
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        }
      }

      // Add data table
      if (data && data.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data Summary', 10, yPosition);
        yPosition += 10;

        // Add table headers
        const columns = Object.keys(data[0]);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');

        let xPosition = 10;
        const colWidth = (pageWidth - 20) / Math.min(columns.length, 6); // Max 6 columns visible

        columns.slice(0, 6).forEach((col, i) => {
          pdf.text(col, xPosition, yPosition);
          xPosition += colWidth;
        });

        yPosition += 6;
        pdf.setFont('helvetica', 'normal');

        // Add first 20 rows of data
        data.slice(0, 20).forEach((row, rowIndex) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          xPosition = 10;
          columns.slice(0, 6).forEach((col) => {
            const value = String(row[col] || '').substring(0, 15); // Truncate long values
            pdf.text(value, xPosition, yPosition);
            xPosition += colWidth;
          });

          yPosition += 6;
        });

        if (data.length > 20) {
          yPosition += 5;
          pdf.setFont('helvetica', 'italic');
          pdf.text(`... and ${data.length - 20} more rows`, 10, yPosition);
        }
      }

      // Add footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Page ${i} of ${pageCount} | Generated by InsightFlow`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      pdf.save(`${fileName}.pdf`);
      setShowMenu(false);
    } catch (error) {
      console.error('PDF export error:', error);
      setToastMessage('Failed to export to PDF');
      setToastType('error');
      setShowToast(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="px-4 py-2 bg-white border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all duration-200 shadow-soft hover:shadow-medium font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-400 border-t-neutral-700"></div>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </>
        )}
      </button>

      {showMenu && !exporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large border border-neutral-200 z-50">
          <div className="py-1">
            <button
              onClick={exportToPDF}
              className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-3 text-sm"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Export as PDF</span>
            </button>

            <button
              onClick={exportToPNG}
              className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-3 text-sm"
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Export as PNG</span>
            </button>

            <div className="border-t border-neutral-200 my-1"></div>

            <button
              onClick={exportToExcel}
              className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-3 text-sm"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Export as Excel</span>
            </button>

            <button
              onClick={exportToCSV}
              className="w-full text-left px-4 py-2 hover:bg-neutral-50 transition-colors flex items-center gap-3 text-sm"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">Export as CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        ></div>
      )}

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
