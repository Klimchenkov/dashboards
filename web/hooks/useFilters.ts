// hooks/useFilters.ts
import { useState, useEffect } from "react";
import { Filters, Period } from "@/lib/dataModel";

const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || 'demo-user-123';
  }
  return 'demo-user-123';
};

export function useFilters() {
  const [filters, setFilters] = useState<Filters>({
    role: 'admin',
    period: 'month',
    departmentId: undefined,
    search: undefined,
    horizonMonths: 3,
    seed: 'SETTERS-SEED-42'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const userId = getUserId();
        const response = await fetch(`/api/filters?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.filters) {
            setFilters(data.filters);
          }
        }
      } catch (error) {
        console.warn('Failed to load filters from server:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilters();
  }, []);

  // Update individual filter - only locally, don't save to backend
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setHasPendingChanges(true); // Mark that we have unsaved changes
    
    return newFilters;
  };

  // Save current filters to backend
  const saveFilters = async (filtersToSave?: Filters) => {
    try {
      const filtersToPersist = filtersToSave || filters;
      const userId = getUserId();
      
      await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, filters: filtersToPersist }),
      });
      
      setHasPendingChanges(false); // Reset pending changes flag
      return true;
    } catch (error) {
      console.warn('Failed to save filters:', error);
      return false;
    }
  };

  // Apply filters (save and mark as no pending changes)
  const applyFilters = async (filtersToApply?: Filters) => {
    return await saveFilters(filtersToApply);
  };

  // Reset to last saved state
  const resetFilters = async () => {
    try {
      const userId = getUserId();
      const response = await fetch(`/api/filters?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.filters) {
          setFilters(data.filters);
        }
      }
      setHasPendingChanges(false);
    } catch (error) {
      console.warn('Failed to reset filters:', error);
    }
  };

  return {
    filters,
    isLoading,
    hasPendingChanges,
    updateFilter,
    saveFilters,
    applyFilters,
    resetFilters,
    setFilters: (newFilters: Filters) => {
      setFilters(newFilters);
      setHasPendingChanges(true);
    },
    // Individual setters for convenience
    setRole: (role: Filters['role']) => updateFilter('role', role),
    setPeriod: (period: Period) => updateFilter('period', period),
    setDepartmentId: (departmentId: number | undefined) => updateFilter('departmentId', departmentId),
    setSearch: (search: string | undefined) => updateFilter('search', search),
    setHorizon: (horizonMonths: 1 | 2 | 3) => updateFilter('horizonMonths', horizonMonths),
    setSeed: (seed: string) => updateFilter('seed', seed),
  };
}