'use client';
import { Button } from "@/components/ui";
import { exportToXLSX } from "@/lib/xlsxExport";
import { DeptAggregates } from "@/lib/dataModel";

interface DepartmentsTableProps {
  deptTable: DeptAggregates[];
  COLORS: any[];
}

export default function DepartmentsTable({ deptTable, COLORS }: DepartmentsTableProps) {
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

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold">Отделы</div>
        <Button onClick={handleExport}>Экспорт XLSX</Button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Отдел</th>
              <th className="p-2">План</th>
              <th className="p-2">Факт</th>
              <th className="p-2">Прогноз</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Дисциплина</th>
            </tr>
          </thead>
          <tbody>
            {deptTable.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{r.department.name}</td>
                <td className="p-2">{r.capacity.toFixed(1)}</td>
                <td className="p-2">{r.demand.toFixed(1)}</td>
                <td className="p-2">{r.forecast.toFixed(1)}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{(r.dataQuality * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}