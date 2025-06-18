# Simple Step-by-Step Migration for Test Data

Since all your data is test data, here's a clean and simple approach:

## 🚀 **STEP 1: Complete Clean Migration (Run this FIRST)**

Copy and paste this **entire script** into Supabase SQL Editor and run it:

```sql
-- CLEAN MIGRATION - DELETES ALL DATA AND REBUILDS SCHEMA
BEGIN;

-- Drop everything
DROP TABLE IF EXISTS daily_question_sets CASCADE;
DROP TABLE IF EXISTS student_attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS exam_category CASCADE;

-- Create types
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'QAUTHOR', 'STUDENT');
CREATE TYPE exam_category AS ENUM ('UPSC', 'JEE', 'NEET', 'SSC', 'OTHER');

-- Create subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    examcategory exam_category DEFAULT 'OTHER',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced users table with streak tracking
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    primarysubject UUID REFERENCES subjects(id),
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
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
    total_duration_seconds INTEGER DEFAULT 0,
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
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
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
    total_attempts INTEGER DEFAULT 0,
    unique_students INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced student_attempts table
CREATE TABLE student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studentId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    questionId UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    session_id UUID REFERENCES user_sessions(id),
    selectedOption TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D')),
    isCorrect BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    attemptedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(studentId, questionId)
);

-- Create daily_question_sets table (legacy compatibility)
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
```

## 🔧 **STEP 2: Add Indexes for Performance**

```sql
-- Create performance indexes
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_subject_id ON user_subjects(subject_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_subject_time_logs_user_id ON subject_time_logs(user_id);
CREATE INDEX idx_questions_subject_id ON questions(subject_id);
CREATE INDEX idx_student_attempts_student_id ON student_attempts(studentId);
CREATE INDEX idx_student_attempts_subject_id ON student_attempts(subject_id);
```

## 🛡️ **STEP 3: Enable RLS (Row Level Security)**

```sql
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

-- Basic RLS policies
CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can manage their own subjects" ON user_subjects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own time logs" ON subject_time_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Everyone can view questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Everyone can view question stats" ON question_stats FOR SELECT USING (true);
CREATE POLICY "Students can manage their own attempts" ON student_attempts FOR ALL USING (auth.uid() = studentId);
CREATE POLICY "Students can manage their own question sets" ON daily_question_sets FOR ALL USING (auth.uid() = studentId);
```

## 📊 **STEP 4: Add Sample Data**

```sql
-- Insert sample subjects
INSERT INTO subjects (name, examcategory, description) VALUES
('Mathematics', 'JEE', 'Advanced mathematics for engineering entrance'),
('Physics', 'JEE', 'Physics concepts for engineering entrance'),
('Chemistry', 'JEE', 'Chemistry fundamentals for engineering entrance'),
('Biology', 'NEET', 'Biology for medical entrance'),
('General Knowledge', 'SSC', 'General awareness and current affairs'),
('History', 'UPSC', 'Indian and world history'),
('Geography', 'UPSC', 'Physical and human geography');
```

## ✅ **STEP 5: Verify Migration**

```sql
-- Check all tables exist
SELECT table_name, 
       CASE WHEN table_name IN ('user_subjects', 'user_sessions', 'subject_time_logs', 'question_stats') 
            THEN '✅ NEW' 
            ELSE '📝 ENHANCED' 
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subjects', 'users', 'user_subjects', 'user_sessions', 'subject_time_logs', 'questions', 'question_stats', 'student_attempts', 'daily_question_sets')
ORDER BY table_name;

-- Check sample data
SELECT 'Sample subjects' as item, COUNT(*) as count FROM subjects;

-- Success message
SELECT '🎉 MIGRATION COMPLETED SUCCESSFULLY!' as status;
```

## 🔄 **What Changed?**

### **NEW TABLES ADDED:**
1. **`user_subjects`** - Multi-subject selection for students
2. **`user_sessions`** - Session tracking for streaks and time
3. **`subject_time_logs`** - Time spent per subject tracking
4. **`question_stats`** - Question popularity tracking

### **ENHANCED EXISTING TABLES:**
1. **`users`** - Added streak columns: `current_streak`, `longest_streak`, `last_login_date`
2. **`student_attempts`** - Added: `subject_id`, `session_id`, `time_spent_seconds`

### **NEW FEATURES ENABLED:**
- ✅ Multi-subject selection for students
- ✅ Login streak tracking
- ✅ Session time monitoring
- ✅ Subject-wise time tracking
- ✅ Question popularity statistics
- ✅ Enhanced analytics capabilities

## 🚀 **Next Steps:**
After running these migrations, your database will be ready for the enhanced student dashboard with:
- Multi-subject support
- Analytics and progress tracking
- Session management
- Question popularity metrics
- Time tracking per subject

The application will need frontend updates to utilize these new features, but the database foundation is now complete! 