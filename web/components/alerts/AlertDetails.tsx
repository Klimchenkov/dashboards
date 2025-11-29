import { Alert } from '@/lib/alertTypes';
import { Card } from '@/components/ui';

interface AlertDetailsProps {
  alert: Alert;
  onMarkResolved: (alertId: string) => void;
  onClose: () => void;
}

export function AlertDetails({ alert, onMarkResolved, onClose }: AlertDetailsProps) {
  const getSeverityText = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'Критический';
      case 'warning': return 'Предупреждение';
      case 'info': return 'Информационный';
      default: return 'Неизвестный';
    }
  };

  const getCategoryText = (category: Alert['category']) => {
    switch (category) {
      case 'load': return 'Загрузка';
      case 'data_quality': return 'Качество данных';
      case 'project': return 'Проект';
      case 'norms': return 'Нормы';
      case 'strategy': return 'Стратегия';
      case 'sales': return 'Продажи';
      default: return 'Другое';
    }
  };

  return (
    <Card className="p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Детали алерта</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-medium mb-2">{alert.title}</h4>
          <p className="text-muted-foreground">{alert.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Серьезность:</span>
            <div className={`inline-block ml-2 px-2 py-1 rounded-full text-xs ${
              alert.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
              alert.severity === 'warning' ? 'bg-warning text-warning-foreground' :
              'bg-info text-info-foreground'
            }`}>
              {getSeverityText(alert.severity)}
            </div>
          </div>
          
          <div>
            <span className="font-medium">Категория:</span>
            <span className="ml-2">{getCategoryText(alert.category)}</span>
          </div>

          <div>
            <span className="font-medium">Объект:</span>
            <span className="ml-2">{alert.entityName}</span>
          </div>

          <div>
            <span className="font-medium">Тип:</span>
            <span className="ml-2 capitalize">
              {alert.entityType === 'user' ? 'Сотрудник' :
               alert.entityType === 'department' ? 'Отдел' : 'Проект'}
            </span>
          </div>

          {alert.period && (
            <div className="col-span-2">
              <span className="font-medium">Период:</span>
              <span className="ml-2">{alert.period}</span>
            </div>
          )}

          {alert.metricValue !== undefined && (
            <div className="col-span-2">
              <span className="font-medium">Значение метрики:</span>
              <span className="ml-2 font-mono">{alert.metricValue.toFixed(1)}</span>
              {alert.threshold !== undefined && (
                <span className="ml-2 text-muted-foreground">
                  (порог: {alert.threshold})
                </span>
              )}
            </div>
          )}

          <div className="col-span-2">
            <span className="font-medium">Создан:</span>
            <span className="ml-2">
              {new Date(alert.createdAt).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>

        {!alert.resolved && (
          <div className="pt-4 border-t">
            <button
              onClick={() => onMarkResolved(alert.id)}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
            >
              Отметить как решенный
            </button>
          </div>
        )}

        {alert.resolved && (
          <div className="pt-4 border-t">
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
              ✅ Алерт был решен {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleString('ru-RU')}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}