// SettersResourceDashboardMock.tsx
'use client';
import { useMemo, useState, useEffect, useCallback } from "react";
import { Tabs, Card } from "@/components/ui";
import FilterBar from "@/components/FilterBar";
import ExecView from "@/components/ExecView";
import DeptView from "@/components/DeptView";
import AlertCenter from "@/components/AlertCenter";
import ForecastView from "@/components/ForecastView";
import ProjectDetailView from "@/components/ProjectDetailView";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilters } from "@/hooks/useFilters";

import { Filters } from "@/lib/dataModel";
import { fmt } from "@/lib/date";



export default function SettersResourceDashboardMock() {
  const { 
    filters, 
    departments,
    availableDepartments,
    projects,
    availableProjects,
    projectStatuses,
    isLoading: filtersLoading, 
    updateFilter, 
    applyFilters,
    resetFilters,
    hasPendingChanges,
    isLoadingData
  } = useFilters();
  const [appliedFilters, setAppliedFilters] = useState<Filters | null>(null);

  useEffect(() => {
    if (!filtersLoading && !appliedFilters) {
      setAppliedFilters(filters);
    }
  }, [filtersLoading, filters, appliedFilters]);

  const dataFilters = appliedFilters || filters;
  const { data, loading, error, fetchProgress, refetch } = useDashboardData(dataFilters);
  
  useEffect(() => {
    if (data) {
      console.log('Dashboard data updated:', {
        data: data,
        users: data.users?.length,
        projects: data.projects?.length,
        timeEntries: data.timeEntries?.length,
        timestamp: data.timestamp
      });
    }
  }, [data]);
  
  const [tab, setTab] = useState<'exec'|'dept'|'forecast'|'project'>('exec');
  const [forecastHorizon] = useState<1|2|3>(3);
  const [selectedProject, setSelectedProject] = useState<number | null>(1);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    console.log(`Filter changed: ${key} = ${value}`);
    updateFilter(key as any, value);
  }, [updateFilter]);

  const handleUpdateData = useCallback(async () => {
    if (!hasPendingChanges) return;
    
    setIsApplyingFilters(true);
    try {
      // 1) Save current draft filters to backend
      await applyFilters();
      
      // Update applied filters to trigger data refetch
      // Use functional update to ensure we have latest filters
      setAppliedFilters(prev => ({ ...filters }));
      
      // Note: No explicit refetch() needed because useDashboardData
      // will automatically refetch when appliedFilters changes
    } catch (error) {
      console.error('Failed to update data:', error);
    } finally {
      setIsApplyingFilters(false);
    }
  }, [hasPendingChanges, applyFilters, filters]);

  const handleResetFilters = useCallback(async () => {
    await resetFilters();
    // Note: We don't reset appliedFilters here because resetFilters
    // only affects the draft UI state. Data remains with current applied filters
    // until user explicitly applies the reset draft.
  }, [resetFilters]);

  const showLoadingOverlay = (loading || !data || filtersLoading ) && !error && !isApplyingFilters;
  
  // Show error state when we have an error AND no data (or when refetching after error)
  const showErrorState = error && !isApplyingFilters;

  const deptAgg = data?.metrics?.deptAgg || [];
  const kpis = data?.metrics?.kpis || { avgLoad: 0, activeUsers: 0, activeProjects: 0, dataQuality: 0 };
  const areaSeries = data?.metrics?.areaSeries || [];
  const pieData = data?.metrics?.pieData || [];
  const composedData = data?.metrics?.composedData || [];
  const scatterData = data?.metrics?.scatterData || [];


  const alerts = useMemo(()=> [{ type:'overload', severity:3, entity:'dept', refId:0, message:'Перегруз > 120% 3+ нед', from:'W2', to:'W5' } as any], []);

    // Dept view mock
  const members = data?.users.slice(0, 12) || [];
  const stacked = members.map(m => ({ name:m.name, commercial: Math.random()*40, presale: Math.random()*12, internal: Math.random()*10 }));
  const table = stacked.map(s => { const capacity=160; const demand=s.commercial+s.presale; const forecast=demand+s.internal; const load=(demand/capacity)*100; const status=load<70?'under':(load>110?'over':'ok'); return { name:s.name, loadPct:load, capacity, demand, forecast, status }; });
  const thirty = Array.from({length:30}).map((_,i)=> ({ date: fmt(new Date(Date.now()-(29-i)*86400000)), value: Math.random()*8 }));
  const deptAlerts = [{message:"Перегруз > 120% 3+ нед"}, {message:"Пустые дни без факта"}];
  const deptQuality = 0.78;
  
  // Show loading overlay while data is being fetched
  if ( showLoadingOverlay )  {
    return <LoadingOverlay progress={fetchProgress} message="Загружаем данные ..." />;
  }

  // Show error state
  if (showErrorState) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <FilterBar 
          filters={filters}
          departments={departments}
          availableDepartments={availableDepartments}
          projects={projects}
          availableProjects={availableProjects}
          projectStatuses={projectStatuses}
          onChange={handleFilterChange}
          onUpdate={handleUpdateData}
          onReset={handleResetFilters}
          hasPendingChanges={hasPendingChanges}
          isUpdating={isApplyingFilters}
          isLoadingData={isLoadingData}
        />
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
    <FilterBar 
        filters={filters}
        departments={departments}
        availableDepartments={availableDepartments}
        projects={projects}
        availableProjects={availableProjects}
        projectStatuses={projectStatuses}
        onChange={handleFilterChange}
        onUpdate={handleUpdateData}
        onReset={handleResetFilters}
        hasPendingChanges={hasPendingChanges}
        isUpdating={isApplyingFilters}
        isLoadingData={isLoadingData}
      />
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
