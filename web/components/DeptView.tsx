'use client';
import { Card } from "./ui";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function DeptView({ stacked, table, heatmap, alerts, quality }:{ stacked:any[]; table:any[]; heatmap:{date:string; value:number}[]; alerts:any[]; quality:number }){
  return (
    <div className="space-y-4">
      <Card>
        <div className="font-semibold mb-2">Нагрузка сотрудников по типам</div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={stacked}>
              <XAxis dataKey="name" /><YAxis /><Tooltip />
              <Bar dataKey="commercial" stackId="1" />
              <Bar dataKey="presale" stackId="1" />
              <Bar dataKey="internal" stackId="1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Таблица</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">Сотрудник</th><th className="p-2">% загрузки</th><th className="p-2">План</th><th className="p-2">Факт</th><th className="p-2">Прогноз</th><th className="p-2">Статус</th></tr></thead>
            <tbody>
              {table.map((r,i)=>(
                <tr key={i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.loadPct.toFixed(0)}%</td>
                  <td className="p-2">{r.capacity.toFixed(1)}</td>
                  <td className="p-2">{r.demand.toFixed(1)}</td>
                  <td className="p-2">{r.forecast.toFixed(1)}</td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Heatmap 30 дней (интенсивность часов)</div>
        <div className="grid grid-cols-15 gap-1">
          {heatmap.map((d, i)=> (
            <div key={i} title={d.date} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(37,99,235,${Math.min(1, d.value/8)})`}} />
          ))}
        </div>
        <div className="text-xs opacity-60 mt-1">Чем темнее, тем больше часов</div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Алерты</div>
        <div className="flex flex-wrap gap-2">
          {alerts.map((a:any, i:number)=> (
            <div key={i} className="px-3 py-2 rounded-xl bg-neutral-100">{a.message}</div>
          ))}
        </div>
        <div className="mt-2 text-sm">Data Quality: {(quality*100).toFixed(0)}%</div>
      </Card>
    </div>
  );
}
