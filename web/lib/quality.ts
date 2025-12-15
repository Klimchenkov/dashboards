// lib/quality.ts - Add these functions
import { User, Department, TimeEntry, Project, Plan, ProductionCalendarDay, DataQualityMetrics } from "./dataModel";
import { calculateUserWorkingDaysInPeriod } from "@/utils/calculateWorkingDays"


export function dataQualityScore(
  department: Department,
  users: User[],
  projects: Project[],
  timeEntries: TimeEntry[],
  plans: Plan[],
  periodStart: string,
  periodEnd: string,
  productionCalendar: Map<string, ProductionCalendarDay>
): { score: number; metrics: DataQualityMetrics } {
  const deptUsers = department.users || [];
  const activeUsers = deptUsers.filter(u => u.isActive);
  
  if (activeUsers.length === 0) {
    return {
      score: 0,
      metrics: {
        normCoverage: 0,
        timeEntryCompleteness: 0,
        planCoverage: 0,
        projectDataCompleteness: 0,
        recentActivity: 0
      }
    };
  }

  const metrics = {
    // 1. User norm coverage - critical for capacity calculations
    normCoverage: calculateNormCoverage(activeUsers),
    
    // 2. Time entry completeness - are people logging their time?
    timeEntryCompleteness: calculateTimeEntryCompleteness(activeUsers, timeEntries, periodStart, periodEnd, productionCalendar),
    
    // 3. Plan coverage - are projects properly planned?
    planCoverage: calculatePlanCoverage(activeUsers, projects, plans),
    
    // 4. Project data completeness - do projects have essential data?
    projectDataCompleteness: calculateProjectDataCompleteness(projects),
    
    // 5. Recent activity - are time entries up to date?
    recentActivity: calculateRecentActivity(timeEntries, periodStart)
  };

  // Weighted average - adjust weights based on importance
  const weights = {
    normCoverage: 0.3,      // Most important - affects capacity
    timeEntryCompleteness: 0.25, // Critical for demand accuracy
    planCoverage: 0.2,      // Important for forecasting
    projectDataCompleteness: 0.15, // Affects project planning
    recentActivity: 0.1     // Indicates data freshness
  };

  const score = (
    metrics.normCoverage * weights.normCoverage +
    metrics.timeEntryCompleteness * weights.timeEntryCompleteness +
    metrics.planCoverage * weights.planCoverage +
    metrics.projectDataCompleteness * weights.projectDataCompleteness +
    metrics.recentActivity * weights.recentActivity
  );
  
  return {
    score,
    metrics: {
      normCoverage: metrics.normCoverage,
      timeEntryCompleteness: metrics.timeEntryCompleteness,
      planCoverage: metrics.planCoverage,
      projectDataCompleteness: metrics.projectDataCompleteness,
      recentActivity: metrics.recentActivity,
    }
  };
}

// Individual metric calculations
function calculateNormCoverage(users: User[]): number {
  const usersWithNorms = users.filter(user => 
    user.norm && 
    user.norm.hours_commercial + user.norm.hours_presale + user.norm.hours_internal > 0
  ).length;
  
  return users.length > 0 ? usersWithNorms / users.length : 0;
}

function calculateTimeEntryCompleteness(
  users: User[], 
  timeEntries: TimeEntry[], 
  periodStart: string, 
  periodEnd: string,
  productionCalendar: Map<string, ProductionCalendarDay>
): number {
  let totalExpectedDays = 0;
  let totalLoggedDays = 0;

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const today = new Date();

  for (const user of users) {
    if (!user.norm) continue;

    // Calculate working days for this user in period
    const userWorkingDays = calculateUserWorkingDaysInPeriod(user, start, end, productionCalendar);
    totalExpectedDays += userWorkingDays;

    // Count days with time entries for this user
    const userEntries = timeEntries.filter(te => te.user_id === user.id);
    const uniqueDaysWithEntries = new Set(
      userEntries.filter(te => {
        const entryDate = new Date(te.date);
        return entryDate >= start && entryDate <= end;
      }).map(te => te.date)
    ).size;

    totalLoggedDays += Math.min(uniqueDaysWithEntries, userWorkingDays); // Cap at working days
  }

  return totalExpectedDays > 0 ? totalLoggedDays / totalExpectedDays : 0;
}

function calculatePlanCoverage(users: User[], projects: Project[], plans: Plan[]): number {
  const activeProjects = projects.filter(p => p.isActive);
  
  if (activeProjects.length === 0) return 0;

  // Projects with at least one plan
  const projectsWithPlans = activeProjects.filter(project => 
    plans.some(plan => plan.project_id === project.id && plan.isActive)
  ).length;

  // Users with at least one plan
  const usersWithPlans = users.filter(user =>
    plans.some(plan => plan.user_id === user.id && plan.isActive)
  ).length;

  // Combined score (projects and users with plans)
  const projectCoverage = projectsWithPlans / activeProjects.length;
  const userCoverage = users.length > 0 ? usersWithPlans / users.length : 0;

  return (projectCoverage + userCoverage) / 2;
}

function calculateProjectDataCompleteness(projects: Project[]): number {
  const activeProjects = projects.filter(p => p.isActive);
  
  if (activeProjects.length === 0) return 0;

  const scores = activeProjects.map(project => {
    let score = 0;
    let totalCriteria = 0;

    // Check for project name
    if (project.project_name && project.project_name.trim().length > 0) {
      score += 1;
    }
    totalCriteria += 1;

    // Check for dates
    if (project.start_date) score += 1;
    if (project.end_date) score += 1;
    totalCriteria += 2;

    // Check for type
    if (project.type) score += 1;
    totalCriteria += 1;

    return score / totalCriteria;
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function calculateRecentActivity(timeEntries: TimeEntry[], periodStart: string): number {
  const startDate = new Date(periodStart);
  const now = new Date();
  const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysInPeriod <= 0) return 0;

  // Count days with at least one time entry in the current period
  const daysWithEntries = new Set(
    timeEntries
      .filter(te => {
        const entryDate = new Date(te.date);
        return entryDate >= startDate && entryDate <= now;
      })
      .map(te => te.date)
  ).size;

  return Math.min(daysWithEntries / daysInPeriod, 1);
}
