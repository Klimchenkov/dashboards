// web/lib/date.ts

export function fmt(d: Date | string) { 
    const x = typeof d === 'string' ? new Date(d) : d; 
    return x.toISOString().slice(0, 10); 
}

export function addDays(d: Date, days: number) { 
    const nd = new Date(d); 
    nd.setDate(nd.getDate() + days); 
    return nd; 
}

// Update the type to include new period options
export type PeriodType = 'week' | 'month' | 'quarter' | 'halfyear' | 'year' | 'month_to_date' | 'last_30_days';

export function startOfPeriod(p: PeriodType, ref = new Date()) { 
    const d = new Date(ref);
    
    // Handle month_to_date (same as month start)
    if (p === 'month' || p === 'month_to_date') { 
        d.setDate(1);
    }
    else if (p === 'last_30_days') {
        // For last_30_days, start is 30 days before the ref date
        d.setDate(d.getDate() - 30); 
    }
    else if (p === 'week') {
        const day = d.getDay();
        const diff = (day === 0 ? 6 : day - 1);
        d.setDate(d.getDate() - diff);
    }
    else if (p === 'quarter') {
        const q = Math.floor(d.getMonth() / 3); 
        d.setMonth(q * 3, 1);
    }
    else if (p === 'halfyear') {
        d.setMonth(d.getMonth() < 6 ? 0 : 6, 1);
    }
    else if (p === 'year') {
        d.setMonth(0, 1);
    }
    
    return d; 
}

export function endOfPeriod(p: PeriodType, ref = new Date()) { 
    if (p === 'month_to_date') {
        // For month_to_date, end is the ref date (today or specified date)
        const d = new Date(ref);
        return d;
    }
    else if (p === 'last_30_days') {
        // For last_30_days, end is the ref date (today or specified date)
        const d = new Date(ref);
        return d;
    }
    
    const d = startOfPeriod(p, ref); 
    
    if (p === 'week') {
        d.setDate(d.getDate() + 6); 
    }
    else if (p === 'month') {
        d.setMonth(d.getMonth() + 1); 
        d.setDate(0);
    }
    else if (p === 'quarter') {
        d.setMonth(d.getMonth() + 3); 
        d.setDate(0);
    }
    else if (p === 'halfyear') {
        d.setMonth(d.getMonth() + 6); 
        d.setDate(0);
    }
    else if (p === 'year') {
        d.setMonth(12, 0);
    }
    
    return d; 
}

export function rangeDays(s: Date, e: Date) { 
    const out: string[] = []; 
    const d = new Date(s); 
    while (d <= e) { 
        out.push(fmt(d)); 
        d.setDate(d.getDate() + 1);
    } 
    return out; 
}

export function monthKey(d: Date) { 
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; 
}

export function addMonths(d: Date, m: number) { 
    const x = new Date(d); 
    x.setMonth(x.getMonth() + m); 
    return x; 
}

// Additional helper functions you might find useful
export function startOfDay(d: Date = new Date()) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function endOfDay(d: Date = new Date()) {
    const date = new Date(d);
    date.setHours(23, 59, 59, 999);
    return date;
}