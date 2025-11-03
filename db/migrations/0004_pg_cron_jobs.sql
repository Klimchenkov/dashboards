SELECT cron.schedule('refresh_mv_timeseries_usage', '*/15 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_timeseries_usage;
$$);
