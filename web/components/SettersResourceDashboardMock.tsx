'use client';

import { useEffect, useMemo, useState } from "react";
import { Tabs, Card } from "./ui";
import FilterBar from "./FilterBar";
import ExecView from "./ExecView";
import DeptView from "./DeptView";
import PersonView from "./PersonView";
import AlertCenter from "./AlertCenter";
import { useMockData } from "@/hooks/useMockData";
import { Filters, DeptAggregates } from "@/lib/dataModel";
import { startOfPeriod, endOfPeriod, fmt, rangeDays } from "@/lib/date";
import { capacityHours, demandHours, forecastHours, loadPct, statusByLoad } from "@/lib/calc";
import { dataQualityScore } from "@/lib/quality";
import { Alerts } from "@/lib/alerts";
import Link from "next/link";

export default function SettersResourceDashboardMock(){
  const [filters, setFilters] = useState<Filters>({ role:'admin', period:'month', horizonMonths:2, seed:'SETTERS-SEED-42' });
  const data = useMockData(filters);
  const [tab, setTab] = useState<'exec'|'dept'|'person'>('exec');
  const [selectedDept, setSelectedDept] = useState<number|undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<number|undefined>(undefined);

  const periodStart = fmt(startOfPeriod(filters.period));
  const periodEnd = fmt(endOfPeriod(filters.period));

  // Aggregations
  const deptAgg: DeptAggregates[] = useMemo(()=> {
    const out: DeptAggregates[] = [];
    for (const d of data.departments) {
      const deptUsers = data.users.filter(u => u.isActive && (!filters.departmentId || filters.departmentId===d.id));
      let cap=0, dem=0, fc=0;
      for (const u of deptUsers) {
        cap += capacityHours(u, data.norms, data.vacations, periodStart, periodEnd);
        dem += demandHours(u, periodStart, periodEnd, data.time_entries, data.projects);
        fc += forecastHours(u, periodStart, periodEnd, data.plans, data.projects, data.norms);
      }
      const load = loadPct(dem, cap);
      const status = statusByLoad(load);
      const quality = dataQualityScore({
        percentProjectsWithPlans: 0.8,
        percentFilledFacts3d: 0.7,
        factLagDays: 2,
        bitrixValidity: 0.9,
      });
      out.push({ department: d, capacity: cap, demand: dem, forecast: fc, loadPct: load, status, dataQuality: quality });
    }
    return out;
  }, [data, filters, periodStart, periodEnd]);

  // KPI for exec
  const kpis = useMemo(()=>{
    const avgLoad = deptAgg.reduce((s,d)=>s+d.loadPct,0)/(deptAgg.length||1);
    const activeUsers = data.users.filter(u=>u.isActive).length;
    const activeProjects = data.projects.length;
    const dq = deptAgg.reduce((s,d)=>s+d.dataQuality,0)/(deptAgg.length||1);
    return { avgLoad, activeUsers, activeProjects, dataQuality: dq };
  }, [deptAgg, data]);

  // Charts mock series
  const areaSeries = useMemo(()=> {
    const weeks = 8;
    return Array.from({length: weeks}).map((_,i)=> ({
      week: `W${i+1}`,
      commercial: Math.random()*300+200,
      presale: Math.random()*120+60,
      internal: Math.random()*100+40,
    }));
  }, []);

  const pieData = useMemo(()=> [
    { type: 'commercial', value: 62 },
    { type: 'presale', value: 18 },
    { type: 'internal', value: 20 },
  ], []);

  const composedData = useMemo(()=> deptAgg.map(d => ({
    dept: d.department.name, capacity: Math.round(d.capacity), demand: Math.round(d.demand)
  })), [deptAgg]);

  const scatterData = useMemo(()=> deptAgg.map(d => ({
    commercialShare: Math.random()*1, load: d.loadPct
  })), [deptAgg]);

  // Alerts (exec level)
  const alerts = useMemo(()=> {
    const series = Array.from({length: 10}).map((_,i)=> ({ date:`W${i+1}`, pct: (60+Math.random()*100) }));
    return [
      ...Alerts.overload(series, 0, 'dept'),
      ...Alerts.underload(series, 0, 'dept'),
      ...Alerts.lowQuality(kpis.dataQuality, 0, 'dept'),
    ];
  }, [kpis.dataQuality]);

  // Dept view dataset (for selected dept or first)
  const dept = data.departments[0];
  const members = data.users.slice(0, 12);
  const stacked = members.map(m => ({
    name: m.name, commercial: Math.random()*40, presale: Math.random()*12, internal: Math.random()*10
  }));
  const table = stacked.map(s => {
    const capacity = 160; const demand = s.commercial + s.presale; const forecast = demand + s.internal;
    const load = (demand/capacity)*100; const status = load<70?'under':(load>110?'over':'ok');
    return { name: s.name, loadPct: load, capacity, demand, forecast, status };
  });
  const thirty = Array.from({length:30}).map((_,i)=> ({
    date: fmt(new Date(Date.now()- (29-i)*24*3600*1000)), value: Math.random()*8
  }));
  const deptAlerts = [{message:"Перегруз > 120% 3+ нед"}, {message:"Пустые дни без факта"}];
  const deptQuality = 0.78;

  // Person view dataset
  const person = data.users[0];
  const line = rangeDays(new Date(periodStart), new Date(periodEnd)).map(d => ({ date:d, plan: 6+Math.random()*2, fact: 5+Math.random()*3 }));
  const pie = [{type:'commercial', value: 75}, {type:'presale', value: 15}, {type:'internal', value: 10}];
  const timeline = data.projects.slice(0,5).map(p => ({ name: p.project_name, start: p.start_date, end: p.end_date, progress: Math.random() }));
  const personAlerts = [{message:"План/факт |Δ| > 15%"}];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <FilterBar onChange={setFilters} />
      <Tabs tabs={[
        { key:'exec', label: '🏢 Exec' },
        { key:'dept', label: '👥 Dept' },
        { key:'person', label: '👤 Person' },
      ]} active={tab} onChange={(k)=>setTab(k as any)} />

      <div className="mt-4" />

      {tab==='exec' && <ExecView
        kpis={kpis}
        areaSeries={areaSeries}
        pieData={pieData}
        composedData={composedData}
        scatterData={scatterData}
        deptTable={deptAgg}
      />}

      {tab==='dept' && <DeptView
        stacked={stacked}
        table={table}
        heatmap={thirty}
        alerts={deptAlerts}
        quality={deptQuality}
      />}

      {tab==='person' && <PersonView
        kpi={{ avgLoad: kpis.avgLoad, overDays: 4, emptyDays: 2 }}
        line={line}
        pie={pie}
        timeline={timeline}
        alerts={personAlerts}
      />}

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <AlertCenter alerts={alerts} />
        <Card>
          <div className="font-semibold">What-if панель</div>
          <div className="text-sm opacity-70">Симуляции (placeholder)</div>
        </Card>
        <Card>
          <div className="font-semibold">Инфо</div>
          <div className="text-sm"><Link href="/how-it-works" className="underline">Как посчитано</Link></div>
          <div className="text-xs opacity-60 mt-1">Mock-дашборд SETTERS: роли, прогноз, аномалии, экспорт, интеграции.</div>
        </Card>
      </div>

      <footer className="mt-8 text-xs opacity-60">© SETTERS · Mock Dashboard · Export · Supabase/Bitrix24/Telegram (stubs)</footer>
    </div>
  );
}
