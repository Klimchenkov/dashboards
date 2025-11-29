'use client';
import { useState, useMemo } from 'react';
import { Card } from "@/components/ui";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import HintTooltip from "../../HintTooltip";
import { DeptAggregates } from '@/lib/dataModel';

interface StackedBarChartProps {
  deptAgg?: DeptAggregates[];
  title?: string;
  height?: number;
}

const COLORS = {
  commercial: "#EC694C",
  presale: "#87B1DE", 
  internal: "#53A58E",
  other: "#E7C452",
  grid: "#f0f0f0",
  text: "#45515C"
};

// Вспомогательная функция для получения часов по типу
const getHoursByType = (distribution: any[] | undefined, type: string): number => {
  if (!distribution || !Array.isArray(distribution)) return 0;
  const item = distribution.find(item => item.type === type);
  return item?.hours || 0;
};

export function StackedBarChart({ 
  deptAgg = [], 
  title = "Распределение часов по сотрудникам отдела", 
  height = 400 
}: StackedBarChartProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Получаем список всех отделов для фильтра
  const departments = useMemo(() => {
    if (!deptAgg || !Array.isArray(deptAgg)) return [];
    return deptAgg.map(dept => ({
      id: dept.department.id,
      name: dept.department.name,
      userCount: dept.department.users?.filter(u => u.isActive).length || 0
    })).filter(dept => dept.userCount > 0);
  }, [deptAgg]);

  // Получаем данные для выбранного отдела
  const chartData = useMemo(() => {
    if (!selectedDepartment || !deptAgg || !Array.isArray(deptAgg)) {
      return [];
    }

    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );

    if (!selectedDept || !selectedDept.department.users) {
      return [];
    }

    // Преобразуем пользователей отдела в данные для графика
    return selectedDept.department.users
      .filter(user => user.isActive) // Только активные пользователи
      .map(user => {
        const commercial = getHoursByType(user.hours_distribution, 'commercial');
        const presale = getHoursByType(user.hours_distribution, 'presale');
        const internal = getHoursByType(user.hours_distribution, 'internal');
        const other = getHoursByType(user.hours_distribution, 'other');
        const total = commercial + presale + internal + other;

        return {
          name: user.name || 'Неизвестный сотрудник',
          commercial,
          presale,
          internal,
          other,
          total,
          user: user.name || 'Неизвестный сотрудник',
          loadPct: user.demand_hours && user.capacity_hours 
            ? (user.demand_hours / user.capacity_hours) * 100 
            : 0,
          capacity: user.capacity_hours || 0,
          demand: user.demand_hours || 0
        };
      })
      // .filter(item => item.total > 0); // Показываем только тех, у кого есть часы
  }, [deptAgg, selectedDepartment]);

  // Статистика для выбранного отдела
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalCommercial: 0,
        totalPresale: 0,
        totalInternal: 0,
        totalOther: 0,
        totalHours: 0,
        commercialShare: 0,
        userCount: 0,
        hasOtherData: false,
        avgLoad: 0
      };
    }

    const totalCommercial = chartData.reduce((sum, item) => sum + item.commercial, 0);
    const totalPresale = chartData.reduce((sum, item) => sum + item.presale, 0);
    const totalInternal = chartData.reduce((sum, item) => sum + item.internal, 0);
    const totalOther = chartData.reduce((sum, item) => sum + item.other, 0);
    const totalHours = totalCommercial + totalPresale + totalInternal + totalOther;
    const avgLoad = chartData.reduce((sum, item) => sum + item.loadPct, 0) / chartData.length;

    return {
      totalCommercial,
      totalPresale,
      totalInternal,
      totalOther,
      totalHours,
      commercialShare: totalHours > 0 ? (totalCommercial / totalHours) * 100 : 0,
      userCount: chartData.length,
      hasOtherData: totalOther > 0,
      avgLoad
    };
  }, [chartData]);

  // Простой кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg min-w-64">
          <p className="font-semibold text-sm mb-2">{label}</p>
          <p className="text-xs text-gray-600 mb-2">Сотрудник: {data.user}</p>
          
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs" style={{ color: entry.color }}>
                    {entry.name === 'commercial' ? 'Коммерческие' :
                     entry.name === 'presale' ? 'Presale' :
                     entry.name === 'internal' ? 'Внутренние' : 'Другие'}
                  </span>
                </div>
                <div className="text-xs font-semibold">
                  {entry.value.toFixed(1)} ч
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Всего часов:</span>
              <span className="font-semibold">{data.total.toFixed(1)} ч</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Загрузка:</span>
              <span className="font-semibold">{data.loadPct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">План/Факт:</span>
              <span className="font-semibold">{data.demand.toFixed(0)}/{data.capacity.toFixed(0)} ч</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Если нет отделов, показываем сообщение
  if (departments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <HintTooltip hintKey="stackedBarDept" />
        </div>
        <Card className="p-8 text-center">
          <div className="text-gray-500">Нет данных по отделам для отображения</div>
        </Card>
      </div>
    );
  }

  // Автоматически выбираем первый отдел, если не выбран
  if (!selectedDepartment && departments.length > 0) {
    setSelectedDepartment(departments[0].name);
    return null; // Пропускаем рендер для установки состояния
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтр отделов */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <HintTooltip hintKey="stackedBarDept" />
        </div>
        
        {/* Фильтр отделов */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Отдел:</span>
          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-48"
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>
                {dept.name} ({dept.userCount} сотрудников)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Если в выбранном отделе нет данных */}
      {chartData.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            В отделе "{selectedDepartment}" нет данных по активным сотрудникам с отработанными часами
          </div>
        </Card>
      ) : (
        <>
          {/* График */}
          <Card>
            <div style={{ height: `${height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis 
                    dataKey="name" 
                    angle={0}
                    textAnchor="middle"
                    height={10}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const parts = value.split(' ');
                      if (parts.length < 2) return value;
                      
                      // "Муравьёв Дмитрий Михайлович" → "Муравьёв Д.М."
                      const lastName = parts[0];
                      const initials = parts.slice(1)
                        .map(part => part.charAt(0) + '.')
                        .join('');
                      
                      return `${lastName} ${initials}`;
                    }}
                  />
                  <YAxis 
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
                      <span style={{ fontSize: '12px', color: COLORS.text }}>
                        {value === 'commercial' ? 'Коммерческие' :
                         value === 'presale' ? 'Presale' :
                         value === 'internal' ? 'Внутренние' : 
                         value === 'other' ? 'Другие' : value}
                      </span>
                    )}
                  />
                  
                  <Bar dataKey="commercial" stackId="1" name="commercial" fill={COLORS.commercial} />
                  <Bar dataKey="presale" stackId="1" name="presale" fill={COLORS.presale} />
                  <Bar dataKey="internal" stackId="1" name="internal" fill={COLORS.internal} />
                  {stats.hasOtherData && (
                    <Bar dataKey="other" stackId="1" name="other" fill={COLORS.other} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Детальная статистика распределения */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${COLORS.commercial}15`, border: `1px solid ${COLORS.commercial}30` }}>
              <div className="font-semibold" style={{ color: COLORS.commercial }}>Коммерческие</div>
              <div className="text-sm font-bold">{stats.commercialShare.toFixed(1)}%</div>
              <div className="text-gray-600">{stats.totalCommercial.toFixed(0)} ч</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${COLORS.presale}15`, border: `1px solid ${COLORS.presale}30` }}>
              <div className="font-semibold" style={{ color: COLORS.presale }}>Presale</div>
              <div className="text-sm font-bold">
                {stats.totalHours > 0 ? ((stats.totalPresale / stats.totalHours) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-gray-600">{stats.totalPresale.toFixed(0)} ч</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${COLORS.internal}15`, border: `1px solid ${COLORS.internal}30` }}>
              <div className="font-semibold" style={{ color: COLORS.internal }}>Внутренние</div>
              <div className="text-sm font-bold">
                {stats.totalHours > 0 ? ((stats.totalInternal / stats.totalHours) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-gray-600">{stats.totalInternal.toFixed(0)} ч</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${COLORS.other}15`, border: `1px solid ${COLORS.other}30` }}>
              <div className="font-semibold" style={{ color: COLORS.other }}>Другие</div>
              <div className="text-sm font-bold">
                {stats.totalHours > 0 ? ((stats.totalOther / stats.totalHours) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-gray-600">{stats.totalOther.toFixed(0)} ч</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}