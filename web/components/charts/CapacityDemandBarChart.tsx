'use client';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend,
  ReferenceLine
} from "recharts";
import HintTooltip from "../HintTooltip";

const COLORS = {
  capacity: "#87B1DE",  // Blue for capacity
  demand: "#EC694C",    // Orange/red for demand
  average: "#53A58E",   // Green for averages
  highlight: "#E7C452"  // Yellow for highlights
};

interface CapacityDemandBarChartProps {
  composedData: {
    dept: string;
    capacity: number;
    demand: number;
  }[];
}

export default function CapacityDemandBarChart({ composedData }: CapacityDemandBarChartProps) {
  // Calculate statistics
  const totalCapacity = composedData.reduce((sum, item) => sum + item.capacity, 0);
  const totalDemand = composedData.reduce((sum, item) => sum + item.demand, 0);
  const avgCapacity = totalCapacity / (composedData.length || 1);
  const avgDemand = totalDemand / (composedData.length || 1);
  const avgLoadPct = totalCapacity > 0 ? (totalDemand / totalCapacity) * 100 : 0;
  const balanceHours = totalCapacity - totalDemand;
  
  // Calculate load percentage for each department and add to data
  const chartData = composedData.map(item => ({
    ...item,
    loadPct: item.capacity > 0 ? (item.demand / item.capacity) * 100 : 0,
    status: item.capacity > 0 
      ? item.demand / item.capacity > 1.1 ? 'overload' 
        : item.demand / item.capacity < 0.7 ? 'underload' 
        : 'optimal'
      : 'no-capacity'
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-sm" style={{ color: COLORS.capacity }}>
            Capacity: <strong>{data.capacity.toFixed(1)} ч</strong>
          </p>
          <p className="text-sm" style={{ color: COLORS.demand }}>
            Demand: <strong>{data.demand.toFixed(1)} ч</strong>
          </p>
          <p className="text-sm text-gray-600">
            Загрузка: <strong>{data.loadPct.toFixed(1)}%</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.status === 'overload' ? '⚡ Перегруз' : 
             data.status === 'underload' ? '💤 Недогруз' : 
             data.status === 'optimal' ? '✅ Оптимально' : '❌ Нет capacity'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape with rounded corners
  const CustomBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={4} // Rounded corners
        ry={4}
      />
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="font-semibold">Capacity vs Demand по отделам</div>
        <HintTooltip hintKey="capacityDemand" />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="dept" 
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Часы', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => (
                <span style={{ fontSize: '12px', color: '#333' }}>
                  {value === 'capacity' ? 'Capacity (доступно)' : 'Demand (факт)'}
                </span>
              )}
            />
            
            {/* Reference line for 100% load */}
            <ReferenceLine 
              y={avgCapacity} 
              stroke={COLORS.average}
              strokeDasharray="3 3"
              label={{ 
                value: `Ср. capacity: ${avgCapacity.toFixed(0)}ч`, 
                position: 'right',
                fill: COLORS.average,
                fontSize: 12
              }}
            />
            
            <Bar 
              dataKey="capacity" 
              name="capacity"
              fill={COLORS.capacity}
              shape={<CustomBar />}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="demand" 
              name="demand"
              fill={COLORS.demand}
              shape={<CustomBar />}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics section - similar to pie chart */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
        {/* Average Load */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: `${COLORS.average}15`,
            border: `1px solid ${COLORS.average}30`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: COLORS.average }}
          >
            Средняя загрузка
          </div>
          <div className="text-lg font-bold">{avgLoadPct.toFixed(1)}%</div>
          <div className="text-gray-600 mt-1">
            {avgLoadPct > 110 ? 'Перегруз' : 
             avgLoadPct < 70 ? 'Недогруз' : 'Оптимально'}
          </div>
        </div>

        {/* Total Capacity */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: `${COLORS.capacity}15`,
            border: `1px solid ${COLORS.capacity}30`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: COLORS.capacity }}
          >
            Total Capacity
          </div>
          <div className="text-lg font-bold">{totalCapacity.toFixed(0)} ч</div>
          <div className="text-gray-600 mt-1">
            Ср: {avgCapacity.toFixed(0)} ч/отдел
          </div>
        </div>

        {/* Total Demand */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: `${COLORS.demand}15`,
            border: `1px solid ${COLORS.demand}30`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: COLORS.demand }}
          >
            Total Demand
          </div>
          <div className="text-lg font-bold">{totalDemand.toFixed(0)} ч</div>
          <div className="text-gray-600 mt-1">
            Ср: {avgDemand.toFixed(0)} ч/отдел
          </div>
        </div>

        {/* Balance */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: balanceHours >= 0 ? '#53A58E15' : '#EC694C15',
            border: `1px solid ${balanceHours >= 0 ? '#53A58E30' : '#EC694C30'}`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: balanceHours >= 0 ? '#53A58E' : '#EC694C' }}
          >
            {balanceHours >= 0 ? 'Резерв' : 'Дефицит'}
          </div>
          <div className="text-lg font-bold">{Math.abs(balanceHours).toFixed(0)} ч</div>
          <div className="text-gray-600 mt-1">
            {balanceHours >= 0 ? 'Доступно' : 'Нехватка'}
          </div>
        </div>
      </div>

      {/* Department load details */}
      {chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Загрузка по отделам:
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {chartData.map((dept, index) => (
              <div 
                key={index}
                className={`p-2 rounded text-center ${
                  dept.status === 'overload' ? 'bg-red-50 text-red-700 border border-red-200' :
                  dept.status === 'underload' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                <div className="font-medium truncate">{dept.dept}</div>
                <div className="font-bold">{dept.loadPct.toFixed(0)}%</div>
                <div className="text-gray-600 text-xs">
                  {dept.demand.toFixed(0)}/{dept.capacity.toFixed(0)}ч
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}