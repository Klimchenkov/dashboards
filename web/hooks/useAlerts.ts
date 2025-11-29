import { useState, useMemo, useCallback } from 'react';
import { Alert, AlertFilters, AlertStats } from '@/lib/alertTypes';
import { AlertGenerator, calculateAlertStats } from '@/lib/alertUtils';
import { useDashboardData } from './useDashboardData';
import { useFilters } from './useFilters';

export function useAlerts() {
  const { filters } = useFilters();
  const { data, loading, error } = useDashboardData(filters);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>({
    severity: 'all',
    category: 'all',
    search: '',
    resolved: false,
    groupBy: 'category'
  });

  const alerts = useMemo(() => {
    if (!data) return [];

    const periodStart = filters.periodStart || new Date().toISOString().split('T')[0];
    const periodEnd = filters.periodEnd || new Date().toISOString().split('T')[0];

    return AlertGenerator.generateAlerts(
      data.users,
      data.departments,
      data.projects,
      data.timeEntries,
      data.metrics,
      periodStart,
      periodEnd
    );
  }, [data, filters]);

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    if (alertFilters.severity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === alertFilters.severity);
    }

    if (alertFilters.category !== 'all') {
      filtered = filtered.filter(alert => alert.category === alertFilters.category);
    }

    if (alertFilters.search) {
      const searchLower = alertFilters.search.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchLower) ||
        alert.description.toLowerCase().includes(searchLower) ||
        alert.entityName.toLowerCase().includes(searchLower)
      );
    }

    if (alertFilters.resolved !== 'all') {
      filtered = filtered.filter(alert => 
        alertFilters.resolved ? alert.resolved : !alert.resolved
      );
    }

    return filtered;
  }, [alerts, alertFilters]);

  const groupedAlerts = useMemo(() => {
    if (alertFilters.groupBy === 'none') {
      return { 'Все алерты': filteredAlerts };
    }

    const groups: Record<string, Alert[]> = {};

    filteredAlerts.forEach(alert => {
      let key: string;
      
      switch (alertFilters.groupBy) {
        case 'category':
          key = alert.category;
          break;
        case 'severity':
          key = alert.severity;
          break;
        case 'department':
          key = alert.entityType === 'department' ? alert.entityName : 'Другие';
          break;
        default:
          key = 'Все алерты';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(alert);
    });

    return groups;
  }, [filteredAlerts, alertFilters.groupBy]);

  const stats = useMemo(() => calculateAlertStats(alerts), [alerts]);

  const updateAlertFilters = useCallback((updates: Partial<AlertFilters>) => {
    setAlertFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const markAsResolved = useCallback((alertId: string) => {
    // В реальном приложении здесь был бы API call
    console.log('Marking alert as resolved:', alertId);
  }, []);

  return {
    alerts: filteredAlerts,
    groupedAlerts,
    stats,
    filters: alertFilters,
    updateFilters: updateAlertFilters,
    markAsResolved,
    loading,
    error
  };
}