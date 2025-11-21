// SettersResourceDashboardMock.tsx
'use client';
import { useMemo, useState, useEffect } from "react";
import { Tabs, Card } from "@/components/ui";
import FilterBar from "@/components/FilterBar";
import ExecView from "@/components/ExecView";
import DeptView from "@/components/DeptView";
import AlertCenter from "@/components/AlertCenter";
import ForecastView from "@/components/ForecastView";
import ProjectDetailView from "@/components/ProjectDetailView";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProductionCalendar } from "@/hooks/useProductionCalendar";
import { Filters, DeptAggregates } from "@/lib/dataModel";
import { startOfPeriod, endOfPeriod, fmt, rangeDays } from "@/lib/date";
import { capacityHours, demandHours, forecastHours, loadPct, statusByLoad } from "@/lib/calc";
import { dataQualityScore } from "@/lib/quality";
import { calculateWeeklyLoad } from "@/lib/weeklyCalculations";
import { calculateHoursDistribution } from "@/lib/pieCalculations";


export default function SettersResourceDashboardMock() {
  const [filters, setFilters] = useState<Filters>({ role:'admin', period:'month', horizonMonths:3, seed:'SETTERS-SEED-42' });
  const { data, loading, error, fetchProgress, refetch } = useDashboardData(filters);
  console.log(data)
  const [tab, setTab] = useState<'exec'|'dept'|'forecast'|'project'>('exec');
  const [forecastHorizon] = useState<1|2|3>(3);
  const [selectedProject, setSelectedProject] = useState<number | null>(1);

  const periodStart = fmt(startOfPeriod(filters.period));
  const periodEnd = fmt(endOfPeriod(filters.period));

  const { calendar: productionCalendar, loading: calendarLoading } = useProductionCalendar(periodStart, periodEnd);

  const deptAgg: DeptAggregates[] = useMemo(() => {
    if (!productionCalendar || !data) return [];

    const out: DeptAggregates[] = [];
    for (const d of data.departments) {
      const deptUsers = d.users;

      let cap = 0, dem = 0, fc = 0;
      for (const u of deptUsers) {
        cap += capacityHours(u, periodStart, periodEnd, productionCalendar);
        dem += demandHours(u, periodStart, periodEnd, data.timeEntries);
        fc += forecastHours(u, periodStart, periodEnd, data.projects, productionCalendar);
      }
      const load = loadPct(dem, cap);
      const status = statusByLoad(load);
      
      const qualityResult = dataQualityScore(
        d, 
        deptUsers, 
        data.projects, 
        data.timeEntries, 
        data.plans, 
        periodStart, 
        periodEnd, 
        productionCalendar
      );
      
      out.push({ 
        department: d, 
        capacity: cap, 
        demand: dem, 
        forecast: fc, 
        loadPct: load, 
        status, 
        dataQuality: qualityResult.score,
        dataQualityMetrics: qualityResult.metrics
      });
    }
    return out;
  }, [data, filters, periodStart, periodEnd, productionCalendar, loading]);

  const kpis = useMemo(()=>{
    if (loading) return { avgLoad: 0, activeUsers: 0, activeProjects: 0, dataQuality: 0 };
    
    const avgLoad = deptAgg.reduce((s,d)=>s+d.loadPct,0)/(deptAgg.length||1);
    const activeUsers = data.users.filter(u=>u.isActive).length;
    const activeProjects = data.projects.filter(p=>p.isActive).length;
    const dq = deptAgg.reduce((s,d)=>s+d.dataQuality,0)/(deptAgg.length||1);
    return { avgLoad, activeUsers, activeProjects, dataQuality: dq };
  }, [deptAgg, data, loading]);

  const areaSeries = useMemo(() => {
    if (!productionCalendar || loading) return [];

    const periodStart = startOfPeriod(filters.period);
    const periodEnd = endOfPeriod(filters.period);
    
    return calculateWeeklyLoad(
        data.users,
        data.timeEntries,
        data.projects,
        productionCalendar,
        periodStart,
        periodEnd
      );
    }, [data?.users, data?.timeEntries, data?.projects, productionCalendar, filters.period, loading]);
  
  const pieData = useMemo(() => {
    if (loading || !data.timeEntries || data.timeEntries.length === 0) {
      return [];
    }
    const periodStart = startOfPeriod(filters.period);
    const periodEnd = endOfPeriod(filters.period);
    
    return calculateHoursDistribution(
      data.timeEntries,
      data.projects,
      periodStart.toISOString().split('T')[0],
      periodEnd.toISOString().split('T')[0]
    );
  }, [data?.timeEntries, data?.projects, filters.period, loading]);

  const composedData = useMemo(()=> deptAgg.map(d=>({ dept:d.department.name, capacity:Math.round(d.capacity), demand:Math.round(d.demand) })), [deptAgg]);
  const scatterData = useMemo(()=> deptAgg.map(d=>({ commercialShare: Math.random(), load: d.loadPct })), [deptAgg]);
  const alerts = useMemo(()=> [{ type:'overload', severity:3, entity:'dept', refId:0, message:'Перегруз > 120% 3+ нед', from:'W2', to:'W5' } as any], []);

    // Dept view mock
  const members = data?.users.slice(0, 12) || [];
  const stacked = members.map(m => ({ name:m.name, commercial: Math.random()*40, presale: Math.random()*12, internal: Math.random()*10 }));
  const table = stacked.map(s => { const capacity=160; const demand=s.commercial+s.presale; const forecast=demand+s.internal; const load=(demand/capacity)*100; const status=load<70?'under':(load>110?'over':'ok'); return { name:s.name, loadPct:load, capacity, demand, forecast, status }; });
  const thirty = Array.from({length:30}).map((_,i)=> ({ date: fmt(new Date(Date.now()-(29-i)*86400000)), value: Math.random()*8 }));
  const deptAlerts = [{message:"Перегруз > 120% 3+ нед"}, {message:"Пустые дни без факта"}];
  const deptQuality = 0.78;
  
  // Show loading overlay while data is being fetched
  if (loading || calendarLoading || !data) {
    return <LoadingOverlay progress={fetchProgress} message="Загружаем данные ..." />;
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">Ошибка загрузки данных</h2>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (<div className="max-w-7xl mx-auto p-6">
    <FilterBar onChange={setFilters} />
    <Tabs tabs={[
      { key:'exec', label:'🏢 Компания' },
      { key:'dept', label:'👥 Отдел' },
      { key:'forecast', label:'📊 Прогноз' },
      { key:'project', label:'📂 Проект' },
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
