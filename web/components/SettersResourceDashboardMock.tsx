'use client';
import { useMemo, useState } from "react";
import { Tabs, Card } from "@/components/ui";
import FilterBar from "@/components/FilterBar";
import ExecView from "@/components/ExecView";
import DeptView from "@/components/DeptView";
import AlertCenter from "@/components/AlertCenter";
import ForecastView from "@/components/ForecastView";
import ProjectDetailView from "@/components/ProjectDetailView";
import { useMockData } from "@/hooks/useMockData";
import { Filters, DeptAggregates } from "@/lib/dataModel";
import { startOfPeriod, endOfPeriod, fmt, rangeDays } from "@/lib/date";
import { capacityHours, demandHours, forecastHours, loadPct, statusByLoad } from "@/lib/calc";
import { dataQualityScore } from "@/lib/quality";
import { useData } from "@/hooks/useData";

export default function SettersResourceDashboardMock(){
  const [filters, setFilters] = useState<Filters>({ role:'admin', period:'month', horizonMonths:3, seed:'SETTERS-SEED-42' });
  const mock_data = useMockData(filters);
  const data = useData(filters);
  console.log(data)
  const [tab, setTab] = useState<'exec'|'dept'|'forecast'|'project'>('exec');
  const [forecastHorizon] = useState<1|2|3>(3);
  const [selectedProject, setSelectedProject] = useState<number | null>(1);

  const periodStart = fmt(startOfPeriod(filters.period));
  const periodEnd = fmt(endOfPeriod(filters.period));

  const deptAgg: DeptAggregates[] = useMemo(()=> {
    const out: DeptAggregates[] = [];
    for (const d of mock_data.departments) {
      const deptUsers = mock_data.users.filter(u => u.isActive);
      let cap=0, dem=0, fc=0;
      for (const u of deptUsers) {
        cap += capacityHours(u, mock_data.norms, mock_data.vacations, periodStart, periodEnd);
        dem += demandHours(u, periodStart, periodEnd, mock_data.time_entries, mock_data.projects);
        fc += forecastHours(u, periodStart, periodEnd, mock_data.plans, mock_data.projects, mock_data.norms);
      }
      const load = loadPct(dem, cap);
      const status = statusByLoad(load);
      const quality = dataQualityScore({ percentProjectsWithPlans:0.8, percentFilledFacts3d:0.7, factLagDays:2, bitrixValidity:0.9 });
      out.push({ department: d, capacity: cap, demand: dem, forecast: fc, loadPct: load, status, dataQuality: quality });
    }
    return out;
  }, [mock_data, filters, periodStart, periodEnd]);

  const kpis = useMemo(()=>{
    const avgLoad = deptAgg.reduce((s,d)=>s+d.loadPct,0)/(deptAgg.length||1);
    const activeUsers = mock_data.users.filter(u=>u.isActive).length;
    const activeProjects = mock_data.projects.length;
    const dq = deptAgg.reduce((s,d)=>s+d.dataQuality,0)/(deptAgg.length||1);
    return { avgLoad, activeUsers, activeProjects, dataQuality: dq };
  }, [deptAgg, mock_data]);

  const areaSeries = useMemo(()=> Array.from({length:8}).map((_,i)=> ({ week:`W${i+1}`, commercial: 200+30*i, presale: 80+10*i, internal: 60+8*i })), []);
  const pieData = useMemo(()=> [{type:'commercial',value:62},{type:'presale',value:18},{type:'internal',value:20}], []);
  const composedData = useMemo(()=> deptAgg.map(d=>({ dept:d.department.name, capacity:Math.round(d.capacity), demand:Math.round(d.demand) })), [deptAgg]);
  const scatterData = useMemo(()=> deptAgg.map(d=>({ commercialShare: Math.random(), load: d.loadPct })), [deptAgg]);
  const alerts = useMemo(()=> [{ type:'overload', severity:3, entity:'dept', refId:0, message:'Перегруз > 120% 3+ нед', from:'W2', to:'W5' } as any], []);

  // Dept view mock
  const members = mock_data.users.slice(0, 12);
  const stacked = members.map(m => ({ name:m.name, commercial: Math.random()*40, presale: Math.random()*12, internal: Math.random()*10 }));
  const table = stacked.map(s => { const capacity=160; const demand=s.commercial+s.presale; const forecast=demand+s.internal; const load=(demand/capacity)*100; const status=load<70?'under':(load>110?'over':'ok'); return { name:s.name, loadPct:load, capacity, demand, forecast, status }; });
  const thirty = Array.from({length:30}).map((_,i)=> ({ date: fmt(new Date(Date.now()-(29-i)*86400000)), value: Math.random()*8 }));
  const deptAlerts = [{message:"Перегруз > 120% 3+ нед"}, {message:"Пустые дни без факта"}];
  const deptQuality = 0.78;

  return (<div className="max-w-7xl mx-auto p-6">
    <FilterBar onChange={setFilters} />
    <Tabs tabs={[
      { key:'exec', label:'🏢 Exec' },
      { key:'dept', label:'👥 Dept' },
      { key:'forecast', label:'📊 Forecast' },
      { key:'project', label:'📂 Project' },
    ]} active={tab} onChange={(k)=>setTab(k as any)} />

    <div className="mt-4" />

    {tab==='exec' && <ExecView kpis={kpis} areaSeries={areaSeries} pieData={pieData} composedData={composedData} scatterData={scatterData} deptTable={deptAgg} />}
    {tab==='dept' && <DeptView stacked={stacked} table={table} heatmap={thirty} alerts={deptAlerts} quality={deptQuality} />}
    {tab==='forecast' && <ForecastView horizon={forecastHorizon} />}
    {tab==='project' && <ProjectDetailView projectId={selectedProject} />}

    <div className="mt-6 grid md:grid-cols-3 gap-4">
      <AlertCenter alerts={alerts as any} />
      <Card><div className="font-semibold">What-if панель</div><div className="text-sm opacity-70">Симуляции (placeholder)</div></Card>
      <Card><div className="font-semibold">Инфо</div><div className="text-sm"><a className="underline" href="/how-it-works">Как посчитано</a></div><div className="text-xs opacity-60 mt-1">Mock-дашборд SETTERS: роли, прогноз, аномалии, экспорт, интеграции.</div></Card>
    </div>

    <footer className="mt-8 text-xs opacity-60">© SETTERS · Mock Dashboard · Export · Supabase/Bitrix24/Telegram (stubs)</footer>
  </div>);
}
