import { useMemo } from "react";
import { Filters } from "@/lib/dataModel";
import { cacheGet, cacheSet } from "@/lib/cache";
import { useSupabaseData } from "@/hooks/useSupabaseData";

export function useData(filters: Filters) {
  const key = JSON.stringify({ seed: filters.seed });
  const { users, projects, departments, timeEntries, loading, error } = useSupabaseData(filters);
  
  return useMemo(() => {
    // Use cached data if available
    // const cached = cacheGet<any>(key);
    // if (cached) return cached;

    
    const realData = {
      users:  users, 
      projects: projects,
      departments: departments,
      time_entries: timeEntries
    };
    
    cacheSet(key, realData);
    return realData;
  }, [key, users, projects, departments, timeEntries]);
}