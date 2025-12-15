import { User, Project, UserNorm, Plan, Vacation, Department, ProjectStatus, ProjectType } from './dataModel';

export interface HypotheticalUser extends Omit<User, 'id' | 'created_at' | 'time_entries'> {
  id: string;
  created_at: string;
  isHypothetical: true;
  department_id?: number;
}

export interface HypotheticalProject extends Omit<Project, 'id' | 'created_at'> {
  id: string;
  created_at: string;
  isHypothetical: true;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description?: string;
  users: HypotheticalUser[];
  projects: HypotheticalProject[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface WhatIfData {
  scenarios: WhatIfScenario[];
  active_scenario_id?: string;
}

// Ключи Redis с привязкой к пользователю
export const getWhatIfUserKey = (userId: string) => `whatif:user:${userId}`;
export const getWhatIfScenarioKey = (userId: string, scenarioId: string) => `whatif:scenario:${userId}:${scenarioId}`;

// Типы для форм
export interface UserFormData {
  name: string;
  isActive: boolean;
  department_id?: number;
  norm: {
    working_days: number[];
    hours_commercial: number;
    hours_presale: number;
    hours_internal: number;
    works_on_holidays: boolean;
  };
}

export interface ProjectFormData {
  project_name: string;
  project_status: ProjectStatus;
  type: ProjectType | null;
  start_date: string;
  end_date: string;
  comment: string;
  isActive: boolean;
  bitrix24_id?: string;
  weeek_id?: string;
  lead_id?: number;
}

export interface HypotheticalProject extends Omit<Project, 'id' | 'created_at'> {
  id: string;
  created_at: string;
  isHypothetical: true;
  // Add the missing fields that are in real project objects
  project_members: Array<{ user_id: number }>;
  project_user_hour_plans: Array<{
    id: string;
    comment: string | null;
    user_id: number;
    isActive: boolean;
    created_at: string;
    project_id: string;
    internal_hours: number;
    contracted_hours: number;
  }>;
}
