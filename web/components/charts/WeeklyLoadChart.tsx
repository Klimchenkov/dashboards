// components/charts/WeeklyLoadChart.tsx
'use client';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine
} from "recharts";


interface WeeklyLoadChartProps {
  areaSeries: any[];
  COLORS: any[];
}

export default function WeeklyLoadChart({ areaSeries, COLORS }: WeeklyLoadChartProps) {
  // Function to get today line position
  const getTodayLine = () => {
    const today = new Date();
    const historicalWeeks = areaSeries.filter(w => !w.isForecast);
    if (historicalWeeks.length > 0) {
      return {
        x: historicalWeeks[historicalWeeks.length-1].week,
        label: 'Текущая неделя'
      };
    }
    
    const todayWeeks = areaSeries.filter(w => {
      const weekEnd = new Date(w.weekEnd);
      return weekEnd > today;
    });
    
    if (todayWeeks.length > 0) {
      return {
        x: todayWeeks[0].week,
        label: 'Сегодня'
      };
    }
    
    return null;
  };

  const todayLine = getTodayLine();

  // Separate historical and forecast data for rendering
  const historicalSeries = areaSeries.filter(w => !w.isForecast);
  const forecastSeries = areaSeries.filter(w => w.isForecast);

  // Calculate statistics
  const totalCommercial = areaSeries.reduce((sum, week) => sum + week.commercial, 0);
  const totalPresale = areaSeries.reduce((sum, week) => sum + week.presale, 0);
  const totalInternal = areaSeries.reduce((sum, week) => sum + week.internal, 0);
  const totalWeeks = areaSeries.length;
  const historicalWeeks = historicalSeries.length;
  const forecastWeeks = forecastSeries.length;

  // Create a single data array with conditional styling
  const chartData = areaSeries.map(week => ({
    ...week,
    commercialFill: week.isForecast ? `${COLORS[0]}30` : COLORS[0],
    commercialStroke: week.isForecast ? COLORS[0] : COLORS[0],
    commercialStrokeDasharray: week.isForecast ? "5 5" : undefined,
    commercialFillOpacity: week.isForecast ? 0.3 : 0.8,
    
    presaleFill: week.isForecast ? `${COLORS[1]}30` : COLORS[1],
    presaleStroke: week.isForecast ? COLORS[1] : COLORS[1],
    presaleStrokeDasharray: week.isForecast ? "5 5" : undefined,
    presaleFillOpacity: week.isForecast ? 0.3 : 0.8,
    
    internalFill: week.isForecast ? `${COLORS[2]}30` : COLORS[2],
    internalStroke: week.isForecast ? COLORS[2] : COLORS[2],
    internalStrokeDasharray: week.isForecast ? "5 5" : undefined,
    internalFillOpacity: week.isForecast ? 0.3 : 0.8,
  }));

  return (
    <>
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
        
        {/* Forecast indicator */}
        {forecastWeeks > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-gray-400" style={{ background: 'repeating-linear-gradient(90deg, #666, #666 2px, transparent 2px, transparent 4px)' }}></div>
              <span className="text-sm text-gray-600">Прогноз</span>
            </div>
            
            {/* Today line indicator */}
            {todayLine && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gray-600"></div>
                <span className="text-sm text-gray-600">Сегодня</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart 
            data={chartData}
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
            
            {/* Today reference line */}
            {todayLine && (
              <ReferenceLine 
                x={todayLine.x} 
                stroke="#666" 
                strokeDasharray="3 3"
                label={{
                  value: todayLine.label,
                  position: 'insideTopRight',
                  fill: '#666',
                  fontSize: 12
                }}
              />
            )}
            
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                const isForecast = props.payload.isForecast;
                const forecastSuffix = isForecast ? ' (прогноз)' : '';
                
                return [
                  `${value.toFixed(1)} ч${forecastSuffix}`,
                  name === 'commercial' ? 'Коммерческие' : 
                  name === 'presale' ? 'Пресейл' : 
                  name === 'internal' ? 'Внутренние' :
                  name === 'capacity' ? 'Capacity (доступно)' :
                  name === 'demand' ? 'Общая загрузка' : name
                ];
              }}
              labelFormatter={(label, props) => {
                const isForecast = props && props[0] && props[0].payload.isForecast;
                const forecastSuffix = isForecast ? ' [ПРОГНОЗ]' : '';
                return `Неделя: ${label}${forecastSuffix}`;
              }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />

            {/* Single set of Areas with conditional styling */}
            <Area 
              dataKey="commercial" 
              stackId="1" 
              type="monotone" 
              stroke={COLORS[0]} 
              fill={COLORS[0]} 
              name="commercial"
              strokeWidth={2}
              fillOpacity={0.8}
              connectNulls
              dot={{ fill: COLORS[0], strokeWidth: 1, r: 2 }}
            />
            <Area 
              dataKey="presale" 
              stackId="1" 
              type="monotone" 
              stroke={COLORS[1]} 
              fill={COLORS[1]} 
              name="presale"
              strokeWidth={2}
              fillOpacity={0.8}
              connectNulls
              dot={{ fill: COLORS[1], strokeWidth: 1, r: 2 }}
            />
            <Area 
              dataKey="internal" 
              stackId="1" 
              type="monotone" 
              stroke={COLORS[2]} 
              fill={COLORS[2]} 
              name="internal"
              strokeWidth={2}
              fillOpacity={0.8}
              connectNulls
              dot={{ fill: COLORS[2], strokeWidth: 1, r: 2 }}
            />
            
            {/* Lines */}
            <Area 
              dataKey="capacity" 
              type="monotone" 
              stroke={COLORS[3]} 
              fill="transparent" 
              name="capacity"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: COLORS[3], strokeWidth: 2, r: 3 }}
              connectNulls
            />
            <Area 
              dataKey="demand" 
              type="monotone" 
              stroke={COLORS[4]} 
              fill="transparent" 
              name="demand"
              strokeWidth={3}
              dot={{ fill: COLORS[4], strokeWidth: 2, r: 3 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Статистика под графиком */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#EC694C15', border: '1px solid #EC694C30' }}>
          <div className="font-semibold" style={{ color: '#EC694C' }}>Ср. коммерческие</div>
          <div>{(totalCommercial / totalWeeks).toFixed(1)} ч/нед</div>
          {forecastWeeks > 0 && (
            <div className="text-xs opacity-60 mt-1">
              {historicalWeeks} нед факт + {forecastWeeks} нед прогноз
            </div>
          )}
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#87B1DE15', border: '1px solid #87B1DE30' }}>
          <div className="font-semibold" style={{ color: '#87B1DE' }}>Ср. пресейл</div>
          <div>{(totalPresale / totalWeeks).toFixed(1)} ч/нед</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#53A58E15', border: '1px solid #53A58E30' }}>
          <div className="font-semibold" style={{ color: '#53A58E' }}>Ср. внутренние</div>
          <div>{(totalInternal / totalWeeks).toFixed(1)} ч/нед</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#45515C15', border: '1px solid #45515C30' }}>
          <div className="font-semibold" style={{ color: '#45515C' }}>Ср. загрузка</div>
          <div>{(areaSeries.reduce((sum, week) => sum + week.loadPct, 0) / totalWeeks).toFixed(1)}%</div>
        </div>
      </div>
    </>
  );
}