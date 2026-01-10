-- Store Goals Feature: Database Table
-- Run this in your Supabase SQL Editor

-- ============================================
-- Table: store_goals
-- Stores weekly and period goals set by managers
-- ============================================
CREATE TABLE IF NOT EXISTS store_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,

  -- Goal type: 'week' or 'period' (month)
  goal_type TEXT NOT NULL CHECK (goal_type IN ('week', 'period')),

  -- The goal message
  message TEXT NOT NULL,

  -- Time boundaries
  start_date DATE NOT NULL,  -- First day of week or month
  end_date DATE NOT NULL,    -- Last day of week or month

  -- Who created it
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_store_goals_location_type
  ON store_goals(location_id, goal_type, start_date DESC);

-- Unique constraint: one goal per type per time period per location
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_goals_unique
  ON store_goals(location_id, goal_type, start_date);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE store_goals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Everyone at the location can view store goals
CREATE POLICY "Users can view store goals at their location"
  ON store_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.location_id = store_goals.location_id
    )
  );

-- Only managers can create store goals
CREATE POLICY "Managers can create store goals"
  ON store_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.location_id = store_goals.location_id
      AND p.role = 'manager'
    )
  );

-- Only managers can update store goals
CREATE POLICY "Managers can update store goals"
  ON store_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.location_id = store_goals.location_id
      AND p.role = 'manager'
    )
  );

-- Only managers can delete store goals
CREATE POLICY "Managers can delete store goals"
  ON store_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.location_id = store_goals.location_id
      AND p.role = 'manager'
    )
  );

-- ============================================
-- Updated_at trigger
-- ============================================
DROP TRIGGER IF EXISTS update_store_goals_updated_at ON store_goals;
CREATE TRIGGER update_store_goals_updated_at
  BEFORE UPDATE ON store_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Enable Realtime (optional)
-- ============================================
-- Run this if you want real-time updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE store_goals;
