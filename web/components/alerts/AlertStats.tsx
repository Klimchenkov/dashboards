import { AlertStats as AlertStatsType } from '@/lib/alertTypes';
import { Card } from '@/components/ui';

interface AlertStatsProps {
  stats: AlertStatsType;
  compact?: boolean;
}

export function AlertStats({ stats, compact = false }: AlertStatsProps) {
  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {stats.critical > 0 && (
          <span className="bg-destructive text-destructive-foreground px-2 py-1 rounded-full">
            {stats.critical} критических
          </span>
        )}
        {stats.warning > 0 && (
          <span className="bg-warning text-warning-foreground px-2 py-1 rounded-full">
            {stats.warning} предупреждений
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Всего</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          <div className="text-sm text-muted-foreground">Критические</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-warning">{stats.warning}</div>
          <div className="text-sm text-muted-foreground">Предупреждения</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-info">{stats.info}</div>
          <div className="text-sm text-muted-foreground">Инфо</div>
        </div>
        <div className="text-center">
        <div className="text-2xl font-bold text-primary">{stats.bySource.person}</div>
        <div className="text-sm text-muted-foreground">Сотрудники</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.bySource.project}</div>
            <div className="text-sm text-muted-foreground">Проекты</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.bySource.system}</div>
            <div className="text-sm text-muted-foreground">Система</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{stats.byCategory.load}</div>
          <div className="text-sm text-muted-foreground">Загрузка</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{stats.byCategory.data_quality}</div>
          <div className="text-sm text-muted-foreground">Качество данных</div>
        </div>
      </div>
    </Card>
  );
}