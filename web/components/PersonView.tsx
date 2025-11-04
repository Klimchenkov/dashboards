'use client';
import { Card } from "./ui";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export default function PersonView({ kpi, line, pie, timeline, alerts }:{ kpi:any; line:any[]; pie:any[]; timeline:any[]; alerts:any[] }){
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <Card><div className="text-sm opacity-60">Средняя загрузка</div><div className="text-3xl font-bold">{kpi.avgLoad.toFixed(0)}%</div></Card>
        <Card><div className="text-sm opacity-60">Дней переработки</div><div className="text-3xl font-bold">{kpi.overDays}</div></Card>
        <Card><div className="text-sm opacity-60">Пустые дни</div><div className="text-3xl font-bold">{kpi.emptyDays}</div></Card>
      </div>

      <Card>
        <div className="font-semibold mb-2">План vs Факт</div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={line}>
              <XAxis dataKey="date" /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="plan" />
              <Line type="monotone" dataKey="fact" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold mb-2">Распределение часов</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="type" label>
                  {pie.map((_,i)=><Cell key={i} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="font-semibold mb-2">Project Timeline</div>
          <div className="space-y-2">
            {timeline.map((t,i)=>(
              <div key={i} className="text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="h-2 bg-neutral-200 rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${t.progress*100}%` }} />
                </div>
                <div className="text-xs opacity-60">{t.start} → {t.end}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-2">Алерты</div>
        <div className="flex flex-wrap gap-2">
          {alerts.map((a:any,i:number)=>(<div key={i} className="px-3 py-2 rounded-xl bg-neutral-100">{a.message}</div>))}
        </div>
        <div className="text-sm mt-2">ℹ️ Как посчитано — см. раздел «Как посчитано»</div>
      </Card>
    </div>
  );
}
