'use client';
import { Card, Button } from '@/components/ui';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function ProjectDetailView({ projectId=1 }:{ projectId?: number | string | null }){
  const kpi = { plan: 1200, fact: 980 };
  const delta = (kpi.fact - kpi.plan)/kpi.plan;
  const burn = kpi.fact / (kpi.plan/2);
  const eac = kpi.fact + Math.max(0, (kpi.plan - kpi.fact)*1.1);
  const status = Math.abs(delta) < 0.1 ? 'on-track' : (delta<0.2 ? 'at-risk' : 'off-track');

  const series = Array.from({length:12}).map((_,i)=> ({ w:`W${i+1}`, plan: (kpi.plan/12)*(i+1), fact: Math.min(kpi.fact, (kpi.fact/10)*(i+1)) }));
  const alloc = Array.from({length:8}).map((_,i)=> ({ name:`User ${i+1}`, hours: 80 + i*10, overload: (i%3===0)? 1: 0 }));

  return (<div className="space-y-4">
    <Card>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Проект #{projectId}</div>
        <span className="px-2 py-1 rounded-xl text-xs" style={{backgroundColor: status==='on-track'?'#dcfce7': status==='at-risk'?'#fef9c3':'#fee2e2'}}>{status}</span>
      </div>
      <div className="grid md:grid-cols-5 gap-3 mt-3">
        <Card><div className="text-xs opacity-60">Бюджет (ч)</div><div className="text-2xl font-bold">{kpi.plan}</div></Card>
        <Card><div className="text-xs opacity-60">Факт (ч)</div><div className="text-2xl font-bold">{kpi.fact}</div></Card>
        <Card><div className="text-xs opacity-60">Δ Plan–Fact</div><div className="text-2xl font-bold">{(delta*100).toFixed(0)}%</div></Card>
        <Card><div className="text-xs opacity-60">Burn-rate</div><div className="text-2xl font-bold">{burn.toFixed(2)}×</div></Card>
        <Card><div className="text-xs opacity-60">EAC (ч)</div><div className="text-2xl font-bold">{Math.round(eac)}</div></Card>
      </div>
    </Card>

    <Card>
      <div className="font-semibold mb-2">Burndown / Plan vs Fact</div>
      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={series}>
            <XAxis dataKey="w" /><YAxis /><Tooltip />
            <Bar dataKey="plan" name="План" />
            <Line dataKey="fact" name="Факт" type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>

    <Card>
      <div className="font-semibold mb-2">Allocation matrix</div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">Участник</th><th className="p-2">Назначено (ч)</th><th className="p-2">Конфликт</th></tr></thead>
          <tbody>{alloc.map((r,i)=>(<tr key={i} className="border-t">
            <td className="p-2">{r.name}</td><td className="p-2">{r.hours}</td>
            <td className="p-2">{r.overload? <span className="text-red-600">Перегруз</span> : 'OK'}</td>
          </tr>))}</tbody>
        </table>
      </div>
    </Card>

    <Card>
      <div className="font-semibold mb-2">Data Quality</div>
      <div className="flex gap-2">
        <span className="px-2 py-1 rounded-xl text-xs bg-green-100">End Date</span>
        <span className="px-2 py-1 rounded-xl text-xs bg-green-100">Bitrix24 ID</span>
        <span className="px-2 py-1 rounded-xl text-xs bg-yellow-100">DQ 68%</span>
      </div>
    </Card>
  </div>);
}
