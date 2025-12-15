// lib/alertTypes.ts
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'load' | 'data_quality' | 'project' | 'norms' | 'strategy' | 'sales' | 'vacation' | 'forecast';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  entityType: 'user' | 'department' | 'project';
  entityId: number | string;
  entityName: string;
  period?: string;
  metricValue?: number;
  threshold?: number;
  createdAt: string;
  resolved?: boolean;
  resolvedAt?: string;
  source?: 'person' | 'project' | 'system';
  // Новые поля для API
  lastGenerated?: string;
  ttl?: number; // Время жизни в секундах
}

// Добавляем в AlertStats
export interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byCategory: {
    load: number;
    data_quality: number;
    project: number;
    norms: number;
    strategy: number;
    sales: number;
    vacation: number;
    forecast: number;
  };
  bySource: {
    person: number;
    project: number;
    system: number;
  };
  // Новые поля
  cacheStatus?: {
    isCached: boolean;
    lastUpdated: string;
    ttl: number;
  };
}

export interface AlertFilters {
  severity: AlertSeverity | 'all';
  category: AlertCategory | 'all';
  search: string;
  resolved: boolean | 'all';
  groupBy: 'category' | 'severity' | 'department' | 'none';
  source?: 'all' | 'person' | 'project' | 'system';
}
