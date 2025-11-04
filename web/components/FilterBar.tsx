'use client';
import { motion } from 'framer-motion';
import { Button, Card, Input } from './ui';
import { useFilters } from '@/hooks/useFilters';

export default function FilterBar({ onChange }:{ onChange:(f: ReturnType<typeof useFilters>['filters'])=>void }){
  const { filters, setRole, setPeriod, setDepartmentId, setSearch, setHorizon, setSeed } = useFilters();

  return (
    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SETTERS · Resource Dashboard</h1>
        <Button onClick={()=>alert('Сохранено (mock)')}>💾 Сохранить фильтр</Button>
      </div>
      <Card className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2">Роль
          <select value={filters.role} onChange={e=>{ setRole(e.target.value as any); onChange({...filters, role: e.target.value as any});}} className="border rounded-xl px-2 py-1">
            <option value="admin">admin</option>
            <option value="lead">lead</option>
            <option value="pm">pm</option>
            <option value="demo">demo</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Период
          <select value={filters.period} onChange={e=>{ setPeriod(e.target.value as any); onChange({...filters, period: e.target.value as any});}} className="border rounded-xl px-2 py-1">
            <option value="week">неделя</option>
            <option value="month">месяц</option>
            <option value="quarter">квартал</option>
            <option value="halfyear">6м</option>
            <option value="year">год</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Отдел
          <Input placeholder="ID" onChange={e=>{ const v = e.target.value? Number(e.target.value): undefined; setDepartmentId(v); onChange({...filters, departmentId: v}); }} />
        </label>
        <label className="flex items-center gap-2">Поиск
          <Input placeholder="сотрудник/проект" onChange={e=>{ setSearch(e.target.value); onChange({...filters, search: e.target.value}); }} />
        </label>
        <label className="flex items-center gap-2">Горизонт
          <select value={filters.horizonMonths} onChange={e=>{ const v = Number(e.target.value) as 1|2|3; setHorizon(v); onChange({...filters, horizonMonths: v}); }} className="border rounded-xl px-2 py-1">
            <option value={1}>1м</option>
            <option value={2}>2м</option>
            <option value={3}>3м</option>
          </select>
        </label>
        <label className="flex items-center gap-2">Seed
          <Input defaultValue={filters.seed} onChange={e=>{ setSeed(e.target.value); onChange({...filters, seed: e.target.value}); }} />
        </label>
      </Card>
    </motion.div>
  );
}
