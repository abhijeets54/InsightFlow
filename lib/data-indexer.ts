/**
 * Data Indexing System
 * Pre-computes statistics, creates search indexes, caches common queries
 * Enables instant responses for large datasets
 */

interface DataIndex {
  datasetId: string;
  metadata: any;
  columnIndex: Record<string, {
    values: any[];
    frequencies: Record<string, number>;
    sortedValues: any[];
  }>;
  precomputedAggregations: Record<string, any>;
  createdAt: number;
}

// In-memory cache (in production, use Redis or similar)
const indexCache = new Map<string, DataIndex>();

/**
 * Create comprehensive index for a dataset
 */
export async function indexDataset(datasetId: string, data: any[]): Promise<DataIndex> {
  const startTime = Date.now();

  console.log(`[Indexer] Starting indexing for dataset ${datasetId} with ${data.length} rows...`);

  const columns = Object.keys(data[0] || {});
  const columnIndex: Record<string, any> = {};
  const precomputedAggregations: Record<string, any> = {};

  // Index each column
  for (const col of columns) {
    const values = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const uniqueValues = [...new Set(values)];

    // Frequency map
    const frequencies: Record<string, number> = {};
    values.forEach((v) => {
      const key = String(v);
      frequencies[key] = (frequencies[key] || 0) + 1;
    });

    // Sorted values for range queries
    const sortedValues = [...uniqueValues].sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });

    columnIndex[col] = {
      values: uniqueValues,
      frequencies,
      sortedValues,
    };

    // Precompute aggregations for numeric columns
    const numericValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    if (numericValues.length > 0) {
      precomputedAggregations[`${col}_sum`] = numericValues.reduce((a, b) => a + b, 0);
      precomputedAggregations[`${col}_avg`] = precomputedAggregations[`${col}_sum`] / numericValues.length;
      precomputedAggregations[`${col}_min`] = Math.min(...numericValues);
      precomputedAggregations[`${col}_max`] = Math.max(...numericValues);
      precomputedAggregations[`${col}_count`] = numericValues.length;
    }
  }

  // Precompute common queries
  precomputedAggregations.totalRows = data.length;
  precomputedAggregations.totalColumns = columns.length;

  const index: DataIndex = {
    datasetId,
    metadata: {
      columns,
      rowCount: data.length,
      columnCount: columns.length,
    },
    columnIndex,
    precomputedAggregations,
    createdAt: Date.now(),
  };

  // Cache the index
  indexCache.set(datasetId, index);

  const duration = Date.now() - startTime;
  console.log(`[Indexer] ✓ Indexed ${datasetId} in ${duration}ms`);

  return index;
}

/**
 * Get cached index or create new one
 */
export async function getOrCreateIndex(datasetId: string, data: any[]): Promise<DataIndex> {
  const cached = indexCache.get(datasetId);

  // Check if cache is fresh (less than 1 hour old)
  if (cached && Date.now() - cached.createdAt < 3600000) {
    console.log(`[Indexer] Using cached index for ${datasetId}`);
    return cached;
  }

  // Create new index
  return await indexDataset(datasetId, data);
}

/**
 * Fast lookup for precomputed values
 */
export function getPrecomputedValue(datasetId: string, key: string): any | null {
  const index = indexCache.get(datasetId);
  if (!index) return null;

  return index.precomputedAggregations[key] || null;
}

/**
 * Fast filter using index
 */
export function fastFilter(
  datasetId: string,
  data: any[],
  column: string,
  operator: 'equals' | 'contains' | 'gt' | 'lt',
  value: any
): any[] {
  const index = indexCache.get(datasetId);

  if (!index || !index.columnIndex[column]) {
    // Fallback to normal filter
    return data.filter((row) => {
      const rowValue = row[column];
      switch (operator) {
        case 'equals':
          return String(rowValue).toLowerCase() === String(value).toLowerCase();
        case 'contains':
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        case 'gt':
          return parseFloat(rowValue) > parseFloat(value);
        case 'lt':
          return parseFloat(rowValue) < parseFloat(value);
        default:
          return false;
      }
    });
  }

  // Use index for faster filtering
  const colIndex = index.columnIndex[column];

  if (operator === 'equals') {
    const freq = colIndex.frequencies[String(value)];
    if (!freq) return [];

    // Filter efficiently
    return data.filter((row) => String(row[column]).toLowerCase() === String(value).toLowerCase());
  }

  // For other operators, fallback to normal filter
  return data.filter((row) => {
    const rowValue = row[column];
    switch (operator) {
      case 'contains':
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      case 'gt':
        return parseFloat(rowValue) > parseFloat(value);
      case 'lt':
        return parseFloat(rowValue) < parseFloat(value);
      default:
        return false;
    }
  });
}

/**
 * Get column statistics from index
 */
export function getColumnStats(datasetId: string, column: string): any | null {
  const index = indexCache.get(datasetId);
  if (!index) return null;

  const aggs = index.precomputedAggregations;

  return {
    sum: aggs[`${column}_sum`],
    avg: aggs[`${column}_avg`],
    min: aggs[`${column}_min`],
    max: aggs[`${column}_max`],
    count: aggs[`${column}_count`],
    uniqueValues: index.columnIndex[column]?.values.length,
  };
}

/**
 * Clear cache for a dataset
 */
export function clearIndex(datasetId: string): void {
  indexCache.delete(datasetId);
  console.log(`[Indexer] Cleared index for ${datasetId}`);
}

/**
 * Clear all cached indexes
 */
export function clearAllIndexes(): void {
  indexCache.clear();
  console.log(`[Indexer] Cleared all indexes`);
}

/**
 * Get cache statistics
 */
export function getIndexStats(): {
  totalIndexes: number;
  totalMemory: string;
  indexes: Array<{ datasetId: string; age: number; columns: number; rows: number }>;
} {
  const indexes: Array<any> = [];

  indexCache.forEach((index, datasetId) => {
    indexes.push({
      datasetId,
      age: Math.floor((Date.now() - index.createdAt) / 1000),
      columns: index.metadata.columnCount,
      rows: index.metadata.rowCount,
    });
  });

  // Estimate memory usage (rough approximation)
  const memoryMB = (JSON.stringify([...indexCache.values()]).length / 1024 / 1024).toFixed(2);

  return {
    totalIndexes: indexCache.size,
    totalMemory: `${memoryMB} MB`,
    indexes,
  };
}
