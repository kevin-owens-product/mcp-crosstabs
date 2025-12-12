import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { VisualizationData, BarChartDataPoint } from '../../lib/types';

interface IndexBarChartProps {
  visualization: VisualizationData;
}

// GWI color scheme
const COLORS = {
  blue: '#0066CC',
  green: '#22c55e',
  red: '#ef4444',
  gray: '#9ca3af',
};

// Get color based on value relative to reference (100 = baseline)
function getBarColor(value: number, referenceValue: number = 100): string {
  if (value >= referenceValue + 20) return COLORS.blue;  // Strong over-index
  if (value >= referenceValue) return '#60a5fa';         // Slight over-index
  if (value >= referenceValue - 20) return COLORS.gray;  // Near baseline
  return COLORS.red;                                      // Under-index
}

// Custom tooltip component
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: BarChartDataPoint }>;
  referenceValue?: number;
}> = ({ active, payload, referenceValue = 100 }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const diff = data.value - referenceValue;
  const diffLabel = diff >= 0 ? `+${diff}` : `${diff}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-gray-900 text-sm mb-1">{data.label}</p>
      <div className="space-y-1 text-xs">
        <p className="text-gray-700">
          <span className="font-medium">Index:</span> {data.value}{' '}
          <span className={diff >= 0 ? 'text-blue-600' : 'text-red-600'}>
            ({diffLabel} vs avg)
          </span>
        </p>
        {data.percentage !== undefined && (
          <p className="text-gray-600">
            <span className="font-medium">Reach:</span> {data.percentage}% of audience
          </p>
        )}
        {data.sample !== undefined && (
          <p className="text-gray-500">
            <span className="font-medium">Sample:</span> {data.sample.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export const IndexBarChart: React.FC<IndexBarChartProps> = ({ visualization }) => {
  const { title, subtitle, data, config } = visualization;
  const referenceValue = config?.referenceValue ?? 100;
  const maxItems = config?.maxItems ?? 10;

  // Limit data to maxItems
  const chartData = data.slice(0, maxItems);

  // Calculate dynamic height based on number of items
  const chartHeight = Math.max(300, chartData.length * 40 + 80);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: string) =>
              value.length > 25 ? `${value.substring(0, 22)}...` : value
            }
          />
          <Tooltip content={<CustomTooltip referenceValue={referenceValue} />} />
          <ReferenceLine
            x={referenceValue}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: 'Avg (100)',
              position: 'top',
              fontSize: 10,
              fill: '#6b7280',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.value, referenceValue)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.blue }} />
          <span>Strong over-index (120+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#60a5fa' }} />
          <span>Slight over-index</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.gray }} />
          <span>Near average</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.red }} />
          <span>Under-index</span>
        </div>
      </div>

      {data.length > maxItems && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Showing top {maxItems} of {data.length} items
        </p>
      )}
    </div>
  );
};

export default IndexBarChart;
