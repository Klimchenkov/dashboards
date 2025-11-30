// components/alerts/AlertCenter.tsx
'use client';
import { useState, useMemo } from 'react';
import { Card, Button } from '@/components/ui';
import { useAlerts } from '@/hooks/useAlerts';
import { Alert } from '@/lib/alertTypes';
import { AlertStats } from './AlertStats';
import { AlertFilters as AlertFiltersComponent } from './AlertFilters';
import { AlertList } from './AlertList';
import { AlertDetails } from './AlertDetails';
import { AlertEmptyState } from './AlertEmptyState';
import { AlertLoadingState } from './AlertLoadingState';
import { AlertErrorState } from './AlertErrorState';

interface AlertCenterProps {
  compact?: boolean;
  maxAlerts?: number;
  alerts_cache_key?: string; 
  className?: string;
}

export function AlertCenter({ 
  compact = false, 
  maxAlerts, 
  alerts_cache_key,
  className = '' 
}: AlertCenterProps) {
  const {
    alerts,
    groupedAlerts,
    stats,
    filters: alertFilters,
    updateFilters,
    markAsResolved,
    markAsUnresolved,
    refreshAlerts,
    loading,
    error,
    lastUpdated,
    hasAlerts,
    hasFilteredAlerts,
    clearFilters
  } = useAlerts(alerts_cache_key);

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Обработчики событий
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

  const handleMarkResolved = async (alertId: string) => {
    const success = await markAsResolved(alertId);
    if (success && selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  const handleMarkUnresolved = async (alertId: string) => {
    const success = await markAsUnresolved(alertId);
    if (success && selectedAlert?.id === alertId) {
      setSelectedAlert(null);
    }
  };

  const handleRefresh = () => {
    refreshAlerts();
  };

  // Ограничение количества алертов для компактного режима
  const displayAlerts = useMemo(() => {
    if (!maxAlerts) return alerts;
    return alerts.slice(0, maxAlerts);
  }, [alerts, maxAlerts]);

  // Состояние: нет ключа для загрузки
  if (!alerts_cache_key) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg mb-2">🚨</div>
          <div>Данные для загрузки алертов еще не готовы</div>
          <div className="text-sm mt-2 opacity-70">
            Дождитесь загрузки основных данных дашборда
          </div>
        </div>
      </Card>
    );
  }

  // Состояние: загрузка
  if (loading) {
    return <AlertLoadingState compact={compact} className={className} />;
  }

  // Состояние: ошибка
  if (error) {
    return (
      <AlertErrorState 
        error={error} 
        onRetry={handleRefresh}
        compact={compact}
        className={className}
      />
    );
  }

  // Состояние: нет алертов
  if (!hasAlerts) {
    return (
      <AlertEmptyState 
        onRefresh={handleRefresh}
        compact={compact}
        className={className}
      />
    );
  }

  // Компактный режим
  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Критические алерты</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="h-6 px-2 text-xs"
          >
            Обновить
          </Button>
        </div>
        
        <AlertStats stats={stats} compact />
        
        <div className="mt-3">
          <AlertList
            alerts={displayAlerts.filter(a => a.severity === 'critical')}
            onSelectAlert={setSelectedAlert}
            onMarkResolved={handleMarkResolved}
            compact
          />
        </div>

        {lastUpdated && (
          <div className="text-xs text-muted-foreground mt-2 text-right">
            Обновлено: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </Card>
    );
  }

  // Полный режим
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Система алертов</h2>
          <p className="text-muted-foreground">
            Мониторинг проблем и аномалий в работе отделов и проектов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
          <Button 
            variant="outline" 
            onClick={clearFilters}
          >
            Сбросить фильтры
          </Button>
        </div>
      </div>

      {/* Общая статистика */}
      <AlertStats stats={stats} />
      
      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Панель фильтров */}
        <div className="lg:col-span-1">
          <AlertFiltersComponent
            filters={alertFilters}
            onFiltersChange={updateFilters}
            stats={stats}
            onClearFilters={clearFilters}
          />
        </div>
        
        {/* Список алертов */}
        <div className="lg:col-span-2">
          {hasFilteredAlerts ? (
            <AlertList
              alerts={alerts}
              groupedAlerts={groupedAlerts}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
              onSelectAlert={setSelectedAlert}
              onMarkResolved={handleMarkResolved}
              onMarkUnresolved={handleMarkUnresolved}
            />
          ) : (
            <Card className="p-6 text-center">
              <div className="text-muted-foreground">
                <div className="text-lg mb-2">🔍</div>
                <div>Нет алертов, соответствующих выбранным фильтрам</div>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-3"
                >
                  Сбросить фильтры
                </Button>
              </div>
            </Card>
          )}
        </div>
        
        {/* Детали алерта */}
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <AlertDetails
              alert={selectedAlert}
              onMarkResolved={handleMarkResolved}
              onMarkUnresolved={handleMarkUnresolved}
              onClose={() => setSelectedAlert(null)}
            />
          ) : (
            <Card className="p-6 h-full flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <div className="text-lg mb-2">📋</div>
                <div>Выберите алерт для просмотра деталей</div>
                <div className="text-sm mt-1 opacity-70">
                  Нажмите на любой алерт в списке
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Футер с информацией */}
      {lastUpdated && (
        <div className="text-sm text-muted-foreground text-center">
          Данные обновлены: {new Date(lastUpdated).toLocaleString('ru-RU')}
        </div>
      )}
    </div>
  );
}