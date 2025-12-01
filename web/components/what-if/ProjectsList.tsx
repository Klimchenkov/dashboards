'use client';
import { Card } from '@/components/ui';
import { HypotheticalProject } from '@/lib/whatIfTypes';

interface ProjectsListProps {
  projects: HypotheticalProject[];
  onEdit: (project: HypotheticalProject) => void;
  onDelete: (id: string) => Promise<boolean>;
  onCreate: () => void;
}

export function ProjectsList({ projects, onEdit, onDelete, onCreate }: ProjectsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'presale': return 'bg-blue-100 text-blue-800';
      case 'internal': return 'bg-purple-100 text-purple-800';
      case 'archive': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-teal-100 text-teal-800';
      case 'presale_archive': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'presale': return 'Presale';
      case 'internal': return 'Внутренний';
      case 'archive': return 'Архивный';
      case 'presale_archive': return 'Presale архив';
      case 'completed': return 'Завершен';
      case 'on_hold': return 'На паузе';
      default: return status;
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'commercial': return 'Коммерческий';
      case 'internal': return 'Внутренний';
      case 'presale': return 'Presale';
      default: return 'Не указан';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const handleDelete = async (project: HypotheticalProject) => {
    if (confirm(`Удалить проект "${project.project_name}"?`)) {
      await onDelete(project.id);
    }
  };

  if (projects.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            Нет гипотетических проектов
          </div>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Создать первый проект
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Гипотетические проекты</h3>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          + Добавить проект
        </button>
      </div>

      <div className="grid gap-4">
        {projects.map(project => (
          <Card key={project.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium">{project.project_name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.project_status)}`}>
                    {getStatusLabel(project.project_status)}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Гипотетический
                  </span>
                  {!project.isActive && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      Неактивный
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                  <div>
                    <span className="font-medium">Тип:</span>
                    <span className="ml-2">{getTypeLabel(project.type)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Начало:</span>
                    <span className="ml-2">{formatDate(project.start_date)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Окончание:</span>
                    <span className="ml-2">{formatDate(project.end_date)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Участники:</span>
                    <span className="ml-2">{project.project_members?.length || 0}</span>
                  </div>
                </div>

                {(project.bitrix24_id || project.weeek_id || project.lead_id) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                    {project.bitrix24_id && (
                      <div>
                        <span className="font-medium">Bitrix24:</span>
                        <span className="ml-2">{project.bitrix24_id}</span>
                      </div>
                    )}
                    {project.weeek_id && (
                      <div>
                        <span className="font-medium">Weeek:</span>
                        <span className="ml-2">{project.weeek_id}</span>
                      </div>
                    )}
                    {project.lead_id && (
                      <div>
                        <span className="font-medium">Lead ID:</span>
                        <span className="ml-2">{project.lead_id}</span>
                      </div>
                    )}
                  </div>
                )}

                {project.comment && (
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Комментарий:</span>
                    <span className="ml-2">{project.comment}</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Планов: {project.plans?.length || 0} • Создан: {new Date(project.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => onEdit(project)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(project)}
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