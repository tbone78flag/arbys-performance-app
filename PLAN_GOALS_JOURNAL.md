# Goals Journal Feature Implementation Plan

## Overview
A monthly goal-tracking system for employees with weekly check-ins, manager visibility, and analytics. Goals follow the S.M.A.R.T. framework and include both work goals (visible to managers) and personal goals (private).

---

## Database Schema

### Table: `employee_goals`
```sql
CREATE TABLE employee_goals (
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

  -- Action steps (2-4 required)
  action_steps JSONB NOT NULL DEFAULT '[]',  -- [{step: "...", order: 1}, ...]

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'carried_over', 'abandoned')),

  -- End-of-month reflection
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

-- Index for efficient queries
CREATE INDEX idx_employee_goals_employee_period ON employee_goals(employee_id, period_start);
CREATE INDEX idx_employee_goals_location ON employee_goals(location_id, period_start);
```

### Table: `goal_weekly_checkins`
```sql
CREATE TABLE goal_weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES employee_goals(id) ON DELETE CASCADE,
  week_number INT NOT NULL,  -- 1-5 for weeks in the month
  week_start DATE NOT NULL,

  -- Check-in responses
  what_tried TEXT NOT NULL,           -- "What did you try this week?"
  did_it_help TEXT NOT NULL,          -- "Did it help?"
  next_week_plan TEXT NOT NULL,       -- "What will you do different or same next week?"

  -- Action step progress (checklist of completed steps)
  completed_actions JSONB DEFAULT '[]',  -- [0, 2] = indices of completed action steps

  -- Self-assessment
  progress_rating TEXT CHECK (progress_rating IN ('green', 'yellow', 'red')),

  -- Manager feedback (optional)
  manager_comment TEXT,
  manager_rating TEXT CHECK (manager_rating IN ('green', 'yellow', 'red')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(goal_id, week_number)
);
```

### Table: `goal_reminders`
```sql
CREATE TABLE goal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('new_month_goal', 'weekly_checkin', 'end_month_reflection')),
  due_date DATE NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Component Architecture

### 1. Employee-Facing Components (Experience Page)

#### `GoalsJournal.jsx` (Main component)
- Shows current month's goal (work + personal tabs)
- Handles goal creation wizard for new months
- Shows weekly check-in prompts
- Displays gentle reminders
- End-of-month reflection form

#### `GoalCreationWizard.jsx`
- Step 1: Continue/Adjust/New choice (if previous month had goal)
- Step 2: Goal text + S.M.A.R.T. questions with examples
- Step 3: Action steps (2-4 required)
- Step 4: Review and submit

#### `WeeklyCheckInForm.jsx`
- Three fixed prompts with examples
- Action step checklist
- Self-rating (green/yellow/red)

#### `MonthEndReflection.jsx`
- What worked, what didn't, what to change
- Triggers continuation choice for next month

---

### 2. Manager-Facing Components (Experience Page - Manager Section)

#### `TeamGoalsOverview.jsx`
- List of team members with their work goals
- Status indicators (green/yellow/red trend)
- Click to expand for details
- Quick "Award Points" button

#### `GoalDetailModal.jsx`
- Full goal view with S.M.A.R.T. breakdown
- Weekly check-in summaries
- Manager comment fields (weekly + monthly)
- Rating controls

---

### 3. Goals Management Page (AM/GM Only)

#### `GoalAnalytics.jsx`
- % of team setting goals
- % completing weekly check-ins
- Common goal themes (word cloud or list)
- Trend over time

---

## React Query Hook: `useGoalsData.js`

```javascript
// Query keys
export const goalsKeys = {
  all: ['goals'],
  myGoals: (employeeId, period) => [...goalsKeys.all, 'my', employeeId, period],
  teamGoals: (locationId, period) => [...goalsKeys.all, 'team', locationId, period],
  checkins: (goalId) => [...goalsKeys.all, 'checkins', goalId],
  analytics: (locationId) => [...goalsKeys.all, 'analytics', locationId],
  reminders: (employeeId) => [...goalsKeys.all, 'reminders', employeeId],
}

