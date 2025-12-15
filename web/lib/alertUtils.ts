// lib/alertUtils.ts
import { User, Department, Project, TimeEntry, DeptAggregates, DashboardMetrics, UserNorm, Vacation } from './dataModel';
import { Alert, AlertSeverity, AlertCategory, AlertStats } from './alertTypes';
import { ALERT_THRESHOLDS } from './alertConstants';
import { format, subDays, isAfter, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export class AlertGenerator {
  static generateAlerts(
    users: User[],
    departments: Department[],
    projects: Project[],
    timeEntries: TimeEntry[],
    metrics: DashboardMetrics,
    periodStart: string,
    periodEnd: string,
    horizonMonth: number = 1
  ): Alert[] {
    const alerts: Alert[] = [];
    
    // Генерируем алерты для отделов
    alerts.push(...this.generateDepartmentAlerts(departments, metrics, periodStart, periodEnd));
    
    // Генерируем алерты для пользователей (включая те, что были в PersonView)
    alerts.push(...this.generateUserAlerts(users, timeEntries, projects, periodStart, periodEnd, horizonMonth));
    
    // Генерируем алерты для проектов (включая те, что были в ProjectDetailView)
    alerts.push(...this.generateProjectAlerts(projects, timeEntries, periodStart, periodEnd));
    
    // Генерируем алерты качества данных
    alerts.push(...this.generateDataQualityAlerts(users, departments, timeEntries, periodStart, periodEnd));
    
    return this.deduplicateAlerts(alerts);
  }

  private static generateUserAlerts(
    users: User[],
    timeEntries: TimeEntry[],
    projects: Project[],
    periodStart: string,
    periodEnd: string,
    horizonMonth: number
  ): Alert[] {
    const alerts: Alert[] = [];
    const startDate = parseISO(periodStart);
    const endDate = parseISO(periodEnd);

    for (const user of users) {
      if (!user.isActive) continue;

      // Фильтруем таймшиты пользователя за период
      const userEntries = timeEntries.filter(te => 
        te.user_id === user.id && 
        isWithinInterval(parseISO(te.date), { start: startDate, end: endDate })
      );

      // Проверка загрузки (аналогично PersonView)
      const loadPct = user.capacity_hours && user.capacity_hours > 0 
        ? (user.demand_hours / user.capacity_hours) * 100 
        : 0;

      if (loadPct > ALERT_THRESHOLDS.CRITICAL_OVERLOAD_PCT) {
        alerts.push({
          id: `user-overload-${user.id}-${periodStart}`,
          severity: 'critical',
          category: 'load',
          title: 'Критическая перегрузка сотрудника',
          description: `Сотрудник "${user.name}" перегружен на ${Math.round(loadPct)}% при пороге ${ALERT_THRESHOLDS.CRITICAL_OVERLOAD_PCT}%`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: loadPct,
          threshold: ALERT_THRESHOLDS.CRITICAL_OVERLOAD_PCT,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      } else if (loadPct > ALERT_THRESHOLDS.OVERLOAD_PCT) {
        alerts.push({
          id: `user-warning-overload-${user.id}-${periodStart}`,
          severity: 'warning',
          category: 'load',
          title: 'Перегрузка сотрудника',
          description: `Сотрудник "${user.name}" перегружен на ${Math.round(loadPct)}%`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: loadPct,
          threshold: ALERT_THRESHOLDS.OVERLOAD_PCT,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка недогрузки
      if (loadPct < ALERT_THRESHOLDS.UNDERLOAD_PCT && user.demand_hours > 0) {
        alerts.push({
          id: `user-underload-${user.id}-${periodStart}`,
          severity: 'warning',
          category: 'load',
          title: 'Недогрузка сотрудника',
          description: `Сотрудник "${user.name}" загружен только на ${Math.round(loadPct)}%`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: loadPct,
          threshold: ALERT_THRESHOLDS.UNDERLOAD_PCT,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка соответствия нормам (упрощенная версия из PersonView)
      const normAnalysis = this.calculateUserNormAnalysis(user, userEntries, projects, periodStart, periodEnd);
      if (normAnalysis && normAnalysis.totalCompliance < ALERT_THRESHOLDS.NORM_COMPLIANCE_CRITICAL) {
        alerts.push({
          id: `user-norm-critical-${user.id}-${periodStart}`,
          severity: 'critical',
          category: 'norms',
          title: 'Критическое несоответствие нормам',
          description: `Сотрудник "${user.name}" имеет соответствие нормам всего ${Math.round(normAnalysis.totalCompliance)}%`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: normAnalysis.totalCompliance,
          threshold: ALERT_THRESHOLDS.NORM_COMPLIANCE_CRITICAL,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      } else if (normAnalysis && normAnalysis.totalCompliance < ALERT_THRESHOLDS.NORM_COMPLIANCE_WARNING) {
        alerts.push({
          id: `user-norm-warning-${user.id}-${periodStart}`,
          severity: 'warning',
          category: 'norms',
          title: 'Низкое соответствие нормам',
          description: `Сотрудник "${user.name}" имеет соответствие нормам ${Math.round(normAnalysis.totalCompliance)}%`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: normAnalysis.totalCompliance,
          threshold: ALERT_THRESHOLDS.NORM_COMPLIANCE_WARNING,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка отпусков (активные отпуска в периоде)
      const activeVacations = this.getActiveVacationsInPeriod(user.vacations || [], periodStart, periodEnd);
      if (activeVacations.length > 0) {
        const vacationInfo = activeVacations.map(v => 
          `${format(parseISO(v.start_date), 'dd.MM.yyyy')} - ${format(parseISO(v.end_date), 'dd.MM.yyyy')}`
        ).join('; ');
        
        alerts.push({
          id: `user-vacation-${user.id}-${periodStart}`,
          severity: 'info',
          category: 'vacation',
          title: 'Активный отпуск сотрудника',
          description: `Сотрудник "${user.name}" в отпуске: ${vacationInfo}`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка проектов без дат (из планов пользователя)
      const plansWithoutDates = user.plans?.filter(plan => 
        plan.isActive && !plan.project_start_date && !plan.project_end_date
      ) || [];
      
      if (plansWithoutDates.length > 0) {
        alerts.push({
          id: `user-no-dates-${user.id}-${periodStart}`,
          severity: 'warning',
          category: 'data_quality',
          title: 'Проекты без указания дат',
          description: `У сотрудника "${user.name}" ${plansWithoutDates.length} проектов без указания дат начала и окончания`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: plansWithoutDates.length,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка прогноза перегрузки (упрощенная версия)
      const forecastData = this.calculateUserForecast(user, timeEntries, periodStart, periodEnd, horizonMonth);
      if (forecastData && forecastData.isOverloaded) {
        alerts.push({
          id: `user-forecast-overload-${user.id}-${periodStart}`,
          severity: 'critical',
          category: 'forecast',
          title: `Прогноз перегрузки на ${horizonMonth} мес.`,
          description: `Сотрудник "${user.name}" будет перегружен на ${Math.round(forecastData.overloadPercentage)}%. Запланировано ${Math.round(forecastData.futurePlannedHours)}ч при емкости ${Math.round(forecastData.remainingCapacity)}ч`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: forecastData.utilizationRate,
          threshold: ALERT_THRESHOLDS.FORECAST_OVERLOAD,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка дней без таймшитов
      const emptyDays = this.findConsecutiveEmptyDays(userEntries, startDate, endDate);
      if (emptyDays >= ALERT_THRESHOLDS.MAX_CONSECUTIVE_EMPTY_DAYS) {
        alerts.push({
          id: `user-empty-days-${user.id}-${periodStart}`,
          severity: emptyDays > 5 ? 'critical' : 'warning',
          category: 'data_quality',
          title: `Дни без таймшитов (${emptyDays} дн.)`,
          description: `Сотрудник "${user.name}" не заполнял таймшиты ${emptyDays} дней подряд`,
          entityType: 'user',
          entityId: user.id,
          entityName: user.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: emptyDays,
          threshold: ALERT_THRESHOLDS.MAX_CONSECUTIVE_EMPTY_DAYS,
          createdAt: new Date().toISOString(),
          source: 'person',
          resolved: false // ДОБАВЛЕНО
        });
      }
    }

    return alerts;
  }

  private static generateProjectAlerts(
    projects: Project[],
    timeEntries: TimeEntry[],
    periodStart: string,
    periodEnd: string
  ): Alert[] {
    const alerts: Alert[] = [];
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    for (const project of projects) {
      if (!project.isActive) continue;

      const projectEntries = timeEntries.filter(te => te.project_id === project.id);
      const projectMetrics = this.calculateProjectMetrics(project, projectEntries);

      // Проекты без дат
      if (!project.start_date && !project.end_date) {
        alerts.push({
          id: `project-no-dates-${project.id}`,
          severity: 'critical',
          category: 'data_quality',
          title: 'Проект без дат начала и окончания',
          description: `Проект "${project.project_name}" не имеет установленных дат начала и окончания`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      } else if (!project.start_date) {
        alerts.push({
          id: `project-no-start-${project.id}`,
          severity: 'warning',
          category: 'data_quality',
          title: 'Проект без даты начала',
          description: `Проект "${project.project_name}" не имеет даты начала`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      } else if (!project.end_date) {
        alerts.push({
          id: `project-no-end-${project.id}`,
          severity: 'warning',
          category: 'data_quality',
          title: 'Проект без даты окончания',
          description: `Проект "${project.project_name}" не имеет даты окончания`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проекты без планов
      if (!project.plans || project.plans.length === 0) {
        alerts.push({
          id: `project-no-plans-${project.id}`,
          severity: 'critical',
          category: 'project',
          title: 'Проект без плановых часов',
          description: `Проект "${project.project_name}" не имеет плановых часов`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Просроченные проекты
      if (project.end_date && parseISO(project.end_date) < today) {
        if (projectMetrics.remainingHours > 0) {
          alerts.push({
            id: `project-past-due-${project.id}`,
            severity: 'critical',
            category: 'project',
            title: 'Проект просрочен',
            description: `Проект "${project.project_name}" просрочен! Осталось ${Math.round(projectMetrics.remainingHours)} часов`,
            entityType: 'project',
            entityId: project.id,
            entityName: project.project_name || 'Без названия',
            period: project.end_date,
            metricValue: projectMetrics.remainingHours,
            createdAt: new Date().toISOString(),
            source: 'project',
            resolved: false // ДОБАВЛЕНО
          });
        }
      }

      // Высокий burn rate при близком дедлайне
      if (project.end_date && projectMetrics.remainingDays && projectMetrics.remainingDays < 7 && projectMetrics.burnRate < ALERT_THRESHOLDS.BURN_RATE_LOW) {
        alerts.push({
          id: `project-burn-rate-${project.id}`,
          severity: 'critical',
          category: 'project',
          title: 'Высокий риск срыва сроков',
          description: `Проект "${project.project_name}": до конца ${projectMetrics.remainingDays} дней, выполнено только ${Math.round(projectMetrics.completionPercentage)}%`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          period: project.end_date,
          metricValue: projectMetrics.burnRate,
          threshold: ALERT_THRESHOLDS.BURN_RATE_LOW,
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Большое отклонение плана от факта
      if (Math.abs(projectMetrics.delta) > ALERT_THRESHOLDS.DELTA_CRITICAL) {
        alerts.push({
          id: `project-delta-critical-${project.id}`,
          severity: 'critical',
          category: 'project',
          title: 'Критическое отклонение от плана',
          description: `Проект "${project.project_name}" имеет отклонение ${Math.round(projectMetrics.delta * 100)}% от плана`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          period: `${periodStart} - ${periodEnd}`,
          metricValue: projectMetrics.delta,
          threshold: ALERT_THRESHOLDS.DELTA_CRITICAL,
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      } else if (Math.abs(projectMetrics.delta) > ALERT_THRESHOLDS.DELTA_WARNING) {
        alerts.push({
          id: `project-delta-warning-${project.id}`,
          severity: 'warning',
          category: 'project',
          title: 'Значительное отклонение от плана',
          description: `Проект "${project.project_name}" имеет отклонение ${Math.round(projectMetrics.delta * 100)}% от плана`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          period: `${periodStart} - ${periodEnd}`,
          metricValue: projectMetrics.delta,
          threshold: ALERT_THRESHOLDS.DELTA_WARNING,
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Низкое качество данных проекта
      const dataQuality = this.calculateProjectDataQuality(project, projectMetrics);
      if (dataQuality < ALERT_THRESHOLDS.CRITICAL_DATA_QUALITY * 100) {
        alerts.push({
          id: `project-data-quality-${project.id}`,
          severity: 'warning',
          category: 'data_quality',
          title: 'Низкое качество данных проекта',
          description: `Качество данных проекта "${project.project_name}" всего ${Math.round(dataQuality)}%`,
          entityType: 'project',
          entityId: project.id,
          entityName: project.project_name || 'Без названия',
          period: `${periodStart} - ${periodEnd}`,
          metricValue: dataQuality,
          threshold: ALERT_THRESHOLDS.CRITICAL_DATA_QUALITY * 100,
          createdAt: new Date().toISOString(),
          source: 'project',
          resolved: false // ДОБАВЛЕНО
        });
      }
    }

    return alerts;
  }

  private static generateDepartmentAlerts(
    departments: Department[],
    metrics: DashboardMetrics,
    periodStart: string,
    periodEnd: string
  ): Alert[] {
    const alerts: Alert[] = [];
    
    // Пример алертов для отделов (добавьте реальную логику)
    for (const department of departments) {
      // Проверка перегруженности отдела
      const deptLoad = this.calculateDepartmentLoad(department, metrics);
      if (deptLoad > ALERT_THRESHOLDS.CRITICAL_OVERLOAD_PCT) {
        alerts.push({
          id: `dept-overload-${department.id}-${periodStart}`,
          severity: 'critical',
          category: 'load',
          title: 'Критическая перегрузка отдела',
          description: `Отдел "${department.name}" перегружен на ${Math.round(deptLoad)}%`,
          entityType: 'department',
          entityId: department.id,
          entityName: department.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: deptLoad,
          threshold: ALERT_THRESHOLDS.CRITICAL_OVERLOAD_PCT,
          createdAt: new Date().toISOString(),
          source: 'system',
          resolved: false // ДОБАВЛЕНО
        });
      }

      // Проверка качества данных отдела
      const deptDataQuality = this.calculateDepartmentDataQuality(department);
      if (deptDataQuality < ALERT_THRESHOLDS.CRITICAL_DATA_QUALITY * 100) {
        alerts.push({
          id: `dept-data-quality-${department.id}-${periodStart}`,
          severity: 'warning',
          category: 'data_quality',
          title: 'Низкое качество данных отдела',
          description: `Качество данных отдела "${department.name}" всего ${Math.round(deptDataQuality)}%`,
          entityType: 'department',
          entityId: department.id,
          entityName: department.name,
          period: `${periodStart} - ${periodEnd}`,
          metricValue: deptDataQuality,
          threshold: ALERT_THRESHOLDS.CRITICAL_DATA_QUALITY * 100,
          createdAt: new Date().toISOString(),
          source: 'system',
          resolved: false // ДОБАВЛЕНО
        });
      }
    }

    return alerts;
  }

  private static generateDataQualityAlerts(
    users: User[],
    departments: Department[],
    timeEntries: TimeEntry[],
    periodStart: string,
    periodEnd: string
  ): Alert[] {
    const alerts: Alert[] = [];
    
    // Проверка пользователей без норм
    const usersWithoutNorms = users.filter(user => user.isActive && !user.norm);
    if (usersWithoutNorms.length > 0) {
      alerts.push({
        id: `data-quality-no-norms-${periodStart}`,
        severity: 'warning',
        category: 'data_quality',
        title: 'Пользователи без установленных норм',
        description: `${usersWithoutNorms.length} активных пользователей не имеют установленных норм рабочего времени`,
        entityType: 'system',
        entityId: 'system',
        entityName: 'Система',
        period: `${periodStart} - ${periodEnd}`,
        metricValue: usersWithoutNorms.length,
        createdAt: new Date().toISOString(),
        source: 'system',
        resolved: false // ДОБАВЛЕНО
      });
    }

    // Проверка отделов без пользователей
    const emptyDepartments = departments.filter(dept => 
      !dept.users || dept.users.length === 0 || !dept.users.some((user: any) => user.isActive)
    );
    if (emptyDepartments.length > 0) {
      alerts.push({
        id: `data-quality-empty-depts-${periodStart}`,
        severity: 'warning',
        category: 'data_quality',
        title: 'Пустые отделы',
        description: `${emptyDepartments.length} отделов не содержат активных пользователей`,
        entityType: 'system',
        entityId: 'system',
        entityName: 'Система',
        period: `${periodStart} - ${periodEnd}`,
        metricValue: emptyDepartments.length,
        createdAt: new Date().toISOString(),
        source: 'system',
        resolved: false // ДОБАВЛЕНО
      });
    }

    // Проверка таймшитов с нулевыми часами
    const zeroHourEntries = timeEntries.filter(entry => entry.hours === 0);
    if (zeroHourEntries.length > 10) { // Порог для предупреждения
      alerts.push({
        id: `data-quality-zero-hours-${periodStart}`,
        severity: 'info',
        category: 'data_quality',
        title: 'Таймшиты с нулевыми часами',
        description: `Обнаружено ${zeroHourEntries.length} таймшитов с нулевым количеством часов`,
        entityType: 'system',
        entityId: 'system',
        entityName: 'Система',
        period: `${periodStart} - ${periodEnd}`,
        metricValue: zeroHourEntries.length,
        createdAt: new Date().toISOString(),
        source: 'system',
        resolved: false // ДОБАВЛЕНО
      });
    }

    return alerts;
  }

  // Вспомогательные методы для расчетов
  private static calculateUserNormAnalysis(user: User, timeEntries: TimeEntry[], projects: Project[], periodStart: string, periodEnd: string) {
    if (!user.norm) return null;

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const expectedHours = this.calculateWorkingDays(periodStart, periodEnd, user.norm.working_days, user.vacations || []) * 8;
    
    const compliance = expectedHours > 0 ? Math.min(100, (totalHours / expectedHours) * 100) : 100;

    return {
      totalCompliance: compliance,
      totalHours,
      expectedHours
    };
  }

  private static calculateUserForecast(user: User, timeEntries: TimeEntry[], periodStart: string, periodEnd: string, horizonMonth: number) {
    const today = new Date();
    const periodEndDate = parseISO(periodEnd);
    const forecastEndDate = new Date(periodEndDate);
    forecastEndDate.setMonth(forecastEndDate.getMonth() + horizonMonth);

    const futurePlannedHours = user.plans?.reduce((total, plan) => {
      const plannedHours = (plan.internal_hours || 0);
      const actualHours = timeEntries
        .filter(entry => entry.project_id === plan.project_id && entry.user_id === user.id)
        .reduce((sum, entry) => sum + entry.hours, 0);
      return total + Math.max(0, plannedHours - actualHours);
    }, 0) || 0;

    const remainingCapacity = this.calculateWorkingDays(
      today.toISOString().split('T')[0],
      forecastEndDate.toISOString().split('T')[0],
      [1, 2, 3, 4, 5],
      user.vacations || []
    ) * 8;

    const utilizationRate = remainingCapacity > 0 ? (futurePlannedHours / remainingCapacity) * 100 : 0;

    return {
      futurePlannedHours,
      remainingCapacity,
      utilizationRate,
      isOverloaded: utilizationRate > 100,
      overloadPercentage: Math.max(0, utilizationRate - 100)
    };
  }

  private static calculateProjectMetrics(project: Project, projectEntries: TimeEntry[]) {
    const totalPlannedHours = project.plans?.reduce((sum, plan) => 
      sum + (plan.internal_hours || 0), 0
    ) || 0;

    const totalActualHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const delta = totalPlannedHours > 0 ? (totalActualHours - totalPlannedHours) / totalPlannedHours : 0;
    const burnRate = totalPlannedHours > 0 ? totalActualHours / totalPlannedHours : 0;

    const today = new Date();
    const endDate = project.end_date ? parseISO(project.end_date) : null;
    const remainingDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const remainingHours = Math.max(0, totalPlannedHours - totalActualHours);

    return {
      totalPlannedHours,
      totalActualHours,
      delta,
      burnRate,
      remainingDays,
      remainingHours,
      completionPercentage: totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0
    };
  }

  private static calculateProjectDataQuality(project: Project, metrics: any): number {
    let score = 0;
    let maxScore = 0;

    // Наличие дат (30%)
    maxScore += 30;
    if (project.start_date && project.end_date) score += 30;
    else if (project.start_date || project.end_date) score += 15;

    // Наличие планов (30%)
    maxScore += 30;
    if (project.plans && project.plans.length > 0) score += 30;

    // Наличие участников (20%)
    maxScore += 20;
    if (project.project_members && project.project_members.length > 0) score += 20;

    // Заполненность метрик (20%)
    maxScore += 20;
    if (metrics.totalPlannedHours > 0 && metrics.totalActualHours >= 0) score += 20;

    return (score / maxScore) * 100;
  }

  private static calculateDepartmentLoad(department: Department, metrics: DashboardMetrics): number {
    // Упрощенный расчет нагрузки отдела
    const deptAggregate = metrics.deptAgg?.find(dept => dept.id === department.id);
    return deptAggregate?.avgLoad || 0;
  }

  private static calculateDepartmentDataQuality(department: Department): number {
    let score = 0;
    let maxScore = 0;

    // Наличие пользователей (50%)
    maxScore += 50;
    if (department.users && department.users.length > 0) score += 50;

    // Наличие активных пользователей (30%)
    maxScore += 30;
    if (department.users && department.users.some((user: any) => user.isActive)) score += 30;

    // Наличие lead_tg_id (20%)
    maxScore += 20;
    if (department.lead_tg_id) score += 20;

    return (score / maxScore) * 100;
  }

  private static getActiveVacationsInPeriod(vacations: Vacation[], periodStart: string, periodEnd: string): Vacation[] {
    const periodStartDate = parseISO(periodStart);
    const periodEndDate = parseISO(periodEnd);
    
    return vacations.filter(vacation => {
      const vacationStart = parseISO(vacation.start_date);
      const vacationEnd = parseISO(vacation.end_date);
      return vacationStart <= periodEndDate && vacationEnd >= periodStartDate;
    });
  }

  private static calculateWorkingDays(startDate: string, endDate: string, workingDays: number[], vacations: Vacation[]): number {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    let count = 0;
    
    const vacationDates = new Set<string>();
    vacations.forEach(vacation => {
      const vacationStart = parseISO(vacation.start_date);
      const vacationEnd = parseISO(vacation.end_date);
      const current = new Date(vacationStart);
      
      while (current <= vacationEnd) {
        if (current >= start && current <= end) {
          vacationDates.add(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (workingDays.includes(current.getDay()) && !vacationDates.has(dateStr)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  private static findConsecutiveEmptyDays(entries: TimeEntry[], start: Date, end: Date): number {
    const entryDates = new Set(entries.map(e => e.date));
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (entryDates.has(dateStr)) {
        currentConsecutive = 0;
      } else {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return maxConsecutive;
  }

  private static deduplicateAlerts(alerts: Alert[]): Alert[] {
    const seen = new Set<string>();
    return alerts.filter(alert => {
      if (seen.has(alert.id)) return false;
      seen.add(alert.id);
      return true;
    });
  }
}

export const calculateAlertStats = (alerts: Alert[]): AlertStats => {
  const stats: AlertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    byCategory: {
      load: 0,
      data_quality: 0,
      project: 0,
      norms: 0,
      strategy: 0,
      sales: 0,
      vacation: 0,
      forecast: 0
    },
    bySource: {
      person: 0,
      project: 0,
      system: 0
    }
  };

  alerts.forEach(alert => {
    stats.byCategory[alert.category]++;
    if (alert.source) {
      stats.bySource[alert.source]++;
    } else {
      stats.bySource.system++;
    }
  });

  return stats;
};