'use client';
import { useState } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalProject } from '@/lib/whatIfTypes';
import { ProjectStatus, ProjectType } from '@/lib/dataModel';

interface ProjectFormProps {
  project?: HypotheticalProject;
  onSubmit: (data: any) => Promise<boolean>;
  onCancel: () => void;
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: project?.project_name || '',
    project_status: project?.project_status || 'active',
    type: project?.type || 'commercial',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    comment: project?.comment || '',
    isActive: project?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await onSubmit(formData);
    setLoading(false);
  };

  const projectStatusOptions = [
    { value: 'active', label: 'Активный' },
    { value: 'presale', label: 'Presale' },
    { value: 'internal', label: 'Внутренний' },
    { value: 'archive', label: 'Архивный' },
    { value: 'presale_archive', label: 'Presale архив' },
    { value: 'completed', label: 'Завершенный' },
    { value: 'on_hold', label: 'На паузе' },
  ];

  const projectTypeOptions = [
    { value: 'commercial', label: 'Коммерческий' },
    { value: 'internal', label: 'Внутренний' },
    { value: 'presale', label: 'Presale' },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {project ? 'Редактировать проект' : 'Новый проект'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название проекта *</label>
          <input
            type="text"
            required
            value={formData.project_name}
            onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
            className="w-full p-2 border rounded-md"
            placeholder="Введите название проекта"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Статус проекта</label>
            <select
              value={formData.project_status}
              onChange={(e) => setFormData(prev => ({ ...prev, project_status: e.target.value as ProjectStatus }))}
              className="w-full p-2 border rounded-md"
            >
              {projectStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Тип проекта</label>
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ProjectType }))}
              className="w-full p-2 border rounded-md"
            >
              {projectTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Дата начала</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Дата окончания</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Комментарий</label>
          <textarea
            value={formData.comment || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            className="w-full p-2 border rounded-md"
            rows={3}
            placeholder="Дополнительная информация о проекте..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm">
            Активный проект
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : (project ? 'Обновить' : 'Создать')}
          </button>
        </div>
      </form>
    </Card>
  );
}