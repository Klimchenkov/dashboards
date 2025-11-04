'use client';
import { Card, Button } from "./ui";
import { DeptAggregates } from "@/lib/dataModel";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, ScatterChart, Scatter } from "recharts";
import { exportToXLSX } from "@/lib/xlsxExport";

export default function ExecView({ kpis, areaSeries, pieData, composedData, scatterData, deptTable } : {
  kpis: {avgLoad: number; activeUsers: number; activeProjects: number; dataQuality: number};
  areaSeries: any[];
  pieData: any[];
  composedData: any[];
  scatterData: any[];
  deptTable: DeptAggregates[];
}){
  const COLORS = ["#2563eb","#22c55e","#8b5cf6"];
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Card><div className="text-sm opacity-60">Средняя загрузка</div><div className="text-3xl font-bold">{kpis.avgLoad.toFixed(0)}%</div></Card>
        <Card><div className="text-sm opacity-60">Активные сотрудники</div><div className="text-3xl font-bold">{kpis.activeUsers}</div></Card>
        <Card><div className="text-sm opacity-60">Активные проекты</div><div className="text-3xl font-bold">{kpis.activeProjects}</div></Card>
        <Card><div className="text-sm opacity-60">Data Quality</div><div className="text-3xl font-bold">{(kpis.dataQuality*100).toFixed(0)}%</div></Card>
      </div>

      <Card>
        <div className="font-semibold mb-2">Загрузка по неделям (stacked)</div>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={areaSeries}>
              <XAxis dataKey="week" /><YAxis /><Tooltip />
              <Area dataKey="commercial" stackId="1" type="monotone" />
              <Area dataKey="presale" stackId="1" type="monotone" />
              <Area dataKey="internal" stackId="1" type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold mb-2">Доли типов часов</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="type" label>
                {pieData.map((_,i) => <Cell key={i} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="font-semibold mb-2">Capacity vs Demand по отделам</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={composedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" /><YAxis /><Tooltip />
                <Bar dataKey="capacity" />
                <Bar dataKey="demand" />
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
              <XAxis dataKey="commercialShare" name="Доля коммерции" /><YAxis dataKey="load" name="Загрузка %" /><Tooltip />
              <Scatter data={scatterData} />
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
