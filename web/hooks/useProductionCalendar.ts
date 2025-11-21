'use client';
import { useEffect, useState, useCallback } from 'react';
import { ProductionCalendarDay } from '@/lib/dataModel';

interface UseProductionCalendarReturn {
  calendar: Map<string, ProductionCalendarDay> | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProductionCalendar(start: string, end: string): UseProductionCalendarReturn {
  const [calendar, setCalendar] = useState<Map<string, ProductionCalendarDay> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/production-calendar?start=${start}&end=${end}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Convert array of entries back to Map
      const calendarMap = new Map(result.calendar);
      setCalendar(calendarMap);
      
    } catch (err) {
      console.error('Error fetching production calendar:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return {
    calendar,
    loading,
    error,
    refetch: fetchCalendar
  };
}