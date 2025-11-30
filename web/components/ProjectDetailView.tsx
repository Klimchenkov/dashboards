// components/ProjectDetailView.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { Project, User, TimeEntry, ProjectStatus } from '@/lib/dataModel';
import HintTooltip from './HintTooltip';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useAlerts } from '@/hooks/useAlerts';

interface ProjectDetailViewProps {
  projects: Project[];
  users: User[];
  timeEntries?: TimeEntry[];
}

interface ProjectMemberAllocation {
  user: User;
  plannedHours: number;
  actualHours: number;
  overload: boolean;
  department: string;
  completionPercentage: number;
}

// Вспомогательная функция для оценки качества данных (вынесена за пределы компонента)
const calculateDataQuality = (project: Project, metrics: any): number => {
  let score = 0;
  let maxScore = 0;

  // Наличие дат
  maxScore += 30;
  if (project.start_date && project.end_date) score += 30;
  else if (project.start_date || project.end_date) score += 15;

  // Наличие планов
  maxScore += 30;
  if (project.plans && project.plans.length > 0) score += 30;

  // Наличие участников
  maxScore += 20;
  if (project.project_members && project.project_members.length > 0) score += 20;

  // Заполненность метрик
  maxScore += 20;
  if (metrics.totalPlannedHours > 0 && metrics.totalActualHours >= 0) score += 20;

  return (score / maxScore) * 100;
};

