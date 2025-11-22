'use client';
import { useEffect, useState, useCallback } from 'react';
import { Filters, User, Project, Department, TimeEntry, Plan, DashboardMetrics } from '@/lib/dataModel';

interface DashboardData {
  users: User[];
  projects: Project[];
  departments: Department[];
  timeEntries: TimeEntry[];
  plans: Plan[];
  metrics: DashboardMetrics;
  timestamp: string;
  cacheStatus: string;
  dataSummary?: {
    users: number;
    projects: number;
    departments: number;
    timeEntries: number;
    plans: number;
  };
}

interface UseDashboardDataReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchProgress: number;
  refetch: () => void;
}

// Progress simulation for better UX
const simulateProgress = (currentProgress: number, setProgress: (progress: number) => void) => {
  const interval = setInterval(() => {
    setProgress(prev => {
      // Slow down progress as we get closer to 100%
      const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
      const newProgress = Math.min(prev + increment, 95); // Never reach 100% until actual completion
      return newProgress;
    });
  }, 500);

  return () => clearInterval(interval);
};

export function useDashboardData(filters: Filters): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState(0);

  const fetchData = useCallback(async () => {
    // Create AbortController for timeout handling with longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout for long operations

    // Start progress simulation
    const stopProgressSimulation = simulateProgress(fetchProgress, setFetchProgress);

    try {
      setLoading(true);
      setError(null);
      setFetchProgress(5); // Start with 5% to show immediate feedback

      console.log('🔄 Fetching dashboard data with filters:', filters);

      const response = await fetch('/api/dashboard-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      setFetchProgress(85); // Jump to 85% when we get response

      if (!response.ok) {
        // Handle error responses
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || `HTTP error! status: ${response.status}`;
        } catch {
          errorDetails = `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorDetails);
      }

      // Validate response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Ожидался JSON ответ, но получен: ${contentType}`);
      }

      const result = await response.json();
      setFetchProgress(95);
      
      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Неверный формат ответа от сервера');
      }

      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 200));
      setFetchProgress(100);
      
      setData(result);
      
    } catch (err) {
      clearTimeout(timeoutId);
      
      let errorMessage = 'Неизвестная ошибка';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Превышено время ожидания ответа от сервера. Данные загружаются, попробуйте обновить позже.';
        } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = String(err);
      }

      console.error('Error fetching dashboard data:', {
        error: errorMessage,
        filters,
        timestamp: new Date().toISOString()
      });

      setError(errorMessage);
      
    } finally {
      stopProgressSimulation();
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    // Reset state before refetching
    setError(null);
    setFetchProgress(0);
    setData(null);
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fetchProgress,
    refetch,
  };
}