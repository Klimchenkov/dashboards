// hooks/useAlerts.ts
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert, AlertFilters, AlertStats } from '@/lib/alertTypes';
import { calculateAlertStats } from '@/lib/alertUtils';

// Вспомогательные функции для отображения
function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    load: 'Загрузка',
    data_quality: 'Качество данных',
    project: 'Проекты',
    norms: 'Нормы',
    strategy: 'Стратегия',
    sales: 'Продажи',
    vacation: 'Отпуска',
    forecast: 'Прогноз'
  };
  return names[category] || category;
}

function getSeverityDisplayName(severity: string): string {
  const names: Record<string, string> = {
    critical: 'Критические',
    warning: 'Предупреждения',
    info: 'Информационные'
  };
  return names[severity] || severity;
}

export function useAlerts(alerts_cache_key?: string) {
  const [alertFilters, setAlertFilters] = useState<AlertFilters>({
    severity: 'all',
    category: 'all',
    search: '',
    resolved: false,
    groupBy: 'category',
    source: 'all'
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Основная функция загрузки алертов через API
  const fetchAlerts = useCallback(async () => {
    if (!alerts_cache_key) {
      console.log('No alerts cache key provided, skipping fetch');
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        alerts_cache_key
      });

      const response = await fetch(`/api/alerts?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const result = await response.json();
      setAlerts(result.alerts || []);
      setLastUpdated(new Date().toISOString());
      
      console.log('Alerts fetched successfully', {
        count: result.alerts?.length,
        source: result.source,
        cacheKey: result.cacheKey,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching alerts via API:', err);
    } finally {
      setLoading(false);
    }
  }, [alerts_cache_key]);

  // Загружаем алерты при изменении alerts_cache_key
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Функция обновления фильтров алертов
  const updateAlertFilters = useCallback((updates: Partial<AlertFilters>) => {
    setAlertFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Фильтрация алертов на клиенте
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    if (alertFilters.severity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === alertFilters.severity);
    }

    if (alertFilters.category !== 'all') {
      filtered = filtered.filter(alert => alert.category === alertFilters.category);
    }

    if (alertFilters.source !== 'all') {
      filtered = filtered.filter(alert => alert.source === alertFilters.source);
    }

    if (alertFilters.search) {
      const searchLower = alertFilters.search.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchLower) ||
        alert.description.toLowerCase().includes(searchLower) ||
        alert.entityName.toLowerCase().includes(searchLower)
      );
    }

    // Фильтрация по resolved статусу
    if (alertFilters.resolved !== undefined) {
      filtered = filtered.filter(alert => alert.resolved === alertFilters.resolved);
    }

    return filtered;
  }, [alerts, alertFilters]);

  // Группировка алертов
  const groupedAlerts = useMemo(() => {
    if (alertFilters.groupBy === 'none') {
      return { 'Все алерты': filteredAlerts };
    }

    const groups: Record<string, Alert[]> = {};

    filteredAlerts.forEach(alert => {
      let key: string;
      
      switch (alertFilters.groupBy) {
        case 'category':
          key = getCategoryDisplayName(alert.category);
          break;
        case 'severity':
          key = getSeverityDisplayName(alert.severity);
          break;
        case 'department':
          key = alert.entityType === 'department' ? alert.entityName : 'Другие';
          break;
        case 'project':
          key = alert.entityType === 'project' ? alert.entityName : 'Другие';
          break;
        default:
          key = 'Все алерты';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(alert);
    });

    // Сортируем группы по количеству алертов (по убыванию)
    const sortedGroups: Record<string, Alert[]> = {};
    Object.keys(groups)
      .sort((a, b) => groups[b].length - groups[a].length)
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });

    return sortedGroups;
  }, [filteredAlerts, alertFilters.groupBy]);

  // Статистика алертов
  const stats = useMemo(() => calculateAlertStats(alerts), [alerts]);

  // Функции для работы с алертами
  const markAsResolved = useCallback(async (alertId: string) => {
    if (!alerts_cache_key) {
      console.error('No alerts_cache_key available for resolve operation');
      return false;
    }

    try {
      const response = await fetch('/api/alerts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          alertId, 
          alerts_cache_key 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve alert: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Оптимистично обновляем локальное состояние
        const resolvedAt = new Date().toISOString();
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { 
            ...alert, 
            resolved: true, 
            resolvedAt 
          } : alert
        ));
        
        console.log('Alert marked as resolved:', alertId);
        return true;
      } else {
        throw new Error(result.message || 'Failed to resolve alert');
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      // В случае ошибки перезагружаем алерты для синхронизации
      await fetchAlerts();
      return false;
    }
  }, [alerts_cache_key, fetchAlerts]);

  const markAsUnresolved = useCallback(async (alertId: string) => {
    if (!alerts_cache_key) {
      console.error('No alerts_cache_key available for unresolve operation');
      return false;
    }

    try {
      const response = await fetch('/api/alerts/unresolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          alertId, 
          alerts_cache_key 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to unresolve alert: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Оптимистично обновляем локальное состояние
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { 
            ...alert, 
            resolved: false, 
            resolvedAt: undefined 
          } : alert
        ));
        
        console.log('Alert marked as unresolved:', alertId);
        return true;
      } else {
        throw new Error(result.message || 'Failed to unresolve alert');
      }
    } catch (err) {
      console.error('Error unresolving alert:', err);
      // В случае ошибки перезагружаем алерты для синхронизации
      await fetchAlerts();
      return false;
    }
  }, [alerts_cache_key, fetchAlerts]);

  const refreshAlerts = useCallback(async () => {
    try {
      await fetchAlerts();
      console.log('Alerts refreshed manually');
    } catch (err) {
      console.error('Error refreshing alerts:', err);
    }
  }, [fetchAlerts]);

  const clearFilters = useCallback(() => {
    setAlertFilters({
      severity: 'all',
      category: 'all',
      search: '',
      resolved: false,
      groupBy: 'category',
      source: 'all'
    });
  }, []);
  
  return {
    // Данные
    alerts: filteredAlerts,
    groupedAlerts,
    stats,
    rawAlerts: alerts, // Исходные алерты без фильтрации
    
    // Фильтры
    filters: alertFilters,
    updateFilters: updateAlertFilters,
    clearFilters,
    
    // Действия
    markAsResolved,
    markAsUnresolved,
    refreshAlerts,
    
    // Состояние
    loading,
    error,
    lastUpdated,
    
    // Мета-информация
    hasAlerts: alerts.length > 0,
    hasFilteredAlerts: filteredAlerts.length > 0,
    alertsCacheKey: alerts_cache_key
  };
}