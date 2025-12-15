import { redis } from './redis';
import { HypotheticalUser, HypotheticalProject, WhatIfData, WhatIfScenario, getWhatIfUserKey } from './whatIfTypes';
import { User, Project } from './dataModel';

export class WhatIfManager {
  // Получить все данные what-if для пользователя
  static async getUserWhatIfData(userId: string): Promise<WhatIfData> {
    if (!redis) {
      console.warn('Redis not available, returning empty what-if data');
      return { scenarios: [] };
    }

    try {
      const data = await redis.get(getWhatIfUserKey(userId));
  
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error fetching what-if data from Redis:', error);
    }

    return { scenarios: [] };
  }

  // Сохранить данные what-if для пользователя
  static async saveUserWhatIfData(userId: string, data: WhatIfData): Promise<void> {
    if (!redis) {
      console.warn('Redis not available, cannot save what-if data');
      return;
    }

    try {
      await redis.set(
        getWhatIfUserKey(userId),
        JSON.stringify(data),
        'EX',
        30 * 24 * 60 * 60 // 30 дней TTL
      );
    } catch (error) {
      console.error('Error saving what-if data to Redis:', error);
      throw new Error('Failed to save what-if data');
    }
  }

  // Генерация UUID для гипотетических сущностей
  static generateId(): string {
    return `hypothetical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Создать нового гипотетического пользователя
  static createHypotheticalUser(
    userData: Partial<HypotheticalUser> & { name: string }
  ): HypotheticalUser {
    const now = new Date().toISOString();
    
    return {
      id: this.generateId(),
      name: userData.name,
      created_at: now,
      isActive: userData.isActive ?? true,
      telegram_id: userData.telegram_id || null,
      telegram_name: userData.telegram_name || null,
      full_access: userData.full_access ?? false,
      vacations: userData.vacations || [],
      norm: {
        id: this.generateId(),
        created_at: now,
        user_id: 0, // Will be replaced when used
        working_days: userData.norm?.working_days || [1, 2, 3, 4, 5],
        hours_commercial: userData.norm?.hours_commercial || 32,
        hours_presale: userData.norm?.hours_presale || 4,
        hours_internal: userData.norm?.hours_internal || 4,
        works_on_holidays: userData.norm?.works_on_holidays || false,
        valid_from: userData.norm?.valid_from || now.split('T')[0],
        valid_to: userData.norm?.valid_to || '2030-12-31'
      },
      plans: userData.plans || [],
      time_entries: userData.time_entries || [],
      department_id: userData.department_id || null,
      isHypothetical: true
    };
  }

  // Создать новый гипотетический проект
 static createHypotheticalProject(
    projectData: Partial<HypotheticalProject> & { project_name: string }
  ): HypotheticalProject {
    const now = new Date().toISOString();
    
    return {
      id: this.generateId(),
      project_name: projectData.project_name,
      name: projectData.project_name, // Set name same as project_name
      created_at: now,
      start_date: projectData.start_date || null,
      end_date: projectData.end_date || null,
      bitrix24_id: projectData.bitrix24_id || null,
      weeek_id: projectData.weeek_id || null,
      type: projectData.type || null,
      lead_id: projectData.lead_id || null,
      project_status: projectData.project_status || 'active',
      comment: projectData.comment || null,
      isActive: projectData.isActive ?? true,
      // Empty arrays as in real project structure
      project_members: [],
      project_user_hour_plans: [],
      plans: [],
      isHypothetical: true
    };
  }

  // Объединить реальных и гипотетических пользователей
  static mergeUsers(realUsers: User[], hypotheticalUsers: HypotheticalUser[]): User[] {
    const mergedUsers = [...realUsers];
    
    for (const hypUser of hypotheticalUsers) {
      // Конвертируем гипотетического пользователя в формат User
      const user: User = {
        ...hypUser,
        time_entries: [] // У гипотетических пользователей нет тайм-записей
      };
      mergedUsers.push(user);
    }
    
    return mergedUsers;
  }

  // Объединить реальные и гипотетические проекты
  static mergeProjects(realProjects: Project[], hypotheticalProjects: HypotheticalProject[]): Project[] {
    const mergedProjects = [...realProjects];
    
    for (const hypProject of hypotheticalProjects) {
      // Конвертируем гипотетический проект в формат Project
      const project: Project = {
        ...hypProject
      };
      mergedProjects.push(project);
    }
    
    return mergedProjects;
  }

  // Добавить гипотетических пользователей в отделы
  static mergeDepartmentsWithHypotheticalUsers(
    realDepartments: any[],
    hypotheticalUsers: HypotheticalUser[]
  ): any[] {
    const mergedDepartments = [...realDepartments];
    
    for (const hypUser of hypotheticalUsers) {
      if (hypUser.department_id) {
        // Находим отдел и добавляем пользователя
        const dept = mergedDepartments.find(d => d.id === hypUser.department_id);
        if (dept) {
          if (!dept.users) dept.users = [];
          
          const userForDept: User = {
            ...hypUser,
            time_entries: []
          };
          
          dept.users.push(userForDept);
        }
      }
    }
    
    return mergedDepartments;
  }
}