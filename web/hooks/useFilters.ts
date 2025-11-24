'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { Filters, Period, ExtendedFilters, DepartmentData, ProjectData, ProjectStatus, UserExclusions } from "@/lib/dataModel";

interface UserData {
  id: number;
  telegram_id: number;
  name: string;
  full_access: boolean;
  lead_departments: number[];
  lead_projects: number[];
}

const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || 'demo-user-123';
  }
  return 'demo-user-123';
};

const getUserData = (): UserData | null => {
  if (typeof window !== 'undefined') {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        return JSON.parse(userDataStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
      }
    }
  }
  return null;
};

export function useFilters() {
  // Basic filters state
  const [filters, setFilters] = useState<ExtendedFilters>({
    period: 'month',
    horizonMonths: 1,
    selectedDepartments: [],
    excludedDepartments: [],
    selectedProjects: [],
    excludedProjects: [],
    excludedProjectStatuses: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Enhanced filters state
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [exclusions, setExclusions] = useState<UserExclusions>({
    excludedDepartments: [],
    excludedProjects: [],
    excludedProjectStatuses: []
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingExclusions, setIsLoadingExclusions] = useState(true);

  // Memoize user data to prevent unnecessary re-renders
  const userData = useMemo(() => getUserData(), []);

  // Load saved filters, departments, projects, and exclusions on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingData(true);
        setIsLoadingExclusions(true);

        const userId = getUserId();
        
        const [filtersResponse, deptsResponse, projsResponse, exclusionsResponse] = await Promise.all([
          fetch(`/api/filters?userId=${userId}`),
          fetch('/api/departments'),
          fetch('/api/projects'),
          fetch(`/api/exclusions?userId=${userId}`)
        ]);

        // Load basic filters
        if (filtersResponse.ok) {
          const data = await filtersResponse.json();
          if (data.filters) {
            setFilters(prev => ({
              ...prev,
              ...data.filters,
              // Ensure arrays are properly initialized
              selectedDepartments: data.filters.selectedDepartments || [],
              excludedDepartments: data.filters.excludedDepartments || [],
              selectedProjects: data.filters.selectedProjects || [],
              excludedProjects: data.filters.excludedProjects || [],
              excludedProjectStatuses: data.filters.excludedProjectStatuses || []
            }));
          }
        }

        // Load departments
        let departmentsData: DepartmentData[] = [];
        if (deptsResponse.ok) {
          const deptsData = await deptsResponse.json();
          departmentsData = deptsData.departments || [];
          
          // Filter departments based on user access
          if (userData && !userData.full_access) {
            departmentsData = departmentsData.filter(dept => 
              userData.lead_departments.includes(dept.id)
            );
          }
          
          setDepartments(departmentsData);
        } else {
          console.error('Failed to load departments:', deptsResponse.status);
        }

        // Load projects
        let projectsData: ProjectData[] = [];
        if (projsResponse.ok) {
          const projsData = await projsResponse.json();
          projectsData = projsData.projects || [];
          
          // Filter projects based on user access
  
          if (userData && !userData.full_access && userData.lead_departments.length === 0) {
            projectsData = projectsData.filter(project => 
              userData.lead_projects.includes(project.id)
            );
          }
          
          setProjects(projectsData);
        } else {
          console.error('Failed to load projects:', projsResponse.status);
        }

        // Load exclusions
        if (exclusionsResponse.ok) {
          const exclusionsData = await exclusionsResponse.json();
          setExclusions(exclusionsData.exclusions || {
            excludedDepartments: [],
            excludedProjects: [],
            excludedProjectStatuses: []
          });
        } else {
          console.error('Failed to load exclusions:', exclusionsResponse.status);
        }

      } catch (error) {
        console.warn('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingData(false);
        setIsLoadingExclusions(false);
      }
    };

    loadAllData();
  }, []); // Remove userData from dependencies since it's memoized

  // Enhanced update filter that handles arrays properly
  const updateFilter = useCallback(<K extends keyof ExtendedFilters>(key: K, value: ExtendedFilters[K]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      setHasPendingChanges(true);
      return newFilters;
    });
  }, []);

  // Save current filters to backend
  const saveFilters = useCallback(async (filtersToSave?: ExtendedFilters) => {
    try {
      const filtersToPersist = filtersToSave || filters;
      const userId = getUserId();
      
      await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, filters: filtersToPersist }),
      });
      
      setHasPendingChanges(false);
      return true;
    } catch (error) {
      console.warn('Failed to save filters:', error);
      return false;
    }
  }, [filters]);

  // Save exclusions to backend
  const saveExclusions = useCallback(async (newExclusions?: UserExclusions) => {
    try {
      const exclusionsToPersist = newExclusions || exclusions;
      const userId = getUserId();
      
      const response = await fetch('/api/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exclusions: exclusionsToPersist }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save exclusions: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving exclusions:', error);
      return false;
    }
  }, [exclusions]);

  // Apply filters (save and mark as no pending changes)
  const applyFilters = useCallback(async (filtersToApply?: ExtendedFilters) => {
    return await saveFilters(filtersToApply);
  }, [saveFilters]);

  // Reset to last saved state
  const resetFilters = useCallback(async () => {
    try {
      const userId = getUserId();
      const response = await fetch(`/api/filters?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.filters) {
          setFilters(prev => ({
            ...prev,
            ...data.filters,
            // Ensure arrays are properly initialized
            selectedDepartments: data.filters.selectedDepartments || [],
            excludedDepartments: data.filters.excludedDepartments || [],
            selectedProjects: data.filters.selectedProjects || [],
            excludedProjects: data.filters.excludedProjects || [],
            excludedProjectStatuses: data.filters.excludedProjectStatuses || []
          }));
        }
      }
      setHasPendingChanges(false);
    } catch (error) {
      console.warn('Failed to reset filters:', error);
    }
  }, []);

  // Update exclusions locally and persist to backend
  const updateExclusions = useCallback(async (key: keyof UserExclusions, value: any) => {
    const newExclusions = { ...exclusions, [key]: value };
    setExclusions(newExclusions);
    
    // Persist to backend (fire and forget)
    saveExclusions(newExclusions).then(success => {
      if (!success) {
        console.warn('Failed to persist exclusions to backend');
      }
    });
  }, [exclusions, saveExclusions]);

  // Get available departments (all departments minus excluded ones)
  const availableDepartments = useMemo(() => 
    departments.filter(dept => !exclusions.excludedDepartments.includes(dept.id)),
    [departments, exclusions.excludedDepartments]
  );

  // Get available projects (filtered by search and status exclusions)
  const availableProjects = useMemo(() => 
    projects.filter(project => {
      // Filter by excluded status
      const notExcludedStatus = !exclusions.excludedProjectStatuses.includes(project.status);
      
      // Filter by excluded projects
      const notExcludedProject = !exclusions.excludedProjects.includes(project.id);
      
      return notExcludedStatus && notExcludedProject;
    }),
    [projects, exclusions.excludedProjectStatuses, exclusions.excludedProjects]
  );

  // Get unique project statuses for grouping
  const projectStatuses = useMemo(() => 
    [...new Set(projects.map(p => p.status))],
    [projects]
  );

  // Individual setters for convenience (basic filters only)
  const setPeriod = useCallback((period: Period) => updateFilter('period', period), [updateFilter]);
  const setDepartmentId = useCallback((departmentId: number | undefined) => updateFilter('departmentId', departmentId), [updateFilter]);
  const setHorizon = useCallback((horizonMonths: 1 | 2 | 3) => updateFilter('horizonMonths', horizonMonths), [updateFilter]);

  return {
    // Basic filters state and functions
    filters,
    isLoading,
    hasPendingChanges,
    updateFilter,
    saveFilters,
    applyFilters,
    resetFilters,
    setFilters: useCallback((newFilters: ExtendedFilters) => {
      setFilters(newFilters);
      setHasPendingChanges(true);
    }, []),
    
    // Individual setters for basic filters
    setPeriod,
    setDepartmentId,
    setHorizon,

    // Enhanced filters state and functions
    departments,
    projects,
    availableDepartments,
    availableProjects,
    projectStatuses,
    exclusions,
    updateExclusions,
    isLoadingData: isLoadingData || isLoadingExclusions,
    saveExclusions
  };
}