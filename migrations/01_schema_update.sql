-- Add the questionHash column to the questions table to prevent duplicates
ALTER TABLE IF EXISTS questions 
ADD COLUMN IF NOT EXISTS questionHash TEXT;

-- Add primarySubject to users table for students
ALTER TABLE IF EXISTS users 
ADD COLUMN IF NOT EXISTS primarySubject UUID REFERENCES subjects(id);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  examCategory TEXT NOT NULL CHECK (examCategory IN ('UPSC', 'JEE', 'NEET', 'SSC', 'OTHER')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Set up Row Level Security for subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Create policy for SUPERADMIN to manage subjects
CREATE POLICY "SUPERADMIN can manage subjects" ON subjects
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPERADMIN'
  );
  
-- Create policy for QAUTHORs and STUDENTs to view subjects
CREATE POLICY "QAUTHORs and STUDENTs can view subjects" ON subjects
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('QAUTHOR', 'STUDENT', 'SUPERADMIN')
  );

-- Create daily_question_sets table
CREATE TABLE IF NOT EXISTS daily_question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studentId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  questions UUID[] NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security for daily question sets
ALTER TABLE daily_question_sets ENABLE ROW LEVEL SECURITY;

-- Create policy for students to view and update only their own question sets
CREATE POLICY "Students can view their own question sets" ON daily_question_sets
  FOR SELECT USING (
    auth.uid() = studentId AND 
    (SELECT role FROM users WHERE id = auth.uid()) = 'STUDENT'
  );
  
CREATE POLICY "Students can update their own question sets" ON daily_question_sets
  FOR UPDATE USING (
    auth.uid() = studentId AND 
    (SELECT role FROM users WHERE id = auth.uid()) = 'STUDENT'
  );

-- Create student_attempts table to track student answers
CREATE TABLE IF NOT EXISTS student_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studentId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  questionId UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selectedOption TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D')),
  isCorrect BOOLEAN NOT NULL,
  attemptedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security for attempts
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy for students to view only their own attempts
CREATE POLICY "Students can view their own attempts" ON student_attempts
  FOR SELECT USING (
    auth.uid() = studentId AND 
    (SELECT role FROM users WHERE id = auth.uid()) = 'STUDENT'
  );

-- Create policy for students to insert their own attempts
CREATE POLICY "Students can insert their own attempts" ON student_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = studentId AND 
    (SELECT role FROM users WHERE id = auth.uid()) = 'STUDENT'
  );

-- Create policy for SUPERADMIN to view all attempts for analytics
CREATE POLICY "SUPERADMIN can view all attempts" ON student_attempts
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'SUPERADMIN'
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_createdAt ON questions(createdAt);
CREATE INDEX IF NOT EXISTS idx_student_attempts_studentId ON student_attempts(studentId);
CREATE INDEX IF NOT EXISTS idx_daily_question_sets_studentId_date ON daily_question_sets(studentId, date); 