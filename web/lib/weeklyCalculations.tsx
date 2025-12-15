import { User, TimeEntry, Project, ProductionCalendarDay, Plan } from "./dataModel";
import { capacityHours, demandHours, forecastHours } from "./calc";
import { startOfWeek, endOfWeek, format, eachWeekOfInterval, addMonths, isAfter, isBefore, eachDayOfInterval } from "date-fns";

export interface WeeklyData {
  week: string;
  weekStart: Date;
  weekEnd: Date;
  commercial: number;
  presale: number;
  internal: number;
  capacity: number;
  demand: number;
  loadPct: number;
  isForecast: boolean;
}

export function calculateWeeklyLoad(
  users: User[],
  timeEntries: TimeEntry[],
  projects: Project[],
  plans: Plan[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  periodStart: Date,
  periodEnd: Date,
  horizonMonths: number
): WeeklyData[] {
  const forecastEnd = addMonths(periodEnd, horizonMonths);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks = eachWeekOfInterval(
    { start: periodStart, end: forecastEnd },
    { weekStartsOn: 1 }
  );

  return weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekKey = `W${index + 1} (${format(weekStart, 'dd.MM')}-${format(weekEnd, 'dd.MM')})`;
    
    const isForecast = isAfter(weekStart, today);

    let totalCapacity = 0;
    let totalCommercial = 0;
    let totalPresale = 0;
    let totalInternal = 0;

    users.forEach(user => {
      if (!user.isActive) return;

      // Calculate capacity for this specific week
      const userCapacity = capacityHours(
        user,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        productionCalendar
      );
      totalCapacity += userCapacity;

      if (!isForecast) {
        // Historical data: use time entries
        const weekEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return (
            entry.user_id === user.id &&
            entryDate >= weekStart &&
            entryDate <= weekEnd
          );
        });

        weekEntries.forEach(entry => {
          const project = projects.find(p => p.id === entry.project_id);
          if (!project) return;

          // FIXED: Use project_status for categorization
          if (project.project_status === 'active') {
            totalCommercial += entry.hours;
          } else if (project.project_status === 'presale') {
            totalPresale += entry.hours;
          } else if (project.project_status === 'internal') {
            totalInternal += entry.hours;
          }
        });
      } else {
        // Forecast data: use improved forecast calculation
        const weekForecast = calculateWeeklyForecast(
          user,
          weekStart,
          weekEnd,
          projects,
          plans,
          productionCalendar,
          today
        );
        
        totalCommercial += weekForecast.commercial;
        totalPresale += weekForecast.presale;
        totalInternal += weekForecast.internal;
      }
    });

    const totalDemand = totalCommercial + totalPresale + totalInternal;
    const loadPct = totalCapacity > 0 ? (totalDemand / totalCapacity) * 100 : 0;

    return {
      week: weekKey,
      weekStart,
      weekEnd,
      commercial: Math.round(totalCommercial * 100) / 100,
      presale: Math.round(totalPresale * 100) / 100,
      internal: Math.round(totalInternal * 100) / 100,
      capacity: Math.round(totalCapacity * 100) / 100,
      demand: Math.round(totalDemand * 100) / 100,
      loadPct: Math.round(loadPct * 100) / 100,
      isForecast
    };
  });
}

