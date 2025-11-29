'use client';
import { Card } from '@/components/ui';
import { HypotheticalUser } from '@/lib/whatIfTypes';
import { Department } from '@/lib/dataModel';

interface UsersListProps {
  users: HypotheticalUser[];
  departments: Department[];
  onEdit: (user: HypotheticalUser) => void;
  onDelete: (id: string) => Promise<boolean>;
  onCreate: () => void;
}

export function UsersList({ users, departments, onEdit, onDelete, onCreate }: UsersListProps) {
  const getDepartmentName = (departmentId?: number) => {
    if (!departmentId) return 'Без отдела';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || `Отдел #${departmentId}`;
  };

  const getTotalHours = (user: HypotheticalUser) => {
    if (!user.norm) return 0;
    return user.norm.hours_commercial + user.norm.hours_presale + user.norm.hours_internal;
  };

  const handleDelete = async (user: HypotheticalUser) => {
    if (confirm(`Удалить сотрудника "${user.name}"?`)) {
      await onDelete(user.id);
    }
  };

  if (users.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            Нет гипотетических сотрудников
          </div>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Создать первого сотрудника
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Гипотетические сотрудники</h3>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          + Добавить сотрудника
        </button>
      </div>

      <div className="grid gap-4">
        {users.map(user => (
          <Card key={user.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium">{user.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.isActive ? 'Активный' : 'Неактивный'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Гипотетический
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                  <div>
                    <span className="font-medium">Отдел:</span>
                    <span className="ml-2">{getDepartmentName(user.department_id)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Всего часов:</span>
                    <span className="ml-2">{getTotalHours(user)}ч/нед</span>
                  </div>
                  <div>
                    <span className="font-medium">Коммерческие:</span>
                    <span className="ml-2">{user.norm?.hours_commercial || 0}ч</span>
                  </div>
                  <div>
                    <span className="font-medium">Рабочих дней:</span>
                    <span className="ml-2">{user.norm?.working_days?.length || 0}</span>
                  </div>
                </div>

                {user.norm && (
                  <div className="flex items-center space-x-4 text-xs">
                    <span>Рабочие дни:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <span
                          key={day}
                          className={`w-6 h-6 flex items-center justify-center rounded ${
                            user.norm!.working_days.includes(day)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day - 1]}
                        </span>
                      ))}
                    </div>
                    {user.norm.works_on_holidays && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        Работает в праздники
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => onEdit(user)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Удалить
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              Создан: {new Date(user.created_at).toLocaleDateString('ru-RU')}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}