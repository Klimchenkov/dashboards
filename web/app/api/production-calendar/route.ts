import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Redis initialization (same as your dashboard-data route)
let redis: Redis | null = null;
const initializeRedis = () => {
  if (redis) return redis;
  // ... same Redis initialization logic as your dashboard-data route
};

const redisClient = initializeRedis();

const CACHE_CONFIG = {
  TTL: 24 * 60 * 60, // 24 hours for calendar data
};

async function cacheGet<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (!redisClient) {
    return await fetchFn();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache read failed, fetching fresh:', error);
  }

  const freshData = await fetchFn();
  
  try {
    await redisClient.set(key, JSON.stringify(freshData), 'EX', CACHE_CONFIG.TTL);
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
  
  return freshData;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const cacheKey = `production_calendar_${startDate}_${endDate}`;

    const calendarData = await cacheGet(cacheKey, async () => {
      const { data, error } = await supabase
        .from('ru_production_calendar')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Convert to Map for consistency with existing interface
      const calendarMap = new Map();
      data?.forEach(day => {
        calendarMap.set(day.date, day);
      });
      
      return Array.from(calendarMap.entries());
    });

    return NextResponse.json({
      calendar: calendarData,
      timestamp: new Date().toISOString(),
      cacheStatus: 'success',
      redisEnabled: !!redisClient
    });

  } catch (error) {
    console.error('Error fetching production calendar:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch production calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}