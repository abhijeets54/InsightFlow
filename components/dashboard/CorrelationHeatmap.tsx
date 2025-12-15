'use client';

import { ResponsiveHeatMap } from '@nivo/heatmap';
import { generateCorrelationMatrix } from '@/lib/statistical-utils';
import { useState, useEffect } from 'react';

interface CorrelationHeatmapProps {
  data: any[];
  columns?: string[];
}

export default function CorrelationHeatmap({ data, columns }: CorrelationHeatmapProps) {
  const [correlationData, setCorrelationData] = useState<any>(null);

  useEffect(() => {
    if (data.length === 0) return;

    // Get numeric columns
    const firstRow = data[0];
    const numericCols = columns || Object.keys(firstRow).filter(key => {
      const values = data.map(row => row[key]);
      const numericValues = values.filter(val => !isNaN(parseFloat(val)) && val !== null && val !== '');
      return numericValues.length / values.length > 0.8;
    });

    if (numericCols.length < 2) {
      setCorrelationData(null);
      return;
    }

    // Limit to first 10 columns for readability
    const limitedCols = numericCols.slice(0, 10);

    // Generate correlation matrix
    const matrix = generateCorrelationMatrix(data, limitedCols);

    // Transform for Nivo heatmap format
    const heatmapData = limitedCols.map((row, i) => {
      const rowData: any = { id: row };
      limitedCols.forEach((col, j) => {
        rowData[col] = matrix.matrix[i][j];
      });
      return rowData;
    });

    setCorrelationData({
      heatmapData,
      significantPairs: matrix.significantPairs,
      columns: limitedCols
    });
  }, [data, columns]);

  if (!correlationData) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <p className="text-gray-600">Not enough numeric columns for correlation analysis</p>
          <p className="text-gray-400 text-sm mt-1">Need at least 2 numeric columns</p>
        </div>
      </div>
    );
  }

  const theme = {
    background: 'transparent',
    text: {
      fontSize: 11,
      fill: '#333333'
    },
    axis: {
      legend: {
        text: {
          fontSize: 12,
          fill: '#333333',
          fontWeight: 600
        }
      },
      ticks: {
        text: {
          fontSize: 10,
          fill: '#555555'
        }
      }
    },
    tooltip: {
      container: {
        background: 'white',
        color: '#333333',
        fontSize: 12,
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '12px'
      }
    }
  };

  const getStrengthEmoji = (strength: string) => {
    switch (strength) {
      case 'strong': return '🟢';
      case 'moderate': return '🟡';
      case 'weak': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="h-96">
        <ResponsiveHeatMap
          data={correlationData.heatmapData}
          keys={correlationData.columns}
          indexBy="id"
          margin={{ top: 100, right: 60, bottom: 60, left: 100 }}
          forceSquare={true}
          axisTop={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendOffset: 36
          }}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          colors={{
            type: 'diverging',
            scheme: 'red_yellow_blue',
            divergeAt: 0.5,
            minValue: -1,
            maxValue: 1
          }}
          emptyColor="#555555"
          legends={[{
            anchor: 'bottom',
            translateX: 0,
            translateY: 30,
            length: 400,
            thickness: 8,
            direction: 'row',
            tickPosition: 'after',
            tickSize: 3,
            tickSpacing: 4,
            tickOverlap: false,
            title: 'Correlation →',
            titleAlign: 'start',
            titleOffset: 4
          }]}
          theme={theme}
          animate={true}
          motionConfig="gentle"
          hoverTarget="cell"
          cellOpacity={1}
          cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
          tooltip={({ cell }) => (
            <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
              <div className="font-semibold text-gray-800 mb-1">
                {cell.serieId} ↔ {cell.data.x}
              </div>
              <div className="text-sm text-gray-600">
                Correlation: <span className="font-mono font-bold">{Number(cell.value).toFixed(3)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.abs(Number(cell.value)) > 0.7 ? '🟢 Strong' :
                 Math.abs(Number(cell.value)) > 0.5 ? '🟡 Moderate' :
                 Math.abs(Number(cell.value)) > 0.3 ? '🔵 Weak' : '⚪ Very Weak'}
                {' '}
                {Number(cell.value) > 0 ? 'positive' : 'negative'}
              </div>
            </div>
          )}
        />
      </div>

      {/* Significant Correlations */}
      {correlationData.significantPairs.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Significant Correlations Found
          </h3>

          <div className="space-y-3">
            {correlationData.significantPairs.slice(0, 8).map((pair: any, index: number) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{pair.col1}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span className="font-semibold text-gray-800">{pair.col2}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getStrengthEmoji(pair.strength)} <span className="font-medium capitalize">{pair.strength}</span>{' '}
                      {pair.direction} correlation
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-blue-600">
                      {pair.correlation.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.abs(pair.correlation) > 0.9 ? 'Almost perfect' :
                       Math.abs(pair.correlation) > 0.7 ? 'Very strong' :
                       Math.abs(pair.correlation) > 0.5 ? 'Moderate' : 'Noticeable'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {correlationData.significantPairs.length > 8 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              + {correlationData.significantPairs.length - 8} more correlations
            </p>
          )}
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 How to Read This</h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-medium text-gray-700 mb-1">Correlation Values:</p>
            <ul className="space-y-1">
              <li>• +1.0: Perfect positive relationship</li>
              <li>• 0.0: No relationship</li>
              <li>• -1.0: Perfect negative relationship</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Strength Guide:</p>
            <ul className="space-y-1">
              <li>🟢 Strong: |r| &gt; 0.7</li>
              <li>🟡 Moderate: 0.5 &lt; |r| &lt; 0.7</li>
              <li>🔵 Weak: 0.3 &lt; |r| &lt; 0.5</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