// Hooks
export function useMyGoals(employeeId, periodStart)
export function useTeamGoals(locationId, periodStart)
export function useGoalCheckins(goalId)
export function useGoalAnalytics(locationId)
export function useGoalReminders(employeeId)

// Mutations
export function useCreateGoal()
export function useUpdateGoal()
export function useSubmitCheckin()
export function useSubmitReflection()
export function useAddManagerComment()
export function useDismissReminder()
```

---

## S.M.A.R.T. Questions with Examples

### Specific
**Question:** "What exactly do you want to accomplish?"
**Example:** "Instead of 'get better at customer service', try 'Greet every drive-thru customer within 5 seconds with a smile and use their name if I see it on the order'"

### Measurable
**Question:** "How will you know when you've achieved it?"
**Example:** "I'll track how many customers I greet within 5 seconds each shift. Goal: 90% of customers"

### Achievable
**Question:** "What resources or skills do you need? Is this realistic?"
**Example:** "I need to practice reading orders quickly. I can ask my trainer for tips."

### Relevant
**Question:** "Why is this goal important to you or the team?"
**Example:** "Faster greetings improve our speed scores and make customers feel welcomed"

### Time-bound
**Question:** "What's your target date within this month?"
**Example:** "By the 15th, I want to consistently hit 90%. By month end, it should be habit."

---

## Weekly Check-In Prompts with Examples

### What did you try this week?
**Example:** "I practiced reading the order screen faster and started greeting before the car fully pulled up"

### Did it help?
**Example:** "Yes! I noticed customers seemed happier and my greeting times dropped from 8 seconds to about 4"

### What will you do different or the same next week?
**Example:** "Same approach, but I want to add using customer names more. I'll look for names on mobile orders."

---

## Role Hierarchy for Visibility

```
General Manager → Can see all work goals for their location
Assistant Manager → Can see all work goals for their location
Shift Manager → Can see work goals of employees they supervise
Employee → Can only see their own goals
```

Personal goals are ALWAYS private (only visible to the goal owner).

---

## File Structure

```
src/
├── components/
│   ├── goals/
│   │   ├── GoalsJournal.jsx           # Main employee component
│   │   ├── GoalCreationWizard.jsx     # Multi-step goal creation
│   │   ├── WeeklyCheckInForm.jsx      # Weekly check-in
│   │   ├── MonthEndReflection.jsx     # End of month reflection
│   │   ├── GoalCard.jsx               # Reusable goal display card
│   │   ├── TeamGoalsOverview.jsx      # Manager view of team goals
│   │   ├── GoalDetailModal.jsx        # Full goal details for managers
│   │   └── GoalAnalytics.jsx          # Analytics for AM/GM
│   └── ...
├── hooks/
│   ├── useGoalsData.js                # React Query hooks for goals
│   └── ...
└── ...
```

---

## Implementation Order

### Phase 1: Core Infrastructure
1. Create database tables (SQL)
2. Create `useGoalsData.js` hook with queries and mutations
3. Create `GoalsJournal.jsx` skeleton

### Phase 2: Goal Creation
4. Build `GoalCreationWizard.jsx` with S.M.A.R.T. questions
5. Integrate into ExperiencePage

### Phase 3: Weekly Check-ins
6. Build `WeeklyCheckInForm.jsx`
7. Add reminder logic

### Phase 4: Month-End & Continuation
8. Build `MonthEndReflection.jsx`
9. Add continuation flow for new months

### Phase 5: Manager Features
10. Build `TeamGoalsOverview.jsx`
11. Build `GoalDetailModal.jsx`
12. Add manager comment functionality
13. Add "Award Points" integration

### Phase 6: Analytics
14. Build `GoalAnalytics.jsx` for Goals Management page
15. Add to GoalsPage.jsx

---

## UI/UX Notes

- Use tabs for Work/Personal goals
- Progress indicators use traffic light colors (green/yellow/red)
- Gentle, encouraging language throughout
- Examples shown in gray italic text below each question
- Action steps shown as interactive checklist
- Reminders appear as dismissable banners at top of component
