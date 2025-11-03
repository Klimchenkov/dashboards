CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_timeseries_usage AS
WITH d AS (
  SELECT te.date::date AS d,
         te.employee_id,
         te.project_id,
         SUM(te.hours) FILTER (WHERE te.category IN ('commercial','presale')) AS fact_useful_hours,
         SUM(te.hours) FILTER (WHERE te.category = 'internal')               AS fact_internal_hours
  FROM public.time_entries te
  GROUP BY 1,2,3
),
p AS (
  SELECT gs::date AS d, puh.employee_id, puh.project_id,
         (puh.hours_total / GREATEST(1, (puh.period_end - puh.period_start + 1)))::numeric AS planned_per_day
  FROM public.project_user_hour_plans puh
  CROSS JOIN generate_series(puh.period_start::date, puh.period_end::date, interval '1 day') gs
),
n AS (
  SELECT sun.user_id AS employee_id,
         gs::date AS d,
         CASE WHEN uds.status IN ('vacation','sick_holiday','weekend','business_trip') THEN 0
              ELSE COALESCE(sun.commercial_per_day, 6) + COALESCE(sun.presale_per_day, 1)
         END AS target_useful_per_day
  FROM public.setters_user_norms sun
  CROSS JOIN generate_series(sun.valid_from::date, COALESCE(sun.valid_to, now())::date, interval '1 day') gs
  LEFT JOIN public.user_day_statuses uds
    ON uds.user_id = sun.user_id AND uds.date = gs
)
SELECT COALESCE(d.d, p.d, n.d) AS date,
       COALESCE(d.employee_id, p.employee_id, n.employee_id) AS employee_id,
       COALESCE(d.project_id, p.project_id) AS project_id,
       COALESCE(d.fact_useful_hours, 0) AS fact_useful_hours,
       COALESCE(d.fact_internal_hours, 0) AS fact_internal_hours,
       COALESCE(p.planned_per_day, 0) AS planned_useful_hours,
       COALESCE(n.target_useful_per_day, 0) AS target_useful_hours
FROM d FULL JOIN p ON d.d = p.d AND d.employee_id = p.employee_id AND d.project_id = p.project_id
       FULL JOIN n ON (COALESCE(d.d,p.d) = n.d AND COALESCE(d.employee_id,p.employee_id) = n.employee_id);

CREATE INDEX IF NOT EXISTS idx_mv_timeseries_usage_date ON public.mv_timeseries_usage(date);

CREATE OR REPLACE VIEW public.v_capacity_vs_utilization AS
SELECT date,
       employee_id,
       SUM(target_useful_hours)                          AS capacity_hours,
       SUM(planned_useful_hours)                         AS planned_hours,
       SUM(fact_useful_hours + fact_internal_hours)      AS fact_total_hours,
       SUM(fact_useful_hours)                            AS fact_useful_hours
FROM public.mv_timeseries_usage
GROUP BY 1,2;

CREATE OR REPLACE VIEW public.v_anomalies AS
WITH daily AS (
  SELECT date, employee_id,
         SUM(fact_useful_hours + fact_internal_hours) AS total,
         SUM(target_useful_hours) AS target
  FROM public.mv_timeseries_usage
  GROUP BY 1,2
)
SELECT date, employee_id,
       CASE WHEN total > GREATEST(target, 8) THEN 'overwork'
            WHEN total < (target * 0.5)       THEN 'underload'
            ELSE NULL END AS anomaly_type,
       total, target
FROM daily
WHERE (total > GREATEST(target, 8)) OR (total < (target * 0.5));
