-- Migration: Create user_sessions table
-- This creates the user_sessions table according to APPLICATION_SPECIFICATION.md

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    date DATE DEFAULT CURRENT_DATE,
    total_duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure login_time is not a future date
    CHECK (login_time <= NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_date ON user_sessions(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON user_sessions(login_time);

-- Enable RLS (Row Level Security)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- QAUTHORs and SUPERADMINs can view all sessions
CREATE POLICY "QAUTHORs and SUPERADMINs can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('QAUTHOR', 'SUPERADMIN')
        )
    );

-- Comment the table
COMMENT ON TABLE user_sessions IS 'Tracks user login/logout sessions for streak calculation and analytics';
COMMENT ON COLUMN user_sessions.id IS 'Primary key';
COMMENT ON COLUMN user_sessions.user_id IS 'Reference to the user (auth.users.id)';
COMMENT ON COLUMN user_sessions.login_time IS 'When the user logged in';
COMMENT ON COLUMN user_sessions.logout_time IS 'When the user logged out (null if still active)';
COMMENT ON COLUMN user_sessions.date IS 'Date of the session for streak calculation';
COMMENT ON COLUMN user_sessions.total_duration_seconds IS 'Total session duration in seconds';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether the session is currently active'; 