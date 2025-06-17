-- Daily Dose Prep - Database Schema (matches supabase-manual-setup.sql exactly)
-- This file should match the actual database structure

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    examCategory TEXT DEFAULT 'OTHER',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    primarySubject UUID REFERENCES public.subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject UUID REFERENCES public.subjects(id),
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    difficulty TEXT,
    questionHash TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student attempts table
CREATE TABLE IF NOT EXISTS public.student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studentId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    questionId UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selectedOption TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D')),
    isCorrect BOOLEAN NOT NULL,
    attemptedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(studentId, questionId)
);

-- Create daily question sets table
CREATE TABLE IF NOT EXISTS public.daily_question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studentId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    questions UUID[] NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_question_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow SUPERADMIN to create subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow SUPERADMIN to update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow SUPERADMIN to delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "QAUTHORs and STUDENTs can view subjects" ON public.subjects;

DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Allow SUPERADMIN to read all users" ON public.users;

DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
DROP POLICY IF EXISTS "Allow QAUTHOR and SUPERADMIN tocreate questions" ON public.questions;
DROP POLICY IF EXISTS "Allow question creator to update their questions" ON public.questions;
DROP POLICY IF EXISTS "Allow SUPERADMIN to update any question" ON public.questions;
DROP POLICY IF EXISTS "Allow SUPERADMIN to delete questions" ON public.questions;

DROP POLICY IF EXISTS "Students can view their own attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "Students can insert their own attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "SUPERADMIN can view all attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "Students can view their own question sets" ON public.daily_question_sets;
DROP POLICY IF EXISTS "Students can update their own question sets" ON public.daily_question_sets;

-- Subjects policies
CREATE POLICY "Allow public read access to subjects" 
    ON public.subjects FOR SELECT 
    USING (true);

CREATE POLICY "Allow SUPERADMIN to manage subjects" 
    ON public.subjects FOR ALL 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

CREATE POLICY "QAUTHORs and STUDENTs can view subjects" 
    ON public.subjects FOR SELECT 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('QAUTHOR', 'STUDENT', 'SUPERADMIN'));

-- Users policies
CREATE POLICY "Allow users to read their own data" 
    ON public.users FOR SELECT 
    TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Allow SUPERADMIN to read all users" 
    ON public.users FOR SELECT 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

-- Questions policies
CREATE POLICY "Allow public read access to questions" 
    ON public.questions FOR SELECT 
    USING (true);

CREATE POLICY "Allow QAUTHOR to create questions" 
    ON public.questions FOR INSERT 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'QAUTHOR');

CREATE POLICY "Allow question creator to update their questions" 
    ON public.questions FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = created_by);

CREATE POLICY "Allow SUPERADMIN to update any question" 
    ON public.questions FOR UPDATE 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

CREATE POLICY "Allow SUPERADMIN to delete questions" 
    ON public.questions FOR DELETE 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

-- Student attempts policies
CREATE POLICY "Students can view their own attempts" 
    ON public.student_attempts FOR SELECT 
    TO authenticated 
    USING (auth.uid() = studentId AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'STUDENT');

CREATE POLICY "Students can insert their own attempts" 
    ON public.student_attempts FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = studentId AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'STUDENT');

CREATE POLICY "SUPERADMIN can view all attempts" 
    ON public.student_attempts FOR SELECT 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

-- Daily question sets policies
CREATE POLICY "Students can view their own question sets" 
    ON public.daily_question_sets FOR SELECT 
    TO authenticated 
    USING (auth.uid() = studentId AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'STUDENT');

CREATE POLICY "Students can update their own question sets" 
    ON public.daily_question_sets FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = studentId AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'STUDENT');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at);
CREATE INDEX IF NOT EXISTS idx_student_attempts_studentId ON public.student_attempts(studentId);
CREATE INDEX IF NOT EXISTS idx_student_attempts_questionId ON public.student_attempts(questionId);
CREATE INDEX IF NOT EXISTS idx_daily_question_sets_studentId_date ON public.daily_question_sets(studentId, date); 