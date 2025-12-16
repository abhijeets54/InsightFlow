import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedFileData, ColumnType } from '@/types';

/**
 * Detect the type of a column based on sample values
 */
export function detectColumnType(values: any[]): ColumnType {
  // Filter out null/undefined values
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (validValues.length === 0) return 'text';

  // Check if all values are numbers
  const numericCount = validValues.filter(v => !isNaN(Number(v))).length;
  if (numericCount / validValues.length > 0.8) {
    return 'number';
  }

  // Check if values are dates
  const dateCount = validValues.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && typeof v === 'string' && v.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
  }).length;

  if (dateCount / validValues.length > 0.8) {
    return 'date';
  }

  // Check if values are boolean
  const boolCount = validValues.filter(v =>
    v === true || v === false ||
    String(v).toLowerCase() === 'true' ||
    String(v).toLowerCase() === 'false' ||
    String(v).toLowerCase() === 'yes' ||
    String(v).toLowerCase() === 'no'
  ).length;

  if (boolCount / validValues.length > 0.8) {
    return 'boolean';
  }

  // Check if it's a category (limited unique values)
  const uniqueValues = new Set(validValues);
  if (uniqueValues.size <= 10 && uniqueValues.size < validValues.length * 0.5) {
    return 'category';
  }

  return 'text';
}

/**
 * Parse CSV file
 */
export function parseCSV(fileContent: string): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        const columns = results.meta.fields || [];

        // Detect types for each column
        const types = columns.map(col => {
          const columnValues = rows.map(row => row[col]);
          return detectColumnType(columnValues);
        });

        resolve({
          columns,
          types,
          rows,
          rowCount: rows.length,
          columnCount: columns.length,
        });
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse Excel file
 */
export function parseExcel(fileBuffer: ArrayBuffer): ParsedFileData {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

  if (rows.length === 0) {
    throw new Error('Excel file is empty');
  }

  const columns = Object.keys(rows[0]);

  // Detect types for each column
  const types = columns.map(col => {
    const columnValues = rows.map(row => row[col]);
    return detectColumnType(columnValues);
  });

  return {
    columns,
    types,
    rows,
    rowCount: rows.length,
    columnCount: columns.length,
  };
}

/**
 * Parse JSON file
 */
export function parseJSON(fileContent: string): ParsedFileData {
  const data = JSON.parse(fileContent);

  // Handle both array of objects and single object
  const rows = Array.isArray(data) ? data : [data];

  if (rows.length === 0) {
    throw new Error('JSON file is empty');
  }

  const columns = Object.keys(rows[0]);

  // Detect types for each column
  const types = columns.map(col => {
    const columnValues = rows.map(row => row[col]);
    return detectColumnType(columnValues);
  });

  return {
    columns,
    types,
    rows,
    rowCount: rows.length,
    columnCount: columns.length,
  };
}

/**
 * Main parser function that routes to appropriate parser
 */
export async function parseFile(
  file: File
): Promise<ParsedFileData> {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  switch (fileType) {
    case 'csv':
    case 'tsv':
      const csvText = await file.text();
      return parseCSV(csvText);

    case 'xlsx':
    case 'xls':
      const excelBuffer = await file.arrayBuffer();
      return parseExcel(excelBuffer);

    case 'json':
      const jsonText = await file.text();
      return parseJSON(jsonText);

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['csv', 'tsv', 'xlsx', 'xls', 'json'];
  const fileType = file.name.split('.').pop()?.toLowerCase();

  if (!fileType || !allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 50MB limit',
    };
  }

  return { valid: true };
}
