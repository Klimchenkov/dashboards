// lib/pieCalculations

import { TimeEntry, Project, HoursDistributionItem } from "./dataModel";


export function calculateHoursDistribution(
  timeEntries: TimeEntry[],
  projects: Project[],
  periodStart: string,
  periodEnd: string
): HoursDistributionItem[] {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    // Фильтруем таймшиты по периоду
    const periodEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
    });

    // Инициализируем счетчики по типам проектов
    const hoursByType = {
        commercial: 0,
        presale: 0,
        internal: 0,
        other: 0
    };

    // Суммируем часы по типам проектов
    periodEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.project_id);
        if (!project) {
        hoursByType.other += entry.hours;
        return;
        }

        switch (project.project_status) {
        case 'active':
            hoursByType.commercial += entry.hours;
            break;
        case 'presale':
            hoursByType.presale += entry.hours;
            break;
        case 'internal':
            hoursByType.internal += entry.hours;
            break;
        default:
            hoursByType.other += entry.hours;
        }
    });

    // Рассчитываем общее количество часов
    const totalHours = Object.values(hoursByType).reduce((sum, hours) => sum + hours, 0);

    // Формируем данные для pie chart
    const result: HoursDistributionItem[] = [];
    
    if (hoursByType.commercial > 0) {
        result.push({
        type: 'commercial',
        value: totalHours > 0 ? (hoursByType.commercial / totalHours) * 100 : 0,
        hours: hoursByType.commercial,
        percentage: totalHours > 0 ? (hoursByType.commercial / totalHours) * 100 : 0
        });
    }

    if (hoursByType.presale > 0) {
        result.push({
        type: 'presale',
        value: totalHours > 0 ? (hoursByType.presale / totalHours) * 100 : 0,
        hours: hoursByType.presale,
        percentage: totalHours > 0 ? (hoursByType.presale / totalHours) * 100 : 0
        });
    }

    if (hoursByType.internal > 0) {
        result.push({
        type: 'internal',
        value: totalHours > 0 ? (hoursByType.internal / totalHours) * 100 : 0,
        hours: hoursByType.internal,
        percentage: totalHours > 0 ? (hoursByType.internal / totalHours) * 100 : 0
        });
    }

    if (hoursByType.other > 0) {
        result.push({
        type: 'other',
        value: totalHours > 0 ? (hoursByType.other / totalHours) * 100 : 0,
        hours: hoursByType.other,
        percentage: totalHours > 0 ? (hoursByType.other / totalHours) * 100 : 0
        });
    }

    return result;
}