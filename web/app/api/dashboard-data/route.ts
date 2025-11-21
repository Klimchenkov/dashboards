// app/api/dashboard-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis'; // Using ioredis for better Redis support
import { startOfPeriod, endOfPeriod, fmt } from '@/lib/date';
import { Filters, User, Project, Department, TimeEntry, Plan, VacationType } from '@/lib/dataModel';

// Initialize Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use service role key for server-side
);

// Redis client configuration
let redis: Redis | null = null;

// Initialize Redis client with connection handling
const initializeRedis = () => {
  if (redis) return redis;

  const redisUrl = process.env.NEXT_PUBLIC_REDIS_URL;
  if (!redisUrl) {
    console.warn('REDIS_URL not set, caching will be disabled');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      commandTimeout: 5000,
    });

    // Add error handling
    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      // Don't set redis to null here to avoid repeated initialization attempts
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
};

// Initialize Redis on module load
const redisClient = initializeRedis();

const CACHE_CONFIG = {
  DEFAULT_TTL: 3 * 60 * 60, // 3 hours in seconds
  SHORT_TTL: 30 * 60, // 30 minutes for frequently changing data
  LONG_TTL: 6 * 60 * 60, // 6 hours for stable data
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
};

// Enhanced cache helper function with better error handling and cache invalidation
async function cacheGet<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  options: { 
    maxRetries?: number; 
    retryDelay?: number;
    ttl?: number;
    tags?: string[]; // For cache invalidation by tags
  } = {}
): Promise<{ data: T; source: 'cache' | 'database'; error?: string }> {
  const { 
    maxRetries = CACHE_CONFIG.MAX_RETRIES, 
    retryDelay = CACHE_CONFIG.RETRY_DELAY,
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    tags = []
  } = options;
  
  let retries = 0;

  // If Redis is not available, directly fetch from database
  if (!redisClient) {
    console.log('🔄 Redis not available, fetching directly from database for:', key);
    try {
      const freshData = await fetchFn();
      return { data: freshData, source: 'database' };
    } catch (error) {
      throw error;
    }
  }

  const attemptFetch = async (): Promise<{ data: T; source: 'cache' | 'database'; error?: string }> => {
    try {
      // Try cache first (only on first attempt)
      if (retries === 0) {
        const cached = await redisClient!.get(key);
        if (cached) {
          console.log('✅ Cache hit for:', key);
          return { 
            data: JSON.parse(cached), 
            source: 'cache' 
          };
        }
      }

      // Fetch fresh data
      console.log('🔄 Cache miss for:', key);
      const freshData = await fetchFn();
      
      // Cache the result with TTL
      try {
        await redisClient!.set(key, JSON.stringify(freshData), 'EX', ttl);
        
        // Store cache tags for invalidation if provided
        if (tags.length > 0) {
          const tagKey = `tags:${key}`;
          await redisClient!.set(tagKey, JSON.stringify(tags), 'EX', ttl);
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
          const staleCached = await redisClient!.get(key);
          if (staleCached) {
            console.log('🔄 Using stale cache after failure for:', key);
            return { 
              data: JSON.parse(staleCached), 
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

// Cache invalidation helper
async function invalidateCache(patterns: string[]): Promise<void> {
  if (!redisClient) return;

  try {
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`🗑️ Invalidated cache keys for pattern: ${pattern} (${keys.length} keys)`);
      }
    }
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}

// Cache key generator with versioning
function generateCacheKey(prefix: string, filters: Filters, additional?: string): string {
  const baseKey = `${prefix}_${filters.period}_${filters.seed}`;
  return additional ? `${baseKey}_${additional}` : baseKey;
}

// Data fetching functions with optimized TTL settings
async function fetchUsers(filters: Filters): Promise<User[]> {
  const cacheKey = generateCacheKey('users', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('setters_users')
        .select(`
          *,
          user_vacations(*),
          setters_user_norms(*),
          project_user_hour_plans(*)
        `)
      
      if (error) throw error;

      return (data || []).map(user => {
        const firstNorm = user.setters_user_norms && user.setters_user_norms.length > 0 
          ? user.setters_user_norms
              .sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
          : null;

        const userPlans: Plan[] = (user.project_user_hour_plans || []).map((plan: any) => ({
          id: plan.id,
          project_id: plan.project_id,
          user_id: plan.user_id,
          contracted_hours: parseFloat(plan.contracted_hours) || 0,
          internal_hours: parseFloat(plan.internal_hours) || 0,
          isActive: plan.isActive,
          comment: plan.comment
        }));

        return {
          id: user.id,
          name: user.name,
          created_at: user.created_at,
          isActive: user.isActive,
          vacations: (user.user_vacations || []).map((vacation: any) => ({
            ...vacation,
            vacation_type: vacation.vacation_type as VacationType
          })),
          norm: firstNorm ? {
            ...firstNorm,
            hours_commercial: parseFloat(firstNorm.hours_commercial),
            hours_presale: parseFloat(firstNorm.hours_presale),
            hours_internal: parseFloat(firstNorm.hours_internal)
          } : null,
          plans: userPlans
        };
      });
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL, // User data doesn't change frequently
      tags: ['users'] 
    }
  );
  return result.data;
}

async function fetchProjects(filters: Filters): Promise<Project[]> {
  const cacheKey = generateCacheKey('projects', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_user_hour_plans(*)
        `)
      
      if (error) throw error;

      return (data || []).map((project: any) => {
        const projectPlans: Plan[] = (project.project_user_hour_plans || []).map((plan: any) => ({
          id: plan.id,
          project_id: plan.project_id,
          user_id: plan.user_id,
          contracted_hours: parseFloat(plan.contracted_hours) || 0,
          internal_hours: parseFloat(plan.internal_hours) || 0,
          isActive: plan.isActive,
          comment: plan.comment
        }));

        return {
          ...project,
          id: project.id,
          name: project.project_name,
          type: project.type,
          isActive: project.project_status === 'active',
          plans: projectPlans
        };
      });
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL, // Project data is relatively stable
      tags: ['projects'] 
    }
  );
  return result.data;
}

async function fetchDepartments(filters: Filters): Promise<Department[]> {
  const cacheKey = generateCacheKey('departments', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          user_departments (
            setters_users (
              *,
              user_vacations(*),
              setters_user_norms(*),
              project_user_hour_plans(
                *,
                projects(start_date, end_date)
              ),
              time_entries(*)
            )
          )
        `);
      
      if (error) throw error;

      return (data || []).map((department: any) => ({
        id: department.id,
        name: department.name,
        lead_tg_id: department.lead_tg_id,
        users: (department.user_departments || []).map((ud: any) => {
          const user = ud.setters_users;
          if (!user) return null;
          
          const firstNorm = user.setters_user_norms && user.setters_user_norms.length > 0 
            ? user.setters_user_norms
                .sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
            : null;

          const userPlans: Plan[] = (user.project_user_hour_plans || []).map((plan: any) => ({
            id: plan.id,
            project_id: plan.project_id,
            user_id: plan.user_id,
            contracted_hours: parseFloat(plan.contracted_hours) || 0,
            internal_hours: parseFloat(plan.internal_hours) || 0,
            isActive: plan.isActive,
            comment: plan.comment,
            project_start_date: plan.projects?.start_date,
            project_end_date: plan.projects?.end_date,
          }));

          const userEntries: TimeEntry[] = (user.time_entries || []).map((entry: any) => ({
              ...entry
            }));

          return {
            id: user.id,
            name: user.name,
            created_at: user.created_at,
            isActive: user.isActive,
            vacations: (user.user_vacations || []).map((vacation: any) => ({
              ...vacation,
              vacation_type: vacation.vacation_type as VacationType
            })),
            norm: firstNorm ? {
              ...firstNorm,
              hours_commercial: parseFloat(firstNorm.hours_commercial),
              hours_presale: parseFloat(firstNorm.hours_presale),
              hours_internal: parseFloat(firstNorm.hours_internal)
            } : null,
            plans: userPlans,
            time_entries: userEntries
          };
        }) || [] 
      }));
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['departments', 'users'] 
    }
  );
  return result.data;
}

async function fetchTimeEntries(filters: Filters, periodStart: string, periodEnd: string): Promise<TimeEntry[]> {
  const cacheKey = generateCacheKey('time_entries', filters, `${periodStart}_${periodEnd}`);
  const result = await cacheGet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          setters_users!inner(name),
          projects!inner(project_name, project_status)
        `)
        .gte('date', periodStart)
        .lte('date', periodEnd)
        .order('date', { ascending: true });
      
      if (error) throw error;

      return (data || []).map((entry: any) => ({
        ...entry,
        user_name: entry.setters_users.name,
        project_name: entry.projects.project_name,
        project_status: entry.projects.project_status
      }));
    },
    { 
      ttl: CACHE_CONFIG.SHORT_TTL, // Time entries change frequently
      tags: ['time_entries'] 
    }
  );
  return result.data;
}

async function fetchPlans(filters: Filters): Promise<Plan[]> {
  const cacheKey = generateCacheKey('plans', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('project_user_hour_plans')
        .select(`
          *,
          setters_users(name),
          projects(project_name, start_date, end_date)
        `)
        .eq('isActive', true);
      
      if (error) throw error;

      return (data || []).map((plan: any) => ({
        id: plan.id,
        project_id: plan.project_id,
        user_id: plan.user_id,
        contracted_hours: parseFloat(plan.contracted_hours) || 0,
        internal_hours: parseFloat(plan.internal_hours) || 0,
        isActive: plan.isActive,
        comment: plan.comment,
        user_name: plan.setters_users?.name,
        project_name: plan.projects?.project_name,
        project_start_date: plan.projects?.start_date,
        project_end_date: plan.projects?.end_date,
      }));
    },
    { 
      ttl: CACHE_CONFIG.DEFAULT_TTL,
      tags: ['plans'] 
    }
  );
  return result.data;
}

// Cache statistics (optional)
async function getCacheStats(): Promise<{ hits: number; misses: number; keys: number }> {
  if (!redisClient) {
    return { hits: 0, misses: 0, keys: 0 };
  }

  try {
    const keys = await redisClient.keys('*');
    return { hits: 0, misses: 0, keys: keys.length }; // You can enhance this with more detailed stats
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { hits: 0, misses: 0, keys: 0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filters: Filters = body.filters;

    if (!filters) {
      return NextResponse.json({ error: 'Filters are required' }, { status: 400 });
    }

    const periodStart = fmt(startOfPeriod(filters.period));
    const periodEnd = fmt(endOfPeriod(filters.period));

    console.log('🔄 Fetching dashboard data with filters:', filters);
    console.log('📊 Redis status:', redisClient ? 'connected' : 'disabled');

    // Track cache performance
    const cacheStats = {
      users: { source: 'unknown' as 'cache' | 'database' },
      projects: { source: 'unknown' as 'cache' | 'database' },
      departments: { source: 'unknown' as 'cache' | 'database' },
      timeEntries: { source: 'unknown' as 'cache' | 'database' },
      plans: { source: 'unknown' as 'cache' | 'database' },
    };

    // Fetch all data in parallel with enhanced error handling
    const [usersResult, projectsResult, departmentsResult, timeEntriesResult, plansResult] = await Promise.all([
      fetchUsers(filters).then(data => { cacheStats.users.source = 'database'; return data; })
        .catch(error => { console.error('Error fetching users:', error); throw error; }),
      fetchProjects(filters).then(data => { cacheStats.projects.source = 'database'; return data; })
        .catch(error => { console.error('Error fetching projects:', error); throw error; }),
      fetchDepartments(filters).then(data => { cacheStats.departments.source = 'database'; return data; })
        .catch(error => { console.error('Error fetching departments:', error); throw error; }),
      fetchTimeEntries(filters, periodStart, periodEnd).then(data => { cacheStats.timeEntries.source = 'database'; return data; })
        .catch(error => { console.error('Error fetching time entries:', error); throw error; }),
      fetchPlans(filters).then(data => { cacheStats.plans.source = 'database'; return data; })
        .catch(error => { console.error('Error fetching plans:', error); throw error; }),
    ]);

    const responseData = {
      users: usersResult,
      projects: projectsResult,
      departments: departmentsResult,
      timeEntries: timeEntriesResult,
      plans: plansResult,
      timestamp: new Date().toISOString(),
      cacheStatus: 'success',
      cacheStats, // Include cache performance information
      redisEnabled: !!redisClient,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error in dashboard-data API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
        cacheStatus: 'error',
        redisEnabled: !!redisClient,
      },
      { status: 500 }
    );
  }
}

// New endpoint for cache management
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') || '*';
    
    await invalidateCache([pattern]);
    
    return NextResponse.json({ 
      success: true, 
      message: `Cache invalidated for pattern: ${pattern}`,
      redisEnabled: !!redisClient,
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}

// Optional: GET method for health check and cache stats
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stats = searchParams.get('stats');
  
  if (stats) {
    const cacheStats = await getCacheStats();
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Dashboard data API is running',
      timestamp: new Date().toISOString(),
      redis: {
        enabled: !!redisClient,
        status: redisClient ? 'connected' : 'disabled',
        ...cacheStats
      }
    });
  }
  
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Dashboard data API is running',
    timestamp: new Date().toISOString(),
    redisEnabled: !!redisClient,
  });
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed gracefully');
  }
});