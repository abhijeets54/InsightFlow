/**
 * Simple SQL-like query executor for JavaScript arrays
 * Lightweight alternative to alasql without React Native dependencies
 */

interface QueryParts {
  select: string[];
  from: string;
  where?: string;
  groupBy?: string[];
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
}

/**
 * Parse simple SQL queries
 */
function parseSQL(sql: string): QueryParts | null {
  // Normalize SQL: remove extra whitespace and newlines
  const normalizedSQL = sql
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/\n/g, ' ')   // Replace newlines with space
    .trim();

  const sqlUpper = normalizedSQL.toUpperCase();

  // Extract SELECT columns
  const selectMatch = normalizedSQL.match(/SELECT\s+(.+?)\s+FROM/i);
  if (!selectMatch) return null;

  const selectPart = selectMatch[1].trim();
  const select = selectPart === '*' ? ['*'] : selectPart.split(',').map(s => s.trim());

  // Extract FROM table (we'll ignore this as we pass data directly)
  const from = 'data';

  // Extract WHERE clause
  const whereMatch = normalizedSQL.match(/WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
  const where = whereMatch ? whereMatch[1].trim() : undefined;

  // Extract GROUP BY
  const groupByMatch = normalizedSQL.match(/GROUP BY\s+(.+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
  const groupBy = groupByMatch ? groupByMatch[1].split(',').map(s => s.trim()) : undefined;

  // Extract ORDER BY
  const orderByMatch = normalizedSQL.match(/ORDER BY\s+(.+?)(?:\s+LIMIT|$)/i);
  let orderBy: QueryParts['orderBy'];
  if (orderByMatch) {
    orderBy = orderByMatch[1].split(',').map(part => {
      const [column, direction] = part.trim().split(/\s+/);
      return {
        column: column.trim(),
        direction: (direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC'
      };
    });
  }

  // Extract LIMIT
  const limitMatch = normalizedSQL.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1]) : undefined;

  return { select, from, where, groupBy, orderBy, limit };
}

/**
 * Evaluate WHERE condition
 */
function evaluateWhere(row: any, whereClause: string): boolean {
  try {
    // Handle common SQL operators
    let condition = whereClause
      // Handle quoted strings
      .replace(/'([^']+)'/g, (_, str) => JSON.stringify(str))
      // Handle IS NULL / IS NOT NULL first (before column replacement)
      .replace(/IS\s+NOT\s+NULL/gi, '!= null')
      .replace(/IS\s+NULL/gi, '== null')
      // Handle column references
      .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
        // Don't replace SQL keywords
        const keywords = ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE'];
        if (keywords.includes(match.toUpperCase())) return match;
        return `row["${match}"]`;
      })
      // Handle LIKE operator
      .replace(/\s+LIKE\s+/gi, '.includes(')
      .replace(/row\["([^"]+)"\]\.includes\(([^)]+)\)/g, 'String(row["$1"]).toLowerCase().includes(String($2).toLowerCase())')
      // Convert SQL operators to JavaScript
      .replace(/\bAND\b/gi, '&&')
      .replace(/\bOR\b/gi, '||')
      .replace(/\bNOT\b/gi, '!');

    // Evaluate condition
    const fn = new Function('row', `return ${condition}`);
    return fn(row);
  } catch (error) {
    console.error('Error evaluating WHERE clause:', error);
    return true; // Default to including row if evaluation fails
  }
}

/**
 * Apply aggregation functions
 */
function applyAggregation(column: string, values: any[]): any {
  const match = column.match(/^(COUNT|SUM|AVG|MIN|MAX|LOWER|UPPER)\((.+?)\)(?:\s+AS\s+(.+))?$/i);

  if (!match) return null;

  const [, func, expr, alias] = match;
  const funcUpper = func.toUpperCase();
  const columnName = expr.trim().replace(/['"]/g, '');

  let result: any;

  if (funcUpper === 'COUNT') {
    if (columnName === '*') {
      result = values.length;
    } else {
      result = values.filter(v => v[columnName] !== null && v[columnName] !== undefined).length;
    }
  } else if (funcUpper === 'SUM') {
    const numbers = values.map(v => parseFloat(v[columnName])).filter(n => !isNaN(n));
    result = numbers.reduce((sum, n) => sum + n, 0);
  } else if (funcUpper === 'AVG') {
    const numbers = values.map(v => parseFloat(v[columnName])).filter(n => !isNaN(n));
    result = numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  } else if (funcUpper === 'MIN') {
    const numbers = values.map(v => parseFloat(v[columnName])).filter(n => !isNaN(n));
    result = numbers.length > 0 ? Math.min(...numbers) : null;
  } else if (funcUpper === 'MAX') {
    const numbers = values.map(v => parseFloat(v[columnName])).filter(n => !isNaN(n));
    result = numbers.length > 0 ? Math.max(...numbers) : null;
  }

  return { value: result, alias: alias || column };
}

/**
 * Execute SQL query on data array
 */
export function executeSQL(sql: string, data: any[]): any[] {
  try {
    // Parse SQL
    const parsed = parseSQL(sql);
    if (!parsed) {
      console.error('Failed to parse SQL:', sql);
      return [];
    }

    let results = [...data];

    // Apply WHERE filter
    if (parsed.where) {
      results = results.filter(row => evaluateWhere(row, parsed.where!));
    }

    // Apply GROUP BY
    if (parsed.groupBy && parsed.groupBy.length > 0) {
      const grouped: { [key: string]: any[] } = {};

      results.forEach(row => {
        const key = parsed.groupBy!.map(col => row[col]).join('|');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });

      results = Object.entries(grouped).map(([key, rows]) => {
        const result: any = {};

        // Add GROUP BY columns
        parsed.groupBy!.forEach((col, i) => {
          result[col] = key.split('|')[i];
        });

        // Apply aggregations
        parsed.select.forEach(col => {
          const agg = applyAggregation(col, rows);
          if (agg) {
            result[agg.alias] = agg.value;
          }
        });

        return result;
      });
    }

    // Apply SELECT (if not grouped)
    if (!parsed.groupBy && parsed.select[0] !== '*') {
      results = results.map(row => {
        const newRow: any = {};
        parsed.select.forEach(col => {
          // Handle aggregations
          const agg = applyAggregation(col, [row]);
          if (agg) {
            newRow[agg.alias] = agg.value;
          } else {
            // Handle alias (col AS alias)
            const aliasMatch = col.match(/^(.+?)\s+AS\s+(.+)$/i);
            if (aliasMatch) {
              const [, expr, alias] = aliasMatch;
              newRow[alias.trim()] = row[expr.trim()];
            } else {
              newRow[col] = row[col];
            }
          }
        });
        return newRow;
      });
    }

    // Apply ORDER BY
    if (parsed.orderBy && parsed.orderBy.length > 0) {
      results.sort((a, b) => {
        for (const { column, direction } of parsed.orderBy!) {
          const aVal = a[column];
          const bVal = b[column];

          let comparison = 0;
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;

          if (comparison !== 0) {
            return direction === 'DESC' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Apply LIMIT
    if (parsed.limit) {
      results = results.slice(0, parsed.limit);
    }

    return results;
  } catch (error) {
    console.error('SQL execution error:', error);

    // Fallback: return first 100 rows
    if (sql.toUpperCase().includes('SELECT *')) {
      return data.slice(0, 100);
    }

    return [];
  }
}
