import { useMemo, useState } from "react";
import { Filters, Period } from "@/lib/dataModel";
export function useFilters(){
  const [role, setRole] = useState<Filters['role']>('admin');
  const [period, setPeriod] = useState<Period>('month');
  const [departmentId, setDepartmentId] = useState<number|undefined>(undefined);
  const [search, setSearch] = useState<string|undefined>(undefined);
  const [horizonMonths, setHorizon] = useState<1|2|3>(3);
  const [seed, setSeed] = useState('SETTERS-SEED-42');
  return { filters: useMemo<Filters>(()=>({ role, period, departmentId, search, horizonMonths, seed }), [role, period, departmentId, search, horizonMonths, seed]), setRole, setPeriod, setDepartmentId, setSearch, setHorizon, setSeed };
}
