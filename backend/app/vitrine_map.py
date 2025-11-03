DATASET_MAP = {
    "timeseries_usage": "public.mv_timeseries_usage",
    "capacity_vs_utilization": "public.v_capacity_vs_utilization",
    "anomalies": "public.v_anomalies",
}
DATASET_FIELDS = {
    "timeseries_usage": [
        "date","employee_id","project_id",
        "planned_useful_hours","fact_useful_hours","fact_internal_hours","target_useful_hours"
    ],
}
