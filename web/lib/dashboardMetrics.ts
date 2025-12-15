// lib/dashboardMetrics.ts
import {
  User,
  Department,
  TimeEntry,
  Plan,
  ProductionCalendarDay,
  DeptAggregates,
  WeeklyLoadData,
  HoursDistributionItem
} from "@/lib/dataModel";
import {
  capacityHours,
  demandHours,
  forecastHours,
  loadPct,
  statusByLoad,
  calculateCommercialShareScatterData,
} from "@/lib/calc";
import { dataQualityScore } from "@/lib/quality";
import { calculateWeeklyLoad } from "@/lib/weeklyCalculations";
import { calculateHoursDistribution  } from "@/lib/pieCalculations";
import { startOfPeriod, endOfPeriod, fmt } from "@/lib/date";

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
  scatterData: { commercialShare: number; load: number }[];
}

export function computeDeptAgg(
  departments: Department[],
  timeEntries: TimeEntry[],
  projects: any[],
  plans: Plan[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  periodStart: string,
  periodEnd: string,
  horizonMonths: number
): DeptAggregates[] {
  const out: DeptAggregates[] = [];

  // Handle empty data
  if (!departments || departments.length === 0) {
    return out;
  }

  for (const d of departments) {
    try {
      const deptUsers = d.users ?? [];
      let cap = 0, dem = 0, fc = 0;
      
      // Инициализируем суммарное распределение часов для отдела
      const deptHoursDistribution = {
        commercial: 0,
        presale: 0,
        internal: 0,
        other: 0
      };

      for (const u of deptUsers) {
        try {
          // Вычисляем распределение часов для пользователя
          u.hours_distribution = calculateHoursDistribution(u.time_entries, projects, periodStart, periodEnd);
          
          // Суммируем распределение часов в отделе
          if (u.hours_distribution) {
            u.hours_distribution.forEach(item => {
              switch (item.type) {
                case 'commercial':
                  deptHoursDistribution.commercial += item.hours || 0;
                  break;
                case 'presale':
                  deptHoursDistribution.presale += item.hours || 0;
                  break;
                case 'internal':
                  deptHoursDistribution.internal += item.hours || 0;
                  break;
                case 'other':
                  deptHoursDistribution.other += item.hours || 0;
                  break;
              }
            });
          }

          u.capacity_hours = capacityHours(u, periodStart, periodEnd, productionCalendar);
          cap += u.capacity_hours;
          u.demand_hours = demandHours(u, periodStart, periodEnd, timeEntries);
          dem += u.demand_hours;
          u.forecast_hours = forecastHours(u, periodStart, periodEnd, projects, productionCalendar, horizonMonths);
          fc += u.forecast_hours;
        } catch (userError) {
          console.warn(`Error processing user ${u.id}:`, userError);
          // Continue with other users
        }
      }

      const load = loadPct(dem, cap);
      const status = statusByLoad(load);
      
      const qualityResult = dataQualityScore(
        d,
        deptUsers,
        projects,
        timeEntries,
        plans,
        periodStart,
        periodEnd,
        productionCalendar
      );

      // Преобразуем суммарное распределение в формат HoursDistributionItem[]
      const totalDeptHours = deptHoursDistribution.commercial + deptHoursDistribution.presale + 
                            deptHoursDistribution.internal + deptHoursDistribution.other;
      
      const deptDistribution: HoursDistributionItem[] = [];
      
      if (deptHoursDistribution.commercial > 0) {
        deptDistribution.push({
          type: 'commercial',
          value: totalDeptHours > 0 ? (deptHoursDistribution.commercial / totalDeptHours) * 100 : 0,
          hours: deptHoursDistribution.commercial,
          percentage: totalDeptHours > 0 ? (deptHoursDistribution.commercial / totalDeptHours) * 100 : 0
        });
      }
      
      if (deptHoursDistribution.presale > 0) {
        deptDistribution.push({
          type: 'presale',
          value: totalDeptHours > 0 ? (deptHoursDistribution.presale / totalDeptHours) * 100 : 0,
          hours: deptHoursDistribution.presale,
          percentage: totalDeptHours > 0 ? (deptHoursDistribution.presale / totalDeptHours) * 100 : 0
        });
      }
      
      if (deptHoursDistribution.internal > 0) {
        deptDistribution.push({
          type: 'internal',
          value: totalDeptHours > 0 ? (deptHoursDistribution.internal / totalDeptHours) * 100 : 0,
          hours: deptHoursDistribution.internal,
          percentage: totalDeptHours > 0 ? (deptHoursDistribution.internal / totalDeptHours) * 100 : 0
        });
      }
      
      if (deptHoursDistribution.other > 0) {
        deptDistribution.push({
          type: 'other',
          value: totalDeptHours > 0 ? (deptHoursDistribution.other / totalDeptHours) * 100 : 0,
          hours: deptHoursDistribution.other,
          percentage: totalDeptHours > 0 ? (deptHoursDistribution.other / totalDeptHours) * 100 : 0
        });
      }

      out.push({
        department: d,
        capacity: cap,
        demand: dem,
        forecast: fc,
        loadPct: load,
        status,
        dataQuality: qualityResult.score,
        dataQualityMetrics: qualityResult.metrics,
        hours_distribution: deptDistribution, // Добавляем распределение часов для отдела
        period_start: periodStart,
        period_end: periodEnd,
      });
    } catch (deptError) {
      console.warn(`Error processing department ${d.id}:`, deptError);
      // Continue with other departments
    }
  }

  return out;
}

export function computeKpis(
  deptAgg: DeptAggregates[],
  users: User[],
  projects: any[]
): DashboardKpis {
  if (!deptAgg || deptAgg.length === 0) {
    return { avgLoad: 0, activeUsers: 0, activeProjects: 0, dataQuality: 0 };
  }

  const avgLoad =
    deptAgg.reduce((s, d) => s + d.loadPct, 0) / (deptAgg.length || 1);
  const dq =
    deptAgg.reduce((s, d) => s + d.dataQuality, 0) / (deptAgg.length || 1);

  const activeUsers = (users || []).filter((u) => u.isActive).length;
  const activeProjects = (projects || []).filter((p) => p.isActive).length;

  return { avgLoad, activeUsers, activeProjects, dataQuality: dq };
}

export function computeMetrics(
  users: User[],
  projects: any[],
  departments: Department[],
  timeEntries: TimeEntry[],
  plans: Plan[],
  productionCalendar: Map<string, ProductionCalendarDay>,
  period: any,
  horizonMonths: number
): DashboardMetrics {
  try {
    const periodStartDate = startOfPeriod(period);
    const periodEndDate = endOfPeriod(period);
    const periodStart = fmt(periodStartDate);
    const periodEnd = fmt(periodEndDate);

    // Ensure we have valid data
    const safeUsers = users || [];
    const safeProjects = projects || [];
    const safeDepartments = departments || [];
    const safeTimeEntries = timeEntries || [];
    const safePlans = plans || [];

    console.log('🧮 Starting metrics computation with:', {
      users: safeUsers.length,
      projects: safeProjects.length,
      departments: safeDepartments.length,
      timeEntries: safeTimeEntries.length,
      plans: safePlans.length,
      productionCalendar: productionCalendar?.size || 0
    });

    const deptAgg = computeDeptAgg(
      safeDepartments,
      safeTimeEntries,
      safeProjects,
      safePlans,
      productionCalendar,
      periodStart,
      periodEnd,
      horizonMonths
    );

    const kpis = computeKpis(deptAgg, safeUsers, safeProjects);

    let areaSeries: WeeklyLoadData[] = [];
    try {
      areaSeries = calculateWeeklyLoad(
        safeUsers,
        safeTimeEntries,
        safeProjects,
        safePlans,
        productionCalendar,
        periodStartDate,
        periodEndDate,
        horizonMonths
      );
    } catch (areaError) {
      console.warn('Error calculating area series:', areaError);
    }

    let pieData: HoursDistributionItem[] = [];
    try {
      pieData = calculateHoursDistribution(
        safeTimeEntries,
        safeProjects,
        periodStart,
        periodEnd
      );
    } catch (pieError) {
      console.warn('Error calculating pie data:', pieError);
    }

    const composedData = deptAgg.map((d) => ({
      dept: d.department.name,
      capacity: Math.round(d.capacity),
      demand: Math.round(d.demand),
    }));

    // still mock, but now deterministic if you want (you can remove random)
    const scatterData = calculateCommercialShareScatterData(
      safeDepartments,
      safeTimeEntries,
      safeProjects,
      productionCalendar,
      periodStart,
      periodEnd
    );

    console.log('✅ Metrics computation completed:', {
      deptAgg: deptAgg.length,
      kpis,
      areaSeries: areaSeries.length,
      pieData: pieData.length,
      composedData: composedData.length,
      scatterData: scatterData.length
    });

    return {
      deptAgg,
      kpis,
      areaSeries,
      pieData,
      composedData,
      scatterData,
    };
  } catch (error) {
    console.error('❌ Error in computeMetrics:', error);
    // Return empty metrics structure
    return {
      deptAgg: [],
      kpis: { avgLoad: 0, activeUsers: 0, activeProjects: 0, dataQuality: 0 },
      areaSeries: [],
      pieData: [],
      composedData: [],
      scatterData: []
    };
  }
}