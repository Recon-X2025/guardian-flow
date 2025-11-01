-- Video Training System Schema
CREATE TABLE IF NOT EXISTS public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  instructor_name TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  video_url TEXT,
  content_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  correct_answer TEXT NOT NULL,
  options JSONB, -- for multiple choice: ["A", "B", "C", "D"]
  points INTEGER DEFAULT 1,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.training_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  time_spent_minutes INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(enrollment_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.training_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id UUID NOT NULL REFERENCES public.training_courses(id),
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  verification_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Offline Sync Schema
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT CHECK (operation IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.offline_cache_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ NOT NULL,
  sync_version INTEGER DEFAULT 1,
  UNIQUE(user_id, entity_type)
);

-- NLP Query Schema
CREATE TABLE IF NOT EXISTS public.nlp_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  natural_language_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  executed_successfully BOOLEAN DEFAULT false,
  result_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nlp_query_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_history_id UUID NOT NULL REFERENCES public.nlp_query_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduling Optimization Schema
CREATE TABLE IF NOT EXISTS public.schedule_optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  run_date DATE NOT NULL,
  algorithm_version TEXT NOT NULL,
  constraints JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.optimized_schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_run_id UUID NOT NULL REFERENCES public.schedule_optimization_runs(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  technician_id UUID NOT NULL REFERENCES public.technicians(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  travel_time_minutes INTEGER,
  priority_score DECIMAL(5,2),
  skill_match_score DECIMAL(5,2),
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_cache_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlp_query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlp_query_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_schedule_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Training (tenant-scoped)
CREATE POLICY "Users can view published courses in their tenant"
  ON public.training_courses FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND (is_published = true OR created_by = auth.uid()));

CREATE POLICY "Trainers can manage courses"
  ON public.training_courses FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "Users can view modules of enrolled courses"
  ON public.training_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_enrollments e
    WHERE e.course_id = training_modules.course_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Trainers can manage modules"
  ON public.training_modules FOR ALL
  USING (public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "Users can view their enrollments"
  ON public.training_enrollments FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

CREATE POLICY "Users can enroll themselves"
  ON public.training_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view/update their progress"
  ON public.training_module_progress FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.training_enrollments e
    WHERE e.id = training_module_progress.enrollment_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their certifications"
  ON public.training_certifications FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role]));

-- RLS Policies for Offline Sync (user-scoped)
CREATE POLICY "Users can manage their sync queue"
  ON public.offline_sync_queue FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their cache metadata"
  ON public.offline_cache_metadata FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for NLP Queries (tenant-scoped)
CREATE POLICY "Users can view their query history"
  ON public.nlp_query_history FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]));

CREATE POLICY "Users can create queries"
  ON public.nlp_query_history FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can provide feedback on queries"
  ON public.nlp_query_feedback FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for Scheduling (tenant-scoped)
CREATE POLICY "Users can view schedules in their tenant"
  ON public.schedule_optimization_runs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can create optimization runs"
  ON public.schedule_optimization_runs FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'dispatcher'::app_role]));

CREATE POLICY "Users can view optimized assignments"
  ON public.optimized_schedule_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.schedule_optimization_runs r
    WHERE r.id = optimized_schedule_assignments.optimization_run_id
    AND r.tenant_id = public.get_user_tenant_id(auth.uid())
  ));

-- Indexes for performance
CREATE INDEX idx_training_courses_tenant ON public.training_courses(tenant_id, is_published);
CREATE INDEX idx_training_enrollments_user ON public.training_enrollments(user_id, course_id);
CREATE INDEX idx_training_enrollments_course ON public.training_enrollments(course_id);
CREATE INDEX idx_offline_sync_queue_user_status ON public.offline_sync_queue(user_id, status);
CREATE INDEX idx_nlp_query_history_user ON public.nlp_query_history(user_id, created_at DESC);
CREATE INDEX idx_schedule_optimization_tenant_date ON public.schedule_optimization_runs(tenant_id, run_date);

-- Triggers
CREATE TRIGGER update_training_courses_updated_at
  BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_enrollments_updated_at
  BEFORE UPDATE ON public.training_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();