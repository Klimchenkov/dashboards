'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalUser, HypotheticalProject } from '@/lib/whatIfTypes';
import { UserNorm, Department, ProjectStatus } from '@/lib/dataModel';
import { UserForm } from './what-if/UserForm';
import { ProjectForm } from './what-if/ProjectForm';
import { UsersList } from './what-if/UsersList';
import { ProjectsList } from './what-if/ProjectsList';

interface WhatIfPanelProps {
  departments: Department[];
  compact?: boolean;
}

export function WhatIfPanel({ departments, compact = false }: WhatIfPanelProps) {
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

  const createUser = async (userData: any) => {
    try {
      const response = await fetch('/api/what-if/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
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
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
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
        <h2 className="text-2xl font-bold mb-4">What-If Моделирование</h2>
        <p className="text-muted-foreground mb-6">
          Создавайте гипотетических сотрудников и проекты для моделирования будущих сценариев.
          Данные сохраняются в вашей персональной сессии и влияют на расчеты дашборда.
        </p>

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