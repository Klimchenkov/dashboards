'use client';
import { useState } from 'react';
import { Card } from '@/components/ui';
import { HypotheticalUser } from '@/lib/whatIfTypes';
import { UserNorm, Department } from '@/lib/dataModel';

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
    norm: {
      working_days: user?.norm?.working_days || [1, 2, 3, 4, 5],
      hours_commercial: user?.norm?.hours_commercial || 32,
      hours_presale: user?.norm?.hours_presale || 4,
      hours_internal: user?.norm?.hours_internal || 4,
      works_on_holidays: user?.norm?.works_on_holidays || false,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await onSubmit(formData);
    setLoading(false);
  };

  const toggleWorkingDay = (day: number) => {
    const currentDays = formData.norm.working_days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    setFormData(prev => ({
      ...prev,
      norm: { ...prev.norm, working_days: newDays }
    }));
  };

  const dayLabels = {
    1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс'
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
            className="w-full p-2 border rounded-md"
            placeholder="Введите имя сотрудника"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Отдел</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
            className="w-full p-2 border rounded-md"
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
              value={formData.norm.hours_commercial}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                norm: { ...prev.norm, hours_commercial: Number(e.target.value) }
              }))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Presale часы</label>
            <input
              type="number"
              min="0"
              max="40"
              value={formData.norm.hours_presale}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                norm: { ...prev.norm, hours_presale: Number(e.target.value) }
              }))}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Внутренние часы</label>
            <input
              type="number"
              min="0"
              max="40"
              value={formData.norm.hours_internal}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                norm: { ...prev.norm, hours_internal: Number(e.target.value) }
              }))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Рабочие дни</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWorkingDay(day)}
                className={`w-10 h-10 rounded-full border ${
                  formData.norm.working_days.includes(day)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border'
                }`}
              >
                {dayLabels[day as keyof typeof dayLabels]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="works_on_holidays"
            checked={formData.norm.works_on_holidays}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              norm: { ...prev.norm, works_on_holidays: e.target.checked }
            }))}
            className="rounded"
          />
          <label htmlFor="works_on_holidays" className="text-sm">
            Работает в праздничные дни
          </label>
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
            Активный сотрудник
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
            {loading ? 'Сохранение...' : (user ? 'Обновить' : 'Создать')}
          </button>
        </div>
      </form>
    </Card>
  );
}