'use client';
import { Card, Button } from '@/components/ui';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { aggregateMonthly } from '@/lib/forecast';

export default function ForecastView({ horizon=3 }:{ horizon?:1|2|3 }){
  const months = aggregateMonthly(horizon);
  const alerts = months.flatMap(m => {
    const load = m.capacity>0 ? m.demand/m.capacity : 0;
    const list:any[] = [];
    if (load>1.2 && m.confidence>0.7) list.push({ message:`Перегруз в ${m.month} (${(load*100).toFixed(0)}%)`});
    if (load<0.7) list.push({ message:`Недогруз в ${m.month} (${(load*100).toFixed(0)}%)`});
    return list;
  });

  return (<div className="space-y-6">
    <Card>
      <div className="font-semibold mb-2">Прогноз загрузки (Confirmed / Presale×p / Internal)</div>
      <div className="h-72">
        <ResponsiveContainer>
          <AreaChart data={months}>
            <XAxis dataKey="month" /><YAxis /><Tooltip />
            <Area dataKey="confirmed" stackId="1" type="monotone" name="Confirmed" />
            <Area dataKey="presaleProb" stackId="1" type="monotone" name="Presale×p" />
            <Area dataKey="internal" stackId="1" type="monotone" name="Internal" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-40 mt-4">
        <ResponsiveContainer>
          <LineChart data={months}>
            <XAxis dataKey="month" /><YAxis /><Tooltip />
            <Line dataKey="capacity" type="monotone" name="Capacity" />
            <Line dataKey="demand" type="monotone" name="Demand" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2 mt-3">
        {months.map(m=> (<span key={m.month} className="px-2 py-1 rounded-xl text-xs bg-neutral-100">{m.month} · conf {(m.confidence*100).toFixed(0)}%</span>))}
      </div>
    </Card>

    <Card>
      <div className="font-semibold mb-2">Forecast-алерты</div>
      <div className="flex flex-wrap gap-2">{alerts.map((a,i)=>(<span key={i} className="px-2 py-1 rounded-xl bg-neutral-100 text-xs">{a.message}</span>))}</div>
    </Card>

    <Card>
      <div className="font-semibold mb-2">What-If</div>
      <div className="flex gap-2">
        <Button onClick={()=>alert('Виртуальный найм: +1 FTE с M+2 (mock)')}>+ Виртуальный найм</Button>
        <Button onClick={()=>alert('Добавлен пресейл p=0.6 (mock)')}>+ Пресейл</Button>
        <Button onClick={()=>alert('Сдвиг сроков +2 недели (mock)')}>⇄ Сдвиг сроков</Button>
      </div>
    </Card>
  </div>);
}
