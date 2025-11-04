'use client';
import BacklogAnalysis from './BacklogAnalysis';
import { Card } from '@/components/ui';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
export default function ForecastView({ horizon=3 }:{ horizon?:1|2|3 }){
  const months = Array.from({length: horizon}).map((_,i)=> `M+${i+1}`);
  const series = months.map((m,i)=> ({ m, commercial: 220+i*30, presale: 90+i*20, internal: 70+i*10 }));
  return (<div className="space-y-6">
    <Card><div className="font-semibold mb-2">Gantt-диаграмма назначений</div><div className="text-sm opacity-70">Mock Gantt: добавьте lib при необходимости.</div><div className="h-2 bg-neutral-200 rounded"><div className="h-2 bg-primary rounded w-1/2"/></div></Card>
    <Card><div className="font-semibold mb-2">Прогноз загрузки по месяцам</div><div className="h-64"><ResponsiveContainer><AreaChart data={series}><XAxis dataKey="m"/><YAxis/><Tooltip/><Area dataKey="commercial" stackId="1" type="monotone"/><Area dataKey="presale" stackId="1" type="monotone"/><Area dataKey="internal" stackId="1" type="monotone"/></AreaChart></ResponsiveContainer></div></Card>
    <Card><div className="font-semibold mb-2">What-If симулятор</div><div className="text-sm opacity-70">Виртуальный найм / новый проект (mock)</div><div className="flex gap-2"><button className="px-3 py-2 rounded-2xl bg-primary text-white">+ Виртуальный найм</button><button className="px-3 py-2 rounded-2xl bg-neutral-900 text-white">+ Проект</button></div></Card>
    <BacklogAnalysis />
  </div>);
}
