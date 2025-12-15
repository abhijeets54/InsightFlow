'use client';

import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { ResponsiveSankey } from '@nivo/sankey';
import { ResponsiveWaffle } from '@nivo/waffle';
import { ResponsiveFunnel } from '@nivo/funnel';
import { ResponsiveStream } from '@nivo/stream';
import { calculateBoxPlot, calculateLinearRegression, getNumericColumns, generateCorrelationMatrix } from '@/lib/statistical-utils';

interface AdvancedChartDisplayProps {
  type: 'bar' | 'line' | 'pie' | 'heatmap' | 'scatter' | 'area' | 'stacked-bar' | 'box-plot' |
        'sankey' | 'waffle' | 'funnel' | 'stream' | 'dual-axis' | 'waterfall';
  data: any[];
  title?: string;
  xKey?: string;
  yKey?: string;
  groupKey?: string;
}

// Beautiful Nivo color schemes
const COLOR_SCHEMES = {
  default: { scheme: 'nivo' },
  categorical: { scheme: 'category10' },
  sequential: { scheme: 'blues' },
  diverging: { scheme: 'red_yellow_blue' }
};

export default function AdvancedChartDisplay({
  type,
  data,
  title,
  xKey,
  yKey,
  groupKey
}: AdvancedChartDisplayProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-600 font-medium">No data available for visualization</p>
          <p className="text-gray-400 text-sm mt-1">Upload data to see beautiful charts</p>
        </div>
      </div>
    );
  }

  // Auto-detect keys if not provided
  const keys = Object.keys(data[0]);
  const numericKeys = getNumericColumns(data);

  console.log('[AdvancedChartDisplay] Debug:', {
    type,
    dataLength: data.length,
    keys,
    numericKeys,
    firstRow: data[0]
  });

  const defaultXKey = xKey || keys[0];
  const defaultYKey = yKey || (numericKeys.length > 0 ? numericKeys[0] : keys[1] || keys[0]);

  console.log('[AdvancedChartDisplay] Selected keys:', { defaultXKey, defaultYKey });

  // Common theme for all charts
  const theme = {
    background: 'transparent',
    text: {
      fontSize: 11,
      fill: '#333333',
      outlineWidth: 0,
      outlineColor: 'transparent'
    },
    axis: {
      domain: {
        line: {
          stroke: '#777777',
          strokeWidth: 1
        }
      },
      legend: {
        text: {
          fontSize: 12,
          fill: '#333333',
          fontWeight: 600
        }
      },
      ticks: {
        line: {
          stroke: '#777777',
          strokeWidth: 1
        },
        text: {
          fontSize: 11,
          fill: '#555555'
        }
      }
    },
    grid: {
      line: {
        stroke: '#dddddd',
        strokeWidth: 1
      }
    },
    legends: {
      text: {
        fontSize: 11,
        fill: '#333333'
      }
    },
    tooltip: {
      container: {
        background: 'white',
        color: '#333333',
        fontSize: 12,
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '12px'
      }
    }
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveBar
            data={data}
            keys={[defaultYKey]}
            indexBy={defaultXKey}
            margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'nivo' }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: defaultXKey,
              legendPosition: 'middle',
              legendOffset: 40
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: defaultYKey,
              legendPosition: 'middle',
              legendOffset: -50
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            legends={[{
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 120,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20,
              effects: [{
                on: 'hover',
                style: { itemOpacity: 1 }
              }]
            }]}
            theme={theme}
            animate={true}
            motionConfig="gentle"
            role="application"
            ariaLabel={title || 'Bar chart'}
          />
        );

      case 'line':
        const lineData = [{
          id: defaultYKey,
          data: data.map(d => ({
            x: d[defaultXKey],
            y: parseFloat(d[defaultYKey]) || 0
          }))
        }];

        return (
          <ResponsiveLine
            data={lineData}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
            curve="monotoneX"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: defaultXKey,
              legendOffset: 40,
              legendPosition: 'middle'
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: defaultYKey,
              legendOffset: -50,
              legendPosition: 'middle'
            }}
            pointSize={8}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            pointLabelYOffset={-12}
            useMesh={true}
            theme={theme}
            colors={{ scheme: 'category10' }}
            lineWidth={3}
            enablePoints={true}
            enableGridX={false}
            enableGridY={true}
            legends={[{
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 0,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
              effects: [{
                on: 'hover',
                style: { itemOpacity: 1 }
              }]
            }]}
            animate={true}
            motionConfig="gentle"
          />
        );

      case 'area':
        const areaData = [{
          id: defaultYKey,
          data: data.map(d => ({
            x: d[defaultXKey],
            y: parseFloat(d[defaultYKey]) || 0
          }))
        }];

        return (
          <ResponsiveLine
            data={areaData}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
            curve="catmullRom"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: defaultXKey,
              legendOffset: 40,
              legendPosition: 'middle'
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: defaultYKey,
              legendOffset: -50,
              legendPosition: 'middle'
            }}
            enableArea={true}
            areaOpacity={0.15}
            pointSize={6}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            useMesh={true}
            theme={theme}
            colors={{ scheme: 'set2' }}
            lineWidth={2}
            animate={true}
            motionConfig="gentle"
          />
        );

      case 'pie':
        const pieData = data.map(d => ({
          id: d[defaultXKey],
          label: d[defaultXKey],
          value: parseFloat(d[defaultYKey]) || 0
        }));

        return (
          <ResponsivePie
            data={pieData}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            theme={theme}
            colors={{ scheme: 'nivo' }}
            animate={true}
            motionConfig="gentle"
            legends={[{
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 56,
              itemsSpacing: 0,
              itemWidth: 100,
              itemHeight: 18,
              itemTextColor: '#999',
              itemDirection: 'left-to-right',
              itemOpacity: 1,
              symbolSize: 18,
              symbolShape: 'circle',
              effects: [{
                on: 'hover',
                style: { itemTextColor: '#000' }
              }]
            }]}
          />
        );

      case 'scatter':
        const scatterData = [{
          id: 'data',
          data: data.map(d => ({
            x: parseFloat(d[defaultXKey]) || 0,
            y: parseFloat(d[defaultYKey]) || 0
          }))
        }];

        // Calculate regression line
        const xValues = data.map(d => parseFloat(d[defaultXKey]) || 0);
        const yValues = data.map(d => parseFloat(d[defaultYKey]) || 0);
        const regression = calculateLinearRegression(xValues, yValues);

        return (
          <div className="relative w-full h-full">
            <ResponsiveScatterPlot
              data={scatterData}
              margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
              xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              blendMode="multiply"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: defaultXKey,
                legendPosition: 'middle',
                legendOffset: 46
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: defaultYKey,
                legendPosition: 'middle',
                legendOffset: -60
              }}
              theme={theme}
              colors={{ scheme: 'category10' }}
              nodeSize={10}
              animate={true}
              motionConfig="gentle"
            />
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-gray-200">
              <p className="text-xs font-semibold text-gray-700">Regression Analysis</p>
              <p className="text-xs text-gray-600 font-mono">{regression.equation}</p>
              <p className="text-xs text-gray-600">R² = {regression.r2.toFixed(3)}</p>
              <p className="text-xs text-gray-500">
                {regression.r2 > 0.7 ? '🟢 Strong' : regression.r2 > 0.4 ? '🟡 Moderate' : '🔴 Weak'} correlation
              </p>
            </div>
          </div>
        );

      case 'stacked-bar':
        // Get all numeric keys for stacking
        const stackKeys = numericKeys.slice(0, 5); // Limit to 5 for readability

        // Clean data - ensure all numeric values are valid numbers
        const cleanedStackData = data.map(row => {
          const cleanedRow: any = { [defaultXKey]: row[defaultXKey] };
          stackKeys.forEach(key => {
            const value = parseFloat(row[key]);
            cleanedRow[key] = isNaN(value) ? 0 : value;
          });
          return cleanedRow;
        });

        return (
          <ResponsiveBar
            data={cleanedStackData}
            keys={stackKeys}
            indexBy={defaultXKey}
            margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'nivo' }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: defaultXKey,
              legendPosition: 'middle',
              legendOffset: 40
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Value',
              legendPosition: 'middle',
              legendOffset: -50
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            legends={[{
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 120,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20
            }]}
            theme={theme}
            animate={true}
            motionConfig="gentle"
            groupMode="stacked"
          />
        );

      case 'box-plot':
        // Calculate box plot statistics
        const boxPlotData = numericKeys.slice(0, 6).map(key => {
          const values = data.map(d => parseFloat(d[key])).filter(v => !isNaN(v));
          const stats = calculateBoxPlot(values);

          return {
            group: key,
            ...stats
          };
        });

        return (
          <div className="w-full h-full overflow-hidden" style={{ maxHeight: '500px' }}>
            <div className="flex items-end justify-around px-4 pb-16" style={{ height: '400px' }}>
              {boxPlotData.map((stats, index) => (
                <div key={index} className="flex flex-col items-center" style={{ width: `${90 / boxPlotData.length}%` }}>
                  <div className="relative h-80 w-full flex justify-center">
                    {/* Outliers */}
                    {stats.outliers.map((outlier, i) => {
                      const range = stats.max - stats.min;
                      const position = ((outlier - stats.min) / range) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-red-500 rounded-full"
                          style={{ bottom: `${position}%`, left: '50%', transform: 'translateX(-50%)' }}
                          title={`Outlier: ${outlier.toFixed(2)}`}
                        />
                      );
                    })}

                    {/* Whiskers */}
                    <div className="absolute w-0.5 bg-gray-400" style={{
                      bottom: `${((stats.min - stats.min) / (stats.max - stats.min)) * 100}%`,
                      height: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }} />
                    <div className="absolute w-0.5 bg-gray-400" style={{
                      bottom: `${((stats.q3 - stats.min) / (stats.max - stats.min)) * 100}%`,
                      height: `${((stats.max - stats.q3) / (stats.max - stats.min)) * 100}%`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }} />

                    {/* Box */}
                    <div
                      className="absolute w-full border-2 border-blue-500 bg-blue-100 bg-opacity-50 rounded"
                      style={{
                        bottom: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`,
                        height: `${((stats.q3 - stats.q1) / (stats.max - stats.min)) * 100}%`
                      }}
                    >
                      {/* Median line */}
                      <div
                        className="absolute w-full h-0.5 bg-red-600"
                        style={{
                          bottom: `${((stats.median - stats.q1) / (stats.q3 - stats.q1)) * 100}%`
                        }}
                      />
                      {/* Mean marker */}
                      <div
                        className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                        style={{
                          bottom: `${((stats.mean - stats.q1) / (stats.q3 - stats.q1)) * 100}%`,
                          left: '50%',
                          transform: 'translate(-50%, 50%)'
                        }}
                      />
                    </div>

                    {/* Min/Max markers */}
                    <div className="absolute w-8 h-0.5 bg-gray-600" style={{ bottom: '0%', left: '50%', transform: 'translateX(-50%)' }} />
                    <div className="absolute w-8 h-0.5 bg-gray-600" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)' }} />
                  </div>

                  <p className="text-xs font-semibold text-gray-700 mt-2 truncate w-full text-center">{stats.group}</p>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    <p>Min: {stats.min.toFixed(1)}</p>
                    <p>Max: {stats.max.toFixed(1)}</p>
                    <p>Med: {stats.median.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded" />
                <span>IQR (Q1-Q3)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-600" />
                <span>Median</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                <span>Mean</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Outliers</span>
              </div>
            </div>
          </div>
        );

      case 'heatmap':
        // Generate correlation matrix for numeric columns
        const heatmapNumericKeys = numericKeys.slice(0, 8); // Limit to 8 for readability

        if (heatmapNumericKeys.length < 2) {
          return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-600 font-medium">Not enough numeric columns</p>
                <p className="text-gray-400 text-sm mt-1">Need at least 2 numeric columns for correlation heatmap</p>
              </div>
            </div>
          );
        }

        const correlationMatrix = generateCorrelationMatrix(data, heatmapNumericKeys);

        // Transform matrix data for Nivo heatmap format
        const heatmapData = correlationMatrix.columns.map((col, i) => ({
          id: col,
          data: correlationMatrix.columns.map((col2, j) => ({
            x: col2,
            y: correlationMatrix.matrix[i][j]
          }))
        }));

        return (
          <div className="relative w-full h-full">
            <ResponsiveHeatMap
              data={heatmapData}
              margin={{ top: 90, right: 60, bottom: 60, left: 90 }}
              valueFormat=">-.2f"
              axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: '',
                legendOffset: 46
              }}
              axisRight={null}
              axisBottom={null}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -72
              }}
              colors={{
                type: 'diverging',
                scheme: 'red_yellow_blue',
                divergeAt: 0.5,
                minValue: -1,
                maxValue: 1
              }}
              emptyColor="#555555"
              borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              theme={theme}
              animate={true}
              motionConfig="gentle"
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
            />
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-1">Correlation Matrix</p>
              <p className="text-xs text-gray-600">
                <span className="text-red-600 font-semibold">-1.0</span> = Perfect negative
              </p>
              <p className="text-xs text-gray-600">
                <span className="text-yellow-600 font-semibold">0.0</span> = No correlation
              </p>
              <p className="text-xs text-gray-600">
                <span className="text-blue-600 font-semibold">+1.0</span> = Perfect positive
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart type "{type}" not yet implemented</p>
          </div>
        );
    }
  };

  try {
    return (
      <div className="w-full h-full overflow-hidden p-4" style={{ maxHeight: '500px' }}>
        {renderChart()}
      </div>
    );
  } catch (error) {
    console.error('[AdvancedChartDisplay] Rendering error:', error);
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-xl border-2 border-red-200">
        <div className="text-center p-6">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-semibold">Chart Rendering Error</p>
          <p className="text-red-600 text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <p className="text-red-500 text-xs mt-2">Check console for details</p>
        </div>
      </div>
    );
  }
}
