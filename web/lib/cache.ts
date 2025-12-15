// lib/cache.ts
import Redis from 'ioredis';
import { ExtendedFilters } from '@/lib/dataModel';


export function generateCacheKey(prefix: string, filters: ExtendedFilters, additional?: string): string {
  const baseKey = `${prefix}_${filters.period}_${filters.horizonMonths}_${filters.selectedDepartments.join(',')}_${filters.excludedDepartments.join(',')}_${filters.selectedProjects.join(',')}_${filters.excludedProjects.join(',')}_${filters.excludedProjectStatuses.join(',')}`;
  return additional ? `${baseKey}_${additional}` : baseKey;
}

export interface CacheOptions {
  maxRetries?: number;
  retryDelay?: number;
  ttl?: number;
  tags?: string[];
}

export interface CacheResult<T> {
  data: T;
  source: 'cache' | 'database';
  error?: string;
}

export const CACHE_CONFIG = {
  DEFAULT_TTL: 3 * 60 * 60, // 3 hours in seconds
  SHORT_TTL: 30 * 60, // 30 minutes for frequently changing data
  LONG_TTL: 6 * 60 * 60, // 6 hours for stable data
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
};

class CacheService {
  private redis: Redis | null = null;
  private isInitializing = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    if (this.redis || this.isInitializing) return;

    const redisUrl = process.env.NEXT_PUBLIC_REDIS_URL;
    if (!redisUrl) {
      console.warn('REDIS_URL not set, caching will be disabled');
      return;
    }

    try {
      this.isInitializing = true;
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        commandTimeout: 5000,
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      this.redis.on('connect', () => {
        console.log('✅ Connected to Redis successfully');
        this.isInitializing = false;
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isInitializing = false;
    }
  }

  public isEnabled(): boolean {
    return this.redis !== null && !this.isInitializing;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Cache read failed for key:', key, error);
      return null;
    }
  }

  public async set(key: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (error) {
      console.warn('Cache write failed for key:', key, error);
    }
  }

  public async setWithTags(key: string, data: any, tags: string[], ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
      
      if (tags.length > 0) {
        const tagKey = `tags:${key}`;
        await this.redis.set(tagKey, JSON.stringify(tags), 'EX', ttl);
      }
    } catch (error) {
      console.warn('Cache write with tags failed for key:', key, error);
    }
  }

  public async del(...keys: string[]): Promise<void> {
    if (!this.redis || keys.length === 0) return;

    try {
      await this.redis.del(...keys);
    } catch (error) {
      console.warn('Cache delete failed for keys:', keys, error);
    }
  }

  public async invalidate(patterns: string[]): Promise<void> {
    if (!this.redis) return;

    try {
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`🗑️ Invalidated cache keys for pattern: ${pattern} (${keys.length} keys)`);
        }
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  }

  public async getStats(): Promise<{ hits: number; misses: number; keys: number }> {
    if (!this.redis) {
      return { hits: 0, misses: 0, keys: 0 };
    }

    try {
      const keys = await this.redis.keys('*');
      return { hits: 0, misses: 0, keys: keys.length };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { hits: 0, misses: 0, keys: 0 };
    }
  }

  public async quit(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Enhanced cache helper function with better error handling and cache invalidation
export async function cacheGet<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  options: CacheOptions = {}
): Promise<CacheResult<T>> {
  const { 
    maxRetries = CACHE_CONFIG.MAX_RETRIES, 
    retryDelay = CACHE_CONFIG.RETRY_DELAY,
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    tags = []
  } = options;
  
  let retries = 0;

  // If Redis is not available, directly fetch from database
  if (!cacheService.isEnabled()) {
    console.log('🔄 Redis not available, fetching directly from database for:', key);
    try {
      const freshData = await fetchFn();
      return { data: freshData, source: 'database' };
    } catch (error) {
      throw error;
    }
  }

  const attemptFetch = async (): Promise<CacheResult<T>> => {
    try {
      // Try cache first (only on first attempt)
      if (retries === 0) {
        const cached = await cacheService.get<T>(key);
        if (cached !== null) {
          console.log('✅ Cache hit for:', key);
          return { 
            data: cached, 
            source: 'cache' 
          };
        }
      }

      // Fetch fresh data
      console.log('🔄 Cache miss for:', key);
      const freshData = await fetchFn();
      
      // Cache the result with TTL
      try {
        if (tags.length > 0) {
          await cacheService.setWithTags(key, freshData, tags, ttl);
        } else {
          await cacheService.set(key, freshData, ttl);
        }
        console.log('💾 Cached data for:', key, `(TTL: ${ttl}s)`);
      } catch (cacheError) {
        console.warn('Failed to cache data for:', key, cacheError);
        // Don't throw here - we still have the fresh data
      }
      
      return { data: freshData, source: 'database' };
    } catch (error) {
      retries++;
      if (retries <= maxRetries) {
        console.log(`🔄 Retry ${retries}/${maxRetries} for ${key}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch();
      }
      
      // On final failure, try to return stale cache if available (cache-aside pattern)
      if (retries > 1) {
        try {
          const staleCached = await cacheService.get<T>(key);
          if (staleCached !== null) {
            console.log('🔄 Using stale cache after failure for:', key);
            return { 
              data: staleCached, 
              source: 'cache',
              error: 'Using cached data due to fetch failure'
            };
          }
        } catch (staleError) {
          // Ignore errors in stale cache retrieval
        }
      }
      
      throw error;
    }
  };

  return attemptFetch();
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await cacheService.quit();
    console.log('Redis connection closed gracefully');
  });
}