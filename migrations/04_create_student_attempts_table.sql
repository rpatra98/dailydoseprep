-- Migration: Create student_attempts table
-- This creates the student_attempts table according to APPLICATION_SPECIFICATION.md

-- Create student_attempts table
CREATE TABLE IF NOT EXISTS student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "questionId" UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    "selectedOption" TEXT NOT NULL CHECK ("selectedOption" IN ('A', 'B', 'C', 'D')),
    "isCorrect" BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    "attemptedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one attempt per question per student
    UNIQUE("studentId", "questionId")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_attempts_student_id ON student_attempts("studentId");
CREATE INDEX IF NOT EXISTS idx_student_attempts_question_id ON student_attempts("questionId");
CREATE INDEX IF NOT EXISTS idx_student_attempts_subject_id ON student_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_session_id ON student_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_attempted_at ON student_attempts("attemptedAt");

-- Enable RLS (Row Level Security)
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Students can view their own attempts" ON student_attempts
    FOR SELECT USING (auth.uid() = "studentId");

CREATE POLICY "Students can insert their own attempts" ON student_attempts
    FOR INSERT WITH CHECK (auth.uid() = "studentId");

CREATE POLICY "Students can update their own attempts" ON student_attempts
    FOR UPDATE USING (auth.uid() = "studentId");

-- QAUTHORs and SUPERADMINs can view all attempts
CREATE POLICY "QAUTHORs and SUPERADMINs can view all attempts" ON student_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('QAUTHOR', 'SUPERADMIN')
        )
    );

-- Comment the table
COMMENT ON TABLE student_attempts IS 'Stores student answers to questions with performance tracking';
COMMENT ON COLUMN student_attempts.id IS 'Primary key';
COMMENT ON COLUMN student_attempts."studentId" IS 'Reference to the student (auth.users.id)';
COMMENT ON COLUMN student_attempts."questionId" IS 'Reference to the question';
COMMENT ON COLUMN student_attempts.subject_id IS 'Reference to the subject for analytics';
COMMENT ON COLUMN student_attempts.session_id IS 'Reference to the user session';
COMMENT ON COLUMN student_attempts."selectedOption" IS 'Student selected option (A, B, C, or D)';
COMMENT ON COLUMN student_attempts."isCorrect" IS 'Whether the answer was correct';
COMMENT ON COLUMN student_attempts.time_spent_seconds IS 'Time spent on this question in seconds';
COMMENT ON COLUMN student_attempts."attemptedAt" IS 'When the attempt was made'; 