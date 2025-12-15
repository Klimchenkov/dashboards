// components/PersonView.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card } from "./ui";
import { DeptAggregates, Project, UserNorm, ProjectStatus, ProjectType, Vacation, TimeEntry, HoursDistributionItem } from "@/lib/dataModel";
import HintTooltip from "./HintTooltip";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { useAlerts } from '@/hooks/useAlerts';

interface PersonViewProps {
  deptAgg?: DeptAggregates[];
  projects: Project[];
  horizonMonth: number; // 1, 2 или 3 месяца для расширения прогноза
}

const COLORS = {
  optimal: "#53A58E",
  underload: "#87B1DE", 
  overload: "#EC694C",
  commercial: "#4F46E5",
  presale: "#10B981",
  internal: "#F59E0B",
  other: "#6B7280",
  vacation: "#9CA3AF"
};

// Функция для расчета распределения часов (аналогичная lib/pieCalculations)
function calculateHoursDistribution(
  timeEntries: TimeEntry[],
  projects: Project[],
  periodStart: string,
  periodEnd: string
): HoursDistributionItem[] {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  
  // Фильтруем таймшиты по периоду
  const periodEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= start && entryDate <= end;
  });

  // Инициализируем счетчики по типам проектов
  const hoursByType = {
    commercial: 0,
    presale: 0,
    internal: 0,
    other: 0
  };

  // Суммируем часы по типам проектов
  periodEntries.forEach(entry => {
    const project = projects.find(p => p.id === entry.project_id);
    if (!project) {
      hoursByType.other += entry.hours;
      return;
    }

    switch (project.project_status) {
      case 'active':
        hoursByType.commercial += entry.hours;
        break;
      case 'presale':
        hoursByType.presale += entry.hours;
        break;
      case 'internal':
        hoursByType.internal += entry.hours;
        break;
      default:
        hoursByType.other += entry.hours;
    }
  });

  // Рассчитываем общее количество часов
  const totalHours = Object.values(hoursByType).reduce((sum, hours) => sum + hours, 0);

  // Формируем данные для pie chart
  const result: HoursDistributionItem[] = [];
  
  if (hoursByType.commercial > 0) {
    result.push({
      type: 'commercial',
      value: hoursByType.commercial, // Используем абсолютные значения часов
      hours: hoursByType.commercial,
      percentage: totalHours > 0 ? (hoursByType.commercial / totalHours) * 100 : 0
    });
  }

  if (hoursByType.presale > 0) {
    result.push({
      type: 'presale',
      value: hoursByType.presale,
      hours: hoursByType.presale,
      percentage: totalHours > 0 ? (hoursByType.presale / totalHours) * 100 : 0
    });
  }

  if (hoursByType.internal > 0) {
    result.push({
      type: 'internal',
      value: hoursByType.internal,
      hours: hoursByType.internal,
      percentage: totalHours > 0 ? (hoursByType.internal / totalHours) * 100 : 0
    });
  }

  if (hoursByType.other > 0) {
    result.push({
      type: 'other',
      value: hoursByType.other,
      hours: hoursByType.other,
      percentage: totalHours > 0 ? (hoursByType.other / totalHours) * 100 : 0
    });
  }

  return result;
}

