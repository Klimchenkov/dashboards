'use client';
import { Card } from '@/components/ui';
import { exportProjectAnalysis } from '@/lib/xlsxExport';
export default function ProjectDetailView({ projectId }:{ projectId: number | string | null }){
  if (!projectId) return <Card>Выберите проект</Card>;
  const handleExport = () => exportProjectAnalysis(String(projectId), [{ metric:'Load', value: 123 }]);
  return (<div className="space-y-4">
    <Card><div className="font-semibold">Детали проекта #{projectId}</div><div className="text-sm opacity-70">Data Quality: проверка дат, Bitrix24 ID, план/факт.</div></Card>
    <Card><div className="font-semibold mb-2">Data Quality Panel</div><div className="text-sm">Нет критических проблем (mock).</div></Card>
    <Card><button className="px-3 py-2 rounded-2xl bg-neutral-900 text-white" onClick={handleExport}>Экспорт анализа</button></Card>
  </div>);
}
