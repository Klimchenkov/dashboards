// components/charts/HoursDistributionPieChart.tsx
'use client';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip
} from "recharts";


interface HoursDistributionPieChartProps {
  pieData: any[];
  COLORS: any[]
}

export default function HoursDistributionPieChart({ pieData, COLORS }: HoursDistributionPieChartProps) {
  // Функция для форматирования названий типов
  const renderLabel = (entry: any) => {
    const typeMap: { [key: string]: string } = {
      commercial: 'Коммерческие',
      presale: 'Пресейл',
      internal: 'Внутренние',
      other: 'Другие'
    };
    return `${typeMap[entry.type] || entry.type}: ${entry.percentage?.toFixed(1) || entry.value.toFixed(1)}%`;
  };

  return (
    <>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="type"
              label={renderLabel}
              labelLine={true}
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => {
                const entry = pieData.find(item => item.type === name);
                const hours = entry?.hours || 0;
                return [
                  `${value.toFixed(1)}% (${hours.toFixed(1)} ч)`,
                  name === 'commercial' ? 'Коммерческие' :
                  name === 'presale' ? 'Пресейл' :
                  name === 'internal' ? 'Внутренние' : 'Другие'
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Статистика под графиком */}
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        {pieData.map((entry, index) => (
          <div 
            key={entry.type}
            className="text-center p-2 rounded-lg"
            style={{ 
              backgroundColor: `${COLORS[index % COLORS.length]}15`,
              border: `1px solid ${COLORS[index % COLORS.length]}30`
            }}
          >
            <div 
              className="font-semibold"
              style={{ color: COLORS[index % COLORS.length] }}
            >
              {entry.type === 'commercial' ? 'Коммерческие' :
                entry.type === 'presale' ? 'Пресейл' :
                entry.type === 'internal' ? 'Внутренние' : 'Другие'}
            </div>
            <div>{entry.hours?.toFixed(1) || '0'} ч</div>
            <div className="text-gray-600">({entry.percentage?.toFixed(1) || entry.value.toFixed(1)}%)</div>
          </div>
        ))}
      </div>

      {/* Общая статистика */}
      {pieData.length > 0 && (
        <div className="mt-3 pt-3 border-t text-center">
          <div className="text-sm font-semibold text-gray-700">
            Всего часов: {pieData.reduce((sum, item) => sum + (item.hours || 0), 0).toFixed(1)}
          </div>
        </div>
      )}
    </>
  );
}