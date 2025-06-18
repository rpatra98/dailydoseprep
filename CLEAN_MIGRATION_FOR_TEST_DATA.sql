-- CLEAN MIGRATION FOR TEST DATA ENVIRONMENT
-- This script completely rebuilds the database with enhanced student dashboard schema
-- ⚠️  WARNING: This will DELETE ALL existing data
-- Only use this if you're okay with losing all current data

-- ============================================================================
-- STEP 1: Clean slate - Drop all existing data and constraints
-- ============================================================================

BEGIN;

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS daily_question_sets CASCADE;
DROP TABLE IF EXISTS student_attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- Drop any existing custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS exam_category CASCADE;

-- ============================================================================
-- STEP 2: Create enhanced schema with all new features
-- ============================================================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'QAUTHOR', 'STUDENT');
CREATE TYPE exam_category AS ENUM ('UPSC', 'JEE', 'NEET', 'SSC', 'OTHER');

-- Create subjects table (enhanced)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    examcategory exam_category DEFAULT 'OTHER',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (enhanced with streak tracking)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    primarysubject UUID REFERENCES subjects(id), -- DEPRECATED but kept for compatibility
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0 AND current_streak <= 9999),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0 AND longest_streak <= 9999),
    last_login_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_subjects table (NEW - Multi-subject support)
CREATE TABLE user_subjects (
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

-- Create user_sessions table (NEW - Session tracking)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    date DATE DEFAULT CURRENT_DATE,
    total_duration_seconds INTEGER DEFAULT 0 CHECK (total_duration_seconds >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subject_time_logs table (NEW - Time tracking per subject)
CREATE TABLE subject_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 86400),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Create questions table (enhanced)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    correct_answer TEXT,
    explanation TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    exam_category TEXT NOT NULL,
    year INTEGER,
    source TEXT,
    questionhash TEXT,
    options JSONB,
    subject_id UUID REFERENCES subjects(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_stats table (NEW - Question popularity tracking)
CREATE TABLE question_stats (
    question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
    unique_students INTEGER DEFAULT 0 CHECK (unique_students >= 0),
    correct_attempts INTEGER DEFAULT 0 CHECK (correct_attempts >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (correct_attempts <= total_attempts),
    CHECK (unique_students <= total_attempts)
);

-- Create student_attempts table (enhanced)
CREATE TABLE student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studentId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    questionId UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    session_id UUID REFERENCES user_sessions(id),
    selectedOption TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D')),
    isCorrect BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
    attemptedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(studentId, questionId)
);

-- Create daily_question_sets table (legacy - for backward compatibility)
CREATE TABLE daily_question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studentId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    questions UUID[] NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

-- Indexes for user_subjects
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_subject_id ON user_subjects(subject_id);
CREATE INDEX idx_user_subjects_active ON user_subjects(user_id, is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_user_subjects_one_primary_per_user ON user_subjects(user_id) WHERE is_primary = TRUE;

-- Indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_date ON user_sessions(date);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Indexes for subject_time_logs
CREATE INDEX idx_subject_time_logs_user_id ON subject_time_logs(user_id);
CREATE INDEX idx_subject_time_logs_subject_id ON subject_time_logs(subject_id);
CREATE INDEX idx_subject_time_logs_session_id ON subject_time_logs(session_id);
CREATE INDEX idx_subject_time_logs_user_subject ON subject_time_logs(user_id, subject_id);

-- Indexes for questions
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_exam_category ON questions(exam_category);

-- Indexes for question_stats
CREATE INDEX idx_question_stats_total_attempts ON question_stats(total_attempts DESC);
CREATE INDEX idx_question_stats_unique_students ON question_stats(unique_students DESC);

-- Indexes for student_attempts
CREATE INDEX idx_student_attempts_student_id ON student_attempts(studentId);
CREATE INDEX idx_student_attempts_question_id ON student_attempts(questionId);
CREATE INDEX idx_student_attempts_subject_id ON student_attempts(subject_id);
CREATE INDEX idx_student_attempts_session_id ON student_attempts(session_id);
CREATE INDEX idx_student_attempts_user_subject ON student_attempts(studentId, subject_id);
CREATE INDEX idx_student_attempts_attempted_at ON student_attempts(attemptedAt);

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_question_sets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies
-- ============================================================================

-- Subjects policies
CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Only SUPERADMIN can modify subjects" ON subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPERADMIN')
);

-- Users policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "SUPERADMIN can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPERADMIN')
);
CREATE POLICY "SUPERADMIN can modify all users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPERADMIN')
);

