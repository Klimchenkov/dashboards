// lib/alertStorage.ts
import { redis } from '@/lib/redis';
import logger from './logger';
import { Alert } from './alertTypes';

const RESOLVED_ALERTS_TTL = 24 * 60 * 60; // 24 часа

/**
 * Получает множество ID решенных алертов
 */
export async function getResolvedAlerts(): Promise<Set<string>> {
  const resolvedAlerts = new Set<string>();
  
  if (!redis) {
    return resolvedAlerts;
  }

  try {
    // Используем SCAN для получения всех ключей решенных алертов
    const stream = redis.scanStream({
      match: 'resolved_alert:*',
      count: 100
    });

    for await (const keys of stream) {
      for (const key of keys) {
        const alertId = key.replace('resolved_alert:', '');
        resolvedAlerts.add(alertId);
      }
    }

    logger.debug('Resolved alerts fetched', { count: resolvedAlerts.size });
  } catch (error) {
    logger.error('Error fetching resolved alerts:', error);
  }

  return resolvedAlerts;
}

/**
 * Обновляет конкретный алерт в конкретном кэш-ключе
 */
export async function updateAlertInCache(
  alerts_cache_key: string, 
  alertId: string, 
  updates: Partial<Alert>
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not available, cannot update alert in cache');
    return false;
  }

  try {
    // Получаем текущий TTL ключа
    const ttl = await redis.ttl(alerts_cache_key);
    if (ttl <= 0) {
      logger.warn('Cache key does not exist or expired', { alerts_cache_key });
      return false;
    }

    // Получаем текущие алерты из кэша
    const cachedAlerts = await redis.get(alerts_cache_key);
    if (!cachedAlerts) {
      logger.warn('No alerts found in cache', { alerts_cache_key });
      return false;
    }

    const alerts: Alert[] = JSON.parse(cachedAlerts);
    let alertFound = false;

    // Обновляем конкретный алерт
    const updatedAlerts = alerts.map(alert => {
      if (alert.id === alertId) {
        alertFound = true;
        return { 
          ...alert, 
          ...updates,
          // Убедимся, что updatedAt всегда обновляется
          lastGenerated: new Date().toISOString()
        };
      }
      return alert;
    });

    if (!alertFound) {
      logger.warn('Alert not found in cache', { alerts_cache_key, alertId });
      return false;
    }

    // Сохраняем обновленный массив обратно в кэш с исходным TTL
    await redis.setex(alerts_cache_key, ttl, JSON.stringify(updatedAlerts));
    
    logger.info('Alert updated in cache', { 
      alerts_cache_key, 
      alertId, 
      updates,
      ttl 
    });

    return true;
  } catch (error) {
    logger.error('Error updating alert in cache:', { alerts_cache_key, alertId, updates, error });
    return false;
  }
}

/**
 * Отмечает алерт как решенный в конкретном кэш-ключе
 */
export async function markAlertAsResolved(
  alertId: string, 
  alerts_cache_key: string
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not available, cannot mark alert as resolved');
    return false;
  }

  try {
    const resolvedAt = new Date().toISOString();

    // 1. Сохраняем в resolved_alert на 24 часа
    await redis.setex(
      `resolved_alert:${alertId}`,
      RESOLVED_ALERTS_TTL,
      'true'
    );
    
    // 2. Обновляем алерт в конкретном кэше
    const cacheUpdated = await updateAlertInCache(alerts_cache_key, alertId, { 
      resolved: true, 
      resolvedAt 
    });
    
    logger.info('Alert marked as resolved', { 
      alertId, 
      alerts_cache_key,
      resolvedAt,
      ttl: RESOLVED_ALERTS_TTL,
      cacheUpdated 
    });
    
    return true;
  } catch (error) {
    logger.error('Error marking alert as resolved:', { alertId, alerts_cache_key, error });
    return false;
  }
}

/**
 * Снимает отметку о решении алерта в конкретном кэш-ключе
 */
export async function markAlertAsUnresolved(
  alertId: string, 
  alerts_cache_key: string
): Promise<boolean> {
  if (!redis) {
    logger.warn('Redis not available, cannot mark alert as unresolved');
    return false;
  }

  try {
    // 1. Удаляем из resolved_alert
    await redis.del(`resolved_alert:${alertId}`);
    
    // 2. Обновляем алерт в конкретном кэше
    const cacheUpdated = await updateAlertInCache(alerts_cache_key, alertId, { 
      resolved: false, 
      resolvedAt: undefined 
    });
    
    logger.info('Alert marked as unresolved', { 
      alertId, 
      alerts_cache_key,
      cacheUpdated 
    });
    
    return true;
  } catch (error) {
    logger.error('Error marking alert as unresolved:', { alertId, alerts_cache_key, error });
    return false;
  }
}

/**
 * Инвалидирует кэш алертов (теперь используется только для принудительного обновления)
 */
export async function invalidateAlertsCache(): Promise<void> {
  if (!redis) return;

  try {
    const keys = await redis.keys('alerts:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Alerts cache invalidated', { keysCount: keys.length });
    }
  } catch (error) {
    logger.error('Error invalidating alerts cache:', error);
  }
}