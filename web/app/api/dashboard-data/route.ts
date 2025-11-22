import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { startOfPeriod, endOfPeriod, fmt } from '@/lib/date';
import { Filters, User, Project, Department, TimeEntry, Plan, VacationType, ProductionCalendarDay } from '@/lib/dataModel';
import { computeMetrics } from '@/lib/dashboardMetrics';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use service role key for server-side
);

// Redis client configuration
let redis: Redis | null = null;

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
      commandTimeout: 30000, // Increased timeout for long operations
    });

    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
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

const redisClient = initializeRedis();

const CACHE_CONFIG = {
  DEFAULT_TTL: 3 * 60 * 60,
  SHORT_TTL: 30 * 60,
  LONG_TTL: 6 * 60 * 60,
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
};

// Enhanced cache function with better error handling
async function cacheGet<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  options: { 
    maxRetries?: number; 
    retryDelay?: number;
    ttl?: number;
    tags?: string[];
  } = {}
): Promise<{ data: T; source: 'cache' | 'database'; error?: string }> {
  const { 
    maxRetries = CACHE_CONFIG.MAX_RETRIES, 
    retryDelay = CACHE_CONFIG.RETRY_DELAY,
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    tags = []
  } = options;
  
  let retries = 0;

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

      console.log('🔄 Cache miss for:', key);
      const freshData = await fetchFn();
      
      try {
        await redisClient!.set(key, JSON.stringify(freshData), 'EX', ttl);
        
        if (tags.length > 0) {
          const tagKey = `tags:${key}`;
          await redisClient!.set(tagKey, JSON.stringify(tags), 'EX', ttl);
        }
        
        console.log('💾 Cached data for:', key, `(TTL: ${ttl}s)`);
      } catch (cacheError) {
        console.warn('Failed to cache data for:', key, cacheError);
      }
      
      return { data: freshData, source: 'database' };
    } catch (error) {
      retries++;
      if (retries <= maxRetries) {
        console.log(`🔄 Retry ${retries}/${maxRetries} for ${key}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch();
      }
      
      if (retries > 1) {
        try {
          const staleCached = await redisClient!.get(key);
          if (staleCached) {
            console.log('🔄 Using stale cache after failure for:', key);
            return { 
              data: JSON.parse(staleCached), 
              source: 'cache',
              error: 'Используются кэшированные данные из-за ошибки получения свежих'
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

function generateCacheKey(prefix: string, filters: Filters, additional?: string): string {
  const baseKey = `${prefix}_${filters.period}_${filters.seed}`;
  return additional ? `${baseKey}_${additional}` : baseKey;
}

// Helper to fetch production calendar with proper error handling
async function fetchProductionCalendar(
  periodStart: string,
  periodEnd: string
): Promise<Map<string, ProductionCalendarDay>> {
  console.log('📅 Fetching production calendar for:', periodStart, 'to', periodEnd);
  
  const { data, error } = await supabase
    .from('ru_production_calendar')
    .select('*')
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching production calendar:', error);
    throw new Error(`Ошибка загрузки производственного календаря: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Производственный календарь не содержит данных для указанного периода');
  }

  const map = new Map<string, ProductionCalendarDay>();
  data.forEach((day: any) => {
    map.set(day.date, day);
  });
  
  console.log('✅ Production calendar created as Map:', {
    size: map.size,
    firstKey: Array.from(map.keys())[0],
    firstValue: Array.from(map.values())[0]
  });
  
  return map;
}

// Data fetching functions with proper error handling in Russian
async function fetchUsers(filters: Filters): Promise<User[]> {
  const cacheKey = generateCacheKey('users', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      console.log('👥 Fetching users from database...');
      const { data, error } = await supabase
        .from('setters_users')
        .select(`
          *,
          user_vacations(*),
          setters_user_norms(*),
          project_user_hour_plans(*)
        `)
      
      if (error) {
        console.error('❌ Error fetching users:', error);
        throw new Error(`Ошибка загрузки пользователей: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные пользователей');
      }

      const users = data.map(user => {
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
          plans: userPlans,
          time_entries: [] // Initialize empty time_entries array
        };
      });

      console.log('✅ Users fetched:', users.length);
      return users;
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['users'] 
    }
  );
  
  if (result.error) {
    console.warn('⚠️ Users fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchProjects(filters: Filters): Promise<Project[]> {
  const cacheKey = generateCacheKey('projects', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      console.log('📂 Fetching projects from database...');
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_user_hour_plans(*)
        `)
      
      if (error) {
        console.error('❌ Error fetching projects:', error);
        throw new Error(`Ошибка загрузки проектов: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные проектов');
      }

      const projects = data.map((project: any) => {
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

      console.log('✅ Projects fetched:', projects.length);
      return projects;
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['projects'] 
    }
  );
  
  if (result.error) {
    console.warn('⚠️ Projects fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchDepartments(filters: Filters): Promise<Department[]> {
  const cacheKey = generateCacheKey('departments', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      console.log('🏢 Fetching departments from database...');
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
      
      if (error) {
        console.error('❌ Error fetching departments:', error);
        throw new Error(`Ошибка загрузки отделов: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные отделов');
      }

      const departments = data.map((department: any) => ({
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
        }).filter(Boolean) || [] 
      }));

      console.log('✅ Departments fetched:', departments.length);
      return departments;
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['departments', 'users'] 
    }
  );
  
  if (result.error) {
    console.warn('⚠️ Departments fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchTimeEntries(filters: Filters, periodStart: string, periodEnd: string): Promise<TimeEntry[]> {
  const cacheKey = generateCacheKey('time_entries', filters, `${periodStart}_${periodEnd}`);
  const result = await cacheGet(
    cacheKey,
    async () => {
      console.log('⏱️ Fetching time entries from database...');
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
      
      if (error) {
        console.error('❌ Error fetching time entries:', error);
        throw new Error(`Ошибка загрузки временных записей: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные временных записей');
      }

      const timeEntries = data.map((entry: any) => ({
        ...entry,
        user_name: entry.setters_users.name,
        project_name: entry.projects.project_name,
        project_status: entry.projects.project_status
      }));

      console.log('✅ Time entries fetched:', timeEntries.length);
      return timeEntries;
    },
    { 
      ttl: CACHE_CONFIG.SHORT_TTL,
      tags: ['time_entries'] 
    }
  );
  
  if (result.error) {
    console.warn('⚠️ Time entries fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchPlans(filters: Filters): Promise<Plan[]> {
  const cacheKey = generateCacheKey('plans', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      console.log('📋 Fetching plans from database...');
      const { data, error } = await supabase
        .from('project_user_hour_plans')
        .select(`
          *,
          setters_users(name),
          projects(project_name, start_date, end_date)
        `)
        .eq('isActive', true);
      
      if (error) {
        console.error('❌ Error fetching plans:', error);
        throw new Error(`Ошибка загрузки планов: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные планов');
      }

      const plans = data.map((plan: any) => ({
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

      console.log('✅ Plans fetched:', plans.length);
      return plans;
    },
    { 
      ttl: CACHE_CONFIG.DEFAULT_TTL,
      tags: ['plans'] 
    }
  );
  
  if (result.error) {
    console.warn('⚠️ Plans fetch had issues:', result.error);
  }
  
  return result.data;
}

// Sequential data fetching with proper error handling
async function fetchAllDataSequentially(filters: Filters, periodStart: string, periodEnd: string) {
  console.log('🔄 Starting sequential data fetching...');
  
  // Step 1: Fetch raw data (all in parallel but with individual error handling)
  console.log('📦 Step 1: Fetching raw data...');
  let usersResult: User[], projectsResult: Project[], departmentsResult: Department[], timeEntriesResult: TimeEntry[], plansResult: Plan[];
  
  try {
    [usersResult, projectsResult, departmentsResult, timeEntriesResult, plansResult] = await Promise.all([
      fetchUsers(filters),
      fetchProjects(filters),
      fetchDepartments(filters),
      fetchTimeEntries(filters, periodStart, periodEnd),
      fetchPlans(filters),
    ]);
    
    console.log('✅ Raw data fetched successfully');
    console.log(`   - Users: ${usersResult.length}`);
    console.log(`   - Projects: ${projectsResult.length}`);
    console.log(`   - Departments: ${departmentsResult.length}`);
    console.log(`   - Time entries: ${timeEntriesResult.length}`);
    console.log(`   - Plans: ${plansResult.length}`);
  } catch (error) {
    throw new Error(`Ошибка на этапе загрузки сырых данных: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 2: Fetch production calendar (critical - will fail if not available)
  console.log('📅 Step 2: Fetching production calendar...');
  let productionCalendar: Map<string, ProductionCalendarDay>;
  
  try {
    const calendarCacheKey = generateCacheKey("production_calendar", filters, `${periodStart}_${periodEnd}`);
    const calendarResult = await cacheGet(
      calendarCacheKey,
      async () => {
        return await fetchProductionCalendar(periodStart, periodEnd);
      },
      {
        ttl: CACHE_CONFIG.LONG_TTL,
        tags: ["production_calendar"],
      }
    );
    productionCalendar = calendarResult.data;
    
    if (calendarResult.error) {
      console.warn('⚠️ Production calendar fetch had issues:', calendarResult.error);
    }
    
    console.log('✅ Production calendar fetched successfully:', productionCalendar.size, 'days');
  } catch (error) {
    throw new Error(`Ошибка на этапе загрузки производственного календаря: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 3: Compute metrics (only after we have both raw data and production calendar)
  console.log('🧮 Step 3: Computing metrics...');
  let metrics;
  
  try {
    const metricsCacheKey = generateCacheKey("dashboard_metrics", filters, `${periodStart}_${periodEnd}`);
    const metricsResult = await cacheGet(
      metricsCacheKey,
      async () => {
        console.log('🔨 Computing metrics with all available data...');
        const computedMetrics = computeMetrics(
          usersResult,
          projectsResult,
          departmentsResult,
          timeEntriesResult,
          plansResult,
          productionCalendar,
          filters.period
        );
        console.log('✅ Metrics computed successfully');
        return computedMetrics;
      },
      {
        ttl: CACHE_CONFIG.SHORT_TTL,
        tags: ["dashboard_metrics", "time_entries"],
      }
    );
    metrics = metricsResult.data;
    
    if (metricsResult.error) {
      console.warn('⚠️ Metrics computation had issues:', metricsResult.error);
    }
  } catch (error) {
    throw new Error(`Ошибка на этапе вычисления метрик: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    users: usersResult,
    projects: projectsResult,
    departments: departmentsResult,
    timeEntries: timeEntriesResult,
    plans: plansResult,
    metrics,
    productionCalendarSize: productionCalendar.size
  };
}

export async function POST(request: NextRequest) {
  // Set longer timeout for Vercel (if using Vercel, this needs proper configuration)
  // For long-running operations, consider using background jobs in production
  
  try {
    const body = await request.json();
    const filters: Filters = body.filters;

    if (!filters) {
      return NextResponse.json({ error: 'Фильтры обязательны для запроса' }, { status: 400 });
    }

    const periodStart = fmt(startOfPeriod(filters.period));
    const periodEnd = fmt(endOfPeriod(filters.period));

    console.log('🔄 Starting dashboard data fetch process...');
    console.log('📅 Period:', periodStart, 'to', periodEnd);
    console.log('🎛️ Filters:', filters);
    console.log('📊 Redis status:', redisClient ? 'connected' : 'disabled');

    // Execute the sequential data fetching pipeline
    const {
      users,
      projects, 
      departments,
      timeEntries,
      plans,
      metrics,
      productionCalendarSize
    } = await fetchAllDataSequentially(filters, periodStart, periodEnd);

    const responseData = {
      users,
      projects,
      departments,
      timeEntries,
      plans,
      metrics,
      timestamp: new Date().toISOString(),
      cacheStatus: 'success',
      redisEnabled: !!redisClient,
      productionCalendarDays: productionCalendarSize,
      dataSummary: {
        users: users.length,
        projects: projects.length,
        departments: departments.length,
        timeEntries: timeEntries.length,
        plans: plans.length
      }
    };

    console.log('✅ Dashboard data ready, returning response');
    console.log('📊 Data summary:', responseData.dataSummary);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error in dashboard-data API:', error);
    
    // Return detailed error in Russian
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        error: 'Не удалось загрузить данные дашборда',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        cacheStatus: 'error',
        redisEnabled: !!redisClient,
      },
      { status: 500 }
    );
  }
}

// Keep existing cache management endpoints
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

export async function GET(request: NextRequest) {
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