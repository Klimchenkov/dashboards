// lib/alertConstants.ts
export const ALERT_THRESHOLDS = {
  // Пороги загрузки
  CRITICAL_OVERLOAD_PCT: 110,
  OVERLOAD_PCT: 100,
  UNDERLOAD_PCT: 70,
  
  // Пороги качества данных
  CRITICAL_DATA_QUALITY: 0.6,
  WARNING_DATA_QUALITY: 0.8,
  
  // Пороги проектов
  BURN_RATE_LOW: 0.7,
  BURN_RATE_HIGH: 1.3,
  DELTA_WARNING: 0.2,
  DELTA_CRITICAL: 0.4,
  
  // Пороги норм
  NORM_COMPLIANCE_WARNING: 60,
  NORM_COMPLIANCE_CRITICAL: 40,
  
  // Другие пороги
  MAX_CONSECUTIVE_EMPTY_DAYS: 3,
  MAX_HOURS_PER_DAY: 10,
  
  // Прогнозные пороги
  FORECAST_OVERLOAD: 100,
  FORECAST_WARNING: 90
};

export const ALERT_CONFIG = {
  refreshInterval: 5 * 60 * 1000, // 5 минут
  maxAlerts: 1000,
  autoResolveAfter: 7 * 24 * 60 * 60 * 1000 // 7 дней
};