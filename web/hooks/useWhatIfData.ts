'use client';
import { useState, useCallback } from 'react';
import { HypotheticalUser, HypotheticalProject, WhatIfScenario } from '@/lib/whatIfTypes';

// Helper function to get user data from localStorage
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('userData');
    const userId = localStorage.getItem('userId');

    
    if (userId) {
      return { id: userId };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Helper function to get headers with user ID
const getAuthHeaders = () => {
  const user = getCurrentUser();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (user?.id) {
    headers['x-user-id'] = user.id.toString();
  }
  
  return headers;
};

export function useWhatIfData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (): Promise<HypotheticalUser[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/users', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async (): Promise<HypotheticalProject[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/projects', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScenarios = useCallback(async (): Promise<WhatIfScenario[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/scenarios', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      return data.scenarios || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, userData: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/users', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, ...userData })
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/what-if/users?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id: string, projectData: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/what-if/projects', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, ...projectData })
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/what-if/projects?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchUsers,
    fetchProjects,
    fetchScenarios,
    createUser,
    updateUser,
    deleteUser,
    createProject,
    updateProject,
    deleteProject
  };
}