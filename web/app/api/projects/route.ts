import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CACHE_CONFIG = {
  TTL: 2 * 60 * 60, // 2 hours for project data (more volatile)
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

async function cacheGet<T>(
  key: string, 
  fetchFn: () => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number; ttl?: number } = {}
): Promise<{ data: T; source: 'cache' | 'database'; error?: string }> {
  const { 
    maxRetries = CACHE_CONFIG.MAX_RETRIES, 
    retryDelay = CACHE_CONFIG.RETRY_DELAY,
    ttl = CACHE_CONFIG.TTL
  } = options;
  
  let retries = 0;

  if (!redis) {
    logger.info('Redis not available, fetching projects directly');
    try {
      const freshData = await fetchFn();
      return { data: freshData, source: 'database' };
    } catch (error) {
      throw error;
    }
  }

  const attemptFetch = async (): Promise<{ data: T; source: 'cache' | 'database'; error?: string }> => {
    try {
      if (retries === 0) {
        const cached = await redis!.get(key);
        if (cached) {
          logger.debug('Project cache hit', { key });
          return { data: JSON.parse(cached), source: 'cache' };
        }
      }

      logger.debug('Project cache miss', { key });
      const freshData = await fetchFn();
      
      try {
        await redis!.set(key, JSON.stringify(freshData), 'EX', ttl);
        logger.debug('Project data cached', { key, ttl });
      } catch (cacheError) {
        logger.warn('Failed to cache project data', { key, cacheError });
      }
      
      return { data: freshData, source: 'database' };
    } catch (error) {
      retries++;
      if (retries <= maxRetries) {
        logger.warn(`Project fetch retry ${retries}/${maxRetries}`, { key, error });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch();
      }
      
      // On final failure, try to return stale cache if available
      if (retries > 1) {
        try {
          const staleCached = await redis!.get(key);
          if (staleCached) {
            logger.warn('Using stale project cache after failure', { key });
            return { 
              data: JSON.parse(staleCached), 
              source: 'cache',
              error: 'Используются кэшированные данные проектов из-за ошибки'
            };
          }
        } catch (staleError) {
          // Ignore stale cache errors
        }
      }
      
      throw error;
    }
  };

  return attemptFetch();
}

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    logger.info('Projects API called', { requestId });
    
    const cacheKey = 'projects_list';
    const result = await cacheGet(
      cacheKey,
      async () => {
        logger.info('Fetching projects from database', { requestId });
        
        const { data, error } = await supabase
          .from('projects')
          .select('id, project_name, project_status')
          .order('project_name');

        if (error) {
          logger.error('Database error fetching projects', { requestId, error });
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
          logger.warn('No projects found', { requestId });
          return [];
        }

        const projects = data.map(project => ({
          id: project.id,
          name: project.project_name || 'Unnamed Project',
          status: project.project_status
        }));

        logger.info('Projects fetched successfully', { 
          requestId, 
          count: projects.length,
          statuses: [...new Set(projects.map(p => p.status))]
        });
        
        return projects;
      },
      { ttl: CACHE_CONFIG.TTL }
    );

    const responseTime = Date.now() - startTime;
    
    const responseData = {
      projects: result.data,
      timestamp: new Date().toISOString(),
      cacheStatus: result.source,
      redisEnabled: !!redis,
      requestId,
      responseTime: `${responseTime}ms`,
      ...(result.error && { warning: result.error })
    };

    logger.info('Projects API response ready', {
      requestId,
      responseTime,
      projectCount: result.data.length,
      cacheStatus: result.source
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error in projects API', { 
      requestId, 
      error: error instanceof Error ? error.message : String(error),
      responseTime 
    });
    
    return NextResponse.json(
      { 
        error: 'Не удалось загрузить список проектов',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        redisEnabled: !!redis,
        requestId
      },
      { status: 500 }
    );
  }
}