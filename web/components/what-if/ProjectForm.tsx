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
    type: project?.type || null,
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    comment: project?.comment || '',
    isActive: project?.isActive ?? true,
    bitrix24_id: project?.bitrix24_id || '',
    weeek_id: project?.weeek_id || '',
    lead_id: project?.lead_id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Prepare data in the exact structure of real project
    const submitData = {
      project_name: formData.project_name.trim(),
      project_status: formData.project_status,
      type: formData.type,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      bitrix24_id: formData.bitrix24_id || null,
      weeek_id: formData.weeek_id || null,
      lead_id: formData.lead_id ? Number(formData.lead_id) : null,
      comment: formData.comment || null,
      isActive: formData.isActive,
      // Empty arrays for project members and plans as in real structure
      project_members: [],
      project_user_hour_plans: [],
      plans: []
    };
    
    const success = await onSubmit(submitData);
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
            className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Введите название проекта"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Статус проекта</label>
            <select
              value={formData.project_status}
              onChange={(e) => setFormData(prev => ({ ...prev, project_status: e.target.value as ProjectStatus }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
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
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Не указан</option>
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
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Дата окончания</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bitrix24 ID</label>
            <input
              type="text"
              value={formData.bitrix24_id}
              onChange={(e) => setFormData(prev => ({ ...prev, bitrix24_id: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Weeek ID</label>
            <input
              type="text"
              value={formData.weeek_id}
              onChange={(e) => setFormData(prev => ({ ...prev, weeek_id: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="abc123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lead ID</label>
            <input
              type="number"
              value={formData.lead_id}
              onChange={(e) => setFormData(prev => ({ ...prev, lead_id: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="123"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Комментарий</label>
          <textarea
            value={formData.comment || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="Дополнительная информация о проекте..."
          />
        </div>

        <div className="flex items-center space-x-2 p-3 border rounded-md">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Активный проект
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Автоматически создаваемые поля</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• project_members: [] (пустой массив)</li>
            <li>• project_user_hour_plans: [] (пустой массив)</li>
            <li>• plans: [] (пустой массив)</li>
            <li>• name: будет установлено как project_name</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading || !formData.project_name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Сохранение...' : (project ? 'Обновить' : 'Создать')}
          </button>
        </div>
      </form>
    </Card>
  );
}