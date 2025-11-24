import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import logger from '@/lib/logger';
import { UserExclusions } from '@/lib/dataModel';

const EXCLUSIONS_CONFIG = {
  TTL: 365 * 24 * 60 * 60, // 1 year for long-term exclusions
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Helper to get user ID from request
function getUserId(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // Extract user from JWT token (simplified)
    return `user_${authHeader.substring(7, 15)}`; // In real app, decode JWT
  }
  
  // Fallback to query parameter for demo
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  return userId || 'demo-user';
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = EXCLUSIONS_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Exclusions operation attempt ${attempt} failed`, { error });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, EXCLUSIONS_CONFIG.RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError!;
}

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    const userId = getUserId(request);
    logger.info('Fetching user exclusions', { requestId, userId });
    
    if (!redis) {
      logger.warn('Redis not available, returning default exclusions', { requestId });
      return NextResponse.json({
        exclusions: {
          excludedDepartments: [],
          excludedProjects: [],
          excludedProjectStatuses: []
        },
        timestamp: new Date().toISOString(),
        redisEnabled: false,
        requestId
      });
    }

    const cacheKey = `user_exclusions_${userId}`;
    
    const exclusions = await withRetry(async () => {
      const cached = await redis!.get(cacheKey);
      if (cached) {
        logger.debug('Exclusions cache hit', { requestId, userId });
        return JSON.parse(cached);
      }
      
      logger.debug('No exclusions found for user, returning defaults', { requestId, userId });
      return {
        excludedDepartments: [],
        excludedProjects: [],
        excludedProjectStatuses: []
      };
    });

    const responseTime = Date.now() - startTime;
    
    logger.info('Exclusions fetched successfully', {
      requestId,
      userId,
      responseTime,
      departmentExclusions: exclusions.excludedDepartments.length,
      projectExclusions: exclusions.excludedProjects.length,
      statusExclusions: exclusions.excludedProjectStatuses.length
    });
    
    return NextResponse.json({
      exclusions,
      timestamp: new Date().toISOString(),
      redisEnabled: true,
      requestId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error fetching exclusions', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      responseTime 
    });
    
    return NextResponse.json(
      { 
        error: 'Не удалось загрузить настройки исключений',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        redisEnabled: !!redis,
        requestId
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { userId, exclusions } = body;

    if (!exclusions) {
      return NextResponse.json({ error: 'Exclusions data is required' }, { status: 400 });
    }

    logger.info('Saving user exclusions', { 
      requestId, 
      userId,
      departmentExclusions: exclusions.excludedDepartments?.length || 0,
      projectExclusions: exclusions.excludedProjects?.length || 0,
      statusExclusions: exclusions.excludedProjectStatuses?.length || 0
    });

    if (!redis) {
      logger.warn('Redis not available, cannot save exclusions', { requestId });
      return NextResponse.json(
        { error: 'Storage not available' },
        { status: 503 }
      );
    }

    const cacheKey = `user_exclusions_${userId}`;
    const exclusionsData = {
      ...exclusions,
      userId,
      updatedAt: new Date().toISOString()
    };

    await withRetry(async () => {
      await redis!.set(cacheKey, JSON.stringify(exclusionsData), 'EX', EXCLUSIONS_CONFIG.TTL);
    });

    const responseTime = Date.now() - startTime;
    
    logger.info('Exclusions saved successfully', {
      requestId,
      userId,
      responseTime
    });
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      redisEnabled: true,
      requestId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error saving exclusions', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      responseTime 
    });
    
    return NextResponse.json(
      { 
        error: 'Не удалось сохранить настройки исключений',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        redisEnabled: !!redis,
        requestId
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    const userId = getUserId(request);
    logger.info('Clearing user exclusions', { requestId, userId });

    if (!redis) {
      return NextResponse.json({ success: true, message: 'No exclusions to clear' });
    }

    const cacheKey = `user_exclusions_${userId}`;
    await withRetry(async () => {
      await redis!.del(cacheKey);
    });

    const responseTime = Date.now() - startTime;
    
    logger.info('Exclusions cleared successfully', { requestId, userId, responseTime });
    
    return NextResponse.json({
      success: true,
      message: 'Exclusions cleared',
      timestamp: new Date().toISOString(),
      requestId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error clearing exclusions', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      responseTime 
    });
    
    return NextResponse.json(
      { error: 'Failed to clear exclusions' },
      { status: 500 }
    );
  }
}