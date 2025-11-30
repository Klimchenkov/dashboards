import { Alert, AlertSeverity } from '@/lib/alertTypes';
import { Card } from '@/components/ui';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface AlertListProps {
  alerts: Alert[];
  groupedAlerts?: Record<string, Alert[]>;
  expandedGroups?: Set<string>;
  onToggleGroup?: (groupName: string) => void;
  onSelectAlert: (alert: Alert) => void;
  onMarkResolved?: (alertId: string) => void;
  compact?: boolean;
}

export function AlertList({
  alerts,
  groupedAlerts,
  expandedGroups = new Set(),
  onToggleGroup,
  onSelectAlert,
  onMarkResolved,
  compact = false
}: AlertListProps) {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'border-l-destructive bg-destructive/5';
      case 'warning': return 'border-l-warning bg-warning/5';
      case 'info': return 'border-l-info bg-info/5';
      default: return 'border-l-muted bg-muted/5';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const renderAlertItem = (alert: Alert) => (
    <div
      key={alert.id}
      className={`p-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors ${getSeverityColor(alert.severity)}`}
      onClick={() => onSelectAlert(alert)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm">{getSeverityIcon(alert.severity)}</span>
            <h4 className="font-medium text-sm truncate">{alert.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {alert.description}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
            <span>{alert.entityName}</span>
            {alert.period && <span>{alert.period}</span>}
          </div>
        </div>
       {!compact && onMarkResolved && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const success = await onMarkResolved(alert.id);
              if (success) {
                // Успешно отмечено как решенное
                console.log(`Alert ${alert.id} marked as resolved`);
              }
            }}
            className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Решить
          </button>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {alerts.map(renderAlertItem)}
        {alerts.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            Нет критических алертов
          </div>
        )}
      </div>
    );
  }

  if (groupedAlerts && onToggleGroup) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Алерты ({alerts.length})</h3>
        <div className="space-y-2">
          {Object.entries(groupedAlerts).map(([groupName, groupAlerts]) => (
            <div key={groupName} className="border rounded-lg">
              <button
                className="w-full p-3 flex items-center justify-between text-left font-medium hover:bg-accent/50"
                onClick={() => onToggleGroup(groupName)}
              >
                <span>
                  {groupName} ({groupAlerts.length})
                </span>
                {expandedGroups.has(groupName) ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
              
              {expandedGroups.has(groupName) && (
                <div className="border-t">
                  {groupAlerts.map(renderAlertItem)}
                </div>
              )}
            </div>
          ))}
          
          {alerts.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Нет алертов, соответствующих фильтрам
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Алерты ({alerts.length})</h3>
      <div className="space-y-2">
        {alerts.map(renderAlertItem)}
        {alerts.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Нет алертов, соответствующих фильтрам
          </div>
        )}
      </div>
    </Card>
  );
}