import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Simple in-memory fallback for development
const memoryCache = new Map();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const cacheKey = `user_filters_${userId}`;
    let filters = null;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        filters = JSON.parse(cached);
      }
    } else {
      // Fallback to memory cache
      filters = memoryCache.get(cacheKey);
    }

    return NextResponse.json({
      filters,
      timestamp: new Date().toISOString(),
      cacheStatus: filters ? 'hit' : 'miss',
      redisEnabled: !!redis
    });

  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, filters } = body;

    if (!userId || !filters) {
      return NextResponse.json({ error: 'User ID and filters are required' }, { status: 400 });
    }

    const cacheKey = `user_filters_${userId}`;

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(filters), 'EX', 30 * 24 * 60 * 60); // 30 days
    } else {
      // Fallback to memory cache
      memoryCache.set(cacheKey, filters);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      redisEnabled: !!redis
    });

  } catch (error) {
    console.error('Error saving filters:', error);
    return NextResponse.json(
      { error: 'Failed to save filters' },
      { status: 500 }
    );
  }
}