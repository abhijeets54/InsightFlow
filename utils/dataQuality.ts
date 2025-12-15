/**
 * FREE Data Quality Analysis
 * No external APIs required - pure JavaScript logic
 */

export interface DataQualityReport {
  missingValues: { column: string; count: number; percentage: number }[];
  duplicates: number;
  outliers: { column: string; values: number[]; count: number }[];
  dataTypes: { column: string; detectedType: string; issues?: string }[];
  recommendations: string[];
  overallScore: number; // 0-100
}

export function analyzeDataQuality(rows: any[], columns: string[]): DataQualityReport {
  const report: DataQualityReport = {
    missingValues: [],
    duplicates: 0,
    outliers: [],
    dataTypes: [],
    recommendations: [],
    overallScore: 100,
  };

  if (!rows || rows.length === 0) {
    report.recommendations.push('Dataset is empty - please upload data with values');
    report.overallScore = 0;
    return report;
  }

  // 1. Analyze missing values (FREE)
  columns.forEach(column => {
    const missingCount = rows.filter(row =>
      row[column] === null ||
      row[column] === undefined ||
      row[column] === '' ||
      (typeof row[column] === 'string' && row[column].toLowerCase() === 'null')
    ).length;

    if (missingCount > 0) {
      const percentage = (missingCount / rows.length) * 100;
      report.missingValues.push({
        column,
        count: missingCount,
        percentage: parseFloat(percentage.toFixed(2)),
      });

      if (percentage > 20) {
        report.recommendations.push(
          `Column "${column}" has ${percentage.toFixed(1)}% missing values - consider filling or removing`
        );
        report.overallScore -= Math.min(10, percentage / 2);
      }
    }
  });

  // 2. Detect duplicates (FREE)
  const uniqueRows = new Set(rows.map(row => JSON.stringify(row)));
  report.duplicates = rows.length - uniqueRows.size;

  if (report.duplicates > 0) {
    const dupPercentage = (report.duplicates / rows.length) * 100;
    report.recommendations.push(
      `Found ${report.duplicates} duplicate rows (${dupPercentage.toFixed(1)}%) - consider removing`
    );
    report.overallScore -= Math.min(15, dupPercentage);
  }

  // 3. Detect outliers for numeric columns (FREE - using IQR method)
  columns.forEach(column => {
    const numericValues = rows
      .map(row => row[column])
      .filter(val => typeof val === 'number' || !isNaN(Number(val)))
      .map(val => Number(val));

    if (numericValues.length > 10) {
      const outlierValues = detectOutliers(numericValues);
      if (outlierValues.length > 0) {
        report.outliers.push({
          column,
          values: outlierValues.slice(0, 5), // Show first 5
          count: outlierValues.length,
        });

        if (outlierValues.length > numericValues.length * 0.05) {
          report.recommendations.push(
            `Column "${column}" has ${outlierValues.length} outliers - review for data quality`
          );
        }
      }
    }
  });

  // 4. Analyze data types and consistency (FREE)
  columns.forEach(column => {
    const types = new Set<string>();
    const values = rows.map(row => row[column]).filter(val => val != null && val !== '');

    values.forEach(val => {
      if (typeof val === 'number' || !isNaN(Number(val))) {
        types.add('number');
      } else if (typeof val === 'boolean') {
        types.add('boolean');
      } else if (isDate(val)) {
        types.add('date');
      } else {
        types.add('string');
      }
    });

    const detectedType = types.size === 1 ? Array.from(types)[0] : 'mixed';
    const typeInfo: any = { column, detectedType };

    if (types.size > 1) {
      typeInfo.issues = `Mixed types found: ${Array.from(types).join(', ')}`;
      report.recommendations.push(
        `Column "${column}" has mixed data types - consider data cleaning`
      );
      report.overallScore -= 5;
    }

    report.dataTypes.push(typeInfo);
  });

  // 5. Add positive recommendations
  if (report.recommendations.length === 0) {
    report.recommendations.push('✓ Data quality is excellent - no issues detected!');
  }

  if (report.duplicates === 0) {
    report.recommendations.push('✓ No duplicate rows found');
  }

  if (report.missingValues.length === 0) {
    report.recommendations.push('✓ No missing values detected');
  }

  // Ensure score is between 0-100
  report.overallScore = Math.max(0, Math.min(100, report.overallScore));

  return report;
}

/**
 * Detect outliers using IQR method (FREE - no API calls)
 */
function detectOutliers(values: number[]): number[] {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.filter(val => val < lowerBound || val > upperBound);
}

/**
 * Check if value is a date (FREE)
 */
function isDate(value: any): boolean {
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,  // DD-MM-YYYY
  ];

  return datePatterns.some(pattern => pattern.test(value));
}

/**
 * Generate anomaly alerts from quality report (FREE)
 */
export interface AnomalyAlert {
  type: 'spike' | 'drop' | 'outlier' | 'trend_change' | 'missing_data';
  column: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedRows?: number[];
}

export function generateAnomalyAlerts(
  qualityReport: DataQualityReport,
  rows: any[]
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];

  // High percentage of missing values
  qualityReport.missingValues.forEach(mv => {
    if (mv.percentage > 30) {
      alerts.push({
        type: 'missing_data',
        column: mv.column,
        description: `${mv.percentage.toFixed(1)}% of values are missing in "${mv.column}"`,
        severity: 'high',
      });
    } else if (mv.percentage > 10) {
      alerts.push({
        type: 'missing_data',
        column: mv.column,
        description: `${mv.percentage.toFixed(1)}% of values are missing in "${mv.column}"`,
        severity: 'medium',
      });
    }
  });

  // Outliers
  qualityReport.outliers.forEach(outlier => {
    if (outlier.count > rows.length * 0.1) {
      alerts.push({
        type: 'outlier',
        column: outlier.column,
        description: `${outlier.count} outlier values detected in "${outlier.column}"`,
        severity: 'high',
      });
    } else if (outlier.count > 5) {
      alerts.push({
        type: 'outlier',
        column: outlier.column,
        description: `${outlier.count} outlier values in "${outlier.column}": ${outlier.values.slice(0, 3).join(', ')}...`,
        severity: 'medium',
      });
    }
  });

  return alerts;
}
