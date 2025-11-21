// hooks/useDashboardData.ts
'use client';
import { useEffect, useState, useCallback } from 'react';
import { Filters, User, Project, Department, TimeEntry, Plan } from '@/lib/dataModel';

interface DashboardData {
  users: User[];
  projects: Project[];
  departments: Department[];
  timeEntries: TimeEntry[];
  plans: Plan[];
  timestamp: string;
  cacheStatus: string;
}

interface UseDashboardDataReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchProgress: number;
  refetch: () => void;
}

export function useDashboardData(filters: Filters): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setFetchProgress(10);

      const response = await fetch('/api/dashboard-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      setFetchProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setFetchProgress(100);
      setData(result);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fetchProgress,
    refetch: fetchData,
  };
}