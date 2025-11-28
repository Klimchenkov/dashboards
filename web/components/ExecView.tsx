'use client';
import { Card } from "./ui";
import { DeptAggregates } from "@/lib/dataModel";
import HintTooltip from "./HintTooltip"; 
import WeeklyLoadChart from "./charts/WeeklyLoadChart";
import HoursDistributionPieChart from "./charts/HoursDistributionPieChart";
import CapacityDemandBarChart from "./charts/CapacityDemandBarChart";
import CommercialShareScatterChart from "./charts/CommercialShareScatterChart";
import DepartmentsTable from "./charts/DepartmentsTable";

export default function ExecView({ kpis, areaSeries, pieData, composedData, scatterData, deptTable } : {
  kpis: {avgLoad: number; activeUsers: number; activeProjects: number; dataQuality: number};
  areaSeries: any[];
  pieData: any[];
  composedData: any[];
  scatterData: any[];
  deptTable: DeptAggregates[];
}){

  const COLORS = ["#EC694C", "#87B1DE", "#53A58E", "#E7C452", "#45515C"];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Средняя загрузка
            <HintTooltip hintKey="avgLoad" />
          </div>
          <div className="text-3xl font-bold">{kpis.avgLoad.toFixed(0)}%</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Активные сотрудники
            <HintTooltip hintKey="activeUsers" />
          </div>
          <div className="text-3xl font-bold">{kpis.activeUsers}</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Активные проекты
            <HintTooltip hintKey="activeProjects" />
          </div>
          <div className="text-3xl font-bold">{kpis.activeProjects}</div>
        </Card>
        <Card>
          <div className="text-sm opacity-60 flex items-center gap-1">
            Data Quality
            <HintTooltip hintKey="dataQuality" />
          </div>
          <div className="text-3xl font-bold">{(kpis.dataQuality*100).toFixed(0)}%</div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-2 flex items-center gap-2">
          Загрузка по неделям
          <HintTooltip hintKey="weeklyLoad" />
        </div>
        <WeeklyLoadChart areaSeries={areaSeries} COLORS={COLORS}/>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold mb-2 flex items-center gap-2">
            Доли типов часов
            <HintTooltip hintKey="hoursDistribution" />
          </div>
          <HoursDistributionPieChart pieData={pieData} COLORS={COLORS}/>
        </Card>
        <Card>
          <CapacityDemandBarChart composedData={composedData}/>
        </Card>
      </div>

      <Card>
        <CommercialShareScatterChart scatterData={scatterData} />
      </Card>

      <Card>
        <DepartmentsTable deptTable={deptTable}/>
      </Card>
    </div>
  );
}