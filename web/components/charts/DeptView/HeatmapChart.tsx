// components/charts/DeptView/HeatmapChart.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui";
import { DeptAggregates } from "@/lib/dataModel";
import HintTooltip from "../../HintTooltip";

interface HeatmapChartProps {
  deptAgg?: DeptAggregates[];
  title?: string;
  days?: number;
}

const COLORS = {
  level1: "#EBF8FF",     // 0-20%
  level2: "#BEE3F8",     // 20-40%  
  level3: "#63B3ED",     // 40-60%
  level4: "#3182CE",     // 60-80%
  level5: "#1A365D",     // 80-100%
  empty: "#F7FAFC"       // empty
};

export function HeatmapChart({ 
  deptAgg = [], 
  title = "Интенсивность работы по дням",
  days = 30
}: HeatmapChartProps) {
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

  // Автоматически выбираем первый отдел при монтировании
  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0].name);
    }
  }, [departments, selectedDepartment]);

  // Получаем данные для тепловой карты выбранного отдела
  const heatmapData = useMemo(() => {
    if (!selectedDepartment || !deptAgg || !Array.isArray(deptAgg)) {
      return [];
    }

    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );

    if (!selectedDept || !selectedDept.department.users) {
      return [];
    }

    // Собираем все time_entries из выбранного отдела
    const allTimeEntries = selectedDept.department.users
      .filter(user => user.isActive)
      .flatMap(user => user.time_entries || [])
      .filter(entry => entry && entry.date && entry.hours);

    if (allTimeEntries.length === 0) {
      return [];
    }

    // Создаем объект для агрегации часов по датам
    const hoursByDate: { [date: string]: number } = {};

    // Заполняем данные за последние N дней
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      hoursByDate[dateString] = 0;
    }

    // Агрегируем часы по датам
    allTimeEntries.forEach(entry => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      if (hoursByDate.hasOwnProperty(entryDate)) {
        hoursByDate[entryDate] += entry.hours;
      }
    });

    // Преобразуем в массив для отображения
    return Object.entries(hoursByDate)
      .map(([date, value]) => ({
        date,
        value,
        dayOfWeek: new Date(date).getDay(), // 0 - воскресенье, 1 - понедельник, ...
        isWeekend: [0, 6].includes(new Date(date).getDay()),
        formattedDate: new Date(date).toLocaleDateString('ru-RU'),
        dayName: new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [deptAgg, selectedDepartment, days]);

  // Статистика по выбранному отделу
  const stats = useMemo(() => {
    if (heatmapData.length === 0) {
      return {
        totalHours: 0,
        avgHoursPerDay: 0,
        maxHours: 0,
        workingDays: 0,
        zeroDays: 0
      };
    }

    const totalHours = heatmapData.reduce((sum, day) => sum + day.value, 0);
    const maxHours = Math.max(...heatmapData.map(day => day.value));
    const workingDays = heatmapData.filter(day => day.value > 0).length;
    const zeroDays = heatmapData.filter(day => day.value === 0).length;

    return {
      totalHours,
      avgHoursPerDay: totalHours / heatmapData.length,
      maxHours,
      workingDays,
      zeroDays
    };
  }, [heatmapData]);

  // Функция для определения цвета ячейки с 5 уровнями интенсивности
  const getCellColor = (hours: number, maxHours: number) => {
    if (hours === 0) return COLORS.empty;
    
    const intensity = maxHours > 0 ? hours / maxHours : 0;
    
    if (intensity < 0.2) return COLORS.level1;      // 0-20%
    if (intensity < 0.4) return COLORS.level2;      // 20-40%
    if (intensity < 0.6) return COLORS.level3;      // 40-60%
    if (intensity < 0.8) return COLORS.level4;      // 60-80%
    return COLORS.level5;                           // 80-100%
  };

  // Функция для получения подсказки дня
  const getDayTooltip = (day: any) => {
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = dayNames[day.dayOfWeek];
    const hoursText = day.value === 0 ? 'нет часов' : `${day.value.toFixed(1)} ч`;
    
    return `${day.formattedDate} (${dayName}) - ${hoursText}`;
  };

  // Группируем данные по неделям для горизонтального отображения
  const weeklyData = useMemo(() => {
    if (heatmapData.length === 0) return [];

    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      // Завершаем неделю в воскресенье (день 0) или в конце данных
      if (day.dayOfWeek === 0 || index === heatmapData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  }, [heatmapData]);

  // Создаем данные для вертикального отображения (дни недели по вертикали)
  const verticalData = useMemo(() => {
    if (weeklyData.length === 0) return [];

    // Создаем массив для каждого дня недели (1-понедельник, 2-вторник, ..., 0-воскресенье)
    const daysOfWeek = Array(7).fill(null).map(() => []);
    
    // Заполняем данные для каждого дня недели
    weeklyData.forEach(week => {
      week.forEach((day, dayIndex) => {
        if (day) {
          daysOfWeek[day.dayOfWeek].push(day);
        } else {
          // Для пустых дней добавляем null
          daysOfWeek[dayIndex].push(null);
        }
      });
    });

    // Названия дней недели - начинаем с понедельника (1)
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Порядок дней: понедельник-воскресенье
    
    return dayOrder.map((dayIndex, orderIndex) => ({
      dayName: dayNames[orderIndex],
      dayOfWeek: dayIndex,
      isWeekend: dayIndex === 0 || dayIndex === 6, // Воскресенье и суббота
      data: daysOfWeek[dayIndex]
    }));
  }, [weeklyData]);

  // Показываем загрузку пока отдел не выбран
  if (!selectedDepartment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">{title}</div>
          <div className="text-sm text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Заголовок и фильтр */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">{title}</div>
          <HintTooltip hintKey="heatmapChart" />
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
                {dept.name} ({dept.userCount} сотруд.)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Статистика */}
      {heatmapData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm w-full">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalHours.toFixed(0)}</div>
            <div className="text-sm text-blue-600">Всего часов</div>
            <div className="text-xs text-gray-600 mt-1">за {days} дней</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.avgHoursPerDay.toFixed(1)}</div>
            <div className="text-sm text-green-600">Среднее в день</div>
            <div className="text-xs text-gray-600 mt-1">часов</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.maxHours.toFixed(1)}</div>
            <div className="text-sm text-purple-600">Максимум в день</div>
            <div className="text-xs text-gray-600 mt-1">часов</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.workingDays}</div>
            <div className="text-sm text-orange-600">Рабочих дней</div>
            <div className="text-xs text-gray-600 mt-1">с активностью</div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.zeroDays}</div>
            <div className="text-sm text-gray-600">Дней без работы</div>
            <div className="text-xs text-gray-600 mt-1">без активностей</div>
          </div>
        </div>
      )}

      {/* Тепловая карта */}
      <Card className="w-full">
        {heatmapData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 w-full">
            {selectedDepartment 
              ? `В отделе "${selectedDepartment}" нет данных по time entries за последние ${days} дней` 
              : 'Выберите отдел для отображения данных'
            }
          </div>
        ) : (
          <div className="p-4 w-full">
            {/* Центрируем всю тепловую карту */}
            <div className="flex justify-center">
              <div className="flex gap-2">
                {/* Легенда дней недели - вертикальная */}
                <div className="flex flex-col gap-1 mr-2">
                  <div className="h-6"></div> {/* Пустая ячейка для выравнивания с заголовками */}
                  {verticalData.map((dayInfo, index) => (
                    <div 
                      key={dayInfo.dayName}
                      className={`h-8 flex items-center justify-center text-xs font-medium ${
                        dayInfo.isWeekend ? 'text-red-600' : 'text-gray-700'
                      }`}
                    >
                      {dayInfo.dayName}
                    </div>
                  ))}
                </div>

                {/* Сама тепловая карта - теперь дни по вертикали, недели по горизонтали */}
                <div className="flex gap-1">
                  {weeklyData.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {/* Заголовок недели (необязательно) */}
                      <div className="h-6 flex items-center justify-center text-xs text-gray-500">
                        {weekIndex + 1}
                      </div>
                      
                      {/* Ячейки для каждого дня недели в этой неделе */}
                      {verticalData.map((dayInfo, dayIndex) => {
                        const dayData = dayInfo.data[weekIndex];
                        
                        if (!dayData) {
                          return (
                            <div
                              key={`${weekIndex}-${dayIndex}`}
                              className="w-8 h-8 rounded-sm bg-transparent border border-transparent"
                              title="Нет данных"
                            />
                          );
                        }
                        
                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            title={getDayTooltip(dayData)}
                            className={`
                              w-8 h-8 rounded-sm border cursor-help transition-all
                              ${dayInfo.isWeekend ? 'border-red-200' : 'border-gray-200'}
                              hover:scale-110 hover:z-10 hover:shadow-md
                            `}
                            style={{
                              backgroundColor: getCellColor(dayData.value, stats.maxHours)
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Легенда интенсивности с процентами - тоже центрируем */}
            <div className="flex items-center justify-center mt-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>Меньше</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.level1 }} title="0-20%" />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.level2 }} title="20-40%" />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.level3 }} title="40-60%" />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.level4 }} title="60-80%" />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.level5 }} title="80-100%" />
                </div>
                <span>Больше</span>
              </div>
              <div className="text-xs ml-4">
                Макс: {stats.maxHours.toFixed(1)} ч в день
              </div>
            </div>

            {/* Подсказка с процентами - центрируем */}
            <div className="text-xs text-gray-500 mt-2 text-center">
              💡 Наведите на ячейку для подробной информации. Красная рамка - выходные дни. 
              Интенсивность: 0-20% | 20-40% | 40-60% | 60-80% | 80-100%
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}