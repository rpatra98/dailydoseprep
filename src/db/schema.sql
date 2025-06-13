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

-- Create users table if not exists (Supabase Auth creates this, but we'll add our custom fields)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT',
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
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Allow public read access to subjects" 
    ON public.subjects FOR SELECT 
    USING (true);

CREATE POLICY "Allow SUPERADMIN to create subjects" 
    ON public.subjects FOR INSERT 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

CREATE POLICY "Allow SUPERADMIN to update subjects" 
    ON public.subjects FOR UPDATE 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

CREATE POLICY "Allow SUPERADMIN to delete subjects" 
    ON public.subjects FOR DELETE 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

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

CREATE POLICY "Allow QAUTHOR and SUPERADMIN to create questions" 
    ON public.questions FOR INSERT 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('QAUTHOR', 'SUPERADMIN'));

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

-- Student attempts table
CREATE TABLE student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) NOT NULL,
    question_id UUID REFERENCES questions(id) NOT NULL,
    selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, question_id)
);

-- Create indexes
CREATE INDEX idx_questions_exam_category ON questions(exam_category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_student_attempts_student_id ON student_attempts(student_id);
CREATE INDEX idx_student_attempts_question_id ON student_attempts(question_id);

-- Create initial SUPERADMIN user
INSERT INTO users (email, password_hash, role)
VALUES ('admin@dailydoseprep.com', 'CHANGE_THIS_PASSWORD_HASH', 'SUPERADMIN'); 