function calculateWeeklyForecast(
  user: User,
  weekStart: Date,
  weekEnd: Date,
  projects: Project[],
  plans: Plan[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  today: Date
): { commercial: number; presale: number; internal: number } {
  const result = { commercial: 0, presale: 0, internal: 0 };

  if (!user.norm || !user.isActive) {
    return result;
  }

  // Get user's active plans for the forecast period
  const userPlans = plans.filter(p => 
    p.user_id === user.id && 
    p.isActive && 
    (p.contracted_hours > 0 || p.internal_hours > 0)
  );

  // Calculate user's capacity for this specific week
  const weeklyCapacity = capacityHours(
    user,
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd'),
    productionCalendar
  );

  // If no specific plans, distribute norm hours
  if (userPlans.length === 0) {
    const workingDays = calculateUserWorkingDaysInPeriod(user, weekStart, weekEnd, productionCalendar);
    const dailyRate = user.norm.hours_commercial + user.norm.hours_presale + user.norm.hours_internal;
    
    result.commercial = (user.norm.hours_commercial / dailyRate) * dailyRate * workingDays;
    result.presale = (user.norm.hours_presale / dailyRate) * dailyRate * workingDays;
    result.internal = (user.norm.hours_internal / dailyRate) * dailyRate * workingDays;
    return result;
  }

  // Process each active plan
  userPlans.forEach(plan => {
    const project = projects.find(p => p.id === plan.project_id);
    if (!project) return;

    // Check if project is active during this forecast week
    const projectStart = project.start_date ? new Date(project.start_date) : null;
    const projectEnd = project.end_date ? new Date(project.end_date) : null;

    if (!projectStart || !projectEnd) return;

    // Skip if project doesn't overlap with forecast week
    if (projectEnd < weekStart || projectStart > weekEnd) return;

    // Calculate actual overlap period
    const forecastStart = projectStart < weekStart ? weekStart : projectStart;
    const forecastEnd = projectEnd > weekEnd ? weekEnd : projectEnd;

    if (forecastStart > forecastEnd) return;

    // Calculate working days in the overlap period
    const overlapWorkingDays = calculateUserWorkingDaysInPeriod(
      user,
      forecastStart,
      forecastEnd,
      productionCalendar
    );

    if (overlapWorkingDays === 0) return;

    // Calculate total project working days
    const totalProjectWorkingDays = calculateUserWorkingDaysInPeriod(
      user,
      projectStart > today ? projectStart : today, // Start from today or project start
      projectEnd,
      productionCalendar
    );

    if (totalProjectWorkingDays === 0) return;

    // Calculate hours already worked (from time entries)
    const hoursWorked = (user.time_entries || [])
      .filter(entry => entry.project_id === plan.project_id)
      .reduce((sum, entry) => sum + entry.hours, 0);

    const remainingHours = Math.max(0, (plan.internal_hours) - hoursWorked);

    // Allocate hours based on overlap
    const allocatedHours = (remainingHours / totalProjectWorkingDays) * overlapWorkingDays;

    // Distribute based on project type - FIXED LOGIC
    if (project.project_status === 'active') {
      // Commercial project: contracted hours are commercial, internal hours are internal
      const totalPlanHours = plan.internal_hours;
      if (totalPlanHours > 0) {
        result.commercial += (plan.contracted_hours / totalPlanHours) * allocatedHours;
        result.internal += (plan.internal_hours / totalPlanHours) * allocatedHours;
      }
    } else if (project.project_status === 'presale') {
      // Presale project: contracted hours are presale, internal hours are internal
      const totalPlanHours = plan.internal_hours;
      if (totalPlanHours > 0) {
        result.presale += (plan.contracted_hours / totalPlanHours) * allocatedHours;
        result.internal += (plan.internal_hours / totalPlanHours) * allocatedHours;
      }
    } else if (project.project_status === 'internal') {
      // Internal project: all hours go to internal
      result.internal += allocatedHours;
    }
  });

  // Cap forecast at weekly capacity to avoid unrealistic numbers
  const totalForecast = result.commercial + result.presale + result.internal;
  if (totalForecast > weeklyCapacity) {
    const ratio = weeklyCapacity / totalForecast;
    result.commercial *= ratio;
    result.presale *= ratio;
    result.internal *= ratio;
  }

  return result;
}

// Improved working days calculation
function calculateUserWorkingDaysInPeriod(
  user: User,
  start: Date,
  end: Date,
  productionCalendar: Map<string, ProductionCalendarDay>
): number {
  if (!user.norm) return 0;

  let workingDays = 0;
  const days = eachDayOfInterval({ start, end });

  days.forEach(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const calendarDay = productionCalendar.get(dateKey);
    
    const dayOfWeek = day.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    // Check if user works this weekday
    const userWorksThisWeekday = user.norm!.working_days.includes(adjustedDayOfWeek);
    
    // Check if it's a working day according to production calendar
    const isWorkingDay = calendarDay ? 
      (calendarDay.is_workday && !calendarDay.is_holiday) || 
      (calendarDay.is_holiday && user.norm!.works_on_holidays) :
      userWorksThisWeekday; // If no calendar data, use user's weekday preference
    
    // Check if user is on vacation
    const isOnVacation = user.vacations?.some(v => {
      const vacationStart = new Date(v.start_date);
      const vacationEnd = new Date(v.end_date);
      return day >= vacationStart && day <= vacationEnd;
    });

    if (userWorksThisWeekday && isWorkingDay && !isOnVacation) {
      workingDays++;
    }
  });

  return workingDays;
}