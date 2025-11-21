//web/components/ExecView.tsx
'use client';
import { Card, Button } from "./ui";
import { DeptAggregates } from "@/lib/dataModel";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, ScatterChart, Scatter } from "recharts";
import { exportToXLSX } from "@/lib/xlsxExport";
import HintTooltip from "./HintTooltip"; 

export default function ExecView({ kpis, areaSeries, pieData, composedData, scatterData, deptTable } : {
  kpis: {avgLoad: number; activeUsers: number; activeProjects: number; dataQuality: number};
  areaSeries: any[];
  pieData: any[];
  composedData: any[];
  scatterData: any[];
  deptTable: DeptAggregates[];
}){
  // Updated colors to match SETTERS website palette
  const COLORS = ["#EC694C", "#87B1DE", "#53A58E", "#E7C452", "#45515C"];

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
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Средняя загрузка
            <HintTooltip hintKey="avgLoad" />
          </div>
          <div className="text-3xl font-bold">{kpis.avgLoad.toFixed(0)}%</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Активные сотрудники
            <HintTooltip hintKey="activeUsers" />
          </div>
          <div className="text-3xl font-bold">{kpis.activeUsers}</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Активные проекты
            <HintTooltip hintKey="activeProjects" />
          </div>
          <div className="text-3xl font-bold">{kpis.activeProjects}</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Data Quality
            <HintTooltip hintKey="dataQuality" />
          </div>
          <div className="text-3xl font-bold">{(kpis.dataQuality*100).toFixed(0)}%</div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-2 flex items-center gap-2">
          Загрузка по неделям
          <HintTooltip hintKey="weeklyLoad" />
        </div>
        
        {/* Кастомная легенда */}
        <div className="flex flex-wrap gap-4 mb-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EC694C]"></div>
            <span className="text-sm">Коммерческие</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#87B1DE]"></div>
            <span className="text-sm">Пресейл</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#53A58E]"></div>
            <span className="text-sm">Внутренние</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E7C452]"></div>
            <span className="text-sm">Capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#45515C]"></div>
            <span className="text-sm">Общая загрузка</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart 
              data={areaSeries}
              margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Часы', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: -10,
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} ч`,
                  name === 'commercial' ? 'Коммерческие' : 
                  name === 'presale' ? 'Пресейл' : 
                  name === 'internal' ? 'Внутренние' :
                  name === 'capacity' ? 'Capacity (доступно)' :
                  name === 'demand' ? 'Общая загрузка' : name
                ]}
                labelFormatter={(label) => `Неделя: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              {/* Stacked areas для типов проектов */}
              <Area 
                dataKey="commercial" 
                stackId="1" 
                type="monotone" 
                stroke={COLORS[0]} 
                fill={COLORS[0]} 
                name="commercial"
                strokeWidth={2}
              />
              <Area 
                dataKey="presale" 
                stackId="1" 
                type="monotone" 
                stroke={COLORS[1]} 
                fill={COLORS[1]} 
                name="presale"
                strokeWidth={2}
              />
              <Area 
                dataKey="internal" 
                stackId="1" 
                type="monotone" 
                stroke={COLORS[2]} 
                fill={COLORS[2]} 
                name="internal"
                strokeWidth={2}
              />
              {/* Линия capacity */}
              <Area 
                dataKey="capacity" 
                type="monotone" 
                stroke={COLORS[3]} 
                fill="transparent" 
                name="capacity"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: COLORS[3], strokeWidth: 2 }}
              />
              {/* Линия общей загрузки */}
              <Area 
                dataKey="demand" 
                type="monotone" 
                stroke={COLORS[4]} 
                fill="transparent" 
                name="demand"
                strokeWidth={3}
                dot={{ fill: COLORS[4], strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Статистика под графиком */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#EC694C15', border: '1px solid #EC694C30' }}>
            <div className="font-semibold" style={{ color: '#EC694C' }}>Ср. коммерческие</div>
            <div>{(areaSeries.reduce((sum, week) => sum + week.commercial, 0) / areaSeries.length).toFixed(1)} ч/нед</div>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#87B1DE15', border: '1px solid #87B1DE30' }}>
            <div className="font-semibold" style={{ color: '#87B1DE' }}>Ср. пресейл</div>
            <div>{(areaSeries.reduce((sum, week) => sum + week.presale, 0) / areaSeries.length).toFixed(1)} ч/нед</div>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#53A58E15', border: '1px solid #53A58E30' }}>
            <div className="font-semibold" style={{ color: '#53A58E' }}>Ср. внутренние</div>
            <div>{(areaSeries.reduce((sum, week) => sum + week.internal, 0) / areaSeries.length).toFixed(1)} ч/нед</div>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#45515C15', border: '1px solid #45515C30' }}>
            <div className="font-semibold" style={{ color: '#45515C' }}>Ср. загрузка</div>
            <div>{(areaSeries.reduce((sum, week) => sum + week.loadPct, 0) / areaSeries.length).toFixed(1)}%</div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold mb-2 flex items-center gap-2">
            Доли типов часов
            <HintTooltip hintKey="hoursDistribution" />
          </div>
          

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
        </Card>
        <Card>
          <div className="font-semibold mb-2">Capacity vs Demand по отделам</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={composedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" /><YAxis /><Tooltip />
                <Bar dataKey="capacity" fill={COLORS[3]} />
                <Bar dataKey="demand" fill={COLORS[4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-2">Коммерческая доля vs общая загрузка</div>
        <div className="h-64">
          <ResponsiveContainer>
            <ScatterChart>
              <XAxis dataKey="commercialShare" name="Доля коммерции" />
              <YAxis dataKey="load" name="Загрузка %" />
              <Tooltip />
              <Scatter data={scatterData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">Отделы</div>
          <Button onClick={()=> exportToXLSX("departments.xlsx", { Departments: deptTable.map(d => ({
            Department: d.department.name, Capacity: d.capacity, Demand: d.demand, Forecast: d.forecast, LoadPct: d.loadPct, Status: d.status, DataQuality: d.dataQuality
          }))})}>Экспорт XLSX</Button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">Отдел</th><th className="p-2">План</th><th className="p-2">Факт</th><th className="p-2">Прогноз</th><th className="p-2">Статус</th><th className="p-2">Дисциплина</th></tr></thead>
            <tbody>
              {deptTable.map((r,i)=> (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.department.name}</td>
                  <td className="p-2">{r.capacity.toFixed(1)}</td>
                  <td className="p-2">{r.demand.toFixed(1)}</td>
                  <td className="p-2">{r.forecast.toFixed(1)}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{(r.dataQuality*100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}