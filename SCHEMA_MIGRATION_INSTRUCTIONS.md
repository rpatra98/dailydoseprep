# Enhanced Student Dashboard - Schema Migration Instructions

## Overview
This document provides step-by-step instructions to migrate your Daily Dose Prep database schema to support the enhanced student dashboard with multi-subject support, analytics, and session tracking.

## Pre-Migration Checklist
- [ ] Backup your current database
- [ ] Ensure you have SUPERADMIN access to Supabase
- [ ] Verify current schema is working
- [ ] Note down current student count and their primary subjects

## Step-by-Step Migration Process

### Step 1: Database Backup
```sql
-- Create a backup of critical tables before migration
-- Run this in Supabase SQL Editor

-- Backup users table
CREATE TABLE users_backup AS SELECT * FROM users;

-- Backup student_attempts table  
CREATE TABLE student_attempts_backup AS SELECT * FROM student_attempts;

-- Backup subjects table
CREATE TABLE subjects_backup AS SELECT * FROM subjects;

-- Verify backups
SELECT 'users_backup' as table_name, COUNT(*) as record_count FROM users_backup
UNION ALL
SELECT 'student_attempts_backup' as table_name, COUNT(*) as record_count FROM student_attempts_backup  
UNION ALL
SELECT 'subjects_backup' as table_name, COUNT(*) as record_count FROM subjects_backup;
```

### Step 2: Run Main Migration Script
Copy and execute the entire content of `migrations/03_enhanced_student_dashboard.sql` in your Supabase SQL Editor.