// Компонент тепловой карты для пользователя
function UserHeatmap({ timeEntries, period, norm, vacations }: { 
  timeEntries: any[], 
  period: { start: string, end: string },
  norm: UserNorm | null,
  vacations: Vacation[]
}) {
  // Получаем все даты отпусков в периоде
  const vacationDays = useMemo(() => {
    const vacationDates = new Set<string>();
    
    vacations.forEach(vacation => {
      const start = new Date(vacation.start_date);
      const end = new Date(vacation.end_date);
      const current = new Date(start);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const periodStart = new Date(period.start);
        const periodEnd = new Date(period.end);
        
        if (current >= periodStart && current <= periodEnd) {
          vacationDates.add(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return vacationDates;
  }, [vacations, period]);

  // Подготовка данных для тепловой карты
  const heatmapData = useMemo(() => {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Создаем массив всех дней в периоде
    const allDays = Array.from({ length: daysDiff + 1 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });

    // Группируем time_entries по дате
    const entriesByDate: { [key: string]: number } = {};
    timeEntries.forEach(entry => {
      entriesByDate[entry.date] = (entriesByDate[entry.date] || 0) + entry.hours;
    });

    // Создаем данные для тепловой карты
    return allDays.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const hours = entriesByDate[dateStr] || 0;
      const dayOfWeek = date.getDay();
      const isWorkingDay = norm?.working_days.includes(dayOfWeek) || false;
      const isVacationDay = vacationDays.has(dateStr);
      
      return {
        date: dateStr,
        hours,
        dayOfWeek,
        isWeekend: [0, 6].includes(dayOfWeek),
        isWorkingDay,
        isVacationDay,
        formattedDate: date.toLocaleDateString('ru-RU'),
        dayName: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayOfWeek]
      };
    });
  }, [timeEntries, period, norm, vacationDays]);

  // Определяем максимальное количество часов в день для градации цветов
  const maxHours = useMemo(() => {
    const workingDaysHours = heatmapData
      .filter(day => day.isWorkingDay && !day.isVacationDay)
      .map(day => day.hours);
    return Math.max(...workingDaysHours, 8); // Минимум 8 часов для шкалы
  }, [heatmapData]);

  // Функция для определения цвета ячейки
  const getCellColor = (hours: number, isWorkingDay: boolean, isVacationDay: boolean) => {
    if (isVacationDay) return COLORS.vacation; // День отпуска
    if (!isWorkingDay) return '#F7FAFC'; // Не рабочий день
    if (hours === 0) return '#F7FAFC'; // Пустой рабочий день
    
    const intensity = hours / maxHours;
    
    if (intensity < 0.3) return '#EBF8FF';     // 0-30%
    if (intensity < 0.6) return '#BEE3F8';     // 30-60%
    if (intensity < 0.9) return '#63B3ED';     // 60-90%
    return '#3182CE';                          // 90-100%
  };

  // Группируем данные по неделям
  const weeklyData = useMemo(() => {
    const weeks: any[][] = [];
    let currentWeek: any[] = Array(7).fill(null);
    
    heatmapData.forEach(day => {
      const dayIndex = day.dayOfWeek;
      
      // Воскресенье (0) - последний день недели
      if (dayIndex === 0) {
        currentWeek[6] = day;
        weeks.push([...currentWeek]);
        currentWeek = Array(7).fill(null);
      } else {
        // Понедельник (1) -> индекс 0, Вторник (2) -> индекс 1, и т.д.
        currentWeek[dayIndex - 1] = day;
      }
    });
    
    // Добавляем последнюю неделю, если она не пустая
    if (currentWeek.some(day => day !== null)) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [heatmapData]);

  return (
    <div className="w-full">
      {/* Легенда дней недели */}
      <div className="flex justify-center mb-2 text-xs text-gray-600">
        <div className="w-6 text-center">Пн</div>
        <div className="w-6 text-center">Вт</div>
        <div className="w-6 text-center">Ср</div>
        <div className="w-6 text-center">Чт</div>
        <div className="w-6 text-center">Пт</div>
        <div className="w-6 text-center">Сб</div>
        <div className="w-6 text-center">Вс</div>
      </div>

      {/* Тепловая карта */}
      <div className="flex flex-col items-center">
        {weeklyData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-1 mb-1">
            {week.map((day, dayIndex) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${weekIndex}-${dayIndex}`}
                    className="w-6 h-6 rounded-sm bg-transparent border border-transparent"
                  />
                );
              }
              
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  title={`${day.formattedDate} (${day.dayName}) - ${day.hours.toFixed(1)} ч${
                    day.isVacationDay ? ' - отпуск' : 
                    !day.isWorkingDay ? ' - не рабочий день' : ''
                  }`}
                  className={`
                    w-6 h-6 rounded-sm border cursor-help
                    ${day.isWeekend ? 'border-red-200' : 'border-gray-200'}
                    ${day.isVacationDay ? 'border-dashed' : ''}
                  `}
                  style={{
                    backgroundColor: getCellColor(day.hours, day.isWorkingDay, day.isVacationDay)
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Легенда интенсивности */}
      <div className="flex items-center justify-center mt-4 text-xs text-gray-600">
        <span className="mr-2">Меньше</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm bg-[#F7FAFC] border border-gray-300" title="0 часов или не рабочий день" />
          <div className="w-4 h-4 rounded-sm bg-[#EBF8FF]" title="0-30%" />
          <div className="w-4 h-4 rounded-sm bg-[#BEE3F8]" title="30-60%" />
          <div className="w-4 h-4 rounded-sm bg-[#63B3ED]" title="60-90%" />
          <div className="w-4 h-4 rounded-sm bg-[#3182CE]" title="90-100%" />
          <div className="w-4 h-4 rounded-sm bg-[#9CA3AF] border border-dashed border-gray-400" title="Отпуск" />
        </div>
        <span className="ml-2">Больше</span>
      </div>
    </div>
  );
}

// Вспомогательная функция для расчета рабочих дней с учетом отпусков
function calculateWorkingDays(
  startDate: string, 
  endDate: string, 
  workingDays: number[], 
  vacations: Vacation[]
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  // Создаем Set всех дат отпуска в периоде
  const vacationDates = new Set<string>();
  vacations.forEach(vacation => {
    const vacationStart = new Date(vacation.start_date);
    const vacationEnd = new Date(vacation.end_date);
    const current = new Date(vacationStart);
    
    while (current <= vacationEnd) {
      if (current >= start && current <= end) {
        vacationDates.add(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
  });
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (workingDays.includes(current.getDay()) && !vacationDates.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Функция для получения активных отпусков в периоде
function getActiveVacationsInPeriod(vacations: Vacation[], period: { start: string, end: string }): Vacation[] {
  const periodStart = new Date(period.start);
  const periodEnd = new Date(period.end);
  
  return vacations.filter(vacation => {
    const vacationStart = new Date(vacation.start_date);
    const vacationEnd = new Date(vacation.end_date);
    
    // Проверяем пересечение периодов отпуска и отчета
    return vacationStart <= periodEnd && vacationEnd >= periodStart;
  });
}

// Функция для прогнозирования загрузки с учетом горизонта планирования
function calculateUserForecast(
  userPlans: any[],
  userTimeEntries: TimeEntry[],
  userCapacity: number,
  period: { start: string, end: string },
  vacations: Vacation[],
  horizonMonth: number // Новый параметр для горизонта планирования
) {
  const today = new Date();
  const periodStart = new Date(period.start);
  const periodEnd = new Date(period.end);
  
  // Расширяем период окончания на horizonMonth месяцев для прогноза
  const forecastEndDate = new Date(periodEnd);
  forecastEndDate.setMonth(forecastEndDate.getMonth() + horizonMonth);
  
  // Рассчитываем оставшиеся рабочие дни в расширенном периоде с учетом отпусков
  const remainingWorkingDays = calculateWorkingDays(
    today.toISOString().split('T')[0],
    forecastEndDate.toISOString().split('T')[0],
    [1, 2, 3, 4, 5], // рабочие дни Пн-Пт
    vacations
  );

  // Рассчитываем емкость на оставшийся расширенный период
  const remainingCapacity = remainingWorkingDays * 8; // 8 часов в день

  // Собираем все планы пользователя
  const futurePlannedHours = userPlans.reduce((total, plan) => {
    const plannedHours = (plan.internal_hours || 0);
    
    // Учитываем только часы, которые еще не отработаны
    const actualHours = userTimeEntries
      .filter(entry => entry.project_id === plan.project_id)
      .reduce((sum, entry) => sum + entry.hours, 0);
    
    return total + Math.max(0, plannedHours - actualHours);
  }, 0);

  // Распределяем запланированные часы по оставшимся дням расширенного периода
  const dailyPlannedLoad = remainingWorkingDays > 0 ? futurePlannedHours / remainingWorkingDays : 0;
  
  // Рассчитываем общую загрузку (уже отработанные + запланированные)
  const completedHours = userTimeEntries
    .filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= periodStart && entryDate <= periodEnd;
    })
    .reduce((sum, entry) => sum + entry.hours, 0);

  // Общая емкость с учетом расширенного периода
  const totalWorkingDays = calculateWorkingDays(
    period.start,
    forecastEndDate.toISOString().split('T')[0],
    [1, 2, 3, 4, 5],
    vacations
  );
  
  const totalCapacity = totalWorkingDays * 8;
  const totalLoad = completedHours + futurePlannedHours;
  const utilizationRate = totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;

  return {
    remainingWorkingDays,
    remainingCapacity,
    futurePlannedHours,
    completedHours,
    totalLoad,
    totalCapacity,
    utilizationRate,
    dailyPlannedLoad,
    isOverloaded: utilizationRate > 100,
    overloadPercentage: utilizationRate > 100 ? utilizationRate - 100 : 0,
    forecastPeriod: {
      start: period.start,
      end: forecastEndDate.toISOString().split('T')[0],
      horizonMonth
    }
  };
}

export default function PersonView({ 
  deptAgg = [], 
  projects = [],
  horizonMonth = 1 // Значение по умолчанию 1 месяц
}: PersonViewProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const title = "Детализация по сотруднику";
  
  // Используем хук алертов для получения всех алертов
  const { alerts: allAlerts } = useAlerts();

  // Получаем период из выбранного отдела
  const period = useMemo(() => {
    if (!selectedDepartment || !deptAgg || !Array.isArray(deptAgg)) return null;
    
    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );
    
    return selectedDept ? {
      start: selectedDept.period_start,
      end: selectedDept.period_end
    } : null;
  }, [deptAgg, selectedDepartment]);

  // Получаем список всех отделов
  const departments = useMemo(() => {
    if (!deptAgg || !Array.isArray(deptAgg)) return [];
    return deptAgg.map(dept => ({
      id: dept.department.id,
      name: dept.department.name,
      userCount: dept.department.users?.filter(u => u.isActive).length || 0,
      period_start: dept.period_start,
      period_end: dept.period_end
    })).filter(dept => dept.userCount > 0);
  }, [deptAgg]);

  // Получаем список пользователей в выбранном отделе
  const users = useMemo(() => {
    if (!selectedDepartment || !deptAgg || !Array.isArray(deptAgg)) return [];
    
    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );

    if (!selectedDept || !selectedDept.department.users) return [];

    return selectedDept.department.users
      .filter(user => user.isActive)
      .map(user => ({
        id: user.id,
        name: user.name,
        loadPct: user.capacity_hours && user.capacity_hours > 0 
          ? (user.demand_hours / user.capacity_hours) * 100 
          : 0,
        capacity: user.capacity_hours || 0,
        demand: user.demand_hours || 0,
        forecast: user.forecast_hours || 0,
        status: user.status || 'норма'
      }))
      .sort((a, b) => b.loadPct - a.loadPct);
  }, [deptAgg, selectedDepartment]);

  // Получаем данные выбранного пользователя
  const userData = useMemo(() => {
    if (!selectedDepartment || !selectedUser || !deptAgg || !Array.isArray(deptAgg)) return null;
    
    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );

    if (!selectedDept || !selectedDept.department.users) return null;

    const user = selectedDept.department.users.find(u => u.id === parseInt(selectedUser));
    if (!user) return null;

    return user;
  }, [deptAgg, selectedDepartment, selectedUser]);

  // Получаем активные отпуска в периоде
  const activeVacations = useMemo(() => {
    if (!userData?.vacations || !period) return [];
    return getActiveVacationsInPeriod(userData.vacations, period);
  }, [userData, period]);

  // Фильтруем time_entries по периоду
  const filteredTimeEntries = useMemo(() => {
    if (!userData || !userData.time_entries || !period) return [];
    
    return userData.time_entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const periodStart = new Date(period.start);
      const periodEnd = new Date(period.end);
      return entryDate >= periodStart && entryDate <= periodEnd;
    });
  }, [userData, period]);

  // Фильтруем планы по периоду и исключаем проекты без дат
  const filteredPlans = useMemo(() => {
    if (!userData || !userData.plans || !period) return [];
    
    return userData.plans.filter(plan => {
      if (!plan.isActive) return false;
      
      // Исключаем проекты без дат начала и окончания
      if (!plan.project_start_date && !plan.project_end_date) return false;
      
      const planStart = plan.project_start_date ? new Date(plan.project_start_date) : null;
      const planEnd = plan.project_end_date ? new Date(plan.project_end_date) : null;
      const periodStart = new Date(period.start);
      const periodEnd = new Date(period.end);
      
      // Проверяем пересечение периодов
      if (planStart && planEnd) {
        return planStart <= periodEnd && planEnd >= periodStart;
      } else if (planStart && !planEnd) {
        return planStart <= periodEnd;
      } else if (!planStart && planEnd) {
        return planEnd >= periodStart;
      }
      
      return false;
    });
  }, [userData, period]);

  // Собираем данные по проектам с названиями и фактическими часами
  const projectsWithDetails = useMemo(() => {
    return filteredPlans.map(plan => {
      const project = projects.find(p => p.id === plan.project_id);
      let projectName = `Проект ${plan.project_id}`;
      
      if (project) {
        // Берем project_name или name, обрезаем если слишком длинное
        const rawName = project.project_name || project.name || projectName;
        projectName = rawName.length > 50 ? rawName.substring(0, 50) + '...' : rawName;
      }
      
      // Считаем фактические часы по проекту за период
      const actualHours = filteredTimeEntries
        .filter(entry => entry.project_id === plan.project_id)
        .reduce((sum, entry) => sum + entry.hours, 0);
      
      return {
        ...plan,
        projectName,
        actualHours,
        totalPlannedHours: (plan.internal_hours || 0)
      };
    });
  }, [filteredPlans, projects, filteredTimeEntries]);

  // Рассчитываем прогноз загрузки с учетом горизонта планирования
  const forecastData = useMemo(() => {
    if (!userData || !period || !filteredPlans.length) return null;

    return calculateUserForecast(
      filteredPlans,
      userData.time_entries as TimeEntry[],
      userData.capacity_hours || 0,
      period,
      userData.vacations || [],
      horizonMonth // Передаем параметр горизонта планирования
    );
  }, [userData, period, filteredPlans, horizonMonth]);

  // Пересчитываем метрики с использованием правильной функции распределения часов
  const recalculatedMetrics = useMemo(() => {
    if (!userData || !period) return null;

    // Используем правильную функцию для расчета распределения часов
    const hoursDistribution = calculateHoursDistribution(
      userData.time_entries as TimeEntry[],
      projects,
      period.start,
      period.end
    );

    // Получаем часы по типам из распределения
    const commercialHours = hoursDistribution.find(item => item.type === 'commercial')?.hours || 0;
    const presaleHours = hoursDistribution.find(item => item.type === 'presale')?.hours || 0;
    const internalHours = hoursDistribution.find(item => item.type === 'internal')?.hours || 0;
    const otherHours = hoursDistribution.find(item => item.type === 'other')?.hours || 0;

    const totalHours = commercialHours + presaleHours + internalHours + otherHours;

    return {
      totalHours,
      hoursDistribution,
      commercialHours,
      presaleHours,
      internalHours,
      otherHours
    };
  }, [userData, period, projects]);

  // Анализ соответствия нормам по типам часов с учетом отпусков
  const normAnalysis = useMemo(() => {
    if (!userData || !userData.norm || !recalculatedMetrics || !period) return null;

    const norm = userData.norm;
    
    // Рассчитываем ожидаемые часы за период с учетом отпусков
    const workingDaysCount = calculateWorkingDays(
      period.start, 
      period.end, 
      norm.working_days,
      userData.vacations || []
    );
    
    const expectedCommercial = norm.hours_commercial * workingDaysCount;
    const expectedPresale = norm.hours_presale * workingDaysCount;
    const expectedInternal = norm.hours_internal * workingDaysCount;
    
    const actualCommercial = recalculatedMetrics.commercialHours;
    const actualPresale = recalculatedMetrics.presaleHours;
    const actualInternal = recalculatedMetrics.internalHours;
    
    // Рассчитываем соответствие по каждому типу (минимум 100%)
    const commercialCompliance = expectedCommercial > 0 ? Math.min(100, (actualCommercial / expectedCommercial) * 100) : 100;
    const presaleCompliance = expectedPresale > 0 ? Math.min(100, (actualPresale / expectedPresale) * 100) : 100;
    const internalCompliance = expectedInternal > 0 ? Math.min(100, (actualInternal / expectedInternal) * 100) : 100;
    
    // Общее соответствие - среднее взвешенное по ожидаемым часам
    const totalExpected = expectedCommercial + expectedPresale + expectedInternal;
    const totalActual = actualCommercial + actualPresale + actualInternal;
    
    const weightedCompliance = totalExpected > 0 ? (
      (commercialCompliance * expectedCommercial + 
       presaleCompliance * expectedPresale + 
       internalCompliance * expectedInternal) / totalExpected
    ) : 100;

    return {
      commercial: {
        expected: expectedCommercial,
        actual: actualCommercial,
        compliance: commercialCompliance,
        status: commercialCompliance >= 80 ? 'good' : commercialCompliance >= 60 ? 'warning' : 'bad'
      },
      presale: {
        expected: expectedPresale,
        actual: actualPresale,
        compliance: presaleCompliance,
        status: presaleCompliance >= 80 ? 'good' : presaleCompliance >= 60 ? 'warning' : 'bad'
      },
      internal: {
        expected: expectedInternal,
        actual: actualInternal,
        compliance: internalCompliance,
        status: internalCompliance >= 80 ? 'good' : internalCompliance >= 60 ? 'warning' : 'bad'
      },
      totalCompliance: weightedCompliance,
      totalExpected,
      totalActual,
      workingDaysCount,
      vacationDaysCount: activeVacations.length > 0 ? 
        calculateWorkingDays(period.start, period.end, norm.working_days, []) - workingDaysCount : 0
    };
  }, [userData, recalculatedMetrics, period, activeVacations]);

  // Подготовка данных для графиков с учетом периода
  const chartData = useMemo(() => {
    if (!userData || !period) return { lineData: [], pieData: [], barData: [] };

    // Получаем все даты отпусков для исключения из графика
    const vacationDates = new Set<string>();
    activeVacations.forEach(vacation => {
      const start = new Date(vacation.start_date);
      const end = new Date(vacation.end_date);
      const current = new Date(start);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        vacationDates.add(dateStr);
        current.setDate(current.getDate() + 1);
      }
    });

    // Данные для линейного графика (только за период)
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const lineData = Array.from({ length: Math.min(daysDiff + 1, 90) }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEntries = filteredTimeEntries.filter(entry => entry.date === dateStr);
      const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
      
      // Определяем норму для этого дня (0 для отпуска и нерабочих дней)
      const dayOfWeek = date.getDay();
      const isWorkingDay = userData.norm?.working_days.includes(dayOfWeek) || false;
      const isVacationDay = vacationDates.has(dateStr);
      const dailyNorm = (isWorkingDay && !isVacationDay) ? 8 : 0;
      
      return {
        date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        fullDate: dateStr,
        fact: totalHours,
        plan: dailyNorm,
        isWeekend: [0, 6].includes(dayOfWeek),
        isWorkingDay,
        isVacationDay
      };
    });

    // Данные для круговой диаграммы из пересчитанных метрик
    const pieData = recalculatedMetrics?.hoursDistribution
      .filter(dist => dist.hours > 0) // Фильтруем нулевые значения
      .map(dist => ({
        name: dist.type === 'commercial' ? 'Коммерческие' : 
              dist.type === 'presale' ? 'Presale' : 
              dist.type === 'internal' ? 'Внутренние' : 'Другие',
        value: dist.hours, // Используем hours для значения
        percentage: dist.percentage,
        type: dist.type,
        hours: dist.hours // Сохраняем hours для tooltip
      })) || [];

    // Данные для столбчатой диаграммы (проекты)
    const barData = projectsWithDetails
      .slice(0, 10) // Топ 10 проектов
      .map(project => ({
        name: project.projectName,
        planned: project.totalPlannedHours,
        actual: project.actualHours,
        difference: project.actualHours - project.totalPlannedHours
      }));

    return { lineData, pieData, barData };
  }, [userData, period, filteredTimeEntries, recalculatedMetrics, projectsWithDetails, activeVacations]);

  // Генерация алертов для текущего пользователя из общего списка алертов
  const alerts = useMemo(() => {
    if (!userData) return [];
    
    // Фильтруем алерты для текущего пользователя
    return allAlerts.filter(alert => 
      alert.entityType === 'user' && alert.entityId === userData.id
    );
  }, [allAlerts, userData]);

  // Автоматически выбираем первый отдел и пользователя
  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0].name);
    }
  }, [departments, selectedDepartment]);

  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUser(users[0].id.toString());
    }
  }, [users, selectedUser]);

  if (!selectedDepartment || !selectedUser) {
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
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">{title}</div>
          <HintTooltip hintKey="personView" />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Фильтр отделов */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Отдел:</span>
            <select 
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedUser('');
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-48"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>
                  {dept.name} ({dept.userCount} сотруд.)
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр пользователей */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Сотрудник:</span>
            <select 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-64"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.loadPct.toFixed(0)}% загрузки)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!userData ? (
        <Card>
          <div className="p-8 text-center text-gray-500">
            Не удалось загрузить данные пользователя
          </div>
        </Card>
      ) : (
        <>
          {/* Основные метрики */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm opacity-60">Загрузка</div>
                <HintTooltip hintKey="loadPct" />
              </div>
              <div className="text-2xl font-bold">
                {userData.capacity_hours && userData.capacity_hours > 0 
                  ? ((userData.demand_hours / userData.capacity_hours) * 100).toFixed(0)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {userData.demand_hours.toFixed(1)} / {userData.capacity_hours.toFixed(1)} ч
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {userData.status}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm opacity-60">Прогноз</div>
                <HintTooltip hintKey="forecast" />
              </div>
              <div className="text-2xl font-bold">{userData.forecast_hours.toFixed(1)} ч</div>
              <div className="text-xs text-gray-500 mt-1">
                {userData.forecast_hours > userData.demand_hours ? '+' : ''}
                {(userData.forecast_hours - userData.demand_hours).toFixed(1)} ч к факту
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm opacity-60">Соответствие нормам</div>
                <HintTooltip hintKey="normCompliance" />
              </div>
              <div className="text-2xl font-bold">
                {normAnalysis ? normAnalysis.totalCompliance.toFixed(0) : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                по типам часов
              </div>
              {normAnalysis && normAnalysis.vacationDaysCount > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  {normAnalysis.vacationDaysCount} дн. отпуска
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="text-sm opacity-60">Активных проектов</div>
                <HintTooltip hintKey="activeProjects" />
              </div>
              <div className="text-2xl font-bold">
                {projectsWithDetails.length || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {activeVacations.length} активных отпусков
              </div>
            </Card>
          </div>

          {/* Прогноз загрузки с учетом горизонта планирования */}
          {forecastData && (
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Прогноз загрузки на {horizonMonth} мес. вперед
                <HintTooltip hintKey="personForecast" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`p-4 rounded-lg ${
                  forecastData.isOverloaded ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="text-sm font-medium text-center mb-2">Общая загрузка</div>
                  <div className={`text-2xl font-bold text-center mb-2 ${
                    forecastData.isOverloaded ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {forecastData.utilizationRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {forecastData.totalLoad.toFixed(0)} / {forecastData.totalCapacity.toFixed(0)} ч
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-sm font-medium text-center mb-2">Оставшаяся емкость</div>
                  <div className="text-2xl font-bold text-center mb-2 text-blue-600">
                    {forecastData.remainingCapacity.toFixed(0)} ч
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {forecastData.remainingWorkingDays} рабочих дней
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-sm font-medium text-center mb-2">Запланировано часов</div>
                  <div className="text-2xl font-bold text-center mb-2 text-orange-600">
                    {forecastData.futurePlannedHours.toFixed(0)} ч
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {forecastData.dailyPlannedLoad.toFixed(1)} ч/день
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-sm font-medium text-center mb-2">Уже выполнено</div>
                  <div className="text-2xl font-bold text-center mb-2 text-purple-600">
                    {forecastData.completedHours.toFixed(0)} ч
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    в текущем периоде
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <div><strong>Период прогноза:</strong> с {new Date(forecastData.forecastPeriod.start).toLocaleDateString('ru-RU')} по {new Date(forecastData.forecastPeriod.end).toLocaleDateString('ru-RU')}</div>
                <div><strong>Горизонт планирования:</strong> {horizonMonth} месяц(ев)</div>
              </div>

              {forecastData.isOverloaded && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <span>⚠️</span>
                    <span>Перегрузка в прогнозе на {horizonMonth} мес.</span>
                  </div>
                  <div className="text-sm text-red-700 mt-2">
                    Сотрудник перегружен на {forecastData.overloadPercentage.toFixed(0)}% ({forecastData.futurePlannedHours.toFixed(0)} запланированных часов при оставшейся емкости {forecastData.remainingCapacity.toFixed(0)} часов).
                    Рекомендуется перераспределить нагрузку или нанять дополнительных сотрудников.
                  </div>
                </div>
              )}
            </Card>
          )}
           {/* Алерты */}
          {alerts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Уведомления и рекомендации
                <HintTooltip hintKey="personAlerts" />
              </div>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {alert.severity === 'critical' && '🔴'}
                      {alert.severity === 'warning' && '🟡'}
                      {alert.severity === 'info' && '🔵'}
                      {alert.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Графики */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* График загрузки по дням */}
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Загрузка по дням (план vs факт)
                <HintTooltip hintKey="personDailyLoad" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="plan" 
                      stroke="#8884d8" 
                      name="План (норма)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="fact" 
                      stroke="#82ca9d" 
                      name="Факт"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Распределение часов */}
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Распределение часов по типам
                <HintTooltip hintKey="hoursDistribution" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.type === 'commercial' ? COLORS.commercial :
                            entry.type === 'presale' ? COLORS.presale :
                            entry.type === 'internal' ? COLORS.internal : COLORS.other
                          } 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        // Показываем часы и проценты в tooltip
                        const hours = props.payload.hours || value;
                        const percentage = props.payload.percentage;
                        return [`${hours.toFixed(1)} ч (${percentage?.toFixed(1)}%)`, 'Часы'];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Тепловая карта активности */}
          {period && userData.norm && (
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Тепловая карта активности
                <HintTooltip hintKey="personHeatmap" />
              </div>
              <UserHeatmap 
                timeEntries={filteredTimeEntries}
                period={period}
                norm={userData.norm}
                vacations={userData.vacations || []}
              />
              <div className="text-xs text-gray-500 mt-2 text-center">
                💡 Показывает интенсивность работы по дням. Учитываются только рабочие дни из норм сотрудника.
                Серые ячейки - дни отпуска.
              </div>
            </Card>
          )}

          {/* Анализ соответствия нормам */}
          {normAnalysis && (
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Анализ соответствия нормам по типам часов
                <HintTooltip hintKey="normAnalysis" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* Коммерческие часы */}
                <div className={`p-4 rounded-lg ${
                  normAnalysis.commercial.status === 'good' ? 'bg-green-50 border border-green-200' :
                  normAnalysis.commercial.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium text-center mb-2">Коммерческие</div>
                  <div className="text-2xl font-bold text-center mb-2">
                    {normAnalysis.commercial.compliance.toFixed(0)}%
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {normAnalysis.commercial.actual.toFixed(1)} / {normAnalysis.commercial.expected.toFixed(1)} ч
                  </div>
                </div>

                {/* Presale часы */}
                <div className={`p-4 rounded-lg ${
                  normAnalysis.presale.status === 'good' ? 'bg-green-50 border border-green-200' :
                  normAnalysis.presale.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium text-center mb-2">Presale</div>
                  <div className="text-2xl font-bold text-center mb-2">
                    {normAnalysis.presale.compliance.toFixed(0)}%
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {normAnalysis.presale.actual.toFixed(1)} / {normAnalysis.presale.expected.toFixed(1)} ч
                  </div>
                </div>

                {/* Внутренние часы */}
                <div className={`p-4 rounded-lg ${
                  normAnalysis.internal.status === 'good' ? 'bg-green-50 border border-green-200' :
                  normAnalysis.internal.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="font-medium text-center mb-2">Внутренние</div>
                  <div className="text-2xl font-bold text-center mb-2">
                    {normAnalysis.internal.compliance.toFixed(0)}%
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {normAnalysis.internal.actual.toFixed(1)} / {normAnalysis.internal.expected.toFixed(1)} ч
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <div>Общее соответствие: <strong>{normAnalysis.totalCompliance.toFixed(1)}%</strong></div>
                <div>Всего часов: {normAnalysis.totalActual.toFixed(1)} / {normAnalysis.totalExpected.toFixed(1)}</div>
                <div>Рабочих дней в периоде: {normAnalysis.workingDaysCount}</div>
                {normAnalysis.vacationDaysCount > 0 && (
                  <div>Дней отпуска в периоде: {normAnalysis.vacationDaysCount}</div>
                )}
              </div>
            </Card>
          )}

          {/* Проекты пользователя */}
          {projectsWithDetails.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 font-semibold mb-4">
                Проекты сотрудника
                <HintTooltip hintKey="personProjects" />
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Название проекта</th>
                      <th className="p-2 text-left">Контрактные часы</th>
                      <th className="p-2 text-left">Внутренние часы</th>
                      <th className="p-2 text-left">Факт часов</th>
                      <th className="p-2 text-left">Разница</th>
                      <th className="p-2 text-left">Период</th>
                      <th className="p-2 text-left">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsWithDetails.map((project, index) => {
                      const difference =  project.totalPlannedHours - project.actualHours;
                      const differenceClass = difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600';
                      
                      return (
                        <tr key={project.id} className="border-b border-gray-100">
                          <td className="p-2" title={project.projectName}>
                            {project.projectName}
                          </td>
                          <td className="p-2">{project.contracted_hours || 0} ч</td>
                          <td className="p-2">{project.internal_hours || 0} ч</td>
                          <td className="p-2 font-medium">{project.actualHours.toFixed(1)} ч</td>
                          <td className={`p-2 font-medium ${differenceClass}`}>
                            {difference > 0 ? '+' : ''}{difference.toFixed(1)} ч
                          </td>
                          <td className="p-2">
                            {project.project_start_date 
                              ? new Date(project.project_start_date).toLocaleDateString('ru-RU')
                              : '—'
                            } →{' '}
                            {project.project_end_date
                              ? new Date(project.project_end_date).toLocaleDateString('ru-RU')
                              : '—'
                            }
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              project.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

         
        </>
      )}
    </div>
  );
}