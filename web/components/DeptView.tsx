'use client';
import { StackedBarChart } from "./charts/DeptView/StackedBarChart";
import { DepartmentUsersTable } from "./charts/DeptView/DepartmenUserstTable";
import { HeatmapChart } from "./charts/DeptView/HeatmapChart";

interface DeptViewProps {
  deptAgg?: any[];
  period?: number;
}

export default function DeptView({ 
  deptAgg = [], 
  period = null,
}: DeptViewProps) {
  return (
    <div className="space-y-4">
      <StackedBarChart deptAgg={deptAgg} />
      <DepartmentUsersTable deptAgg={deptAgg} />
      <HeatmapChart deptAgg={deptAgg} days={period}/>
    </div>
  );
}