// FilterBar.tsx
'use client';
import { motion } from 'framer-motion';
import { Button, Card, Input } from './ui';

interface FilterBarProps {
  filters: any;
  onChange: (key: string, value: any) => void;
  onUpdate: () => void;
  onReset?: () => void;
  hasPendingChanges?: boolean;
  isUpdating?: boolean;
}

export default function FilterBar({ 
  filters, 
  onChange, 
  onUpdate, 
  onReset,
  hasPendingChanges = false, 
  isUpdating = false 
}: FilterBarProps) {
  const handleChange = (key: string, value: any) => {
    console.log(`FilterBar: Changing ${key} to ${value}`);
    onChange(key, value);
  };

  return (
    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SETTERS · Resource Dashboard</h1>
        <div className="flex gap-2">
          {hasPendingChanges && onReset && (
            <Button 
              variant="outline"
              onClick={onReset}
              disabled={isUpdating}
            >
              Сбросить
            </Button>
          )}
          <Button 
            onClick={onUpdate}
            disabled={isUpdating || !hasPendingChanges}
            className={!hasPendingChanges ? "opacity-70 cursor-not-allowed" : ""}
          >
            {isUpdating ? "⏳ Обновление данных..." : "🔄 Обновить"}
          </Button>
        </div>
      </div>
      
      <Card className={`flex flex-wrap gap-3 items-center p-4 relative transition-opacity ${isUpdating ? "opacity-70" : ""}`}>
        {isUpdating && (
          <div className="absolute inset-0 bg-background/30 flex items-center justify-center rounded-lg z-10">
            <div className="flex items-center gap-2 text-sm font-medium bg-white px-3 py-1 rounded-full shadow-sm">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
              Загрузка...
            </div>
          </div>
        )}

        {hasPendingChanges && (
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" title="Есть несохраненные изменения" />
        )}

        <label className="flex items-center gap-2 text-sm font-medium">
          Роль
          <select 
            value={filters.role} 
            onChange={e => handleChange('role', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="admin">admin</option>
            <option value="lead">lead</option>
            <option value="pm">pm</option>
            <option value="demo">demo</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Период 
          <select 
            value={filters.period} 
            onChange={e => handleChange('period', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">неделя</option>
            <option value="month">месяц</option>
            <option value="quarter">квартал</option>
            <option value="halfyear">6м</option>
            <option value="year">год</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Отдел
          <Input 
            placeholder="ID отдела" 
            value={filters.departmentId || ''}
            onChange={e => handleChange('departmentId', e.target.value ? Number(e.target.value) : undefined)}
            className="w-20"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Поиск
          <Input 
            placeholder="сотрудник/проект" 
            value={filters.search || ''}
            onChange={e => handleChange('search', e.target.value)}
            className="w-40"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Горизонт
          <select 
            value={filters.horizonMonths} 
            onChange={e => handleChange('horizonMonths', Number(e.target.value) as 1|2|3)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>1м</option>
            <option value={2}>2м</option>
            <option value={3}>3м</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Seed
          <Input 
            value={filters.seed}
            onChange={e => handleChange('seed', e.target.value)}
            className="w-32"
          />
        </label>
      </Card>
    </motion.div>
  );
}