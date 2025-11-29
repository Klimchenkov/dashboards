import { AlertFilters as AlertFiltersType, AlertStats } from '@/lib/alertTypes';
import { Card } from '@/components/ui';

interface AlertFiltersProps {
  filters: AlertFiltersType;
  onFiltersChange: (updates: Partial<AlertFiltersType>) => void;
  stats: AlertStats;
}

export function AlertFilters({ filters, onFiltersChange, stats }: AlertFiltersProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Фильтры</h3>
      
      <div className="space-y-4">
        {/* Поиск */}
        <div>
          <label className="block text-sm font-medium mb-1">Поиск</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            placeholder="Поиск по алертам..."
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>

        {/* Серьезность */}
        <div>
          <label className="block text-sm font-medium mb-1">Серьезность</label>
          <select
            value={filters.severity}
            onChange={(e) => onFiltersChange({ severity: e.target.value as any })}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="all">Все ({stats.total})</option>
            <option value="critical">Критические ({stats.critical})</option>
            <option value="warning">Предупреждения ({stats.warning})</option>
            <option value="info">Информационные ({stats.info})</option>
          </select>
        </div>

        {/* Категория */}
        <div>
          <label className="block text-sm font-medium mb-1">Категория</label>
          <select
            value={filters.category}
            onChange={(e) => onFiltersChange({ category: e.target.value as any })}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="all">Все категории</option>
            <option value="load">Загрузка ({stats.byCategory.load})</option>
            <option value="data_quality">Качество данных ({stats.byCategory.data_quality})</option>
            <option value="project">Проекты ({stats.byCategory.project})</option>
            <option value="norms">Нормы ({stats.byCategory.norms})</option>
            <option value="strategy">Стратегия ({stats.byCategory.strategy})</option>
          </select>
        </div>

        {/* Статус */}
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            value={filters.resolved.toString()}
            onChange={(e) => onFiltersChange({ 
              resolved: e.target.value === 'all' ? 'all' : e.target.value === 'true' 
            })}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="false">Активные</option>
            <option value="true">Решенные</option>
            <option value="all">Все</option>
          </select>
        </div>

        {/* Группировка */}
        <div>
          <label className="block text-sm font-medium mb-1">Группировка</label>
          <select
            value={filters.groupBy}
            onChange={(e) => onFiltersChange({ groupBy: e.target.value as any })}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="category">По категории</option>
            <option value="severity">По серьезности</option>
            <option value="department">По отделу</option>
            <option value="none">Без группировки</option>
          </select>
        </div>
      </div>
    </Card>
  );
}