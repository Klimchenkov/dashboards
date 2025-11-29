'use client';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Legend
} from "recharts";
import HintTooltip from "../../HintTooltip";

const COLORS = {
  optimal: "#53A58E",      // Green - optimal quadrant
  highLoad: "#EC694C",     // Red - high load, low commercial
  highCommercial: "#87B1DE", // Blue - high commercial, low load
  lowBoth: "#E7C452",      // Yellow - low both
  average: "#45515C"       // Dark gray for averages
};

interface CommercialShareScatterChartProps {
  scatterData: {
    commercialShare: number;
    load: number;
    dept: string;
    totalHours: number;
    commercialHours: number;
  }[];
}

export default function CommercialShareScatterChart({ scatterData }: CommercialShareScatterChartProps) {
  // Calculate statistics
  const avgCommercialShare = scatterData.reduce((sum, item) => sum + item.commercialShare, 0) / (scatterData.length || 1);
  const avgLoad = scatterData.reduce((sum, item) => sum + item.load, 0) / (scatterData.length || 1);
  const totalCommercialHours = scatterData.reduce((sum, item) => sum + item.commercialHours, 0);
  const totalHours = scatterData.reduce((sum, item) => sum + item.totalHours, 0);
  const overallCommercialShare = totalHours > 0 ? (totalCommercialHours / totalHours) * 100 : 0;

  // Calculate correlation coefficient
  const correlation = calculateCorrelation(scatterData);

  // Assign quadrant colors to points
  const chartData = scatterData.map(item => {
    let quadrant = '';
    if (item.load >= 70 && item.commercialShare >= 50) {
      quadrant = 'optimal'; // High load, high commercial
    } else if (item.load >= 70 && item.commercialShare < 50) {
      quadrant = 'highLoad'; // High load, low commercial
    } else if (item.load < 70 && item.commercialShare >= 50) {
      quadrant = 'highCommercial'; // Low load, high commercial
    } else {
      quadrant = 'lowBoth'; // Low load, low commercial
    }

    return {
      ...item,
      quadrant,
      color: COLORS[quadrant as keyof typeof COLORS]
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.dept}</p>
          <p className="text-sm" style={{ color: COLORS.average }}>
            Коммерческая доля: <strong>{data.commercialShare.toFixed(1)}%</strong>
          </p>
          <p className="text-sm" style={{ color: COLORS.average }}>
            Общая загрузка: <strong>{data.load.toFixed(1)}%</strong>
          </p>
          <p className="text-sm text-gray-600">
            Коммерческие часы: <strong>{data.commercialHours.toFixed(0)} ч</strong>
          </p>
          <p className="text-sm text-gray-600">
            Всего часов: <strong>{data.totalHours.toFixed(0)} ч</strong>
          </p>
          <p className={`text-xs font-medium mt-1 ${
            data.quadrant === 'optimal' ? 'text-green-600' :
            data.quadrant === 'highLoad' ? 'text-red-600' :
            data.quadrant === 'highCommercial' ? 'text-blue-600' : 'text-yellow-600'
          }`}>
            {data.quadrant === 'optimal' ? '✅ Оптимально' :
             data.quadrant === 'highLoad' ? '⚡ Высокая нагрузка' :
             data.quadrant === 'highCommercial' ? '💎 Высокая коммерческая доля' : '📉 Низкие показатели'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom shape for scatter points
  const CustomShape = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (cx == null || cy == null) {
      return null;
    }

    const size = Math.max(8, Math.min(20, payload.totalHours / 50)); // Size based on total hours

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={size}
          fill={payload.color}
          stroke="#fff"
          strokeWidth={2}
          opacity={0.8}
        />
        {size > 12 && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={10}
            fontWeight="bold"
          >
            {payload.dept.charAt(0)}
          </text>
        )}
      </g>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="font-semibold">Коммерческая доля vs Общая загрузка</div>
        <HintTooltip hintKey="commercialShare" />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="commercialShare" 
              name="Коммерческая доля"
              unit="%"
              domain={[0, 100]}
              label={{ 
                value: 'Коммерческая доля (%)', 
                position: 'insideBottom', 
                offset: -10 
              }}
            />
            <YAxis 
              dataKey="load" 
              name="Загрузка"
              unit="%"
              domain={[0, dataMax => Math.max(150, dataMax * 1.1)]}
              label={{ 
                value: 'Загрузка (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            
            {/* Reference lines for averages */}
            <ReferenceLine 
              x={avgCommercialShare} 
              stroke={COLORS.average}
              strokeDasharray="3 3"
              label={{ 
                value: `Ср. коммерческая доля: ${avgCommercialShare.toFixed(1)}%`, 
                position: 'top',
                fill: COLORS.average,
                fontSize: 12
              }}
            />
            <ReferenceLine 
              y={avgLoad} 
              stroke={COLORS.average}
              strokeDasharray="3 3"
              label={{ 
                value: `Ср. загрузка: ${avgLoad.toFixed(1)}%`, 
                position: 'right',
                fill: COLORS.average,
                fontSize: 12
              }}
            />

            {/* Quadrant areas */}
            <ReferenceArea 
              x1={50} 
              x2={100} 
              y1={70} 
              y2={200}
              fill="#53A58E"
              fillOpacity={0.1}
              stroke="none"
            />
            <ReferenceArea 
              x1={0} 
              x2={50} 
              y1={70} 
              y2={200}
              fill="#EC694C"
              fillOpacity={0.1}
              stroke="none"
            />
            <ReferenceArea 
              x1={50} 
              x2={100} 
              y1={0} 
              y2={70}
              fill="#87B1DE"
              fillOpacity={0.1}
              stroke="none"
            />
            <ReferenceArea 
              x1={0} 
              x2={50} 
              y1={0} 
              y2={70}
              fill="#E7C452"
              fillOpacity={0.1}
              stroke="none"
            />

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend 
              verticalAlign="top" 
              height={60}
              formatter={(value) => (
                <span style={{ fontSize: '11px', color: '#333' }}>
                  {value}
                </span>
              )}
              payload={[
                { value: 'Оптимально (↑→)', type: 'circle', color: COLORS.optimal },
                { value: 'Высокая нагрузка (↑←)', type: 'circle', color: COLORS.highLoad },
                { value: 'Высокая коммерческая доля (↓→)', type: 'circle', color: COLORS.highCommercial },
                { value: 'Низкие показатели (↓←)', type: 'circle', color: COLORS.lowBoth },
              ]}
            />
            
            <Scatter 
              data={chartData} 
              shape={<CustomShape />}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
        {/* Overall Commercial Share */}
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
            Общая коммерческая доля
          </div>
          <div className="text-lg font-bold">{overallCommercialShare.toFixed(1)}%</div>
          <div className="text-gray-600 mt-1">
            {totalCommercialHours.toFixed(0)}/{totalHours.toFixed(0)} ч
          </div>
        </div>

        {/* Average Commercial Share */}
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
            Ср. коммерческая доля
          </div>
          <div className="text-lg font-bold">{avgCommercialShare.toFixed(1)}%</div>
          <div className="text-gray-600 mt-1">
            по отделам
          </div>
        </div>

        {/* Correlation */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: `${COLORS.optimal}15`,
            border: `1px solid ${COLORS.optimal}30`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: COLORS.optimal }}
          >
            Корреляция
          </div>
          <div className="text-lg font-bold">{correlation.toFixed(2)}</div>
          <div className="text-gray-600 mt-1">
            {correlation > 0.3 ? 'Положительная' : 
             correlation < -0.3 ? 'Отрицательная' : 'Слабая'}
          </div>
        </div>

        {/* Department Distribution */}
        <div 
          className="text-center p-2 rounded-lg"
          style={{ 
            backgroundColor: `${COLORS.highCommercial}15`,
            border: `1px solid ${COLORS.highCommercial}30`
          }}
        >
          <div 
            className="font-semibold"
            style={{ color: COLORS.highCommercial }}
          >
            Распределение
          </div>
          <div className="text-lg font-bold">
            {chartData.filter(d => d.quadrant === 'optimal').length}/{chartData.length}
          </div>
          <div className="text-gray-600 mt-1">
            в оптимальном квадранте
          </div>
        </div>
      </div>

      {/* Quadrant explanation */}
      <div className="mt-4 pt-3 border-t">
        <div className="text-sm font-semibold text-gray-700 mb-2">Объяснение квадрантов:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-green-50 border border-green-200">
            <div className="font-semibold text-green-700">Верхний правый</div>
            <div>Высокая загрузка + Высокая коммерческая доля</div>
            <div className="text-green-600 font-medium">Оптимально</div>
          </div>
          <div className="p-2 rounded bg-red-50 border border-red-200">
            <div className="font-semibold text-red-700">Верхний левый</div>
            <div>Высокая загрузка + Низкая коммерческая доля</div>
            <div className="text-red-600 font-medium">Много внутренней работы</div>
          </div>
          <div className="p-2 rounded bg-blue-50 border border-blue-200">
            <div className="font-semibold text-blue-700">Нижний правый</div>
            <div>Низкая загрузка + Высокая коммерческая доля</div>
            <div className="text-blue-600 font-medium">Резерв для роста</div>
          </div>
          <div className="p-2 rounded bg-yellow-50 border border-yellow-200">
            <div className="font-semibold text-yellow-700">Нижний левый</div>
            <div>Низкая загрузка + Низкая коммерческая доля</div>
            <div className="text-yellow-600 font-medium">Требует внимания</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function to calculate correlation coefficient
function calculateCorrelation(data: { commercialShare: number; load: number }[]): number {
  if (data.length < 2) return 0;

  const x = data.map(d => d.commercialShare);
  const y = data.map(d => d.load);

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}