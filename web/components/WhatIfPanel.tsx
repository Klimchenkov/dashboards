'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalUser, HypotheticalProject } from '@/lib/whatIfTypes';
import { UserNorm, Department, ProjectStatus } from '@/lib/dataModel';
import { UserForm } from './what-if/UserForm';
import { ProjectForm } from './what-if/ProjectForm';
import { UsersList } from './what-if/UsersList';
import { ProjectsList } from './what-if/ProjectsList';
import { getUserId } from '@/lib/authUtils';

interface WhatIfPanelProps {
  departments: Department[];
  compact?: boolean;
  currentFilters?: any; // Add current filters for specific cache invalidation
}

export function WhatIfPanel({ 
  departments, 
  compact = false,
  currentFilters 
}: WhatIfPanelProps) {
  const [users, setUsers] = useState<HypotheticalUser[]>([]);
  const [projects, setProjects] = useState<HypotheticalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HypotheticalUser | null>(null);
  const [editingProject, setEditingProject] = useState<HypotheticalProject | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/what-if/users'),
        fetch('/api/what-if/projects')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (error) {
      console.error('Error loading what-if data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to invalidate cache
  const invalidateDashboardCache = async (userId?: string) => {
    try {
      const currentUserId = userId || getUserId();
      
      if (!currentUserId) {
        console.warn('No user ID found for cache invalidation');
        return;
      }

      // First, try user-specific cache invalidation
      const userResponse = await fetch(`/api/dashboard-data?mode=user&userId=${currentUserId}`, {
        method: 'DELETE'
      });
      
      if (userResponse.ok) {
        console.log('User-specific cache invalidated successfully');
      } else {
        console.warn('User-specific cache invalidation failed, trying specific mode');
        
        // Fallback to specific invalidation with current filters
        if (currentFilters) {
          const specificResponse = await fetch('/api/dashboard-data', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: currentFilters,
              userRestrictions: { userId: currentUserId }
            })
          });
          
          if (specificResponse.ok) {
            console.log('Specific cache invalidation successful');
          } else {
            console.warn('Specific cache invalidation also failed');
          }
        }
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  };

  const createUser = async (userData: any) => {
    try {
      const response = await fetch('/api/what-if/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        // Invalidate cache after successful creation
        await invalidateDashboardCache();
        
        await loadData();
        setShowUserForm(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, userData: any) => {
    try {
      const response = await fetch('/api/what-if/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...userData })
      });

      if (response.ok) {
        // Invalidate cache after successful update
        await invalidateDashboardCache();
        
        await loadData();
        setEditingUser(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/what-if/users?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Invalidate cache after successful deletion
        await invalidateDashboardCache();
        
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  };

  const createProject = async (projectData: any) => {
    try {
      const response = await fetch('/api/what-if/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        // Invalidate cache after successful creation
        await invalidateDashboardCache();
        
        await loadData();
        setShowProjectForm(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating project:', error);
      return false;
    }
  };

  const updateProject = async (id: string, projectData: any) => {
    try {
      const response = await fetch('/api/what-if/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...projectData })
      });

      if (response.ok) {
        // Invalidate cache after successful update
        await invalidateDashboardCache();
        
        await loadData();
        setEditingProject(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/what-if/projects?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Invalidate cache after successful deletion
        await invalidateDashboardCache();
        
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  };

  // Add a manual cache invalidation button for testing
  const handleClearCache = async () => {
    try {
      await invalidateDashboardCache();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">Загрузка What-If данных...</div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">What-If Моделирование</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUserForm(true)}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
            >
              + Сотрудник
            </button>
            <button
              onClick={() => setShowProjectForm(true)}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
            >
              + Проект
            </button>
            <button
              onClick={handleClearCache}
              className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm"
              title="Очистить кэш дашборда"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Сотрудники:</span>
            <span className="ml-2">{users.length}</span>
          </div>
          <div>
            <span className="font-medium">Проекты:</span>
            <span className="ml-2">{projects.length}</span>
          </div>
        </div>

        {showUserForm && (
          <UserForm
            departments={departments}
            onSubmit={createUser}
            onCancel={() => setShowUserForm(false)}
          />
        )}

        {showProjectForm && (
          <ProjectForm
            onSubmit={createProject}
            onCancel={() => setShowProjectForm(false)}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">What-If Моделирование</h2>
            <p className="text-muted-foreground mt-2">
              Создавайте гипотетических сотрудников и проекты для моделирования будущих сценариев.
              Данные сохраняются в вашей персональной сессии и влияют на расчеты дашборда.
            </p>
          </div>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90"
            title="Очистить кэш дашборда после внесения изменений"
          >
            Очистить кэш
          </button>
        </div>

        {/* Информация о кэшировании */}
        <div className="mb-6 p-3 bg-muted rounded text-sm">
          <p className="font-medium">Информация о кэшировании:</p>
          <p className="text-muted-foreground">
            После создания, изменения или удаления данных кэш дашборда будет автоматически очищен.
            Это может занять несколько секунд. Обновите дашборд, чтобы увидеть изменения.
          </p>
        </div>

        {/* Табы */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            className={`pb-2 px-1 font-medium ${
              activeTab === 'users' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Сотрудники ({users.length})
          </button>
          <button
            className={`pb-2 px-1 font-medium ${
              activeTab === 'projects' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            Проекты ({projects.length})
          </button>
        </div>

        {/* Контент табов */}
        {activeTab === 'users' && (
          <UsersList
            users={users}
            departments={departments}
            onEdit={setEditingUser}
            onDelete={deleteUser}
            onCreate={() => setShowUserForm(true)}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsList
            projects={projects}
            onEdit={setEditingProject}
            onDelete={deleteProject}
            onCreate={() => setShowProjectForm(true)}
          />
        )}
      </Card>

      {/* Формы */}
      {showUserForm && (
        <UserForm
          departments={departments}
          onSubmit={createUser}
          onCancel={() => setShowUserForm(false)}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          departments={departments}
          onSubmit={(data) => updateUser(editingUser.id, data)}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {showProjectForm && (
        <ProjectForm
          onSubmit={createProject}
          onCancel={() => setShowProjectForm(false)}
        />
      )}

      {editingProject && (
        <ProjectForm
          project={editingProject}
          onSubmit={(data) => updateProject(editingProject.id, data)}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}