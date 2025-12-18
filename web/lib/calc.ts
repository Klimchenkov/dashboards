//lib/calc.ts

import { User, TimeEntry, Project, Plan, ProductionCalendarDay, Department } from "./dataModel";
import { rangeDays } from "./date";
import { calculateUserWorkingDaysInPeriod } from "@/utils/calculateWorkingDays"
import { format, eachDayOfInterval } from "date-fns";

export function capacityHours(
  user: User, 
  start: string, 
  end: string,
  productionCalendar: Map<string, ProductionCalendarDay>
) {
  const periodStart = new Date(start);
  const periodEnd = new Date(end);
  
  if (!user.norm || !user.isActive) {
    return 0;
  }

  // Adjust start date if user was created after the period start
  let effectiveStart = periodStart;
  if (user.created_at && new Date(user.created_at) > periodStart) {
    effectiveStart = new Date(user.created_at);
  }

  // If effective start is after period end, user wasn't active
  if (effectiveStart > periodEnd) {
    return 0;
  }

  let effectiveEnd = periodEnd;
  
  const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
  let totalCapacity = 0;
  
  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const calendarDay = productionCalendar.get(dateKey);
    
    if (!calendarDay) {
      console.warn(`No production calendar data for date: ${dateKey}`);
      continue;
    }
    
    const dayOfWeek = day.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const userWorksThisWeekday = user.norm.working_days.includes(adjustedDayOfWeek);
    
    // CRITICAL FIX: Properly handle non-working days
    const isNonWorkingDay = calendarDay.is_holiday && !user.norm.works_on_holidays;
    // Check if user is on vacation
    const isOnVacation = user.vacations?.some(v => {
      const vacationStart = new Date(v.start_date);
      const vacationEnd = new Date(v.end_date);
      vacationStart.setHours(0, 0, 0, 0);
      vacationEnd.setHours(23, 59, 59, 999);
      return day >= vacationStart && day <= vacationEnd;
    }) || false;

    // Calculate capacity only for valid working days
    if (userWorksThisWeekday && !isNonWorkingDay && !isOnVacation) {
      let dailyHours = user.norm.hours_commercial + user.norm.hours_presale + user.norm.hours_internal;
      
      // Adjust for pre-holiday short days
      if (calendarDay.is_preholiday_short_day) {
        dailyHours = Math.max(0, dailyHours - 1); // Typically 1 hour less
      }
      
      totalCapacity += dailyHours;
    }
  }
  
  return totalCapacity;
}
export function demandHours(user: User, start: string, end: string, timeEntries: TimeEntry[]) {
  const s = new Date(start), e = new Date(end);
  const check = timeEntries
    .filter(t => t.user_id === user.id && new Date(t.date) >= s && new Date(t.date) <= e)

  return timeEntries
    .filter(t => t.user_id === user.id && new Date(t.date) >= s && new Date(t.date) <= e)
    .filter(t => t.project_status === 'active' || t.project_status === 'presale' || t.project_status === 'presale_archive' || t.project_status === 'archive')
    .reduce((a, b) => a + b.hours, 0);
}
export function forecastHours(
  user: User, 
  start: string, 
  end: string, 
  projects: Project[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  horizonMonths: number = 1 // Default to 1 month if not provided
) {
  const periodStart = new Date(start);
  const periodEnd = new Date(end);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // Calculate forecast horizon end date by adding horizonMonths to period end
  const forecastHorizonEnd = new Date(periodEnd);
  forecastHorizonEnd.setMonth(forecastHorizonEnd.getMonth() + horizonMonths);

  // If user has no norm or is inactive, return 0
  if (!user.norm || !user.isActive) {
    return 0;
  }

  let totalForecast = 0;

  // Get user's active plans from user object
  const userPlans = (user.plans || []).filter(p => 
    p.isActive && 
    (p.contracted_hours > 0 || p.internal_hours > 0)
  );

  // Process each plan
  for (const plan of userPlans) {
    const project = projects.find(p => p.id === plan.project_id);
    
    // Skip if project not found or not active
    if (!project || project.project_status !== 'active') continue;

    const projectStart = project.start_date ? new Date(project.start_date) : null;
    const projectEnd = project.end_date ? new Date(project.end_date) : null;

    // If project has no dates, skip it
    if (!projectStart || !projectEnd) continue;

    // Calculate total hours already worked on this project from user's time entries
    const hoursAlreadyWorked = (user.time_entries || [])
      .filter(entry => entry.project_id === plan.project_id)
      .reduce((sum, entry) => sum + entry.hours, 0);

    // Calculate remaining hours for the project
    const totalProjectHours = plan.internal_hours;
    const remainingHours = Math.max(0, totalProjectHours - hoursAlreadyWorked);

    // If no hours left, skip this project
    if (remainingHours <= 0) continue;

    // Calculate project duration in working days (from today to project end)
    const projectWorkingDays = calculateUserWorkingDaysInPeriod(
      user, 
      today, 
      projectEnd, 
      productionCalendar
    );

    if (projectWorkingDays === 0) continue;

    // Daily rate for remaining work on this project
    const dailyRate = remainingHours / projectWorkingDays;

    // Determine forecast period - from today to forecast horizon end (or project end if earlier)
    const forecastStart = new Date(Math.max(today.getTime(), periodStart.getTime()));
    const forecastEnd = new Date(Math.min(projectEnd.getTime(), forecastHorizonEnd.getTime()));

    // Skip if no overlap
    if (forecastStart > forecastEnd) continue;

    // Calculate working days in forecast period
    const forecastWorkingDays = calculateUserWorkingDaysInPeriod(
      user, 
      forecastStart, 
      forecastEnd, 
      productionCalendar
    );

    // Add forecast for this project
    totalForecast += dailyRate * forecastWorkingDays;
  }

  // Add internal hours from norm (distributed evenly across working days)
  const normInternalHours = user.norm.hours_internal;
  
  if (normInternalHours > 0) {
    // Calculate working days from today to forecast horizon end for internal work
    const forecastStart = new Date(Math.max(today.getTime(), periodStart.getTime()));
    const internalWorkingDays = calculateUserWorkingDaysInPeriod(
      user, 
      forecastStart, 
      forecastHorizonEnd, 
      productionCalendar
    );

    // Daily internal hours rate (assuming 20 working days per month)
    const dailyInternalRate = normInternalHours / 20;
    totalForecast += dailyInternalRate * internalWorkingDays;
  }

  return totalForecast;
}
export function loadPct(demand:number, capacity:number){ 
  return capacity<=0? 0 : (demand/capacity)*100; }
export function statusByLoad(pct:number){ if(pct<70) return 'малая загрузка'; if(pct>110) return 'перегруз'; return 'норма'; }


export function calculateCommercialShareScatterData(
  departments: Department[],
  timeEntries: TimeEntry[],
  projects: Project[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  periodStart: string,
  periodEnd: string
): { commercialShare: number; load: number; dept: string; totalHours: number; commercialHours: number }[] {
  
  const scatterData: { commercialShare: number; load: number; dept: string; totalHours: number; commercialHours: number }[] = [];

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  for (const department of departments) {
    try {
      const deptUsers = department.users || [];
      
      // Initialize counters - consistent with pie calculations
      let commercialHours = 0;
      let presaleHours = 0;
      let internalHours = 0;
      let otherHours = 0;
      let totalHours = 0;

      // Calculate hours for each user in the department - using same filtering as pie calculations
      for (const user of deptUsers) {
        if (!user.isActive) continue;

        // Filter time entries by period - exactly like pie calculations
        const userTimeEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= start && entryDate <= end && entry.user_id === user.id;
        });

        // Categorize hours by project status - exactly like pie calculations
        userTimeEntries.forEach(entry => {
          const project = projects.find(p => p.id === entry.project_id);
          if (!project) {
            otherHours += entry.hours;
            return;
          }

          // Use the same project_status logic as pie calculations
          switch (project.project_status) {
            case 'active':
              commercialHours += entry.hours;
              break;
            case 'presale':
              presaleHours += entry.hours;
              break;
            case 'internal':
              internalHours += entry.hours;
              break;
            default:
              otherHours += entry.hours;
          }
        });
      }

      // Calculate totals - consistent approach
      totalHours = commercialHours + presaleHours + internalHours + otherHours;

      // Calculate commercial share percentage - only commercial vs total (not including presale)
      const commercialShare = totalHours > 0 ? (commercialHours / totalHours) * 100 : 0;

      // Calculate department capacity and load using the same approach as deptAgg
      let capacity = 0;
      let demand = 0;

      for (const user of deptUsers) {
        if (!user.isActive || !user.norm) continue;

        // Calculate capacity using the same function as deptAgg - now with production calendar
        const userCapacity = capacityHours(user, periodStart, periodEnd, productionCalendar);
        capacity += userCapacity;

        // Calculate demand using the same function as deptAgg
        const userDemand = demandHours(user, periodStart, periodEnd, timeEntries);
        demand += userDemand;
      }

      const load = capacity > 0 ? (demand / capacity) * 100 : 0;

      scatterData.push({
        commercialShare,
        load,
        dept: department.name,
        totalHours,
        commercialHours
      });

    } catch (error) {
      console.warn(`Error calculating commercial share for department ${department.name}:`, error);
      // Continue with other departments
    }
  }

  return scatterData;
}
