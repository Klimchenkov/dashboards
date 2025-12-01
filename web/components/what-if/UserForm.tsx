'use client';
import { useState } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalUser } from '@/lib/whatIfTypes';
import { Department } from '@/lib/dataModel';

interface UserFormProps {
  user?: HypotheticalUser;
  departments: Department[];
  onSubmit: (data: any) => Promise<boolean>;
  onCancel: () => void;
}

export function UserForm({ user, departments, onSubmit, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    isActive: user?.isActive ?? true,
    department_id: user?.department_id || '',
    telegram_id: user?.telegram_id || '',
    telegram_name: user?.telegram_name || '',
    full_access: user?.full_access ?? false,
    norm: {
      working_days: user?.norm?.working_days || [1, 2, 3, 4, 5],
      hours_commercial: user?.norm?.hours_commercial || 32,
      hours_presale: user?.norm?.hours_presale || 4,
      hours_internal: user?.norm?.hours_internal || 4,
      works_on_holidays: user?.norm?.works_on_holidays || false,
      valid_from: user?.norm?.valid_from || new Date().toISOString().split('T')[0],
      valid_to: user?.norm?.valid_to || '2030-12-31'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Prepare data in the exact structure of real user
    const submitData = {
      name: formData.name.trim(),
      isActive: formData.isActive,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      telegram_id: formData.telegram_id ? Number(formData.telegram_id) : null,
      telegram_name: formData.telegram_name || null,
      full_access: formData.full_access,
      // Empty arrays for plans and time_entries as in real structure
      plans: [],
      time_entries: [],
      vacations: [],
      // Norm object with proper structure
      norm: {
        working_days: formData.norm.working_days,
        hours_commercial: Number(formData.norm.hours_commercial),
        hours_presale: Number(formData.norm.hours_presale),
        hours_internal: Number(formData.norm.hours_internal),
        works_on_holidays: formData.norm.works_on_holidays,
        valid_from: formData.norm.valid_from,
        valid_to: formData.norm.valid_to
      }
    };
    
    const success = await onSubmit(submitData);
    setLoading(false);
  };

  const toggleWorkingDay = (day: number) => {
    const currentDays = formData.norm.working_days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    setFormData(prev => ({
      ...prev,
      norm: { 
        ...prev.norm, 
        working_days: newDays 
      }
    }));
  };

  const dayLabels = {
    1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс'
  };

  const handleNumberInputChange = (field: keyof typeof formData.norm, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, Math.min(40, parseFloat(value) || 0));
    
    setFormData(prev => ({
      ...prev,
      norm: { 
        ...prev.norm, 
        [field]: numValue 
      }
    }));
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {user ? 'Редактировать сотрудника' : 'Новый сотрудник'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Имя сотрудника *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Введите имя сотрудника"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Telegram ID</label>
            <input
              type="number"
              value={formData.telegram_id}
              onChange={(e) => setFormData(prev => ({ ...prev, telegram_id: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telegram Username</label>
            <input
              type="text"
              value={formData.telegram_name}
              onChange={(e) => setFormData(prev => ({ ...prev, telegram_name: e.target.value }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Отдел</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
            className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Без отдела</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Коммерческие часы</label>
            <input
              type="number"
              min="0"
              max="40"
              step="0.1"
              value={formData.norm.hours_commercial}
              onChange={(e) => handleNumberInputChange('hours_commercial', e.target.value)}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Presale часы</label>
            <input
              type="number"
              min="0"
              max="40"
              step="0.1"
              value={formData.norm.hours_presale}
              onChange={(e) => handleNumberInputChange('hours_presale', e.target.value)}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Внутренние часы</label>
            <input
              type="number"
              min="0"
              max="40"
              step="0.1"
              value={formData.norm.hours_internal}
              onChange={(e) => handleNumberInputChange('hours_internal', e.target.value)}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Рабочие дни</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => {
              const isSelected = formData.norm.working_days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium
                    transition-all duration-200 ease-in-out
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105' 
                      : 'bg-background text-muted-foreground border-border hover:bg-muted hover:border-primary/50'
                    }
                    hover:scale-105 active:scale-95
                  `}
                >
                  {dayLabels[day as keyof typeof dayLabels]}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Выбрано дней: {formData.norm.working_days.length}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Норма действует с</label>
            <input
              type="date"
              value={formData.norm.valid_from}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                norm: { ...prev.norm, valid_from: e.target.value }
              }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Норма действует до</label>
            <input
              type="date"
              value={formData.norm.valid_to}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                norm: { ...prev.norm, valid_to: e.target.value }
              }))}
              className="w-full p-2 border rounded-md focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 border rounded-md">
          <input
            type="checkbox"
            id="works_on_holidays"
            checked={formData.norm.works_on_holidays}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              norm: { ...prev.norm, works_on_holidays: e.target.checked }
            }))}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="works_on_holidays" className="text-sm font-medium">
            Работает в праздничные дни
          </label>
        </div>

        <div className="flex items-center space-x-2 p-3 border rounded-md">
          <input
            type="checkbox"
            id="full_access"
            checked={formData.full_access}
            onChange={(e) => setFormData(prev => ({ ...prev, full_access: e.target.checked }))}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="full_access" className="text-sm font-medium">
            Полный доступ
          </label>
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
            Активный сотрудник
          </label>
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
            disabled={loading || !formData.name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Сохранение...' : (user ? 'Обновить' : 'Создать')}
          </button>
        </div>
      </form>
    </Card>
  );
}