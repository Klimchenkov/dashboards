ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user_hour_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_entries_by_department ON public.time_entries
USING (
  EXISTS (
    SELECT 1
    FROM public.user_departments ud
    WHERE ud.user_id = time_entries.employee_id
      AND ud.department_id = ANY (string_to_array(current_setting('request.jwt.claims.department_ids', true), ',')::bigint[])
  )
);

CREATE POLICY time_entries_by_project ON public.time_entries
USING (
  project_id = ANY (string_to_array(current_setting('request.jwt.claims.project_ids', true), ',')::bigint[])
);

CREATE POLICY time_entries_self ON public.time_entries
USING (
  employee_id = NULLIF(current_setting('request.jwt.claims.user_id', true), '')::bigint
);
