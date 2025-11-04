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

export default function SettersResourceDashboardMock() {
  const [isClient, setIsClient] = useState(false);
  const [filters, setFilters] = useState<Filters>({ 
    role: 'admin', 
    period: 'month', 
    horizonMonths: 2, 
    seed: 'SETTERS-SEED-42' 
  });
  
  const data = useMockData(filters);
  const [tab, setTab] = useState<'exec' | 'dept' | 'person'>('exec');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Move all calculations to useMemo that depends on isClient
  const {
    periodStart,
    periodEnd,
    deptAgg,
    kpis,
    areaSeries,
    pieData,
    composedData,
    scatterData,
    alerts,
    deptData,
    personData
  } = useMemo(() => {
    if (!isClient) {
      return {
        periodStart: '',
        periodEnd: '',
        deptAgg: [],
        kpis: null,
        areaSeries: [],
        pieData: [],
        composedData: [],
        scatterData: [],
        alerts: [],
        deptData: null,
        personData: null
      };
    }

    const periodStart = fmt(startOfPeriod(filters.period));
    const periodEnd = fmt(endOfPeriod(filters.period));

    // Aggregations
    const deptAgg: DeptAggregates[] = [];
    for (const d of data.departments) {
      const deptUsers = data.users.filter(u => u.isActive && (!filters.departmentId || filters.departmentId === d.id));
      let cap = 0, dem = 0, fc = 0;
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
      deptAgg.push({ 
        department: d, 
        capacity: cap, 
        demand: dem, 
        forecast: fc, 
        loadPct: load, 
        status, 
        dataQuality: quality 
      });
    }

    // KPI for exec
    const avgLoad = deptAgg.reduce((s, d) => s + d.loadPct, 0) / (deptAgg.length || 1);
    const activeUsers = data.users.filter(u => u.isActive).length;
    const activeProjects = data.projects.length;
    const dq = deptAgg.reduce((s, d) => s + d.dataQuality, 0) / (deptAgg.length || 1);
    const kpis = { avgLoad, activeUsers, activeProjects, dataQuality: dq };

    // Charts mock series
    const areaSeries = Array.from({ length: 8 }).map((_, i) => ({
      week: `W${i + 1}`,
      commercial: Math.random() * 300 + 200,
      presale: Math.random() * 120 + 60,
      internal: Math.random() * 100 + 40,
    }));

    const pieData = [
      { type: 'commercial', value: 62 },
      { type: 'presale', value: 18 },
      { type: 'internal', value: 20 },
    ];

    const composedData = deptAgg.map(d => ({
      dept: d.department.name,
      capacity: Math.round(d.capacity),
      demand: Math.round(d.demand)
    }));

    const scatterData = deptAgg.map(d => ({
      commercialShare: Math.random() * 1,
      load: d.loadPct
    }));

    // Alerts (exec level)
    const series = Array.from({ length: 10 }).map((_, i) => ({
      date: `W${i + 1}`,
      pct: (60 + Math.random() * 100)
    }));
    const alerts = [
      ...Alerts.overload(series, 0, 'dept'),
      ...Alerts.underload(series, 0, 'dept'),
      ...Alerts.lowQuality(kpis.dataQuality, 0, 'dept'),
    ];

    // Dept view dataset
    const members = data.users.slice(0, 12);
    const stacked = members.map(m => ({
      name: m.name,
      commercial: Math.random() * 40,
      presale: Math.random() * 12,
      internal: Math.random() * 10
    }));
    const table = stacked.map(s => {
      const capacity = 160;
      const demand = s.commercial + s.presale;
      const forecast = demand + s.internal;
      const load = (demand / capacity) * 100;
      const status = load < 70 ? 'under' : (load > 110 ? 'over' : 'ok');
      return { name: s.name, loadPct: load, capacity, demand, forecast, status };
    });
    const thirty = Array.from({ length: 30 }).map((_, i) => ({
      date: fmt(new Date(Date.now() - (29 - i) * 24 * 3600 * 1000)),
      value: Math.random() * 8
    }));
    const deptAlerts = [{ message: "Перегруз > 120% 3+ нед" }, { message: "Пустые дни без факта" }];
    const deptQuality = 0.78;

    // Person view dataset
    const line = rangeDays(new Date(periodStart), new Date(periodEnd)).map(d => ({
      date: d,
      plan: 6 + Math.random() * 2,
      fact: 5 + Math.random() * 3
    }));
    const pie = [{ type: 'commercial', value: 75 }, { type: 'presale', value: 15 }, { type: 'internal', value: 10 }];
    const timeline = data.projects.slice(0, 5).map(p => ({
      name: p.project_name,
      start: p.start_date,
      end: p.end_date,
      progress: Math.random()
    }));
    const personAlerts = [{ message: "План/факт |Δ| > 15%" }];

    return {
      periodStart,
      periodEnd,
      deptAgg,
      kpis,
      areaSeries,
      pieData,
      composedData,
      scatterData,
      alerts,
      deptData: {
        stacked,
        table,
        heatmap: thirty,
        alerts: deptAlerts,
        quality: deptQuality
      },
      personData: {
        kpi: { avgLoad: kpis.avgLoad, overDays: 4, emptyDays: 2 },
        line,
        pie,
        timeline,
        alerts: personAlerts
      }
    };
  }, [isClient, data, filters]);

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <FilterBar onChange={setFilters} />
      <Tabs
        tabs={[
          { key: 'exec', label: '🏢 Exec' },
          { key: 'dept', label: '👥 Dept' },
          { key: 'person', label: '👤 Person' },
        ]}
        active={tab}
        onChange={(k) => setTab(k as any)}
      />

      <div className="mt-4" />

      {tab === 'exec' && kpis && (
        <ExecView
          kpis={kpis}
          areaSeries={areaSeries}
          pieData={pieData}
          composedData={composedData}
          scatterData={scatterData}
          deptTable={deptAgg}
        />
      )}

      {tab === 'dept' && deptData && (
        <DeptView
          stacked={deptData.stacked}
          table={deptData.table}
          heatmap={deptData.heatmap}
          alerts={deptData.alerts}
          quality={deptData.quality}
        />
      )}

      {tab === 'person' && personData && (
        <PersonView
          kpi={personData.kpi}
          line={personData.line}
          pie={personData.pie}
          timeline={personData.timeline}
          alerts={personData.alerts}
        />
      )}

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <AlertCenter alerts={alerts} />
        <Card>
          <div className="font-semibold">What-if панель</div>
          <div className="text-sm opacity-70">Симуляции (placeholder)</div>
        </Card>
        <Card>
          <div className="font-semibold">Инфо</div>
          <div className="text-sm">
            <Link href="/how-it-works" className="underline">
              Как посчитано
            </Link>
          </div>
          <div className="text-xs opacity-60 mt-1">
            Mock-дашборд SETTERS: роли, прогноз, аномалии, экспорт, интеграции.
          </div>
        </Card>
      </div>

      <footer className="mt-8 text-xs opacity-60">
        © SETTERS · Mock Dashboard · Export · Supabase/Bitrix24/Telegram (stubs)
      </footer>
    </div>
  );
}