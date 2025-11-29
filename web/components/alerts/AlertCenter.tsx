'use client';
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { useAlerts } from '@/hooks/useAlerts';
import { Alert, AlertFilters, AlertSeverity, AlertCategory } from '@/lib/alertTypes';
import { AlertStats } from './AlertStats';
import { AlertFilters as AlertFiltersComponent } from './AlertFilters';
import { AlertList } from './AlertList';
import { AlertDetails } from './AlertDetails';

interface AlertCenterProps {
  compact?: boolean;
  maxAlerts?: number;
}

export function AlertCenter({ compact = false, maxAlerts }: AlertCenterProps) {
  const {
    alerts,
    groupedAlerts,
    stats,
    filters,
    updateFilters,
    markAsResolved,
    loading,
    error
  } = useAlerts();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const displayAlerts = useMemo(() => {
    if (!maxAlerts) return alerts;
    return alerts.slice(0, maxAlerts);
  }, [alerts, maxAlerts]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">Загрузка алертов...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <div className="text-destructive text-center">Ошибка загрузки алертов: {error}</div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Критические алерты</h3>
          <AlertStats stats={stats} compact />
        </div>
        <AlertList
          alerts={displayAlerts.filter(a => a.severity === 'critical')}
          onSelectAlert={setSelectedAlert}
          compact
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AlertStats stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <AlertFiltersComponent
            filters={filters}
            onFiltersChange={updateFilters}
            stats={stats}
          />
        </div>
        
        <div className="lg:col-span-2">
          <AlertList
            alerts={displayAlerts}
            groupedAlerts={groupedAlerts}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            onSelectAlert={setSelectedAlert}
            onMarkResolved={markAsResolved}
          />
        </div>
        
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <AlertDetails
              alert={selectedAlert}
              onMarkResolved={markAsResolved}
              onClose={() => setSelectedAlert(null)}
            />
          ) : (
            <Card className="p-4 h-full flex items-center justify-center">
              <div className="text-muted-foreground text-center">
                Выберите алерт для просмотра деталей
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}