**Important Notes:**
- Run the entire script in one go (it's wrapped in a transaction)
- If any step fails, the entire migration will rollback
- The script includes verification queries at the end

### Step 3: Verify Migration Success
After running the migration script, verify the changes:

```sql
-- Check new tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_subjects', 'user_sessions', 'subject_time_logs', 'question_stats')
ORDER BY table_name;

-- Check new columns were added to users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('current_streak', 'longest_streak', 'last_login_date')
ORDER BY column_name;

-- Check new columns were added to student_attempts table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_attempts' 
AND column_name IN ('subject_id', 'session_id', 'time_spent_seconds')
ORDER BY column_name;

-- Verify data migration
SELECT 'Migrated primary subjects' as description, COUNT(*) as count 
FROM user_subjects WHERE is_primary = TRUE;

SELECT 'Question stats initialized' as description, COUNT(*) as count 
FROM question_stats;
```

### Step 4: Test New Functionality
Run these queries to test the new features:

```sql
-- Test user subject selection
INSERT INTO user_subjects (user_id, subject_id, is_active, is_primary)
SELECT 
    (SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1),
    (SELECT id FROM subjects LIMIT 1),
    TRUE,
    FALSE
ON CONFLICT (user_id, subject_id) DO NOTHING;

-- Test session creation
INSERT INTO user_sessions (user_id, login_time, date)
SELECT 
    (SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1),
    NOW(),
    CURRENT_DATE
RETURNING *;

-- Test question stats
SELECT 
    q.title,
    qs.total_attempts,
    qs.unique_students,
    qs.correct_attempts
FROM questions q
JOIN question_stats qs ON q.id = qs.question_id
ORDER BY qs.total_attempts DESC
LIMIT 5;
```

### Step 5: Update Application Configuration
After successful migration, update your application:

1. **Environment Variables**: No changes needed
2. **API Routes**: New routes will be added in subsequent steps
3. **Frontend Components**: New dashboard components will be developed

## New Database Schema Summary

### New Tables Added:
1. **user_subjects** - Multi-subject selection for students
2. **user_sessions** - Session tracking for streaks and time
3. **subject_time_logs** - Time spent per subject tracking
4. **question_stats** - Question popularity and attempt statistics

### Enhanced Existing Tables:
1. **users** - Added streak tracking columns
2. **student_attempts** - Added subject_id, session_id, time_spent_seconds

### New Indexes Created:
- Performance indexes on all new tables
- Composite indexes for common query patterns
- Partial indexes for active records

### New Constraints Added:
- Data validation constraints
- Foreign key relationships
- Unique constraints for data integrity

## Pre-Fix vs Post-Fix System Behavior

### PRE-FIX (Current System):
**Student Dashboard:**
- Simple interface showing daily questions
- Single primary subject selection (cannot be changed)
- Basic question answering interface
- Simple result feedback after daily completion
- No analytics or progress tracking
- No session tracking or streaks

**Database Structure:**
- Single `primarysubject` column in users table
- Basic `student_attempts` table
- No session or time tracking
- No question popularity metrics
- No multi-subject support

**User Experience:**
- Limited to one subject forever
- No progress visibility
- No engagement metrics
- Simple daily routine without analytics

### POST-FIX (Enhanced System):
**Student Dashboard:**
- **Comprehensive Analytics Dashboard** with:
  - Score by subject (individual performance metrics)
  - Overall score (average across all subjects)
  - Login streak counter (consecutive days)
  - Time spent analytics (tabbed interface per subject)
- **Multi-Subject Selection System**:
  - Select multiple subjects for practice
  - Subject-wise progress tracking
  - Flexible subject management
- **Enhanced Practice Mode**:
  - Persistent timer tracking session time
  - Subject tabs for easy switching
  - Question popularity indicators
  - Unlimited practice (no daily limits)
  - Real-time performance updates

**Database Structure:**
- **user_subjects** table for multi-subject support
- **user_sessions** table for session and streak tracking
- **subject_time_logs** table for granular time tracking
- **question_stats** table for question popularity
- Enhanced **student_attempts** with analytics fields
- Comprehensive indexes and constraints

**User Experience:**
- **Rich Analytics**: Detailed performance insights
- **Multi-Subject Learning**: Comprehensive exam preparation
- **Engagement Features**: Streaks, time tracking, progress visualization
- **Flexible Practice**: Subject-based practice with real-time feedback
- **Comparative Analysis**: See question popularity and personal performance

## Rollback Instructions (If Needed)
If you need to rollback the migration:

```sql
-- WARNING: This will lose all new data
BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS subject_time_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE; 
DROP TABLE IF EXISTS user_subjects CASCADE;
DROP TABLE IF EXISTS question_stats CASCADE;

-- Remove new columns from existing tables
ALTER TABLE users DROP COLUMN IF EXISTS current_streak;
ALTER TABLE users DROP COLUMN IF EXISTS longest_streak;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date;

ALTER TABLE student_attempts DROP COLUMN IF EXISTS subject_id;
ALTER TABLE student_attempts DROP COLUMN IF EXISTS session_id;
ALTER TABLE student_attempts DROP COLUMN IF EXISTS time_spent_seconds;

-- Restore from backup if needed
-- INSERT INTO users SELECT * FROM users_backup;
-- INSERT INTO student_attempts SELECT * FROM student_attempts_backup;

COMMIT;
```

## Post-Migration Development Tasks
After successful schema migration:

1. **API Development** (Weeks 3-4):
   - Create session management endpoints
   - Build analytics API routes
   - Implement multi-subject selection APIs

2. **Frontend Development** (Weeks 5-6):
   - Build enhanced dashboard components
   - Create practice mode interface
   - Implement timer and analytics features

3. **Testing & Optimization** (Weeks 7-8):
   - Performance testing with new schema
   - User experience testing
   - Mobile responsiveness

## Support & Troubleshooting
If you encounter issues:

1. **Check Migration Logs**: Review Supabase logs for errors
2. **Verify Constraints**: Ensure all foreign keys are valid
3. **Test Queries**: Run verification queries to check data integrity
4. **Rollback if Needed**: Use rollback instructions if critical issues occur

## Success Indicators
Migration is successful when:
- [ ] All new tables exist and are populated
- [ ] All new columns exist with correct data types
- [ ] Existing data is preserved and migrated correctly
- [ ] All verification queries return expected results
- [ ] No constraint violations or foreign key errors
- [ ] RLS policies are properly configured

This migration transforms your simple daily question system into a comprehensive exam preparation platform with advanced analytics and multi-subject support. 