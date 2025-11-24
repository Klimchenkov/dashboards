// components/FilterBar.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Button, Card, Input } from './ui';
import { ProjectStatus } from '@/lib/dataModel';

interface FilterBarProps {
  filters: any;
  departments: any[];
  availableDepartments: any[];
  projects: any[];
  availableProjects: any[];
  projectStatuses: ProjectStatus[];
  onChange: (key: string, value: any) => void;
  onUpdate: () => void;
  onReset?: () => void;
  hasPendingChanges?: boolean;
  isUpdating?: boolean;
  isLoadingData?: boolean;
}

export default function FilterBar({ 
  filters, 
  departments,
  availableDepartments,
  projects,
  availableProjects,
  projectStatuses,
  onChange, 
  onUpdate, 
  onReset,
  hasPendingChanges = false, 
  isUpdating = false,
  isLoadingData = false
}: FilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  const handleChange = (key: string, value: any) => {
    onChange(key, value);
  };

  const toggleDepartment = (deptId: number) => {
    const currentSelected = filters.selectedDepartments || [];
    const newSelected = currentSelected.includes(deptId)
      ? currentSelected.filter((id: number) => id !== deptId)
      : [...currentSelected, deptId];
    handleChange('selectedDepartments', newSelected);
  };

  const includeDepartment = (deptId: number) => {
    const currentExcluded = filters.excludedDepartments || [];
    const newExcluded = currentExcluded.filter((id: number) => id !== deptId);
    handleChange('excludedDepartments', newExcluded);
  };

  const excludeDepartment = (deptId: number) => {
    const currentExcluded = filters.excludedDepartments || [];
    const newExcluded = [...currentExcluded, deptId];
    handleChange('excludedDepartments', newExcluded);
    
    const currentSelected = filters.selectedDepartments || [];
    if (currentSelected.includes(deptId)) {
      const newSelected = currentSelected.filter((id: number) => id !== deptId);
      handleChange('selectedDepartments', newSelected);
    }
  };

  const toggleProject = (projectId: number) => {
    const currentSelected = filters.selectedProjects || [];
    const newSelected = currentSelected.includes(projectId)
      ? currentSelected.filter((id: number) => id !== projectId)
      : [...currentSelected, projectId];
    handleChange('selectedProjects', newSelected);
  };

  const includeProject = (projectId: number) => {
    const currentExcluded = filters.excludedProjects || [];
    const newExcluded = currentExcluded.filter((id: number) => id !== projectId);
    handleChange('excludedProjects', newExcluded);
  };

  const excludeProject = (projectId: number) => {
    const currentExcluded = filters.excludedProjects || [];
    const newExcluded = [...currentExcluded, projectId];
    handleChange('excludedProjects', newExcluded);
    
    const currentSelected = filters.selectedProjects || [];
    if (currentSelected.includes(projectId)) {
      const newSelected = currentSelected.filter((id: number) => id !== projectId);
      handleChange('selectedProjects', newSelected);
    }
  };

  const toggleProjectStatus = (status: ProjectStatus) => {
    const current = filters.excludedProjectStatuses || [];
    const newStatuses = current.includes(status)
      ? current.filter((s: ProjectStatus) => s !== status)
      : [...current, status];
    handleChange('excludedProjectStatuses', newStatuses);
  };

  // Filter departments based on search
  const filteredDepartments = useMemo(() => {
    const searchTerm = departmentSearch.toLowerCase();
    return availableDepartments.filter(dept => 
      dept.name.toLowerCase().includes(searchTerm)
    );
  }, [availableDepartments, departmentSearch]);

  // Separate departments into included and excluded
  const { includedDepartments, excludedDepartments } = useMemo(() => {
    const excluded = filters.excludedDepartments || [];
    return {
      includedDepartments: filteredDepartments.filter(dept => !excluded.includes(dept.id)),
      excludedDepartments: filteredDepartments.filter(dept => excluded.includes(dept.id))
    };
  }, [filteredDepartments, filters.excludedDepartments]);

  // Filter and separate projects into included and excluded
  const { includedProjects, excludedProjects } = useMemo(() => {
    const searchTerm = projectSearch.toLowerCase();
    const excludedStatuses = filters.excludedProjectStatuses || [];
    const excludedProjects = filters.excludedProjects || [];
    
    const filteredBySearchAndStatus = availableProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) &&
      !excludedStatuses.includes(project.status)
    );

    return {
      includedProjects: filteredBySearchAndStatus.filter(project => !excludedProjects.includes(project.id)),
      excludedProjects: filteredBySearchAndStatus.filter(project => excludedProjects.includes(project.id))
    };
  }, [availableProjects, projectSearch, filters.excludedProjectStatuses, filters.excludedProjects]);

  // Group included projects by status for display
  const groupedIncludedProjects = useMemo(() => {
    const groups: Record<string, typeof availableProjects> = {};
    includedProjects.forEach(project => {
      if (!groups[project.status]) {
        groups[project.status] = [];
      }
      groups[project.status].push(project);
    });
    return groups;
  }, [includedProjects]);

  // Get display text for department button
  const getDepartmentDisplayText = () => {
    const selected = filters.selectedDepartments || [];
    if (selected.length === 0) return 'Выберите отдел';
    if (selected.length === 1) {
      const dept = availableDepartments.find(d => d.id === selected[0]);
      return dept?.name || 'Выберите отдел';
    }
    return `Отделы (${selected.length})`;
  };

  // Get display text for project button
  const getProjectDisplayText = () => {
    const selected = filters.selectedProjects || [];
    if (selected.length === 0) return 'Выберите проект';
    if (selected.length === 1) {
      const project = availableProjects.find(p => p.id === selected[0]);
      return project?.name || 'Выберите проект';
    }
    return `Проекты (${selected.length})`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SETTERS · Resource Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Мониторинг загрузки и планирования ресурсов</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {hasPendingChanges && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full"
              >
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-700">Изменения не применены</span>
              </motion.div>
            )}
          </AnimatePresence>

          {hasPendingChanges && onReset && (
            <Button 
              variant="outline" 
              onClick={onReset} 
              disabled={isUpdating}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Сбросить
            </Button>
          )}
          
          <Button 
            onClick={onUpdate}
            disabled={isUpdating || !hasPendingChanges}
            className={`
              relative min-w-32 font-semibold
              ${!hasPendingChanges 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-[#EC694C] hover:bg-[#e55c3e] shadow-sm hover:shadow-md"
              }
              transition-all duration-200
            `}
          >
            {isUpdating ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Загрузка...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить данные
              </div>
            )}
          </Button>
        </div>
      </div>
      
      <Card className={`
        relative p-4 border-2 transition-all duration-300
        ${hasPendingChanges 
          ? "border-yellow-400 bg-yellow-50/30 shadow-lg" 
          : "border-gray-200 shadow-sm"
        }
        ${isUpdating ? "opacity-70" : ""}
      `}>
        {isUpdating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
            <div className="flex items-center gap-2 text-sm font-medium bg-white px-4 py-2 rounded-full shadow-lg border">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#EC694C]"></div>
              Обновление данных...
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {/* Period Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Период
            </label>
            <select 
              value={filters.period || ''} 
              onChange={e => handleChange('period', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-32"
            >
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="quarter">Квартал</option>
              <option value="halfyear">6 месяцев</option>
              <option value="year">Год</option>
            </select>
          </div>

          {/* Horizon Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Горизонт
            </label>
            <select 
              value={filters.horizonMonths || 1} 
              onChange={e => handleChange('horizonMonths', Number(e.target.value) as 1|2|3)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC694C] focus:border-transparent bg-white min-w-20"
            >
              <option value={1}>1 месяц</option>
              <option value={2}>2 месяца</option>
              <option value={3}>3 месяца</option>
            </select>
          </div>

          <div className="w-px h-8 bg-gray-300"></div>

          {/* Departments Dropdown */}
          <div className="relative">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Отдел
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDropdown(activeDropdown === 'depts' ? null : 'depts')}
                className={`
                  min-w-48 justify-between border transition-colors
                  ${(filters.selectedDepartments || []).length > 0 
                    ? "border-[#53A58E] bg-[#53A58E]/5" 
                    : "border-gray-300"
                  }
                `}
              >
                <span className={`${(filters.selectedDepartments || []).length === 0 ? "text-gray-500" : "text-gray-900"}`}>
                  {getDepartmentDisplayText()}
                </span>
                <span className={`transition-transform ${activeDropdown === 'depts' ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </Button>
            </div>
            
            {activeDropdown === 'depts' && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-96 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <Input
                    placeholder="Поиск отделов..."
                    value={departmentSearch}
                    onChange={e => setDepartmentSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {/* Included Departments */}
                  <div className="p-2 space-y-1">
                    {includedDepartments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(filters.selectedDepartments || []).includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="rounded border-gray-300 text-[#53A58E] focus:ring-[#53A58E]"
                        />
                        <span className="text-sm flex-1">{dept.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            excludeDepartment(dept.id);
                          }}
                          className="text-xs text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="Исключить отдел"
                        >
                          ✕
                        </button>
                      </label>
                    ))}
                  </div>

                  {/* Excluded Departments Section */}
                  {excludedDepartments.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 mx-3"></div>
                      <div className="p-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Исключенные отделы:</div>
                        <div className="space-y-1">
                          {excludedDepartments.map(dept => (
                            <div key={dept.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                              <span className="text-sm flex-1 line-through text-gray-500">{dept.name}</span>
                              <button
                                onClick={() => includeDepartment(dept.id)}
                                className="text-xs text-green-500 hover:text-green-700 p-1 transition-colors"
                                title="Включить отдел"
                              >
                                ✓
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Projects Dropdown */}
          <div className="relative">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Проект
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
                className={`
                  min-w-48 justify-between border transition-colors
                  ${(filters.selectedProjects || []).length > 0 
                    ? "border-[#87B1DE] bg-[#87B1DE]/5" 
                    : "border-gray-300"
                  }
                `}
              >
                <span className={`${(filters.selectedProjects || []).length === 0 ? "text-gray-500" : "text-gray-900"}`}>
                  {getProjectDisplayText()}
                </span>
                <span className={`transition-transform ${activeDropdown === 'projects' ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </Button>
            </div>
            
            {activeDropdown === 'projects' && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-96 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <Input
                    placeholder="Поиск проектов..."
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Project Status Filters */}
                <div className="p-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Исключить по статусу:</div>
                  <div className="flex flex-wrap gap-1">
                    {projectStatuses.map(status => (
                      <button
                        key={status}
                        onClick={() => toggleProjectStatus(status)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          (filters.excludedProjectStatuses || []).includes(status)
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {/* Included Projects */}
                  <div className="p-2 space-y-2">
                    {Object.entries(groupedIncludedProjects).map(([status, statusProjects]) => (
                      <div key={status}>
                        <div className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wide">
                          {status} <span className="text-gray-400">({statusProjects.length})</span>
                        </div>
                        {statusProjects.map(project => (
                          <label key={project.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(filters.selectedProjects || []).includes(project.id)}
                              onChange={() => toggleProject(project.id)}
                              className="rounded border-gray-300 text-[#87B1DE] focus:ring-[#87B1DE]"
                            />
                            <span className="text-sm flex-1 truncate">{project.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                excludeProject(project.id);
                              }}
                              className="text-xs text-gray-400 hover:text-red-500 p-1 transition-colors"
                              title="Исключить проект"
                            >
                              ✕
                            </button>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Excluded Projects Section */}
                  {excludedProjects.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 mx-3"></div>
                      <div className="p-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Исключенные проекты:</div>
                        <div className="space-y-1">
                          {excludedProjects.map(project => (
                            <div key={project.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                              <span className="text-sm flex-1 line-through text-gray-500 truncate">{project.name}</span>
                              <button
                                onClick={() => includeProject(project.id)}
                                className="text-xs text-green-500 hover:text-green-700 p-1 transition-colors"
                                title="Включить проект"
                              >
                                ✓
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Close dropdowns when clicking outside */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </motion.div>
  );
}