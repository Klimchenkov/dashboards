'use client';
import { Card, Button } from '@/components/ui';
import { exportHiringReport } from '@/lib/xlsxExport';
export default function HiringJustificationWidget({ department='design', onGenerateReport }:{ department?:string; onGenerateReport?:(x:any)=>void }){
  const handle = () => { const rows = Array.from({length:30}).map((_,i)=> ({ Week: i+1, Capacity: 300+i*5, Demand: 340+i*6, Gap: (340+i*6)-(300+i*5) })); exportHiringReport(department, 3, rows); onGenerateReport?.(rows); };
  return (<Card><div className="font-semibold mb-2">Прогноз найма</div><div className="text-sm opacity-70 mb-3">Авто-обоснование при устойчивом дефиците мощностей.</div><Button onClick={handle}>Сформировать отчёт HR</Button></Card>);
}
