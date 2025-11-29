// /var/www/klimchenkovdev/dashboards/web/components/charts/ExecView/DepartmentsTable.tsx
'use client';
import { Button } from "@/components/ui";
import { exportToXLSX } from "@/lib/xlsxExport";
import { DeptAggregates } from "@/lib/dataModel";
import HintTooltip from "../../HintTooltip";

interface DepartmentsTableProps {
  deptTable: DeptAggregates[];
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

export default function DepartmentsTable({ deptTable }: DepartmentsTableProps) {
  const handleExport = () => {
    exportToXLSX("departments.xlsx", { 
      Departments: deptTable.map(d => ({
        Department: d.department.name, 
        Capacity: d.capacity, 
        Demand: d.demand, 
        Forecast: d.forecast, 
        LoadPct: d.loadPct, 
        Status: d.status, 
        DataQuality: d.dataQuality
      }))
    });
  };

  // Calculate summary statistics
  const totalCapacity = deptTable.reduce((sum, dept) => sum + dept.capacity, 0);
  const totalDemand = deptTable.reduce((sum, dept) => sum + dept.demand, 0);
  const totalForecast = deptTable.reduce((sum, dept) => sum + dept.forecast, 0);
  const avgLoad = deptTable.reduce((sum, dept) => sum + dept.loadPct, 0) / deptTable.length;
  const avgQuality = deptTable.reduce((sum, dept) => sum + dept.dataQuality, 0) / deptTable.length;

  const overloadCount = deptTable.filter(d => d.status === 'перегруз').length;
  const underloadCount = deptTable.filter(d => d.status === 'малая загрузка').length;
  const optimalCount = deptTable.filter(d => d.status === 'норма').length;

  // Get status color and icon
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

  // Get quality indicator
  const getQualityConfig = (quality: number) => {
    if (quality >= 0.8) {
      return { 
        color: COLORS.qualityHigh, 
        bgColor: `${COLORS.qualityHigh}15`,
        level: 'Высокая'
      };
    } else if (quality >= 0.6) {
      return { 
        color: COLORS.qualityMedium, 
        bgColor: `${COLORS.qualityMedium}15`,
        level: 'Средняя'
      };
    } else {
      return { 
        color: COLORS.qualityLow, 
        bgColor: `${COLORS.qualityLow}15`,
        level: 'Низкая'
      };
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">Анализ отделов</div>
          <HintTooltip hintKey="departmentsTable" />
        </div>
        <Button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Экспорт в XLSX
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{deptTable.length}</div>
          <div className="text-sm text-blue-600">Всего отделов</div>
          <div className="text-xs text-gray-600 mt-1">
            {optimalCount} опт. / {underloadCount} мало / {overloadCount} перегр.
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{avgLoad.toFixed(1)}%</div>
          <div className="text-sm text-green-600">Ср. загрузка</div>
          <div className="text-xs text-gray-600 mt-1">
            {totalDemand.toFixed(0)} / {totalCapacity.toFixed(0)} ч
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">{totalForecast.toFixed(0)}</div>
          <div className="text-sm text-purple-600">Прогноз часов</div>
          <div className="text-xs text-gray-600 mt-1">
            +{(totalForecast - totalDemand).toFixed(0)} ч к факту
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{(avgQuality * 100).toFixed(0)}%</div>
          <div className="text-sm text-yellow-600">Ср. дисциплина</div>
          <div className="text-xs text-gray-600 mt-1">
            Качество данных
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b border-gray-200">
              <th className="p-3 font-semibold text-gray-700">Отдел</th>
              <th className="p-3 font-semibold text-gray-700 text-right">План</th>
              <th className="p-3 font-semibold text-gray-700 text-right">Факт</th>
              <th className="p-3 font-semibold text-gray-700 text-right">Прогноз</th>
              <th className="p-3 font-semibold text-gray-700 text-center">Загрузка</th>
              <th className="p-3 font-semibold text-gray-700 text-center">Статус</th>
              <th className="p-3 font-semibold text-gray-700 text-center">Качество данных</th>
            </tr>
          </thead>
          <tbody>
            {deptTable.map((dept, index) => {
              const statusConfig = getStatusConfig(dept.status, dept.loadPct);
              const qualityConfig = getQualityConfig(dept.dataQuality);
              const utilization = dept.capacity > 0 ? (dept.demand / dept.capacity) : 0;
              
              return (
                <tr 
                  key={index} 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 font-medium text-gray-900">
                    {dept.department.name}
                  </td>
                  <td className="p-3 text-right text-gray-700">
                    {dept.capacity.toFixed(0)} ч
                  </td>
                  <td className="p-3 text-right text-gray-700">
                    {dept.demand.toFixed(0)} ч
                  </td>
                  <td className="p-3 text-right text-gray-700">
                    <span className={dept.forecast > dept.demand ? "text-green-600 font-medium" : "text-gray-700"}>
                      {dept.forecast.toFixed(0)} ч
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-sm font-medium text-gray-700">
                        {dept.loadPct.toFixed(0)}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, dept.loadPct)}%`,
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
                      <span>{dept.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: qualityConfig.bgColor,
                          color: qualityConfig.color
                        }}
                      >
                        {(dept.dataQuality * 100).toFixed(0)}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div 
                          className="h-1 rounded-full"
                          style={{
                            width: `${dept.dataQuality * 100}%`,
                            backgroundColor: qualityConfig.color
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="font-semibold text-gray-700 mb-2">Легенда статусов:</div>
          <div className="space-y-1">
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
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="font-semibold text-gray-700 mb-2">Легенда Качество данных:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Высокая (&gt;80%) - отличное качество данных</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Средняя (60-80%) - приемлемое качество</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Низкая (&lt;60%) - требуется улучшение</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}