export default function ProjectDetailView({ projects, users, timeEntries = [] }: ProjectDetailViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Используем хук алертов для получения всех алертов
  const { alerts: allAlerts } = useAlerts();

  // Фильтруем активные проекты для выбора
  const activeProjects = useMemo(() => {
    return projects.filter(project => 
      project.project_status === ProjectStatus.ACTIVE
    );
  }, [projects]);

  // Фильтруем проекты для поиска
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return activeProjects;
    
    const searchLower = searchTerm.toLowerCase();
    return activeProjects.filter(project => 
      project.project_name?.toLowerCase().includes(searchLower) ||
      project.bitrix24_id?.toLowerCase().includes(searchLower) ||
      project.id.toString().includes(searchTerm)
    );
  }, [activeProjects, searchTerm]);

  // Выбираем проект по умолчанию
  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].id.toString());
    }
  }, [filteredProjects, selectedProjectId]);

  // Получаем выбранный проект
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id.toString() === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Рассчитываем метрики проекта
  const projectMetrics = useMemo(() => {
    if (!selectedProject) return null;

    // Суммируем плановые часы из всех планов проекта
    const totalPlannedHours = selectedProject.plans?.reduce((sum, plan) => 
      sum + (plan.contracted_hours || 0) + (plan.internal_hours || 0), 0
    ) || 0;

    // Суммируем фактические часы по проекту
    const totalActualHours = timeEntries
      .filter(entry => entry.project_id === selectedProject.id)
      .reduce((sum, entry) => sum + entry.hours, 0);

    // Рассчитываем разницу
    const delta = totalPlannedHours > 0 ? (totalActualHours - totalPlannedHours) / totalPlannedHours : 0;

    // Burn rate (сколько уже выполнено от плана)
    const burnRate = totalPlannedHours > 0 ? totalActualHours / totalPlannedHours : 0;

    // Estimate at Completion (прогноз итоговых часов)
    const eac = totalActualHours + Math.max(0, (totalPlannedHours - totalActualHours) * 1.1);

    // Определяем статус проекта
    let status: 'on-track' | 'at-risk' | 'off-track';
    if (Math.abs(delta) < 0.1) {
      status = 'on-track';
    } else if (delta < 0.2) {
      status = 'at-risk';
    } else {
      status = 'off-track';
    }

    // Рассчитываем оставшиеся рабочие дни
    const today = new Date();
    const endDate = selectedProject.end_date ? new Date(selectedProject.end_date) : null;
    const remainingDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Оставшиеся часы
    const remainingHours = Math.max(0, totalPlannedHours - totalActualHours);

    return {
      totalPlannedHours,
      totalActualHours,
      delta,
      burnRate,
      eac,
      status,
      remainingDays,
      remainingHours,
      completionPercentage: totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0
    };
  }, [selectedProject, timeEntries]);

  // Формируем данные для графика Burndown
  const burndownData = useMemo(() => {
    if (!selectedProject || !projectMetrics) return [];

    const startDate = selectedProject.start_date ? new Date(selectedProject.start_date) : new Date();
    const endDate = selectedProject.end_date ? new Date(selectedProject.end_date) : new Date(startDate);
    endDate.setDate(startDate.getDate() + 30); // По умолчанию 30 дней, если нет даты окончания

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(daysDiff / 7);

    return Array.from({ length: Math.min(totalWeeks, 12) }, (_, i) => {
      const weekNum = i + 1;
      const plannedProgress = projectMetrics.totalPlannedHours * (weekNum / totalWeeks);
      
      // Упрощенный расчет факта (в реальности нужно группировать по неделям)
      const actualProgress = Math.min(
        projectMetrics.totalActualHours, 
        projectMetrics.totalActualHours * (weekNum / totalWeeks)
      );

      return {
        week: `W${weekNum}`,
        planned: Math.round(plannedProgress),
        actual: Math.round(actualProgress),
        ideal: projectMetrics.totalPlannedHours * (weekNum / totalWeeks)
      };
    });
  }, [selectedProject, projectMetrics]);

  // Формируем матрицу распределения ресурсов
  const allocationMatrix = useMemo(() => {
    if (!selectedProject) return [];

    const members: ProjectMemberAllocation[] = [];

    // Обрабатываем участников проекта
    selectedProject.project_members?.forEach(member => {
      const user = users.find(u => u.id === member.user_id);
      if (!user) return;

      // Находим планы для этого пользователя в проекте
      const userPlans = selectedProject.plans?.filter(plan => plan.user_id === user.id) || [];
      const plannedHours = userPlans.reduce((sum, plan) => 
        sum + (plan.contracted_hours || 0) + (plan.internal_hours || 0), 0
      );

      // Считаем фактические часы пользователя по проекту
      const actualHours = timeEntries
        .filter(entry => entry.project_id === selectedProject.id && entry.user_id === user.id)
        .reduce((sum, entry) => sum + entry.hours, 0);

      // Получаем название отдела пользователя (первый отдел в массиве)
      const department = user.departments && user.departments.length > 0 
        ? user.departments[0].departments.name 
        : 'Не указан';

      // Рассчитываем процент выполнения плана
      const completionPercentage = plannedHours > 0 
        ? (actualHours / plannedHours) * 100 
        : 0;

      // Проверяем перегрузку (если у пользователя есть норма)
      const userCapacity = user.capacity_hours || 40;
      const overload = plannedHours > userCapacity * 0.8;

      members.push({
        user,
        plannedHours,
        actualHours,
        overload,
        department,
        completionPercentage
      });
    });

    return members;
  }, [selectedProject, users, timeEntries]);

  // Группируем участников по отделам
  const allocationByDepartment = useMemo(() => {
    const grouped: { [key: string]: ProjectMemberAllocation[] } = {};
    
    allocationMatrix.forEach(member => {
      if (!grouped[member.department]) {
        grouped[member.department] = [];
      }
      grouped[member.department].push(member);
    });

    return grouped;
  }, [allocationMatrix]);

  // Рассчитываем суммарные часы по отделам
  const departmentTotals = useMemo(() => {
    const totals: { [key: string]: { planned: number, actual: number } } = {};
    
    Object.entries(allocationByDepartment).forEach(([department, members]) => {
      totals[department] = {
        planned: members.reduce((sum, member) => sum + member.plannedHours, 0),
        actual: members.reduce((sum, member) => sum + member.actualHours, 0)
      };
    });

    return totals;
  }, [allocationByDepartment]);

  // Генерация алертов для текущего проекта из общего списка алертов
  const projectAlerts = useMemo(() => {
    if (!selectedProject) return [];
    
    // Фильтруем алерты для текущего проекта
    return allAlerts.filter(alert => 
      alert.entityType === 'project' && alert.entityId === selectedProject.id
    );
  }, [allAlerts, selectedProject]);
  if (!selectedProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Детализация проекта</div>
        </div>
        <Card>
          <div className="p-8 text-center text-gray-500">
            {activeProjects.length === 0 ? 'Нет активных проектов' : 'Загрузка...'}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">Детализация проекта</div>
          <HintTooltip hintKey="projectDetail" />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Поиск проектов */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Поиск проекта..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-64"
            />
          </div>

          {/* Выбор проекта */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Проект:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-80"
            >
              {filteredProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name || `Проект ${project.id}`} 
                  {project.bitrix24_id && ` (Bitrix: ${project.bitrix24_id})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Основные метрики проекта */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-xl">
              {selectedProject.project_name || `Проект ${selectedProject.id}`}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {selectedProject.start_date && `С ${new Date(selectedProject.start_date).toLocaleDateString('ru-RU')}`}
              {selectedProject.end_date && ` по ${new Date(selectedProject.end_date).toLocaleDateString('ru-RU')}`}
              {selectedProject.bitrix24_id && ` • Bitrix24: ${selectedProject.bitrix24_id}`}
            </div>
          </div>
          <span 
            className="px-3 py-1 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: 
                projectMetrics?.status === 'on-track' ? '#dcfce7' :
                projectMetrics?.status === 'at-risk' ? '#fef9c3' : '#fee2e2',
              color: 
                projectMetrics?.status === 'on-track' ? '#166534' :
                projectMetrics?.status === 'at-risk' ? '#854d0e' : '#991b1b'
            }}
          >
            {projectMetrics?.status === 'on-track' ? 'По плану' :
             projectMetrics?.status === 'at-risk' ? 'В зоне риска' : 'Отклонение'}
          </span>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">Бюджет (ч)</div>
              <HintTooltip hintKey="projectBudget" />
            </div>
            <div className="text-2xl font-bold">{projectMetrics?.totalPlannedHours.toFixed(0)}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">Факт (ч)</div>
              <HintTooltip hintKey="projectActual" />
            </div>
            <div className="text-2xl font-bold">{projectMetrics?.totalActualHours.toFixed(0)}</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">Δ Plan–Fact</div>
              <HintTooltip hintKey="projectDelta" />
            </div>
            <div className="text-2xl font-bold" style={{
              color: projectMetrics && projectMetrics.delta >= 0 ? '#059669' : '#dc2626'
            }}>
              {(projectMetrics ? projectMetrics.delta * 100 : 0).toFixed(0)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">Burn-rate</div>
              <HintTooltip hintKey="projectBurnRate" />
            </div>
            <div className="text-2xl font-bold">{projectMetrics?.burnRate.toFixed(2)}×</div>
            <div className="text-xs text-gray-500 mt-1">
              {projectMetrics ? projectMetrics.completionPercentage.toFixed(0) : 0}% выполнено
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">EAC (ч)</div>
              <HintTooltip hintKey="projectEAC" />
            </div>
            <div className="text-2xl font-bold">{projectMetrics ? Math.round(projectMetrics.eac) : 0}</div>
            {projectMetrics?.remainingDays && (
              <div className="text-xs text-gray-500 mt-1">
                {projectMetrics.remainingDays} дн. осталось
              </div>
            )}
          </Card>
        </div>
      </Card>

      {/* Алерты проекта */}
      {projectAlerts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 font-semibold mb-4">
            Уведомления проекта
            <HintTooltip hintKey="projectAlerts" />
          </div>
          <div className="space-y-2">
            {projectAlerts.map((alert) => (
              <div
                key={alert.id} // Используем id алерта вместо индекса
                className={`p-3 rounded-lg border ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {alert.severity === 'critical' && '🔴'}
                  {alert.severity === 'warning' && '🟡'}
                  {alert.severity === 'info' && '🔵'}
                  {alert.description}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* График Burndown */}
      <Card className="p-4">
        <div className="flex items-center gap-2 font-semibold mb-4">
          Burndown / Plan vs Fact
          <HintTooltip hintKey="projectBurndown" />
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" name="План" fill="#8884d8" />
              <Line dataKey="actual" name="Факт" type="monotone" stroke="#82ca9d" strokeWidth={2} />
              <Line dataKey="ideal" name="Идеальный план" type="monotone" stroke="#ffc658" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

     {/* Матрица распределения */}
      <Card className="p-4">
        <div className="flex items-center gap-2 font-semibold mb-4">
          Матрица распределения ресурсов
          <HintTooltip hintKey="projectAllocation" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Участник</th>
                <th className="p-2 text-left">Отдел</th>
                <th className="p-2 text-left">Плановые часы</th>
                <th className="p-2 text-left">Фактические часы</th>
                <th className="p-2 text-left">Выполнение</th>
                <th className="p-2 text-left">Статус</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allocationByDepartment).map(([department, members]) => [
                // Заголовок отдела с суммарными часами
                <tr key={`header-${department}`} className="bg-gray-100 font-semibold">
                  <td colSpan={2} className="p-2">
                    {department}
                  </td>
                  <td className="p-2">
                    {departmentTotals[department].planned.toFixed(1)} ч
                  </td>
                  <td className="p-2">
                    {departmentTotals[department].actual.toFixed(1)} ч
                  </td>
                  <td className="p-2">
                    {departmentTotals[department].planned > 0 
                      ? `${((departmentTotals[department].actual / departmentTotals[department].planned) * 100).toFixed(0)}%`
                      : '—'
                    }
                  </td>
                  <td className="p-2">
                    {/* Статус для отдела можно оставить пустым или добавить общую оценку */}
                  </td>
                </tr>,
                // Участники отдела
                ...members.map((member) => (
                  <tr key={`member-${member.user.id}-${department}`} className="border-b border-gray-100">
                    <td className="p-2">
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-xs text-gray-500">
                        {member.user.telegram_name && `@${member.user.telegram_name}`}
                      </div>
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {/* Отдел уже показан в заголовке, можно оставить пустым */}
                    </td>
                    <td className="p-2">{member.plannedHours.toFixed(1)} ч</td>
                    <td className="p-2">{member.actualHours.toFixed(1)} ч</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span>{member.completionPercentage.toFixed(0)}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              member.completionPercentage >= 100 ? 'bg-green-500' :
                              member.completionPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(member.completionPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      {member.overload ? (
                        <span className="text-red-600 font-medium">Перегруз</span>
                      ) : member.plannedHours === 0 ? (
                        <span className="text-yellow-600">Нет плана</span>
                      ) : (
                        <span className="text-green-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              ])}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Качество данных */}
      <Card className="p-4">
        <div className="flex items-center gap-2 font-semibold mb-4">
          Качество данных проекта
          <HintTooltip hintKey="projectDataQuality" />
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedProject.start_date && (
            <span key="start-date" className="px-3 py-1 rounded-xl text-xs bg-green-100 text-green-800">
              Дата начала ✓
            </span>
          )}
          {selectedProject.end_date && (
            <span key="end-date" className="px-3 py-1 rounded-xl text-xs bg-green-100 text-green-800">
              Дата окончания ✓
            </span>
          )}
          {selectedProject.bitrix24_id && (
            <span key="bitrix-id" className="px-3 py-1 rounded-xl text-xs bg-blue-100 text-blue-800">
              Bitrix24 ID: {selectedProject.bitrix24_id}
            </span>
          )}
          {selectedProject.plans && selectedProject.plans.length > 0 && (
            <span key="plans" className="px-3 py-1 rounded-xl text-xs bg-green-100 text-green-800">
              Планы: {selectedProject.plans.length}
            </span>
          )}
          {selectedProject.project_members && selectedProject.project_members.length > 0 && (
            <span key="members" className="px-3 py-1 rounded-xl text-xs bg-green-100 text-green-800">
              Участники: {selectedProject.project_members.length}
            </span>
          )}
          <span key="dq" className="px-3 py-1 rounded-xl text-xs bg-yellow-100 text-yellow-800">
            DQ: {projectMetrics ? calculateDataQuality(selectedProject, projectMetrics).toFixed(0) : '0'}%
          </span>
        </div>
      </Card>
    </div>
  );
}