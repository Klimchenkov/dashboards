CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.setters_users(
  id BIGSERIAL PRIMARY KEY,
  full_name text NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.departments(
  id BIGSERIAL PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_departments(
  user_id bigint REFERENCES public.setters_users(id) ON DELETE CASCADE,
  department_id bigint REFERENCES public.departments(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, department_id)
);

CREATE TABLE IF NOT EXISTS public.projects(
  id BIGSERIAL PRIMARY KEY,
  name text NOT NULL,
  status text DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.project_members(
  project_id bigint REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id bigint REFERENCES public.setters_users(id) ON DELETE CASCADE,
  fte numeric,
  PRIMARY KEY(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_user_hour_plans(
  id BIGSERIAL PRIMARY KEY,
  employee_id bigint REFERENCES public.setters_users(id),
  project_id bigint REFERENCES public.projects(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours_total numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public.time_entries(
  id BIGSERIAL PRIMARY KEY,
  employee_id bigint REFERENCES public.setters_users(id),
  project_id bigint REFERENCES public.projects(id),
  date date NOT NULL,
  hours numeric NOT NULL,
  category text
);

CREATE TABLE IF NOT EXISTS public.setters_user_norms(
  id BIGSERIAL PRIMARY KEY,
  user_id bigint REFERENCES public.setters_users(id),
  commercial_per_day numeric DEFAULT 6,
  presale_per_day numeric DEFAULT 1,
  valid_from date NOT NULL,
  valid_to date
);

CREATE TABLE IF NOT EXISTS public.user_day_statuses(
  user_id bigint REFERENCES public.setters_users(id),
  date date NOT NULL,
  status text,
  PRIMARY KEY(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.visualizations(
  id BIGSERIAL PRIMARY KEY,
  name text NOT NULL,
  schema_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_date_emp ON public.time_entries(date, employee_id);
CREATE INDEX IF NOT EXISTS idx_pu_plans_period ON public.project_user_hour_plans(period_start, period_end, employee_id);
