// app/api/alerts/route.ts (GET)
import { NextRequest, NextResponse } from 'next/server';
import { getResolvedAlerts } from '@/lib/alertStorage';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { searchParams } = new URL(request.url);
    const alerts_cache_key = searchParams.get('alerts_cache_key');

    if (!alerts_cache_key) {
      return NextResponse.json(
        { error: 'alerts_cache_key is required' },
        { status: 400 }
      );
    }

    let alerts: any[] = [];
    let source = 'cache';
    
    // Пытаемся получить из кэша
    if (redis) {
      const cachedAlerts = await redis.get(alerts_cache_key);
      if (cachedAlerts) {
        alerts = JSON.parse(cachedAlerts);
        console.log('Alerts loaded from cache', { 
          requestId, 
          alertsCount: alerts.length,
          cacheKey: alerts_cache_key 
        });
      } else {
        console.log('No alerts found in cache for key:', alerts_cache_key);
        source = 'empty';
      }
    } else {
      console.log('Redis not available, returning empty alerts');
      source = 'redis_unavailable';
    }

    // Получаем решенные алерты для фильтрации
    const resolvedAlerts = await getResolvedAlerts();
    
    // Обновляем поле resolved в алертах на основе хранилища
    const alertsWithResolvedStatus = alerts.map(alert => ({
      ...alert,
      // Алерт считается решенным, если он есть в resolved_alert хранилище
      resolved: resolvedAlerts.has(alert.id)
    }));

    // Активные алерты - те, которые не решены
    const activeAlerts = alertsWithResolvedStatus.filter(alert => !alert.resolved);

    console.log('Alerts API response', {
      requestId,
      totalAlerts: alerts.length,
      resolvedAlerts: resolvedAlerts.size,
      activeAlerts: activeAlerts.length,
      source,
      cacheKey: alerts_cache_key
    });

    return NextResponse.json({
      alerts: activeAlerts, // Возвращаем только активные алерты
      total: alerts.length,
      resolved: resolvedAlerts.size,
      active: activeAlerts.length,
      source,
      cacheKey: alerts_cache_key,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in alerts API:', { requestId, error });
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        alerts: [],
        source: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}