-- Goals Journal Feature: Database Tables
-- Run this in your Supabase SQL Editor

-- ============================================
-- Table: employee_goals
-- Stores monthly goals for each employee
-- ============================================
CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('work', 'personal')),
  period_start DATE NOT NULL,  -- First day of the month
  period_end DATE NOT NULL,    -- Last day of the month

  -- Goal definition
  goal_text TEXT NOT NULL,

  -- S.M.A.R.T. criteria responses
  smart_specific TEXT NOT NULL,      -- "What exactly do you want to accomplish?"
  smart_measurable TEXT NOT NULL,    -- "How will you know when it's achieved?"
  smart_achievable TEXT NOT NULL,    -- "What resources/skills do you need?"
  smart_relevant TEXT NOT NULL,      -- "Why is this goal important to you/the team?"
  smart_timebound TEXT NOT NULL,     -- "What's your target date within this month?"

  -- Action steps (2-4 required) stored as JSON array
  -- Format: [{"step": "Do X during morning rush", "order": 1}, ...]
  action_steps JSONB NOT NULL DEFAULT '[]',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'carried_over', 'abandoned')),

  -- End-of-month reflection (filled at end of period)
  reflection_worked TEXT,         -- What worked well
  reflection_didnt_work TEXT,     -- What didn't work
  reflection_change TEXT,         -- What to change next time

  -- Manager feedback
  manager_monthly_comment TEXT,
  manager_monthly_rating TEXT CHECK (manager_monthly_rating IN ('green', 'yellow', 'red')),

  -- Continuation from previous month
  previous_goal_id UUID REFERENCES employee_goals(id),
  continuation_choice TEXT CHECK (continuation_choice IN ('continue', 'adjust', 'new')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee_period
  ON employee_goals(employee_id, period_start);
CREATE INDEX IF NOT EXISTS idx_employee_goals_location
  ON employee_goals(location_id, period_start);
CREATE INDEX IF NOT EXISTS idx_employee_goals_type
  ON employee_goals(goal_type);

-- ============================================
-- Table: goal_weekly_checkins
-- Stores weekly check-in data for each goal
-- ============================================
CREATE TABLE IF NOT EXISTS goal_weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES employee_goals(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 6),  -- 1-6 for weeks in the month
  week_start DATE NOT NULL,

  -- Check-in responses (3 fixed prompts)
  what_tried TEXT NOT NULL,           -- "What did you try this week?"
  did_it_help TEXT NOT NULL,          -- "Did it help?"
  next_week_plan TEXT NOT NULL,       -- "What will you do different or same next week?"

  -- Action step progress - indices of completed action steps
  -- Format: [0, 2] means steps at index 0 and 2 are completed
  completed_actions JSONB DEFAULT '[]',

  -- Self-assessment by employee
  progress_rating TEXT CHECK (progress_rating IN ('green', 'yellow', 'red')),

  -- Manager feedback (optional)
  manager_comment TEXT,
  manager_rating TEXT CHECK (manager_rating IN ('green', 'yellow', 'red')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One check-in per goal per week
  UNIQUE(goal_id, week_number)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal
  ON goal_weekly_checkins(goal_id);

-- ============================================
-- Table: goal_reminders
-- Stores reminders for goal-related actions
-- ============================================
CREATE TABLE IF NOT EXISTS goal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('new_month_goal', 'weekly_checkin', 'end_month_reflection')),
  due_date DATE NOT NULL,
  goal_id UUID REFERENCES employee_goals(id) ON DELETE CASCADE,  -- Optional: link to specific goal
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_goal_reminders_employee
  ON goal_reminders(employee_id, dismissed);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for employee_goals
-- ============================================

-- Employees can view their own goals
CREATE POLICY "Employees can view own goals"
  ON employee_goals FOR SELECT
  USING (auth.uid() = employee_id);

-- Employees can insert their own goals
CREATE POLICY "Employees can create own goals"
  ON employee_goals FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own goals
CREATE POLICY "Employees can update own goals"
  ON employee_goals FOR UPDATE
  USING (auth.uid() = employee_id);

-- Managers can view work goals of employees at their location
CREATE POLICY "Managers can view work goals at location"
  ON employee_goals FOR SELECT
  USING (
    goal_type = 'work' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
      AND e.location_id = employee_goals.location_id
      AND e.role = 'manager'
    )
  );

-- Managers can update work goals (for comments/ratings)
CREATE POLICY "Managers can update work goals at location"
  ON employee_goals FOR UPDATE
  USING (
    goal_type = 'work' AND
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
      AND e.location_id = employee_goals.location_id
      AND e.role = 'manager'
    )
  );

-- ============================================
-- RLS Policies for goal_weekly_checkins
-- ============================================

-- Employees can view check-ins for their own goals
CREATE POLICY "Employees can view own checkins"
  ON goal_weekly_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employee_goals g
      WHERE g.id = goal_weekly_checkins.goal_id
      AND g.employee_id = auth.uid()
    )
  );

-- Employees can create check-ins for their own goals
CREATE POLICY "Employees can create own checkins"
  ON goal_weekly_checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_goals g
      WHERE g.id = goal_weekly_checkins.goal_id
      AND g.employee_id = auth.uid()
    )
  );

-- Employees can update check-ins for their own goals
CREATE POLICY "Employees can update own checkins"
  ON goal_weekly_checkins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employee_goals g
      WHERE g.id = goal_weekly_checkins.goal_id
      AND g.employee_id = auth.uid()
    )
  );

-- Managers can view check-ins for work goals at their location
CREATE POLICY "Managers can view work goal checkins"
  ON goal_weekly_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employee_goals g
      JOIN employees e ON e.id = auth.uid()
      WHERE g.id = goal_weekly_checkins.goal_id
      AND g.goal_type = 'work'
      AND g.location_id = e.location_id
      AND e.role = 'manager'
    )
  );

-- Managers can update check-ins (for manager comments/ratings)
CREATE POLICY "Managers can update work goal checkins"
  ON goal_weekly_checkins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employee_goals g
      JOIN employees e ON e.id = auth.uid()
      WHERE g.id = goal_weekly_checkins.goal_id
      AND g.goal_type = 'work'
      AND g.location_id = e.location_id
      AND e.role = 'manager'
    )
  );

-- ============================================
-- RLS Policies for goal_reminders
-- ============================================

-- Employees can view their own reminders
CREATE POLICY "Employees can view own reminders"
  ON goal_reminders FOR SELECT
  USING (auth.uid() = employee_id);

-- Employees can update their own reminders (dismiss)
CREATE POLICY "Employees can update own reminders"
  ON goal_reminders FOR UPDATE
  USING (auth.uid() = employee_id);

-- System can insert reminders (via service role)
CREATE POLICY "Service role can insert reminders"
  ON goal_reminders FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to employee_goals
DROP TRIGGER IF EXISTS update_employee_goals_updated_at ON employee_goals;
CREATE TRIGGER update_employee_goals_updated_at
  BEFORE UPDATE ON employee_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to goal_weekly_checkins
DROP TRIGGER IF EXISTS update_goal_checkins_updated_at ON goal_weekly_checkins;
CREATE TRIGGER update_goal_checkins_updated_at
  BEFORE UPDATE ON goal_weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
