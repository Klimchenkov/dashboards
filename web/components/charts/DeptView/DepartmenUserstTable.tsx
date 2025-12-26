// /components/charts/DeptView/DepartmentTable.tsx
'use client';
import { useState, useMemo } from 'react';
import { Card, Button } from "@/components/ui";
import { exportToXLSX } from "@/lib/xlsxExport";
import { DeptAggregates } from "@/lib/dataModel";
import HintTooltip from "../../HintTooltip";

interface DepartmentUsersTableProps {
  deptAgg?: DeptAggregates[];
  title?: string;
}

const COLORS = {
  optimal: "#53A58E",      // Green for optimal load
  underload: "#87B1DE",    // Blue for underload
  overload: "#EC694C",     // Red for overload
  qualityHigh: "#53A58E",  // Green for high quality
  qualityMedium: "#E7C452", // Yellow for medium quality
  qualityLow: "#EC694C",   // Red for low quality
  export: "#45515C"        // Dark for export button
};

export function DepartmentUsersTable({ 
  deptAgg = [], 
  title = "Детализация по сотрудникам" 
}: DepartmentUsersTableProps) {
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
  const tableData = useMemo(() => {
    if (!selectedDepartment || !deptAgg || !Array.isArray(deptAgg)) {
      return [];
    }

    const selectedDept = deptAgg.find(dept => 
      dept.department.name === selectedDepartment
    );

    if (!selectedDept || !selectedDept.department.users) {
      return [];
    }

    // Преобразуем пользователей отдела в данные для таблицы
    return selectedDept.department.users
      .filter(user => user.isActive)
      .map(user => {
        const loadPct = user.capacity_hours && user.capacity_hours > 0 
          ? (user.demand_hours / user.capacity_hours) * 100 
          : 0;

        return {
          name: user.name || 'Неизвестный сотрудник',
          loadPct,
          capacity: user.capacity_hours || 0,
          demand: user.demand_hours || 0,
          forecast: user.forecast_hours || 0,
          status: getStatusByLoad(loadPct),
          commercialHours: getHoursByType(user.hours_distribution, 'commercial'),
          presaleHours: getHoursByType(user.hours_distribution, 'presale'),
          internalHours: getHoursByType(user.hours_distribution, 'internal'),
          otherHours: getHoursByType(user.hours_distribution, 'other'),
          totalHours: (user.demand_hours || 0)
        };
      })
      .sort((a, b) => b.loadPct - a.loadPct); // Сортируем по убыванию загрузки
  }, [deptAgg, selectedDepartment]);

  // Вспомогательная функция для получения часов по типу
  function getHoursByType(distribution: any[] | undefined, type: string): number {
    if (!distribution || !Array.isArray(distribution)) return 0;
    const item = distribution.find(item => item.type === type);
    return item?.hours || 0;
  }

  // Функция определения статуса по загрузке
  function getStatusByLoad(loadPct: number): string {
    if (loadPct < 70) return 'малая загрузка';
    if (loadPct > 110) return 'перегруз';
    return 'норма';
  }

  // Обработчик экспорта данных
  const handleExport = () => {
    if (!selectedDepartment || tableData.length === 0) return;

    const exportData = tableData.map(user => ({
      'Отдел': selectedDepartment,
      'Сотрудник': user.name,
      'Загрузка %': user.loadPct,
      'Статус': user.status,
      'План (часы)': user.capacity,
      'Факт (часы)': user.demand,
      'Прогноз (часы)': user.forecast,
      'Коммерческие часы': user.commercialHours,
      'Presale часы': user.presaleHours,
      'Внутренние часы': user.internalHours,
      'Другие часы': user.otherHours,
      'Всего часов': user.totalHours
    }));

    exportToXLSX(`сотрудники_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.xlsx`, { 
      'Сотрудники отдела': exportData
    });
  };

  // Получаем конфигурацию статуса
  const getStatusConfig = (status: string, loadPct: number) => {
    switch (status) {
      case 'перегруз':
        return { 
          color: COLORS.overload, 
          bgColor: `${COLORS.overload}15`,
          icon: '⚡',
          description: `Перегруз ${loadPct.toFixed(0)}%`
        };
      case 'малая загрузка':
        return { 
          color: COLORS.underload, 
          bgColor: `${COLORS.underload}15`,
          icon: '💤',
          description: `Малая загрузка ${loadPct.toFixed(0)}%`
        };
      default:
        return { 
          color: COLORS.optimal, 
          bgColor: `${COLORS.optimal}15`,
          icon: '✅',
          description: `Норма ${loadPct.toFixed(0)}%`
        };
    }
  };

  // Статистика по выбранному отделу
  const stats = useMemo(() => {
    if (tableData.length === 0) {
      return {
        totalUsers: 0,
        avgLoad: 0,
        totalCapacity: 0,
        totalDemand: 0,
        totalForecast: 0,
        overloadCount: 0,
        underloadCount: 0,
        optimalCount: 0,
        totalCommercial: 0,
        totalPresale: 0,
        totalInternal: 0,
        totalOther: 0,
        totalHours: 0,
      };
    }

    const totalCapacity = tableData.reduce((sum, user) => sum + user.capacity, 0);
    const totalDemand = tableData.reduce((sum, user) => sum + user.demand, 0);
    const totalForecast = tableData.reduce((sum, user) => sum + user.forecast, 0);
    const avgLoad = tableData.reduce((sum, user) => sum + user.loadPct, 0) / tableData.length;
    
    const overloadCount = tableData.filter(user => user.status === 'перегруз').length;
    const underloadCount = tableData.filter(user => user.status === 'малая загрузка').length;
    const optimalCount = tableData.filter(user => user.status === 'норма').length;

    const totalCommercial = tableData.reduce((sum, user) => sum + user.commercialHours, 0);
    const totalPresale = tableData.reduce((sum, user) => sum + user.presaleHours, 0);
    const totalInternal = tableData.reduce((sum, user) => sum + user.internalHours, 0);
    const totalOther = tableData.reduce((sum, user) => sum + user.otherHours, 0);
    const totalHours = tableData.reduce((sum, user) => sum + user.totalHours, 0);

    return {
      totalUsers: tableData.length,
      avgLoad,
      totalCapacity,
      totalDemand,
      totalForecast,
      overloadCount,
      underloadCount,
      optimalCount,
      totalCommercial,
      totalPresale,
      totalInternal,
      totalOther,
      totalHours
    };
  }, [tableData]);

  // Автоматически выбираем первый отдел, если не выбран
  if (!selectedDepartment && departments.length > 0) {
    setSelectedDepartment(departments[0].name);
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтр */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">{title}</div>
          <HintTooltip hintKey="departmentUsersTable" />
        </div>
        
        <div className="flex items-center gap-3">
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

          {/* Кнопка экспорта */}
          <Button 
            onClick={handleExport}
            disabled={tableData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Экспорт в XLSX
          </Button>
        </div>
      </div>

      {/* Таблица */}
      <Card>
        {tableData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {selectedDepartment 
              ? `В отделе "${selectedDepartment}" нет данных по активным сотрудникам` 
              : 'Выберите отдел для отображения данных'
            }
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left border-b border-gray-200">
                  <th className="p-3 font-semibold text-gray-700">Сотрудник</th>
                  <th className="p-3 font-semibold text-gray-700 text-right">Capacity</th>
                  <th className="p-3 font-semibold text-gray-700 text-right">Demand</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Загрузка</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Статус</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Коммерческие</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Presale</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Архивные</th>
                  <th className="p-3 font-semibold text-gray-700 text-center">Внутренние</th>
                  <th className="p-3 font-semibold text-gray-700 text-right bg-gray-100 border-l-2 border-dashed border-gray-400">Forecast</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((user, index) => {
                  const statusConfig = getStatusConfig(user.status, user.loadPct);
                  const totalUserHours = user.commercialHours + user.presaleHours + user.internalHours + user.otherHours;
                  
                  return (
                    <tr 
                      key={index} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {user.capacity.toFixed(0)} ч
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {user.demand.toFixed(0)} ч
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-sm font-medium text-gray-700">
                            {user.loadPct.toFixed(0)}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, user.loadPct)}%`,
                                backgroundColor: statusConfig.color
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color
                          }}
                        >
                          <span>{statusConfig.icon}</span>
                          <span>{user.status}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {user.commercialHours.toFixed(0)} ч
                        {totalUserHours > 0 && (
                          <div className="text-xs text-gray-500">
                            ({((user.commercialHours / totalUserHours) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {user.presaleHours.toFixed(0)} ч
                        {totalUserHours > 0 && (
                          <div className="text-xs text-gray-500">
                            ({((user.presaleHours / totalUserHours) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {user.otherHours.toFixed(0)} ч
                        {totalUserHours > 0 && (
                          <div className="text-xs text-gray-500">
                            ({((user.otherHours / totalUserHours) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {user.internalHours.toFixed(0)} ч
                        {totalUserHours > 0 && (
                          <div className="text-xs text-gray-500">
                            ({((user.internalHours / totalUserHours) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right bg-gray-100 group-hover:bg-gray-200 border-l-2 border-dashed border-gray-400">
                        <span className="text-gray-700">
                          {user.forecast.toFixed(0)} ч
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Легенда */}
      {tableData.length > 0 && (
        <div className="mt-4 bg-gray-50 p-3 rounded-lg text-xs">
          <div className="font-semibold text-gray-700 mb-2">Легенда статусов загрузки:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Норма (70-110%) - оптимальная загрузка</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Малая загрузка (&lt;70%) - есть резерв</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Перегруз (&gt;110%) - требуется распределение</span>
            </div>
          </div>
        </div>
      )}
       {/* Статистика по отделу */}
      {tableData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalUsers}</div>
            <div className="text-sm text-blue-600">Сотрудников</div>
            <div className="text-xs text-gray-600 mt-1">
              {stats.optimalCount} опт. / {stats.underloadCount} мало / {stats.overloadCount} перегр.
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.avgLoad.toFixed(1)}%</div>
            <div className="text-sm text-green-600">Ср. загрузка</div>
            <div className="text-xs text-gray-600 mt-1">
              {stats.totalDemand.toFixed(0)} / {stats.totalCapacity.toFixed(0)} ч
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.totalForecast.toFixed(0)}</div>
            <div className="text-sm text-purple-600">Прогноз часов</div>
            <div className="text-xs text-gray-600 mt-1">
              +{(stats.totalForecast - stats.totalDemand).toFixed(0)} ч к факту
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.totalCommercial.toFixed(0)}</div>
            <div className="text-sm text-orange-600">Коммерческие ч.</div>
            <div className="text-xs text-gray-600 mt-1">
              {stats.totalHours > 0 ? ((stats.totalCommercial / stats.totalHours) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}