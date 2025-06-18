-- Migration 03: Enhanced Student Dashboard with Multi-Subject Support
-- This migration adds all necessary tables and columns for the enhanced student experience
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- STEP 1: Add new columns to existing users table for streak tracking
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- Add constraints for streak columns
ALTER TABLE users ADD CONSTRAINT users_current_streak_check CHECK (current_streak >= 0 AND current_streak <= 9999);
ALTER TABLE users ADD CONSTRAINT users_longest_streak_check CHECK (longest_streak >= 0 AND longest_streak <= 9999);

-- ============================================================================
-- STEP 2: Create user_subjects table for multi-subject support
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

-- Add constraint to ensure only one primary subject per user
CREATE UNIQUE INDEX IF NOT EXISTS user_subjects_one_primary_per_user 
ON user_subjects (user_id) WHERE is_primary = TRUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_subject_id ON user_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_active ON user_subjects(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 3: Create user_sessions table for session tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    date DATE DEFAULT CURRENT_DATE,
    total_duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_duration_check CHECK (total_duration_seconds >= 0);
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_logout_after_login CHECK (logout_time IS NULL OR logout_time >= login_time);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_date ON user_sessions(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 4: Create subject_time_logs table for time tracking per subject
-- ============================================================================

CREATE TABLE IF NOT EXISTS subject_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE subject_time_logs ADD CONSTRAINT subject_time_logs_duration_check CHECK (duration_seconds >= 0 AND duration_seconds <= 86400);
ALTER TABLE subject_time_logs ADD CONSTRAINT subject_time_logs_end_after_start CHECK (end_time IS NULL OR end_time >= start_time);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_user_id ON subject_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_subject_id ON subject_time_logs(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_session_id ON subject_time_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_user_subject ON subject_time_logs(user_id, subject_id);

-- ============================================================================
-- STEP 5: Create question_stats table for question popularity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_stats (
    question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0,
    unique_students INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE question_stats ADD CONSTRAINT question_stats_attempts_check CHECK (total_attempts >= 0);
ALTER TABLE question_stats ADD CONSTRAINT question_stats_unique_students_check CHECK (unique_students >= 0);
ALTER TABLE question_stats ADD CONSTRAINT question_stats_correct_attempts_check CHECK (correct_attempts >= 0 AND correct_attempts <= total_attempts);
ALTER TABLE question_stats ADD CONSTRAINT question_stats_unique_vs_total_check CHECK (unique_students <= total_attempts);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_stats_total_attempts ON question_stats(total_attempts DESC);
CREATE INDEX IF NOT EXISTS idx_question_stats_unique_students ON question_stats(unique_students DESC);

-- ============================================================================
-- STEP 6: Enhance student_attempts table with new columns
-- ============================================================================

ALTER TABLE student_attempts ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);
ALTER TABLE student_attempts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES user_sessions(id);
ALTER TABLE student_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Add constraints for new columns
ALTER TABLE student_attempts ADD CONSTRAINT student_attempts_time_spent_check CHECK (time_spent_seconds >= 0);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_student_attempts_subject_id ON student_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_session_id ON student_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_user_subject ON student_attempts(studentId, subject_id);

-- ============================================================================
-- STEP 7: Initialize question_stats for existing questions
-- ============================================================================

INSERT INTO question_stats (question_id, total_attempts, unique_students, correct_attempts)
SELECT 
    q.id,
    COALESCE(stats.total_attempts, 0),
    COALESCE(stats.unique_students, 0),
    COALESCE(stats.correct_attempts, 0)
FROM questions q
LEFT JOIN (
    SELECT 
        questionId,
        COUNT(*) as total_attempts,
        COUNT(DISTINCT studentId) as unique_students,
        SUM(CASE WHEN isCorrect THEN 1 ELSE 0 END) as correct_attempts
    FROM student_attempts
    GROUP BY questionId
) stats ON q.id = stats.questionId
ON CONFLICT (question_id) DO UPDATE SET
    total_attempts = EXCLUDED.total_attempts,
    unique_students = EXCLUDED.unique_students,
    correct_attempts = EXCLUDED.correct_attempts,
    last_updated = NOW();

-- ============================================================================
-- STEP 8: Migrate existing primarysubject data to user_subjects table
-- ============================================================================

INSERT INTO user_subjects (user_id, subject_id, is_primary, is_active, selected_at)
SELECT 
    id as user_id,
    primarysubject as subject_id,
    TRUE as is_primary,
    TRUE as is_active,
    created_at as selected_at
FROM users 
WHERE role = 'STUDENT' 
AND primarysubject IS NOT NULL
ON CONFLICT (user_id, subject_id) DO UPDATE SET
    is_primary = TRUE,
    is_active = TRUE;

-- ============================================================================
-- STEP 9: Update student_attempts with subject_id from questions
-- ============================================================================

UPDATE student_attempts 
SET subject_id = q.subject_id
FROM questions q
WHERE student_attempts.questionId = q.id
AND student_attempts.subject_id IS NULL;

-- ============================================================================
-- STEP 10: Create RLS (Row Level Security) policies for new tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subjects
CREATE POLICY "Users can view their own subjects" ON user_subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects" ON user_subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" ON user_subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user subjects" ON user_subjects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('SUPERADMIN', 'QAUTHOR')
        )
    );

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for subject_time_logs
CREATE POLICY "Users can view their own time logs" ON subject_time_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time logs" ON subject_time_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time logs" ON subject_time_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for question_stats (read-only for all authenticated users)
CREATE POLICY "All users can view question stats" ON question_stats
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system can update question stats" ON question_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'SUPERADMIN'
        )
    );

