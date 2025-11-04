'use client';
import { Card } from '@/components/ui';
export default function BacklogAnalysis(){
  const rows = Array.from({length:10}).map((_,i)=> ({ name:`Deal #${i+1}`, probability: Math.random().toFixed(2), hours: Math.round(80+Math.random()*200) }));
  return (<Card>
    <div className="font-semibold mb-2">Анализ бэклога</div>
    <div className="overflow-auto"><table className="min-w-full text-sm"><thead><tr className="text-left"><th className="p-2">Сделка</th><th className="p-2">Вероятность</th><th className="p-2">Часы</th></tr></thead><tbody>
      {rows.map((r,i)=>(<tr key={i} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.probability}</td><td className="p-2">{r.hours}</td></tr>))}
    </tbody></table></div>
  </Card>);
}
