'use client';
import { useState } from 'react';
import { Card } from '@/components/ui';
import { WhatIfScenario } from '@/lib/whatIfTypes';

interface ScenarioManagerProps {
  scenarios: WhatIfScenario[];
  onScenariosChange: () => void;
}

export function ScenarioManager({ scenarios, onScenariosChange }: ScenarioManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');

  const activeScenario = scenarios.find(s => s.is_active);

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

  const createScenario = async () => {
    if (!newScenarioName.trim()) return;

    try {
      const response = await fetch('/api/what-if/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newScenarioName,
          description: newScenarioDescription
        })
      });

      if (response.ok) {
        setNewScenarioName('');
        setNewScenarioDescription('');
        setShowCreateForm(false);
        onScenariosChange();
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  const activateScenario = async (scenarioId: string) => {
    try {
      const response = await fetch('/api/what-if/scenarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });

      if (response.ok) {
        onScenariosChange();
      }
    } catch (error) {
      console.error('Error activating scenario:', error);
    }
  };

  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Удалить этот сценарий? Все данные в нем будут потеряны.')) {
      return;
    }

    try {
      const response = await fetch(`/api/what-if/scenarios?id=${scenarioId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        onScenariosChange();
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
    }
  };

  if (scenarios.length === 0 && !showCreateForm) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-4">
          Нет созданных сценариев
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Создать первый сценарий
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Управление сценариями</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          + Новый сценарий
        </button>
      </div>

      {activeScenario && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-800">Активный сценарий</h4>
              <p className="text-green-700">{activeScenario.name}</p>
              {activeScenario.description && (
                <p className="text-green-600 text-sm mt-1">{activeScenario.description}</p>
              )}
            </div>
            <div className="text-sm text-green-600">
              {activeScenario.users.length} сотрудников, {activeScenario.projects.length} проектов
            </div>
          </div>
        </Card>
      )}

      {showCreateForm && (
        <Card className="p-4">
          <h4 className="font-semibold mb-4">Создать новый сценарий</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Название сценария *</label>
              <input
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Введите название сценария"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Описание</label>
              <textarea
                value={newScenarioDescription}
                onChange={(e) => setNewScenarioDescription(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Описание сценария..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={createScenario}
                disabled={!newScenarioName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {scenarios.map(scenario => (
          <Card key={scenario.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium">{scenario.name}</h4>
                  {scenario.is_active && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Активный
                    </span>
                  )}
                </div>
                
                {scenario.description && (
                  <p className="text-muted-foreground mb-3">{scenario.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Сотрудники:</span>
                    <span className="ml-2">{scenario.users.length}</span>
                  </div>
                  <div>
                    <span className="font-medium">Проекты:</span>
                    <span className="ml-2">{scenario.projects.length}</span>
                  </div>
                  <div>
                    <span className="font-medium">Создан:</span>
                    <span className="ml-2">
                      {new Date(scenario.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Обновлен:</span>
                    <span className="ml-2">
                      {new Date(scenario.updated_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                {!scenario.is_active && (
                  <button
                    onClick={() => activateScenario(scenario.id)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Активировать
                  </button>
                )}
                <button
                  onClick={() => deleteScenario(scenario.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Удалить
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}