-- ============================================================================
-- STEP 11: Create functions for automatic updates
-- ============================================================================

-- Function to update question stats when student_attempts changes
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update question stats
    INSERT INTO question_stats (question_id, total_attempts, unique_students, correct_attempts)
    SELECT 
        NEW.questionId,
        1,
        1,
        CASE WHEN NEW.isCorrect THEN 1 ELSE 0 END
    ON CONFLICT (question_id) DO UPDATE SET
        total_attempts = question_stats.total_attempts + 1,
        unique_students = (
            SELECT COUNT(DISTINCT studentId) 
            FROM student_attempts 
            WHERE questionId = NEW.questionId
        ),
        correct_attempts = question_stats.correct_attempts + CASE WHEN NEW.isCorrect THEN 1 ELSE 0 END,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic question stats updates
DROP TRIGGER IF EXISTS trigger_update_question_stats ON student_attempts;
CREATE TRIGGER trigger_update_question_stats
    AFTER INSERT ON student_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_question_stats();

-- Function to update user streaks on session creation
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_date DATE := NEW.date;
BEGIN
    -- Get user's last login date
    SELECT last_login_date INTO last_date FROM users WHERE id = NEW.user_id;
    
    -- Update streak logic
    IF last_date IS NULL THEN
        -- First login
        UPDATE users SET 
            current_streak = 1,
            longest_streak = GREATEST(longest_streak, 1),
            last_login_date = current_date
        WHERE id = NEW.user_id;
    ELSIF last_date = current_date THEN
        -- Same day login, no change to streak
        NULL;
    ELSIF last_date = current_date - INTERVAL '1 day' THEN
        -- Consecutive day login
        UPDATE users SET 
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_login_date = current_date
        WHERE id = NEW.user_id;
    ELSE
        -- Streak broken
        UPDATE users SET 
            current_streak = 1,
            longest_streak = GREATEST(longest_streak, 1),
            last_login_date = current_date
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic streak updates
DROP TRIGGER IF EXISTS trigger_update_user_streak ON user_sessions;
CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- ============================================================================
-- STEP 12: Create helpful views for analytics
-- ============================================================================

-- View for user subject performance
CREATE OR REPLACE VIEW user_subject_performance AS
SELECT 
    us.user_id,
    us.subject_id,
    s.name as subject_name,
    us.is_primary,
    us.is_active,
    COALESCE(perf.total_questions, 0) as total_questions_attempted,
    COALESCE(perf.correct_answers, 0) as correct_answers,
    COALESCE(ROUND(perf.correct_answers::numeric / NULLIF(perf.total_questions, 0) * 100, 2), 0) as success_rate,
    COALESCE(time_data.total_time_seconds, 0) as total_time_spent_seconds,
    us.selected_at
FROM user_subjects us
JOIN subjects s ON us.subject_id = s.id
LEFT JOIN (
    SELECT 
        studentId,
        subject_id,
        COUNT(*) as total_questions,
        SUM(CASE WHEN isCorrect THEN 1 ELSE 0 END) as correct_answers
    FROM student_attempts
    WHERE subject_id IS NOT NULL
    GROUP BY studentId, subject_id
) perf ON us.user_id = perf.studentId AND us.subject_id = perf.subject_id
LEFT JOIN (
    SELECT 
        user_id,
        subject_id,
        SUM(duration_seconds) as total_time_seconds
    FROM subject_time_logs
    GROUP BY user_id, subject_id
) time_data ON us.user_id = time_data.user_id AND us.subject_id = time_data.subject_id;

-- View for daily user activity
CREATE OR REPLACE VIEW daily_user_activity AS
SELECT 
    user_id,
    date,
    COUNT(*) as sessions_count,
    SUM(total_duration_seconds) as total_time_seconds,
    MIN(login_time) as first_login,
    MAX(COALESCE(logout_time, login_time)) as last_activity
FROM user_sessions
GROUP BY user_id, date
ORDER BY user_id, date DESC;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration worked)
-- ============================================================================

-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_subjects', 'user_sessions', 'subject_time_logs', 'question_stats')
ORDER BY table_name;

-- Check new columns in existing tables
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('current_streak', 'longest_streak', 'last_login_date')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_attempts' 
AND column_name IN ('subject_id', 'session_id', 'time_spent_seconds')
ORDER BY column_name;

-- Check data migration
SELECT 'user_subjects' as table_name, COUNT(*) as record_count FROM user_subjects
UNION ALL
SELECT 'question_stats' as table_name, COUNT(*) as record_count FROM question_stats
UNION ALL
SELECT 'migrated_primary_subjects' as table_name, COUNT(*) as record_count 
FROM user_subjects WHERE is_primary = TRUE;

-- Check views
SELECT 'user_subject_performance' as view_name, COUNT(*) as record_count FROM user_subject_performance
UNION ALL
SELECT 'daily_user_activity' as view_name, COUNT(*) as record_count FROM daily_user_activity;

-- Success message
SELECT 'Migration 03: Enhanced Student Dashboard completed successfully!' as status; 