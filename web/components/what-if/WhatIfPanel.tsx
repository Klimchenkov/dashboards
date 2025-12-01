'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalUser, HypotheticalProject, WhatIfScenario } from '@/lib/whatIfTypes';
import { Department } from '@/lib/dataModel';
import { useWhatIfData } from '@/hooks/useWhatIfData';
import { UserForm } from './UserForm';
import { ProjectForm } from './ProjectForm';
import { UsersList } from './UsersList';
import { ProjectsList } from './ProjectsList';
import { ScenarioManager } from './ScenarioManager';

interface WhatIfPanelEnhancedProps {
  departments: Department[];
  compact?: boolean;
}

export function WhatIfPanel({ departments, compact = false }: WhatIfPanelEnhancedProps) {
  const [users, setUsers] = useState<HypotheticalUser[]>([]);
  const [projects, setProjects] = useState<HypotheticalProject[]>([]);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'scenarios'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingUser, setEditingUser] = useState<HypotheticalUser | null>(null);
  const [editingProject, setEditingProject] = useState<HypotheticalProject | null>(null);

  const {
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
  } = useWhatIfData();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, projectsData, scenariosData] = await Promise.all([
        fetchUsers(),
        fetchProjects(),
        fetchScenarios()
      ]);
      setUsers(usersData);
      setProjects(projectsData);
      setScenarios(scenariosData);
    } catch (err) {
      console.error('Error loading what-if data:', err);
    }
  };

  const handleCreateUser = async (userData: any) => {
    const success = await createUser(userData);
    if (success) {
      await loadData();
      setShowUserForm(false);
    }
    return success;
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    const success = await updateUser(id, userData);
    if (success) {
      await loadData();
      setEditingUser(null);
    }
    return success;
  };

  const handleDeleteUser = async (id: string) => {
    const success = await deleteUser(id);
    if (success) {
      await loadData();
    }
    return success;
  };

  const handleCreateProject = async (projectData: any) => {
    const success = await createProject(projectData);
    if (success) {
      await loadData();
      setShowProjectForm(false);
    }
    return success;
  };

  const handleUpdateProject = async (id: string, projectData: any) => {
    const success = await updateProject(id, projectData);
    if (success) {
      await loadData();
      setEditingProject(null);
    }
    return success;
  };

  const handleDeleteProject = async (id: string) => {
    const success = await deleteProject(id);
    if (success) {
      await loadData();
    }
    return success;
  };

  if (loading && users.length === 0 && projects.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">Загрузка What-If данных...</div>
      </Card>
    );
  }

  if (error && !compact) {
    return (
      <Card className="p-4 border-destructive">
        <div className="text-destructive text-center">Ошибка: {error}</div>
        <button 
          onClick={loadData}
          className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Попробовать снова
        </button>
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
          <div className="mt-4">
            <UserForm
              departments={departments}
              onSubmit={handleCreateUser}
              onCancel={() => setShowUserForm(false)}
            />
          </div>
        )}

        {showProjectForm && (
          <div className="mt-4">
            <ProjectForm
              onSubmit={handleCreateProject}
              onCancel={() => setShowProjectForm(false)}
            />
          </div>
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

        {/* Tabs */}
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
          <button
            className={`pb-2 px-1 font-medium ${
              activeTab === 'scenarios' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('scenarios')}
          >
            Сценарии ({scenarios.length})
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'users' && (
          <UsersList
            users={users}
            departments={departments}
            onEdit={setEditingUser}
            onDelete={handleDeleteUser}
            onCreate={() => setShowUserForm(true)}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsList
            projects={projects}
            onEdit={setEditingProject}
            onDelete={handleDeleteProject}
            onCreate={() => setShowProjectForm(true)}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioManager
            scenarios={scenarios}
            onScenariosChange={loadData}
          />
        )}
      </Card>

      {/* Forms */}
      {showUserForm && (
        <UserForm
          departments={departments}
          onSubmit={handleCreateUser}
          onCancel={() => setShowUserForm(false)}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          departments={departments}
          onSubmit={(data) => handleUpdateUser(editingUser.id, data)}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {showProjectForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowProjectForm(false)}
        />
      )}

      {editingProject && (
        <ProjectForm
          project={editingProject}
          onSubmit={(data) => handleUpdateProject(editingProject.id, data)}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}