# Foundation Lessons Database Schema

This schema powers the CMS for all 12 Foundation modules and tracks student progress with streaks and time investment.

## Tables

### 1. `foundation_lessons`
Stores all lesson content (English + Swahili, instructions, pronunciation guides).

```sql
CREATE TABLE foundation_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number INT NOT NULL CHECK (module_number >= 1 AND module_number <= 12),
  lesson_number INT NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  title_sw VARCHAR(255),
  instruction_body TEXT NOT NULL,
  instruction_body_sw TEXT,
  pronunciation_guide TEXT,
  video_url VARCHAR(500),
  assessment_type VARCHAR(50) DEFAULT 'multiple_choice',
  pass_threshold INT DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  UNIQUE (module_number, lesson_number),
  FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE INDEX idx_foundation_lessons_module ON foundation_lessons(module_number);
CREATE INDEX idx_foundation_lessons_module_lesson ON foundation_lessons(module_number, lesson_number);
```

### 2. `foundation_progress`
Tracks which modules/lessons each user has completed, time spent, and streaks.

```sql
CREATE TABLE foundation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_number INT NOT NULL CHECK (module_number >= 1 AND module_number <= 12),
  status VARCHAR(50) DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'complete')),
  completed_at TIMESTAMP,
  time_spent_seconds INT DEFAULT 0,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, module_number),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_progress_user ON foundation_progress(user_id);
CREATE INDEX idx_progress_user_status ON foundation_progress(user_id, status);
```

### 3. `foundation_lesson_attempts`
Records each attempt at a lesson assessment for analytics and retry tracking.

```sql
CREATE TABLE foundation_lesson_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES foundation_lessons(id) ON DELETE CASCADE,
  score INT,
  passed BOOLEAN DEFAULT FALSE,
  time_spent_seconds INT,
  feedback_text TEXT,
  attempted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attempts_user ON foundation_lesson_attempts(user_id);
CREATE INDEX idx_attempts_lesson ON foundation_lesson_attempts(lesson_id);
CREATE INDEX idx_attempts_user_lesson ON foundation_lesson_attempts(user_id, lesson_id);
```

### 4. `foundation_badges`
Milestones and badges earned by users (e.g., "Pronunciation Pro", "Job Ready").

```sql
CREATE TABLE foundation_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_emoji VARCHAR(10),
  unlock_requirement VARCHAR(50),
  unlock_value INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial badges
INSERT INTO foundation_badges (name, description, icon_emoji, unlock_requirement, unlock_value) VALUES
  ('Pronunciation Pro', 'Complete modules 1-3', '🎤', 'modules_completed', 3),
  ('Conversation Ready', 'Complete modules 1-6', '💬', 'modules_completed', 6),
  ('Interview Master', 'Complete modules 7-9', '💼', 'modules_completed', 9),
  ('Job Ready', 'Complete all 12 modules', '🏆', 'modules_completed', 12),
  ('7-Day Streak', 'Log in for 7 consecutive days', '🔥', 'streak_days', 7),
  ('40-Hour Champion', 'Invest 40+ hours in learning', '⏱️', 'hours_invested', 40);
```

### 5. `foundation_user_badges`
Tracks which badges each user has unlocked.

```sql
CREATE TABLE foundation_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES foundation_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges ON foundation_user_badges(user_id);
```

### 6. `foundation_streaks`
Tracks daily login streaks to motivate consistent learning.

```sql
CREATE TABLE foundation_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak_days INT DEFAULT 0,
  longest_streak_days INT DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_streaks_user ON foundation_streaks(user_id);
```

### 7. `foundation_activity_log`
Daily activity heatmap data (which days user studied).

```sql
CREATE TABLE foundation_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  time_spent_seconds INT DEFAULT 0,
  lessons_completed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, activity_date)
);

CREATE INDEX idx_activity_user ON foundation_activity_log(user_id);
CREATE INDEX idx_activity_user_date ON foundation_activity_log(user_id, activity_date);
```

## API Endpoints to Implement

### Lessons API
- `GET /api/foundation/lessons` — List all lessons for a module
- `GET /api/foundation/lessons/[module]/[lesson]` — Get single lesson (dynamic rendering)
- `POST /api/admin/foundation/lessons` — Create lesson (admin only)
- `PUT /api/admin/foundation/lessons/[id]` — Update lesson (admin only)
- `DELETE /api/admin/foundation/lessons/[id]` — Delete lesson (admin only)

### Progress API
- `GET /api/foundation/progress` — Get user's progress across all 12 modules
- `GET /api/foundation/progress/summary` — Get summary (% complete, streak, time invested)
- `PUT /api/foundation/progress/[module]` — Update module status
- `POST /api/foundation/lessons/[id]/attempt` — Record lesson attempt

### Streaks API
- `GET /api/foundation/streaks` — Get user's streak data
- `GET /api/foundation/activity` — Get activity heatmap (last 90 days)

### Badges API
- `GET /api/foundation/badges` — Get all available badges
- `GET /api/foundation/badges/earned` — Get user's earned badges
- `POST /api/foundation/badges/check` — Trigger badge unlock check on module completion

## Seeding Data

To populate the lessons table with current Foundation content:

```js
// scripts/seed-foundation-lessons.mjs
// This will extract hardcoded lesson data and insert into foundation_lessons table
// Module structure: 12 modules × 2-4 lessons per module = ~30-40 total lessons
```

## Data Relationships

```
User (auth.users)
  ├── foundation_progress (which modules they've done)
  ├── foundation_lesson_attempts (scores on assessments)
  ├── foundation_streaks (login streaks)
  ├── foundation_activity_log (daily study time)
  └── foundation_user_badges (badges earned)

Lesson (foundation_lessons)
  ├── foundation_lesson_attempts (all attempts on this lesson)
  └── Badge unlock conditions (badge_id references)
```

## Migration Steps

1. Run these SQL statements in your Supabase console (or run as migrations in your app)
2. Seed foundation_lessons with current hardcoded content
3. Seed foundation_badges with milestone badges
4. Create API endpoints to CRUD all tables
5. Build Admin UI at `/admin/foundation` to manage lessons
6. Refactor Foundation pages to fetch from API instead of hardcoded strings
7. Build `/foundation/home` (My Progress dashboard) to visualize data
