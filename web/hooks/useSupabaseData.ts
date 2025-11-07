import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, Project, Department, VacationType, ProductionCalendarDay, TimeEntry, Filters } from '@/lib/dataModel';
import { startOfPeriod, endOfPeriod, fmt } from "@/lib/date";


export function useSupabaseData(filters: Filters) {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const periodStart = fmt(startOfPeriod(filters.period));
  const periodEnd = fmt(endOfPeriod(filters.period));

  useEffect(() => {
      async function fetchUsers() {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('setters_users')
            .select(`
              *,
              user_vacations(*),
              setters_user_norms(*)
            `)
          
          if (error) throw error;

          // Transform Supabase data to match your User type
          const transformedUsers: User[] = (data || []).map(user => {
            // Get only the first norm (most recent by valid_from)
            const firstNorm = user.setters_user_norms && user.setters_user_norms.length > 0 
              ? user.setters_user_norms
                  .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
              : null;

            return {
              id: user.id,
              name: user.name,
              created_at: user.created_at,
              isActive: user.isActive,
              vacations: (user.user_vacations || []).map(vacation => ({
                ...vacation,
                vacation_type: vacation.vacation_type as VacationType
              })),
              norm: firstNorm ? {
                ...firstNorm,
                // Convert numeric fields from string to number
                hours_commercial: parseFloat(firstNorm.hours_commercial),
                hours_presale: parseFloat(firstNorm.hours_presale),
                hours_internal: parseFloat(firstNorm.hours_internal)
              } : null
            };
          });

          setUsers(transformedUsers);
        } catch (err) {
          console.error('Error fetching users:', err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      }

    async function fetchProjects() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
        if (error) throw error;
        // Transform Supabase data to match your User type
        const transformedProject: Project[] = (data || []).map(project => ({
          ...project,
          id: project.id,
          name: project.project_name,
          type: project.type,
          isActive: project.project_status === 'active'
        }));

        setProjects(transformedProject);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchDepartments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('departments')
          .select(`
            *,
            user_departments (
              setters_users (
                *,
                user_vacations(*),
                setters_user_norms(*)
              )
            )
          `)
        
        if (error) throw error;

        // Transform Supabase data to include users array with nested norms and vacations
        const transformedDepartments: (Department & { users: User[] })[] = (data || []).map(department => ({
          id: department.id,
          name: department.name,
          lead_tg_id: department.lead_tg_id,
          users: (department.user_departments || []).map(ud => {
            const user = ud.setters_users;
            
            // Get only the first norm (most recent by valid_from)
            const firstNorm = user.setters_user_norms && user.setters_user_norms.length > 0 
              ? user.setters_user_norms
                  .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0]
              : null;

            return {
              id: user.id,
              name: user.name,
              created_at: user.created_at,
              isActive: user.isActive,
              vacations: (user.user_vacations || []).map(vacation => ({
                ...vacation,
                vacation_type: vacation.vacation_type as VacationType
              })),
              norm: firstNorm ? {
                ...firstNorm,
                // Convert numeric fields from string to number
                hours_commercial: parseFloat(firstNorm.hours_commercial),
                hours_presale: parseFloat(firstNorm.hours_presale),
                hours_internal: parseFloat(firstNorm.hours_internal)
              } : null
            };
          }) || []
        }));

        setDepartments(transformedDepartments);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchTimeEntries(periodStart: string, periodEnd: string) {
      try {
        setLoading(true);
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

        const transformedEntries: TimeEntry[] = (data || []).map(entry => ({
          ...entry,
          user_name: entry.setters_users.name,
          project_name: entry.projects.project_name,
          project_status: entry.projects.project_status
        }));

        setTimeEntries(transformedEntries);
      } catch (err) {
        console.error('Error fetching time entries:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
    fetchProjects();
    fetchDepartments();
    fetchTimeEntries(periodStart, periodEnd);
  }, []);

  return { users, projects, departments, timeEntries, loading, error };
}

export async function fetchProductionCalendar(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('ru_production_calendar')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    // Convert array to Map for faster lookups
    const calendarMap = new Map<string, ProductionCalendarDay>();
    data?.forEach(day => {
      calendarMap.set(day.date, day);
    });
    
    return calendarMap;
  } catch (err) {
    console.error('Error fetching production calendar:', err);
    throw err;
  }
}


export function useProductionCalendar(start: string, end: string) {
  const [calendar, setCalendar] = useState<Map<string, ProductionCalendarDay> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadCalendar() {
      try {
        setLoading(true);
        const calendarData = await fetchProductionCalendar(start, end);
        setCalendar(calendarData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    loadCalendar();
  }, [start, end]);

  return { calendar, loading, error };
}