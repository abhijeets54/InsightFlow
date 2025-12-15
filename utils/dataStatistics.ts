/**
 * FREE Statistical Analysis
 * Calculate statistics on FULL dataset, send summary to AI
 * No API costs - pure JavaScript
 */

export interface ColumnStatistics {
  column: string;
  type: 'numeric' | 'string' | 'date' | 'boolean' | 'mixed';
  count: number;
  nullCount: number;
  uniqueCount: number;

  // For numeric columns
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  sum?: number;

  // For string columns
  topValues?: { value: string; count: number }[];

  // For all columns
  sampleValues: any[];
}

export interface DatasetStatistics {
  totalRows: number;
  totalColumns: number;
  columnStats: ColumnStatistics[];
  representativeSample: any[]; // Smart sample from full dataset
}

/**
 * Calculate comprehensive statistics on FULL dataset
 * Returns summary suitable for AI context (no token waste)
 */
export function calculateDatasetStatistics(
  rows: any[],
  columns: string[]
): DatasetStatistics {
  const columnStats: ColumnStatistics[] = columns.map(column => {
    const values = rows.map(row => row[column]);
    const nonNullValues = values.filter(v => v != null && v !== '');

    // Determine type
    const type = detectColumnType(nonNullValues);

    // Count unique values
    const uniqueValues = new Set(nonNullValues);

    const stat: ColumnStatistics = {
      column,
      type,
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
      sampleValues: nonNullValues.slice(0, 3),
    };

    // Calculate numeric statistics
    if (type === 'numeric') {
      const numericValues = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
      if (numericValues.length > 0) {
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        stat.sum = numericValues.reduce((a, b) => a + b, 0);

        // Calculate median
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        stat.median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }
    }

    // Calculate top values for string columns
    if (type === 'string' && uniqueValues.size <= 50) {
      const valueCounts = new Map<string, number>();
      nonNullValues.forEach(v => {
        const key = String(v);
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
      });

      stat.topValues = Array.from(valueCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
    }

    return stat;
  });

  // Create smart representative sample (instead of just first 10 rows)
  const representativeSample = createRepresentativeSample(rows, 10);

  return {
    totalRows: rows.length,
    totalColumns: columns.length,
    columnStats,
    representativeSample,
  };
}

/**
 * Detect column type based on values
 */
function detectColumnType(values: any[]): ColumnStatistics['type'] {
  if (values.length === 0) return 'mixed';

  const types = new Set<string>();

  values.slice(0, 100).forEach(val => {
    if (typeof val === 'number' || !isNaN(Number(val))) {
      types.add('numeric');
    } else if (typeof val === 'boolean') {
      types.add('boolean');
    } else if (isDate(val)) {
      types.add('date');
    } else {
      types.add('string');
    }
  });

  if (types.size === 1) {
    return Array.from(types)[0] as ColumnStatistics['type'];
  }

  return 'mixed';
}

/**
 * Check if value looks like a date
 */
function isDate(value: any): boolean {
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
  ];

  return datePatterns.some(pattern => pattern.test(value));
}

/**
 * Create representative sample from full dataset
 * Instead of first N rows, take samples from beginning, middle, and end
 */
function createRepresentativeSample(rows: any[], sampleSize: number): any[] {
  if (rows.length <= sampleSize) return rows;

  const sample: any[] = [];
  const segmentSize = Math.floor(sampleSize / 3);

  // First few rows
  sample.push(...rows.slice(0, segmentSize));

  // Middle rows
  const middleStart = Math.floor((rows.length - segmentSize) / 2);
  sample.push(...rows.slice(middleStart, middleStart + segmentSize));

  // Last rows
  sample.push(...rows.slice(-segmentSize));

  return sample;
}

/**
 * Format statistics for AI prompt (human-readable summary)
 */
export function formatStatsForAI(stats: DatasetStatistics): string {
  let summary = `Dataset Overview (FULL DATASET - ${stats.totalRows} rows):\n\n`;

  stats.columnStats.forEach(col => {
    summary += `Column: ${col.column}\n`;
    summary += `  Type: ${col.type}\n`;
    summary += `  Non-null values: ${col.count - col.nullCount}/${col.count}\n`;
    summary += `  Unique values: ${col.uniqueCount}\n`;

    if (col.type === 'numeric') {
      summary += `  Range: ${col.min?.toFixed(2)} to ${col.max?.toFixed(2)}\n`;
      summary += `  Average: ${col.mean?.toFixed(2)}\n`;
      summary += `  Median: ${col.median?.toFixed(2)}\n`;
      summary += `  Sum: ${col.sum?.toFixed(2)}\n`;
    }

    if (col.topValues && col.topValues.length > 0) {
      summary += `  Top values: ${col.topValues.map(v => `${v.value} (${v.count})`).join(', ')}\n`;
    }

    summary += `  Sample: ${col.sampleValues.join(', ')}\n`;
    summary += '\n';
  });

  return summary;
}