-- User subjects policies
CREATE POLICY "Users can manage their own subjects" ON user_subjects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user subjects" ON user_subjects FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SUPERADMIN', 'QAUTHOR'))
);

-- User sessions policies
CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);

-- Subject time logs policies
CREATE POLICY "Users can manage their own time logs" ON subject_time_logs FOR ALL USING (auth.uid() = user_id);

-- Questions policies
CREATE POLICY "Everyone can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "QAUTHORs can manage their own questions" ON questions FOR ALL USING (
    auth.uid() = created_by AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'QAUTHOR')
);
CREATE POLICY "SUPERADMIN can manage all questions" ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPERADMIN')
);

-- Question stats policies
CREATE POLICY "Everyone can view question stats" ON question_stats FOR SELECT USING (true);
CREATE POLICY "System can update question stats" ON question_stats FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SUPERADMIN', 'QAUTHOR'))
);

-- Student attempts policies
CREATE POLICY "Students can manage their own attempts" ON student_attempts FOR ALL USING (auth.uid() = studentId);
CREATE POLICY "Admins can view all attempts" ON student_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('SUPERADMIN', 'QAUTHOR'))
);

-- Daily question sets policies
CREATE POLICY "Students can manage their own question sets" ON daily_question_sets FOR ALL USING (auth.uid() = studentId);

-- ============================================================================
-- STEP 6: Create automatic update functions and triggers
-- ============================================================================

-- Function to update question stats automatically
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO question_stats (question_id, total_attempts, unique_students, correct_attempts)
    VALUES (
        NEW.questionId,
        1,
        1,
        CASE WHEN NEW.isCorrect THEN 1 ELSE 0 END
    )
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

-- Function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_date DATE := NEW.date;
BEGIN
    SELECT last_login_date INTO last_date FROM users WHERE id = NEW.user_id;
    
    IF last_date IS NULL THEN
        -- First login
        UPDATE users SET 
            current_streak = 1,
            longest_streak = GREATEST(longest_streak, 1),
            last_login_date = current_date
        WHERE id = NEW.user_id;
    ELSIF last_date = current_date THEN
        -- Same day login, no change
        NULL;
    ELSIF last_date = current_date - INTERVAL '1 day' THEN
        -- Consecutive day
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

-- Create triggers
CREATE TRIGGER trigger_update_question_stats
    AFTER INSERT ON student_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_question_stats();

CREATE TRIGGER trigger_update_user_streak
    AFTER INSERT ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- ============================================================================
-- STEP 7: Create helpful views for analytics
-- ============================================================================

-- User subject performance view
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

-- Daily user activity view
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

-- ============================================================================
-- STEP 8: Insert sample data for testing
-- ============================================================================

-- Insert sample subjects
INSERT INTO subjects (name, examcategory, description) VALUES
('Mathematics', 'JEE', 'Advanced mathematics for engineering entrance'),
('Physics', 'JEE', 'Physics concepts for engineering entrance'),
('Chemistry', 'JEE', 'Chemistry fundamentals for engineering entrance'),
('Biology', 'NEET', 'Biology for medical entrance'),
('General Knowledge', 'SSC', 'General awareness and current affairs'),
('History', 'UPSC', 'Indian and world history'),
('Geography', 'UPSC', 'Physical and human geography');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_subjects', 'user_sessions', 'subject_time_logs', 'question_stats') 
        THEN '✅ NEW TABLE'
        ELSE '📝 ENHANCED TABLE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'subjects', 'users', 'user_subjects', 'user_sessions', 
    'subject_time_logs', 'questions', 'question_stats', 
    'student_attempts', 'daily_question_sets'
)
ORDER BY 
    CASE WHEN table_name IN ('user_subjects', 'user_sessions', 'subject_time_logs', 'question_stats') THEN 1 ELSE 2 END,
    table_name;

-- Verify sample data
SELECT 'Sample subjects created' as description, COUNT(*) as count FROM subjects;

-- Verify views
SELECT 'Views created' as description, COUNT(*) as count 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('user_subject_performance', 'daily_user_activity');

-- Verify indexes
SELECT 'Indexes created' as description, COUNT(*) as count 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Success message
SELECT '🎉 CLEAN MIGRATION COMPLETED SUCCESSFULLY! 🎉' as status,
       'Database is now ready for enhanced student dashboard' as message; 