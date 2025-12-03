import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { startOfPeriod, endOfPeriod, fmt } from '@/lib/date';
import { Filters, User, Project, Department, TimeEntry, Plan, VacationType, ProductionCalendarDay, ExtendedFilters } from '@/lib/dataModel';
import { computeMetrics } from '@/lib/dashboardMetrics';
import { addMonths } from "date-fns";
import { WhatIfManager } from '@/lib/whatIfUtils';
import { AlertGenerator } from '@/lib/alertUtils';
import { getResolvedAlerts } from '@/lib/alertStorage';
import { generateCacheKey } from '@/lib/cache';
import { getUserIdFromRequest } from '@/lib/authUtils'

import logger from '@/lib/logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
);

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

  if (!redis) {
    logger.info('Redis not available, fetching directly from database', { key });
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
          logger.debug('Cache hit', { key });
          return { 
            data: JSON.parse(cached), 
            source: 'cache' 
          };
        }
      }

      logger.debug('Cache miss', { key });
      const freshData = await fetchFn();
      
      try {
        await redis!.set(key, JSON.stringify(freshData), 'EX', ttl);
        
        if (tags.length > 0) {
          const tagKey = `tags:${key}`;
          await redis!.set(tagKey, JSON.stringify(tags), 'EX', ttl);
        }
        
        logger.debug('Cached data', { key, ttl });
      } catch (cacheError) {
        logger.warn('Failed to cache data', { key, cacheError });
      }
      
      return { data: freshData, source: 'database' };
    } catch (error) {
      retries++;
      if (retries <= maxRetries) {
        logger.info(`Retry ${retries}/${maxRetries}`, { key });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch();
      }
      
      if (retries > 1) {
        try {
          const staleCached = await redis!.get(key);
          if (staleCached) {
            logger.warn('Using stale cache after failure', { key });
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
  if (!redis) return;

  try {
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info('Invalidated cache keys', { pattern, keysCount: keys.length });
      }
    }
  } catch (error) {
    logger.error('Failed to invalidate cache:', error);
  }
}


// Helper to fetch production calendar with proper error handling
async function fetchProductionCalendar(
  periodStart: string,
  periodEnd: string
): Promise<Map<string, ProductionCalendarDay>> {
  logger.info('Fetching production calendar', { periodStart, periodEnd });
  
  const { data, error } = await supabase
    .from('ru_production_calendar')
    .select('*')
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: true });

  if (error) {
    logger.error('Error fetching production calendar:', error);
    throw new Error(`Ошибка загрузки производственного календаря: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Производственный календарь не содержит данных для указанного периода');
  }

  const map = new Map<string, ProductionCalendarDay>();
  data.forEach((day: any) => {
    map.set(day.date, day);
  });
  
  logger.info('Production calendar created as Map', {
    size: map.size,
    firstKey: Array.from(map.keys())[0],
    firstValue: Array.from(map.values())[0]
  });
  
  return map;
}

// Data fetching functions with proper error handling in Russian
async function fetchUsers(filters: ExtendedFilters, userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] }, hypotheticalUsers: any[] = []): Promise<{users: User[], userIds: number[]}> {
  const cacheKey = generateCacheKey(`users`, filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      logger.info('Fetching users from database');
      
      // Build the base query
      let query = supabase
        .from('setters_users')
        .select(`
          *,
          user_vacations(*),
          setters_user_norms(*),
          project_user_hour_plans(*),
          user_departments!inner(
            department_id,
            departments!inner(
              id,
              name
            )
          )
        `);

      // Apply user restrictions if user doesn't have full access
      if (userRestrictions && !userRestrictions.full_access && userRestrictions.lead_departments.length > 0) {
        query = query.in('user_departments.department_id', userRestrictions.lead_departments);
        logger.info('Applied user department restrictions', { lead_departments: userRestrictions.lead_departments });
      }

      // Apply selected departments filter
      if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
        query = query.in('user_departments.department_id', filters.selectedDepartments);
        logger.info('Applied selected departments filter for users', { selectedDepartments: filters.selectedDepartments });
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching users:', error);
        throw new Error(`Ошибка загрузки пользователей: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные пользователей');
      }

      let users = data.map(user => {
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
          telegram_id: user.telegram_id,
          telegram_name: user.telegram_name,
          full_access: user.full_access,
          departments: user.user_departments,
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

      // Apply excluded departments filter in memory
      if (filters.excludedDepartments && filters.excludedDepartments.length > 0) {
        // We need to check which users have departments that are not excluded
        const usersWithDepartments = await supabase
          .from('user_departments')
          .select('user_id, department_id')
          .in('user_id', users.map(u => u.id));

        if (usersWithDepartments.data) {
          const userAllowedDepartments = new Map<number, number[]>();
          usersWithDepartments.data.forEach(ud => {
            if (!userAllowedDepartments.has(ud.user_id)) {
              userAllowedDepartments.set(ud.user_id, []);
            }
            userAllowedDepartments.get(ud.user_id)!.push(ud.department_id);
          });

          users = users.filter(user => {
            const userDeptIds = userAllowedDepartments.get(user.id) || [];
            // User is allowed if they have at least one department that's not excluded
            return userDeptIds.some(deptId => !filters.excludedDepartments!.includes(deptId));
          });
        }
      }

      // === IMPORTANT: MERGE WHAT-IF USERS HERE ===
      // Convert hypothetical users to the same structure as real users
      const formattedHypotheticalUsers = hypotheticalUsers.map(hypUser => {
        // Convert hypothetical user to match real user structure
        const user: User = {
          id: parseInt(hypUser.id.replace('hypothetical_', '')) || Math.floor(Math.random() * 1000000) + 1000000, // Generate unique ID
          name: hypUser.name,
          created_at: hypUser.created_at,
          isActive: hypUser.isActive,
          telegram_id: hypUser.telegram_id,
          telegram_name: hypUser.telegram_name,
          full_access: hypUser.full_access,
          departments: hypUser.department_id ? [{
            department_id: hypUser.department_id,
            departments: {
              id: hypUser.department_id,
              name: 'Hypothetical Department' // This will be replaced by actual department name in departments fetch
            }
          }] : [],
          vacations: hypUser.vacations || [],
          norm: hypUser.norm ? {
            id: hypUser.norm.id,
            user_id: parseInt(hypUser.id.replace('hypothetical_', '')) || Math.floor(Math.random() * 1000000) + 1000000,
            valid_from: hypUser.norm.valid_from,
            valid_to: hypUser.norm.valid_to,
            created_at: hypUser.norm.created_at,
            working_days: hypUser.norm.working_days,
            hours_presale: hypUser.norm.hours_presale,
            hours_internal: hypUser.norm.hours_internal,
            hours_commercial: hypUser.norm.hours_commercial,
            works_on_holidays: hypUser.norm.works_on_holidays
          } : null,
          plans: hypUser.plans || [],
          time_entries: hypUser.time_entries || []
        };
        return user;
      });
      // Merge real and hypothetical users
      const allUsers = [...users, ...formattedHypotheticalUsers];
      const userIds = allUsers.map(user => user.id);

      logger.info('Users fetched with filters and hypothetical users', { 
        count: allUsers.length,
        realUsers: users.length,
        hypotheticalUsers: formattedHypotheticalUsers.length,
        userIdsCount: userIds.length,
        userRestrictions: userRestrictions ? {
          full_access: userRestrictions.full_access,
          lead_departments_count: userRestrictions.lead_departments.length
        } : 'none',
        filterSummary: {
          selectedDepartments: filters.selectedDepartments?.length || 0,
          excludedDepartments: filters.excludedDepartments?.length || 0
        }
      });

      return { users: allUsers, userIds };
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['users'] 
    }
  );
  
  if (result.error) {
    logger.warn('Users fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchProjects(filters: ExtendedFilters, userIds: number[], userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] }, hypotheticalProjects: any[] = []): Promise<Project[]> {
  const cacheKey = generateCacheKey('projects', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      logger.info('Fetching projects from database');
      
      // Build the base query
      let query = supabase
        .from('projects')
        .select(`
          *,
          project_user_hour_plans(*),
          project_members!inner(user_id)
        `);

      // Apply user restrictions if user doesn't have full access
      if (userRestrictions && !userRestrictions.full_access && userRestrictions.lead_projects.length > 0) {
        query = query.in('id', userRestrictions.lead_projects);
        logger.info('Applied user project restrictions', { lead_projects: userRestrictions.lead_projects });
      }

      // Filter projects by user IDs (only projects that have these users as members)
      if (userIds && userIds.length > 0) {
        query = query.in('project_members.user_id', userIds);
        logger.info('Applied user-based project filtering', { userIdsCount: userIds.length });
      }

      // Apply selected projects filter
      if (filters.selectedProjects && filters.selectedProjects.length > 0) {
        query = query.in('id', filters.selectedProjects);
        logger.info('Applied selected projects filter', { selectedProjects: filters.selectedProjects });
      }

      // Apply excluded projects filter
      if (filters.excludedProjects && filters.excludedProjects.length > 0) {
        query = query.not('id', 'in', `(${filters.excludedProjects.join(',')})`);
        logger.info('Applied excluded projects filter', { excludedProjects: filters.excludedProjects });
      }

      // Apply excluded project statuses filter - Use multiple neq filters
      if (filters.excludedProjectStatuses && filters.excludedProjectStatuses.length > 0) {
        filters.excludedProjectStatuses.forEach(status => {
          query = query.neq('project_status', status);
        });
        logger.info('Applied excluded project statuses filter', { excludedProjectStatuses: filters.excludedProjectStatuses });
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching projects:', error);
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

      // Merge hypothetical projects
      const allProjects = [...projects, ...hypotheticalProjects.map(proj => ({
        ...proj,
        id: parseInt(proj.id.replace('hypothetical_', '')) || Math.floor(Math.random() * 1000000) + 1000000,
        name: proj.project_name,
        isActive: proj.isActive,
        plans: proj.plans || []
      }))];

      logger.info('Projects fetched with hypothetical projects', { 
        count: allProjects.length,
        realProjects: projects.length,
        hypotheticalProjects: hypotheticalProjects.length,
        userRestrictions: userRestrictions ? {
          full_access: userRestrictions.full_access,
          lead_projects_count: userRestrictions.lead_projects.length
        } : 'none',
        filterSummary: {
          userIdsCount: userIds?.length || 0,
          selectedProjects: filters.selectedProjects?.length || 0,
          excludedProjects: filters.excludedProjects?.length || 0,
          excludedProjectStatuses: filters.excludedProjectStatuses?.length || 0
        }
      });
      return allProjects;
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['projects'] 
    }
  );
  
  if (result.error) {
    logger.warn('Projects fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchDepartments(filters: ExtendedFilters, userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] }, hypotheticalUsers: any[] = []): Promise<Department[]> {
  const cacheKey = generateCacheKey('departments', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      logger.info('Fetching departments from database');
      
      // Build the base query
      let query = supabase
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

      // Apply user restrictions if user doesn't have full access
      if (userRestrictions && !userRestrictions.full_access && userRestrictions.lead_departments.length > 0) {
        query = query.in('id', userRestrictions.lead_departments);
        logger.info('Applied user department restrictions', { lead_departments: userRestrictions.lead_departments });
      }

      // Apply selected departments filter
      if (filters.selectedDepartments && filters.selectedDepartments.length > 0) {
        query = query.in('id', filters.selectedDepartments);
        logger.info('Applied selected departments filter', { selectedDepartments: filters.selectedDepartments });
      }

      // Apply excluded departments filter - Use multiple neq filters
      if (filters.excludedDepartments && filters.excludedDepartments.length > 0) {
        filters.excludedDepartments.forEach(deptId => {
          query = query.neq('id', deptId);
        });
        logger.info('Applied excluded departments filter', { excludedDepartments: filters.excludedDepartments });
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching departments:', error);
        throw new Error(`Ошибка загрузки отделов: ${error.message}`);
      }

      if (!data) {
        throw new Error('Не удалось загрузить данные отделов');
      }

      let departments = data.map((department: any) => ({
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

      // === IMPORTANT: ADD WHAT-IF USERS TO THEIR DEPARTMENTS ===
      if (hypotheticalUsers.length > 0) {
        hypotheticalUsers.forEach(hypUser => {
          if (hypUser.department_id) {
            // Find the department for this hypothetical user
            const department = departments.find(dept => dept.id === hypUser.department_id);
            if (department) {
              // Convert hypothetical user to department user format
              const departmentUser = {
                id: parseInt(hypUser.id.replace('hypothetical_', '')) || Math.floor(Math.random() * 1000000) + 1000000,
                name: hypUser.name,
                created_at: hypUser.created_at,
                isActive: hypUser.isActive,
                vacations: hypUser.vacations || [],
                norm: hypUser.norm ? {
                  id: hypUser.norm.id,
                  user_id: parseInt(hypUser.id.replace('hypothetical_', '')) || Math.floor(Math.random() * 1000000) + 1000000,
                  valid_from: hypUser.norm.valid_from,
                  valid_to: hypUser.norm.valid_to,
                  created_at: hypUser.norm.created_at,
                  working_days: hypUser.norm.working_days,
                  hours_presale: hypUser.norm.hours_presale,
                  hours_internal: hypUser.norm.hours_internal,
                  hours_commercial: hypUser.norm.hours_commercial,
                  works_on_holidays: hypUser.norm.works_on_holidays
                } : null,
                plans: hypUser.plans || [],
                time_entries: hypUser.time_entries || []
              };

              // Add the hypothetical user to the department
              department.users.push(departmentUser);
              logger.debug('Added hypothetical user to department', {
                departmentId: department.id,
                departmentName: department.name,
                userName: hypUser.name
              });
            } else {
              logger.warn('Hypothetical user department not found', {
                departmentId: hypUser.department_id,
                userName: hypUser.name
              });
            }
          }
        });
      }

      logger.info('Departments fetched with filters and hypothetical users', { 
        count: departments.length,
        hypotheticalUsersAdded: hypotheticalUsers.filter(u => u.department_id).length,
        userRestrictions: userRestrictions ? {
          full_access: userRestrictions.full_access,
          lead_departments_count: userRestrictions.lead_departments.length
        } : 'none',
        filterSummary: {
          selectedDepartments: filters.selectedDepartments?.length || 0,
          excludedDepartments: filters.excludedDepartments?.length || 0
        }
      });
      return departments;
    },
    { 
      ttl: CACHE_CONFIG.LONG_TTL,
      tags: ['departments', 'users'] 
    }
  );
  
  if (result.error) {
    logger.warn('Departments fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchTimeEntries(filters: ExtendedFilters, periodStart: string, periodEnd: string, userIds: number[], userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] }): Promise<TimeEntry[]> {
  const cacheKey = generateCacheKey('time_entries', filters, `${periodStart}_${periodEnd}`);
  const result = await cacheGet(
    cacheKey,
    async () => {
      logger.info('Fetching time entries from database');
      
      // Build base query
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          setters_users!inner(name),
          projects!inner(project_name, project_status)
        `)
        .gte('date', periodStart)
        .lte('date', periodEnd)
        .order('date', { ascending: true });

      // Filter by user IDs
      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      // If user doesn't have full access, filter by their lead projects
      if (userRestrictions && !userRestrictions.full_access && userRestrictions.lead_projects.length > 0) {
        query = query.in('projects.id', userRestrictions.lead_projects);
      }

      // Apply project filters
      if (filters.selectedProjects && filters.selectedProjects.length > 0) {
        query = query.in('project_id', filters.selectedProjects);
      }
      if (filters.excludedProjects && filters.excludedProjects.length > 0) {
        query = query.not('project_id', 'in', `(${filters.excludedProjects.join(',')})`);
      }
      
      // Apply excluded project statuses filter - Use multiple neq filters
      if (filters.excludedProjectStatuses && filters.excludedProjectStatuses.length > 0) {
        filters.excludedProjectStatuses.forEach(status => {
          query = query.neq('projects.project_status', status);
        });
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching time entries:', error);
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

      logger.info('Time entries fetched', { count: timeEntries.length });
      return timeEntries;
    },
    { 
      ttl: CACHE_CONFIG.SHORT_TTL,
      tags: ['time_entries'] 
    }
  );
  
  if (result.error) {
    logger.warn('Time entries fetch had issues:', result.error);
  }
  
  return result.data;
}

async function fetchPlans(filters: ExtendedFilters, userIds: number[], userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] }): Promise<Plan[]> {
  const cacheKey = generateCacheKey('plans', filters);
  const result = await cacheGet(
    cacheKey,
    async () => {
      logger.info('Fetching plans from database');
      
      // Build base query
      let query = supabase
        .from('project_user_hour_plans')
        .select(`
          *,
          setters_users(name),
          projects(project_name, start_date, end_date)
        `)
        .eq('isActive', true);

      // Filter by user IDs
      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      // If user doesn't have full access, filter by their lead projects
      if (userRestrictions && !userRestrictions.full_access && userRestrictions.lead_projects.length > 0) {
        query = query.in('projects.id', userRestrictions.lead_projects);
      }

      // Apply project filters
      if (filters.selectedProjects && filters.selectedProjects.length > 0) {
        query = query.in('project_id', filters.selectedProjects);
      }
      if (filters.excludedProjects && filters.excludedProjects.length > 0) {
        query = query.not('project_id', 'in', `(${filters.excludedProjects.join(',')})`);
      }
      
      // Apply excluded project statuses filter - Use multiple neq filters
      if (filters.excludedProjectStatuses && filters.excludedProjectStatuses.length > 0) {
        filters.excludedProjectStatuses.forEach(status => {
          query = query.neq('projects.project_status', status);
        });
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching plans:', error);
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

      logger.info('Plans fetched', { count: plans.length });
      return plans;
    },
    { 
      ttl: CACHE_CONFIG.DEFAULT_TTL,
      tags: ['plans'] 
    }
  );
  
  if (result.error) {
    logger.warn('Plans fetch had issues:', result.error);
  }
  
  return result.data;
}

// Sequential data fetching with proper error handling
async function fetchAllDataSequentially(
  filters: ExtendedFilters, 
  periodStart: string, 
  periodEnd: string, 
  userRestrictions?: { full_access: boolean; lead_departments: number[]; lead_projects: number[] },
  hypotheticalUsers: any[] = [],
  hypotheticalProjects: any[] = []
) {
  const requestId = Math.random().toString(36).substring(7);
  logger.info('Starting sequential data fetching', { 
    requestId, 
    userRestrictions,
    hypotheticalUsersCount: hypotheticalUsers.length,
    hypotheticalProjectsCount: hypotheticalProjects.length
  });
  
  // Step 1: Fetch users first to get the user IDs for filtering other data
  logger.info('Step 1: Fetching users', { requestId });
  let usersResult: {users: User[], userIds: number[]};
  
  try {
    usersResult = await fetchUsers(filters, userRestrictions, hypotheticalUsers);
    logger.info('Users fetched successfully', { 
      requestId, 
      usersCount: usersResult.users.length,
      userIdsCount: usersResult.userIds.length 
    });
  } catch (error) {
    logger.error('Error fetching users:', { requestId, error });
    throw new Error(`Ошибка на этапе загрузки пользователей: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 2: Fetch other data in parallel using the user IDs for filtering
  logger.info('Step 2: Fetching other data with user-based filtering', { requestId });
  let projectsResult: Project[], departmentsResult: Department[], timeEntriesResult: TimeEntry[], plansResult: Plan[];
  
  try {
    [projectsResult, departmentsResult, timeEntriesResult, plansResult] = await Promise.all([
      fetchProjects(filters, usersResult.userIds, userRestrictions, hypotheticalProjects),
      fetchDepartments(filters, userRestrictions, hypotheticalUsers),
      fetchTimeEntries(filters, periodStart, periodEnd, usersResult.userIds, userRestrictions),
      fetchPlans(filters, usersResult.userIds, userRestrictions),
    ]);
    
    logger.info('Other data fetched successfully', {
      requestId,
      projects: projectsResult.length,
      departments: departmentsResult.length,
      timeEntries: timeEntriesResult.length,
      plans: plansResult.length
    });
  } catch (error) {
    logger.error('Error fetching other data', { requestId, error });
    throw new Error(`Ошибка на этапе загрузки сырых данных: ${error instanceof Error ? error.message : String(error)}`);
  }

  logger.info('Step 3: Fetching production calendar', { requestId });
  let productionCalendar: Map<string, ProductionCalendarDay>;

  try {
    const calendarCacheKey = generateCacheKey("production_calendar", filters, `${periodStart}_${periodEnd}`);
    const calendarResult = await cacheGet<Array<[string, ProductionCalendarDay]>>(
      calendarCacheKey,
      async () => {
        const forecastEnd = fmt(addMonths(periodEnd, filters.horizonMonths));
        const map = await fetchProductionCalendar(periodStart, forecastEnd);
        // Convert Map to array of entries for proper serialization
        const entries = Array.from(map.entries());
        logger.info('Production calendar serialized for caching', { requestId, entriesCount: entries.length });
        return entries;
      },
      {
        ttl: CACHE_CONFIG.LONG_TTL,
        tags: ["production_calendar"],
      }
    );
    
    // Always convert back to Map from the serialized format
    productionCalendar = new Map(calendarResult.data);
    
    if (calendarResult.error) {
      logger.warn('Production calendar fetch had issues', { requestId, error: calendarResult.error });
    }
    
    logger.info('Production calendar fetched successfully', { requestId, daysCount: productionCalendar.size });
  } catch (error) {
    logger.error('Error fetching production calendar', { requestId, error });
    throw new Error(`Ошибка на этапе загрузки производственного календаря: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 4: Compute metrics (only after we have both raw data and production calendar)
  logger.info('Step 4: Computing metrics', { requestId });
  let metrics;
  
  try {
    const metricsCacheKey = generateCacheKey("dashboard_metrics", filters, `${periodStart}_${periodEnd}`);
    const metricsResult = await cacheGet(
      metricsCacheKey,
      async () => {
        logger.info('Computing metrics with all available data', { requestId });
        const computedMetrics = computeMetrics(
          usersResult.users,
          projectsResult,
          departmentsResult,
          timeEntriesResult,
          plansResult,
          productionCalendar,
          filters.period,
          filters.horizonMonths
        );
        logger.info('Metrics computed successfully', { requestId });
        return computedMetrics;
      },
      {
        ttl: CACHE_CONFIG.SHORT_TTL,
        tags: ["dashboard_metrics", "time_entries"],
      }
    );
    metrics = metricsResult.data;
    
    if (metricsResult.error) {
      logger.warn('Metrics computation had issues', { requestId, error: metricsResult.error });
    }
  } catch (error) {
    logger.error('Error computing metrics', { requestId, error });
    throw new Error(`Ошибка на этапе вычисления метрик: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    users: usersResult.users,
    projects: projectsResult,
    departments: departmentsResult,
    timeEntries: timeEntriesResult,
    plans: plansResult,
    metrics,
    productionCalendarSize: productionCalendar.size
  };
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const filters: ExtendedFilters = body.filters;
    const userRestrictions = body.userRestrictions;

    if (!filters) {
      logger.warn('Missing filters in request', { requestId });
      return NextResponse.json({ error: 'Фильтры обязательны для запроса' }, { status: 400 });
    }

    const periodStart = fmt(startOfPeriod(filters.period));
    const periodEnd = fmt(endOfPeriod(filters.period));

    logger.info('Starting dashboard data fetch process', {
      requestId,
      periodStart,
      periodEnd,
      filters,
      userRestrictions,
      redisEnabled: !!redis
    });
    
    // Get user ID from request for What-If data
    const userId = await getUserIdFromRequest(request, body);
  
    let hypotheticalUsers = [];
    let hypotheticalProjects = [];
    
    if (userId) {
      try {
        const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
        hypotheticalUsers = whatIfData.scenarios
          .filter(s => s.is_active)
          .flatMap(s => s.users);
        hypotheticalProjects = whatIfData.scenarios
          .filter(s => s.is_active)
          .flatMap(s => s.projects); 
        logger.info('Loaded hypothetical data', {
          requestId,
          hypotheticalUsers: hypotheticalUsers.length,
          hypotheticalProjects: hypotheticalProjects.length
        });
      } catch (error) {
        logger.warn('Error loading hypothetical data, continuing without it', {
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Execute the sequential data fetching pipeline with user restrictions AND hypothetical data
    const {
      users,
      projects, 
      departments,
      timeEntries,
      plans,
      metrics,
      productionCalendarSize
    } = await fetchAllDataSequentially(filters, periodStart, periodEnd, userRestrictions, hypotheticalUsers, hypotheticalProjects);

    logger.info('Step 5: Generating alerts', { requestId });

    let alerts: Alert[] = [];
    const alertsCacheKey = `alerts:${generateCacheKey('', filters, `${periodStart}_${periodEnd}`)}`;
    try {
      // Проверяем кэш алертов
      if (redis) {
        const cachedAlerts = await redis.get(alertsCacheKey);
        if (cachedAlerts) {
          alerts = JSON.parse(cachedAlerts);
          logger.info('Alerts loaded from cache', { 
            requestId, 
            alertsCount: alerts.length,
            cacheKey: alertsCacheKey 
          });
        }
      }

      // Если алертов нет в кэше - генерируем
      if (alerts.length === 0) {
        logger.info('Generating fresh alerts', { requestId });
        
        alerts = AlertGenerator.generateAlerts(
          users,
          departments,
          projects,
          timeEntries,
          metrics,
          periodStart,
          periodEnd,
          filters.horizonMonth
        );

        // Сохраняем в Redis на 24 часа
        if (redis && alerts.length > 0) {
          await redis.setex(alertsCacheKey, 24 * 60 * 60, JSON.stringify(alerts));
          logger.info('Alerts cached in Redis', { 
            requestId, 
            alertsCount: alerts.length,
            ttl: '24 hours'
          });
        }
      }

      // Получаем решенные алерты для фильтрации
      const resolvedAlerts = await getResolvedAlerts();
      const activeAlerts = alerts.filter(alert => !resolvedAlerts.has(alert.id));

      logger.info('Alerts processing completed', {
        requestId,
        totalAlerts: alerts.length,
        resolvedAlerts: resolvedAlerts.size,
        activeAlerts: activeAlerts.length
      });

    } catch (error) {
      logger.error('Error generating alerts:', { 
        requestId, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Продолжаем без алертов, чтобы не ломать весь дашборд
      alerts = [];
    }

    const responseTime = Date.now() - startTime;
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)
    const daysInFilterPeriod =  ((endDate - startDate) / (1000 * 60 * 60 * 24))
    
    const responseData = {
      users,
      projects,
      departments,
      timeEntries,
      plans,
      metrics,
      alerts,
      timestamp: new Date().toISOString(),
      cacheStatus: 'success',
      redisEnabled: !!redis,
      productionCalendarDays: productionCalendarSize,
      requestId,
      responseTime: `${responseTime}ms`,
      dataSummary: {
        users: users.length,
        projects: projects.length,
        departments: departments.length,
        timeEntries: timeEntries.length,
        plans: plans.length,
        period: daysInFilterPeriod,
        alerts: alerts.length,
        alerts_cache_key: alertsCacheKey
      }
    };

    logger.info('Dashboard data ready, returning response', {
      requestId,
      responseTime,
      dataSummary: responseData.dataSummary
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Error in dashboard-data API', { 
      requestId, 
      error,
      responseTime 
    });
    
    // Return detailed error in Russian
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    return NextResponse.json(
      { 
        error: 'Не удалось загрузить данные дашборда',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        cacheStatus: 'error',
        redisEnabled: !!redis,
        requestId
      },
      { status: 500 }
    );
  }
}

// Keep existing cache management endpoints
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const filters = body.filters;
    const userRestrictions = body.userRestrictions;
    
    logger.info('Cache invalidation request received', { 
      filters: filters ? 'present' : 'absent',
      userRestrictions: userRestrictions ? 'present' : 'absent'
    });
    
    if (!filters) {
      // If no filters provided, clear all dashboard-related cache
      logger.info('No filters provided, clearing all dashboard cache');
      await invalidateCache([
        'users_*',
        'projects_*', 
        'departments_*',
        'time_entries_*',
        'plans_*',
        'production_calendar_*',
        'dashboard_metrics_*',
        'alerts:*'
      ]);
      
      return NextResponse.json({ 
        success: true, 
        message: 'All dashboard cache cleared',
        redisEnabled: !!redis,
      });
    }
    
    // Generate specific cache keys based on filters
    const periodStart = fmt(startOfPeriod(filters.period));
    const periodEnd = fmt(endOfPeriod(filters.period));
    
    // Generate all the cache keys that would have been created
    const cacheKeys = [
      // Users cache key
      generateCacheKey('users', filters),
      
      // Projects cache key
      generateCacheKey('projects', filters),
      
      // Departments cache key
      generateCacheKey('departments', filters),
      
      // Time entries cache key (includes period)
      generateCacheKey('time_entries', filters, `${periodStart}_${periodEnd}`),
      
      // Plans cache key
      generateCacheKey('plans', filters),
      
      // Production calendar cache key (includes period)
      generateCacheKey('production_calendar', filters, `${periodStart}_${periodEnd}`),
      
      // Dashboard metrics cache key (includes period)
      generateCacheKey('dashboard_metrics', filters, `${periodStart}_${periodEnd}`),
      
      // Alerts cache key (special format)
      `alerts:${generateCacheKey('', filters, `${periodStart}_${periodEnd}`)}`
    ];
    
    logger.info('Generated cache keys for invalidation', { 
      keys: cacheKeys,
      periodStart,
      periodEnd
    });
    
    // Also generate wildcard patterns for partial matches
    const patterns = [
      // For any cache keys that might have additional variations
      `${generateCacheKey('users', filters)}*`,
      `${generateCacheKey('projects', filters)}*`,
      `${generateCacheKey('departments', filters)}*`,
      `${generateCacheKey('time_entries', filters)}*`,
      `${generateCacheKey('plans', filters)}*`,
      `${generateCacheKey('production_calendar', filters)}*`,
      `${generateCacheKey('dashboard_metrics', filters)}*`,
      `alerts:${generateCacheKey('', filters)}*`
    ];
    
    // Combine exact keys and patterns
    const allKeysToInvalidate = [...cacheKeys, ...patterns];
    
    await invalidateCache(allKeysToInvalidate);
    
    // Also invalidate any related user-specific cache
    if (userRestrictions) {
      const userId = userRestrictions.userId;
      if (userId) {
        await invalidateCache([`user_${userId}_*`]);
      }
    }
    
    logger.info('Cache invalidation completed', { 
      keysCount: allKeysToInvalidate.length,
      exactKeys: cacheKeys.length,
      patterns: patterns.length
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Cache invalidated for ${allKeysToInvalidate.length} keys/patterns`,
      redisEnabled: !!redis,
      invalidatedKeys: {
        exact: cacheKeys,
        patterns: patterns
      }
    });
    
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  logger.info('Health check endpoint called');
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Dashboard data API is running',
    timestamp: new Date().toISOString(),
    redisEnabled: !!redis,
  });
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  }
});
