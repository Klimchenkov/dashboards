//lib/dataModel.ts

export enum VacationType {
  PAID = 'paid',
  UNPAID = 'unpaid',
  SICK = 'sick',
  DAY_OFF = 'day_off',
  OTHER = 'other'
}

// User type
export type User = { 
  id: number; 
  name: string; 
  created_at: string;
  isActive: boolean | null; // Match DB nullable
  telegram_id?: number | null;
  telegram_name?: string | null;
  full_access?: boolean | null;
  vacations?: Vacation[];
  norm?: UserNorm | null;
  plans?: Plan[]; // Add plans from transformation
  time_entries: TimeEntry[];
  user_departments: Department[];
  forecast_hours: number | null;
  capacity_hours: number | null;
  demand_hours: number | null;
  hours_distribution: HoursDistributionItem [] | null;
};

// Vacation type
export type Vacation = {
  id: number;
  created_at: string;
  user_id: number;
  start_date: string;
  end_date: string;
  vacation_type: VacationType;
};

// UserNorm type
export type UserNorm = {
  id: number;
  created_at: string;
  user_id: number;
  working_days: number[];
  hours_commercial: number;
  hours_presale: number;
  hours_internal: number;
  works_on_holidays: boolean;
  valid_from: string;
  valid_to: string | null;
};
export type Project = {
  id: number;
  created_at: string; 
  start_date: string | null; 
  end_date: string | null; 
  bitrix24_id: string | null;
  weeek_id: string | null;
  type: ProjectType | null; 
  lead_id: number | null;
  project_name: string | null; // Keep as project_name to match DB
  project_status: ProjectStatus;
  comment: string | null;
  isActive?: boolean; // Add computed field from transformation
  plans?: Plan[]; // Add plans from transformation
};
export enum ProjectStatus {
  COMMERCIAL = 'active',
  INTERNAL = 'internal',
  PRESALE = 'presale'
}
export enum ProjectType {
  COMMERCIAL = 'commercial',
  INTERNAL = 'internal',
  PRESALE = 'presale'
}
export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVE = 'archive',
  PRESALE_ARCHIVE = 'presale_archive',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}
export type Department = { 
  id: number; 
  name: string; 
  lead_tg_id?: number;
  users?: User[]; // Make optional if not always needed
};
export type ProductionCalendarDay = {
  date: string;
  year: number;
  month: number;
  day: number;
  iso_weekday: number;
  is_workday: boolean;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string;
  is_transferred_day_off: boolean;
  is_preholiday_short_day: boolean;
  notes: string;
};
export interface TimeEntry {
  id: number;
  created_at: string;
  user_id: number;
  project_id: number;
  date: string;
  hours: number;
  user_name?: string; // Joined from users table
  project_name?: string; // Joined from projects table
  project_status?: ProjectStatus; // Joined from projects table
}
export type Plan = {
  id: number;
  created_at?: string; // Add from DB
  project_id: number | null; // Match DB nullable
  user_id: number | null; // Match DB nullable
  contracted_hours: number; // Will be parsed from numeric
  internal_hours: number; // Will be parsed from numeric
  isActive: boolean | null; // Match DB nullable
  comment: string | null; // Match DB nullable
  project_start_date: string | null;
  project_end_date: string | null;
};

export type DeptAggregates = { 
  department: Department; 
  capacity: number; 
  demand: number; 
  forecast: number; 
  loadPct: number; 
  status: 'малая загрузка'|'норма'|'перегруз';
  dataQuality: number;
  dataQualityMetrics?: DataQualityMetrics; // Optional metrics
  hours_distribution?: HoursDistributionItem[];
  period_start: string;
  period_end: string;
};
export interface WeeklyLoadData {
  week: string;
  weekStart: Date;
  weekEnd: Date;
  commercial: number;
  presale: number;
  internal: number;
  capacity: number;
  demand: number;
  loadPct: number;
}
export type ProjectMember = { project_id:number; user_id:number };
export type UserVacation = { user_id:number; start_date:string; end_date:string; type:string };
export type EnhancedProjectStatus = 'active'|'planned'|'on_hold'|'backlog';
export type EnhancedProjectType = 'commercial'|'presale'|'internal';
export type EnhancedProject = { id:number; name:string; type:EnhancedProjectType; bitrix24_id:string; start_date:string; end_date:string; status:EnhancedProjectStatus; probability:number; budget_hours:number; actual_hours:number };

export type Period = 'week'|'month'|'quarter'|'halfyear'|'year';

export type Filters = {
  period:Period;  
  horizonMonths:1|2|3;
};

export interface UserExclusions {
  id?: string;
  userId: string;
  excludedDepartments: number[];
  excludedProjects: number[];
  excludedProjectStatuses: ProjectStatus[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtendedFilters extends Filters {
  selectedDepartments: number[];
  selectedProjects: number[];
  excludedDepartments: number[];
  excludedProjects: number[];
  excludedProjectStatuses: ProjectStatus[];
}

// Keep existing types and add these interfaces
export interface DepartmentData {
  id: number;
  name: string;
}

export interface ProjectData {
  id: number;
  name: string;
  status: ProjectStatus;
  project_name?: string; // For DB compatibility
  project_status?: ProjectStatus; // For DB compatibility
}

export type AlertType = 'overload'|'underload'|'empty-days'|'plan-vs-fact'|'stale'|'low-quality'; 
export type Alert = { type:AlertType; severity:1|2|3; entity:'dept'|'person'|'project'; refId:number; message:string; from:string; to:string };

export type NormPresetKey = 'linear'|'manager'|'presale_specialist';
export const normPresets: Record<NormPresetKey, { commercial:number; presale:number; internal:number }> = {
  linear: { commercial: 0.75, presale: 0.15, internal: 0.10 },
  manager: { commercial: 0.55, presale: 0.20, internal: 0.25 },
  presale_specialist: { commercial: 0.20, presale: 0.60, internal: 0.20 },
};

export type DataQualityMetrics = {
  normCoverage: number;
  timeEntryCompleteness: number;
  planCoverage: number;
  projectDataCompleteness: number;
  recentActivity: number;
};

// Dashboard metrics interfaces
export interface DashboardKpis {
  avgLoad: number;
  activeUsers: number;
  activeProjects: number;
  dataQuality: number;
}

export interface DashboardMetrics {
  deptAgg: DeptAggregates[];
  kpis: DashboardKpis;
  areaSeries: WeeklyLoadData[];
  pieData: HoursDistributionItem[];
  composedData: { dept: string; capacity: number; demand: number }[];
  scatterData: { 
    commercialShare: number; 
    load: number; 
    dept: string; 
    totalHours: number; 
    commercialHours: number 
  }[];
}

export interface HoursDistributionItem {
  type: string;
  value: number;
  color?: string;
  hours?: number;
  percentage?: number;
}