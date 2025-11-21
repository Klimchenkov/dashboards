import { User, ProductionCalendarDay } from "@/lib/dataModel";

export function calculateUserWorkingDaysInPeriod(
  user: User,
  start: Date,
  end: Date,
  productionCalendar: Map<string, ProductionCalendarDay>
): number {
  if (start > end) return 0;

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    const calendarDay = productionCalendar.get(dateKey);
    const dayOfWeek = current.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Check if user works this weekday
    const userWorksThisWeekday = user.norm?.working_days?.includes(adjustedDayOfWeek) ?? false;
    
    // Check if it's a non-working day according to production calendar
    const isNonWorkingDay = calendarDay && 
      (!calendarDay.is_workday || calendarDay.is_holiday) && 
      !(calendarDay.is_holiday && user.norm?.works_on_holidays);

    // Check if user is on vacation
    const isOnVacation = user.vacations?.some(v => {
      const vacationStart = new Date(v.start_date);
      const vacationEnd = new Date(v.end_date);
      return current >= vacationStart && current <= vacationEnd;
    });

    // Count as working day if user works this day and it's not a non-working day/vacation
    if (userWorksThisWeekday && !isNonWorkingDay && !isOnVacation) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}