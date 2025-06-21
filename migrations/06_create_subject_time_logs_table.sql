-- Migration: Create subject_time_logs table
-- This creates the subject_time_logs table according to APPLICATION_SPECIFICATION.md

-- Create subject_time_logs table
CREATE TABLE IF NOT EXISTS subject_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 86400),
    
    -- Ensure end_time is after start_time if provided
    CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_user_id ON subject_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_subject_id ON subject_time_logs(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_session_id ON subject_time_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_subject_time_logs_start_time ON subject_time_logs(start_time);

-- Enable RLS (Row Level Security)
ALTER TABLE subject_time_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own time logs" ON subject_time_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time logs" ON subject_time_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time logs" ON subject_time_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- QAUTHORs and SUPERADMINs can view all time logs
CREATE POLICY "QAUTHORs and SUPERADMINs can view all time logs" ON subject_time_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('QAUTHOR', 'SUPERADMIN')
        )
    );

-- Comment the table
COMMENT ON TABLE subject_time_logs IS 'Tracks time spent per subject per session for detailed analytics';
COMMENT ON COLUMN subject_time_logs.id IS 'Primary key';
COMMENT ON COLUMN subject_time_logs.user_id IS 'Reference to the user (auth.users.id)';
COMMENT ON COLUMN subject_time_logs.subject_id IS 'Reference to the subject';
COMMENT ON COLUMN subject_time_logs.session_id IS 'Reference to the user session';
COMMENT ON COLUMN subject_time_logs.start_time IS 'When time tracking started for this subject';
COMMENT ON COLUMN subject_time_logs.end_time IS 'When time tracking ended for this subject';
COMMENT ON COLUMN subject_time_logs.duration_seconds IS 'Total time spent on this subject in this session (max 24 hours)'; 