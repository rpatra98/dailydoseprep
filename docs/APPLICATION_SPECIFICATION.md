# Daily Dose Prep - Application Specification v2.0

## Database Conventions & Technical Standards

### **CRITICAL: Database Naming Convention**
- **The actual database schema uses MIXED naming conventions** (verified from live database inspection)
- **Most columns use snake_case**: `subject_id`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `correct_answer`, `exam_category`, `created_at`, `updated_at`
- **Some columns use lowercase**: `examcategory`, `primarysubject`, `questionhash`
- **This specification reflects the ACTUAL database structure as of latest inspection**

### Database Schema - Single Source of Truth
**AUTHORITATIVE SCHEMA**: Live database structure (verified via SQL inspection)

### Enhanced Database Tables Structure (ACTUAL COLUMN NAMES AND TYPES)

#### questions table (COMPLETE STRUCTURE):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `title` TEXT NOT NULL - **Brief question title/heading**
- `content` TEXT NOT NULL - **Full detailed question text**
- `option_a` TEXT NOT NULL - **Answer option A text**
- `option_b` TEXT NOT NULL - **Answer option B text**
- `option_c` TEXT NOT NULL - **Answer option C text**
- `option_d` TEXT NOT NULL - **Answer option D text**
- `correct_option` CHARACTER NOT NULL - **Single character: 'A', 'B', 'C', or 'D'**
- `correct_answer` TEXT (nullable) - **Full text of the correct answer (redundant with option text)**
- `explanation` TEXT NOT NULL - **Detailed explanation of why the answer is correct**
- `difficulty` TEXT NOT NULL - **Difficulty level: 'EASY', 'MEDIUM', 'HARD'**
- `exam_category` TEXT NOT NULL - **Exam type: 'UPSC', 'JEE', 'NEET', 'SSC', 'OTHER'**
- `year` INTEGER (nullable) - **Year the question was from (if applicable)**
- `source` TEXT (nullable) - **Source/reference information**
- `questionhash` TEXT (nullable) - **Unique hash to prevent duplicate questions**
- `options` JSONB (nullable) - **Alternative JSON storage: {"A": "text", "B": "text", "C": "text", "D": "text"}**
- `subject_id` UUID (nullable) - **Foreign key to subjects.id**
- `created_by` UUID NOT NULL - **Foreign key to users.id (QAUTHOR who created this)**
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT now()

#### users table (ENHANCED STRUCTURE - HYBRID AUTH + CUSTOM):
**Note: This table combines Supabase Auth fields with custom application fields**

**Custom Application Fields:**
- `id` UUID PRIMARY KEY - **References auth.users.id**
- `email` TEXT NOT NULL - **User email address**
- `role` USER-DEFINED NOT NULL - **Application role: 'SUPERADMIN', 'QAUTHOR', 'STUDENT'**
- `primarysubject` UUID (nullable) - **DEPRECATED: Use user_subjects table instead**
- `current_streak` INTEGER DEFAULT 0 - **Current consecutive login days**
- `longest_streak` INTEGER DEFAULT 0 - **Longest streak ever achieved**
- `last_login_date` DATE - **Last login date for streak calculation**
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT now()

**Supabase Auth Fields (automatically managed):**
- `instance_id` UUID (nullable)
- `password_hash` TEXT (nullable)
- `aud` CHARACTER VARYING (nullable)
- `encrypted_password` CHARACTER VARYING (nullable)
- `email_confirmed_at` TIMESTAMP WITH TIME ZONE (nullable)
- `invited_at` TIMESTAMP WITH TIME ZONE (nullable)
- `confirmation_token` CHARACTER VARYING (nullable)
- `confirmation_sent_at` TIMESTAMP WITH TIME ZONE (nullable)
- `recovery_token` CHARACTER VARYING (nullable)
- `recovery_sent_at` TIMESTAMP WITH TIME ZONE (nullable)
- `email_change_token_new` CHARACTER VARYING (nullable)
- `email_change` CHARACTER VARYING (nullable)
- `email_change_sent_at` TIMESTAMP WITH TIME ZONE (nullable)
- `last_sign_in_at` TIMESTAMP WITH TIME ZONE (nullable)
- `raw_app_meta_data` JSONB (nullable)
- `raw_user_meta_data` JSONB (nullable)
- `is_super_admin` BOOLEAN (nullable)
- `phone` TEXT (nullable)
- `phone_confirmed_at` TIMESTAMP WITH TIME ZONE (nullable)
- `phone_change` TEXT (nullable)
- `phone_change_token` CHARACTER VARYING (nullable)
- `phone_change_sent_at` TIMESTAMP WITH TIME ZONE (nullable)
- `confirmed_at` TIMESTAMP WITH TIME ZONE (nullable)
- `email_change_token_current` CHARACTER VARYING (nullable)
- `email_change_confirm_status` SMALLINT (nullable)
- `banned_until` TIMESTAMP WITH TIME ZONE (nullable)
- `reauthentication_token` CHARACTER VARYING (nullable)
- `reauthentication_sent_at` TIMESTAMP WITH TIME ZONE (nullable)
- `is_sso_user` BOOLEAN NOT NULL DEFAULT false
- `deleted_at` TIMESTAMP WITH TIME ZONE (nullable)
- `is_anonymous` BOOLEAN NOT NULL DEFAULT false

#### subjects table (COMPLETE STRUCTURE):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` TEXT NOT NULL UNIQUE - **Subject name (e.g., 'Mathematics', 'Physics')**
- `examcategory` USER-DEFINED DEFAULT 'OTHER' - **Enum: exam categories**
- `description` TEXT (nullable) - **Optional subject description**
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT now()

#### user_subjects table (NEW - MULTI-SUBJECT SUPPORT):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` UUID NOT NULL - **Foreign key to auth.users.id**
- `subject_id` UUID NOT NULL - **Foreign key to subjects.id**
- `selected_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `is_active` BOOLEAN DEFAULT TRUE - **Whether student is actively practicing this subject**
- `is_primary` BOOLEAN DEFAULT FALSE - **Primary subject for legacy compatibility**
- UNIQUE constraint on (user_id, subject_id) - **One record per user per subject**

#### user_sessions table (NEW - SESSION TRACKING):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` UUID NOT NULL - **Foreign key to auth.users.id**
- `login_time` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `logout_time` TIMESTAMP WITH TIME ZONE (nullable)
- `date` DATE DEFAULT CURRENT_DATE - **Date for streak calculation**
- `total_duration_seconds` INTEGER DEFAULT 0 - **Total session duration**
- `is_active` BOOLEAN DEFAULT TRUE - **Whether session is currently active**

#### subject_time_logs table (NEW - TIME TRACKING PER SUBJECT):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` UUID NOT NULL - **Foreign key to auth.users.id**
- `subject_id` UUID NOT NULL - **Foreign key to subjects.id**
- `session_id` UUID NOT NULL - **Foreign key to user_sessions.id**
- `start_time` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `end_time` TIMESTAMP WITH TIME ZONE (nullable)
- `duration_seconds` INTEGER DEFAULT 0 - **Time spent on this subject in this session**

#### question_stats table (NEW - QUESTION POPULARITY TRACKING):
- `question_id` UUID PRIMARY KEY - **Foreign key to questions.id**
- `total_attempts` INTEGER DEFAULT 0 - **Total number of attempts across all students**
- `unique_students` INTEGER DEFAULT 0 - **Number of unique students who attempted**
- `correct_attempts` INTEGER DEFAULT 0 - **Number of correct attempts**
- `last_updated` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

#### student_attempts table (ENHANCED STRUCTURE):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `studentId` UUID NOT NULL - **Foreign key to auth.users.id**
- `questionId` UUID NOT NULL - **Foreign key to questions.id**
- `subject_id` UUID NOT NULL - **Foreign key to subjects.id (for analytics)**
- `session_id` UUID (nullable) - **Foreign key to user_sessions.id**
- `selectedOption` TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D'))
- `isCorrect` BOOLEAN NOT NULL
- `time_spent_seconds` INTEGER DEFAULT 0 - **Time spent on this specific question**
- `attemptedAt` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE constraint on (studentId, questionId) - **One attempt per question per student**

#### daily_question_sets table (LEGACY - MAINTAINED FOR BACKWARD COMPATIBILITY):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `studentId` UUID NOT NULL - **Foreign key to auth.users.id**
- `date` TEXT NOT NULL - **Date in YYYY-MM-DD format**
- `questions` UUID[] NOT NULL - **Array of question IDs**
- `completed` BOOLEAN DEFAULT FALSE
- `score` INT (nullable) - **Number of correct answers**
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### Enhanced Database Relationships (FOREIGN KEY CONSTRAINTS)
1. `users.primarysubject` → `subjects.id` (DEPRECATED)
2. `user_subjects.user_id` → `auth.users.id`
3. `user_subjects.subject_id` → `subjects.id`
4. `user_sessions.user_id` → `auth.users.id`
5. `subject_time_logs.user_id` → `auth.users.id`
6. `subject_time_logs.subject_id` → `subjects.id`
7. `subject_time_logs.session_id` → `user_sessions.id`
8. `question_stats.question_id` → `questions.id`
9. `questions.created_by` → `users.id`
10. `questions.subject_id` → `subjects.id`
11. `student_attempts.studentId` → `auth.users.id`
12. `student_attempts.questionId` → `questions.id`
13. `student_attempts.subject_id` → `subjects.id`
14. `student_attempts.session_id` → `user_sessions.id`
15. `daily_question_sets.studentId` → `auth.users.id`

### API Implementation Guidelines
- Use `createRouteHandlerClient({ cookies })` for server-side API routes
- Always validate user authentication and role before database operations
- **CRITICAL**: Use exact column names as specified above (case-sensitive)
- For questions API: send `title`, `content`, `option_a/b/c/d`, `correct_option`, `subject_id`
- For subjects API: send `name` (examcategory auto-defaults to 'OTHER')
- Transform camelCase frontend data to snake_case for database operations
- Implement real-time session tracking for timer and analytics
- Update question statistics on every attempt
- Maintain streak calculations on login/logout

### Enhanced Data Validation Rules
#### Questions:
- `title`: Required, max 200 characters
- `content`: Required, max 2000 characters
- `option_a/b/c/d`: Required, max 500 characters each
- `correct_option`: Required, must be exactly 'A', 'B', 'C', or 'D'
- `explanation`: Required, max 1000 characters
- `difficulty`: Required, must be 'EASY', 'MEDIUM', or 'HARD'
- `exam_category`: Required, must be valid exam category
- `subject_id`: Required, must exist in subjects table
- `created_by`: Required, must be valid QAUTHOR user ID

#### Users:
- `email`: Required, valid email format, unique
- `role`: Required, must be 'SUPERADMIN', 'QAUTHOR', or 'STUDENT'
- `current_streak`: Non-negative integer, max 9999
- `longest_streak`: Non-negative integer, max 9999

#### User Subjects:
- `user_id`: Required, must exist in users table
- `subject_id`: Required, must exist in subjects table
- `is_active`: Boolean, defaults to TRUE
- `is_primary`: Boolean, only one primary per user allowed

#### Sessions:
- `user_id`: Required, must exist in users table
- `login_time`: Required, cannot be future date
- `total_duration_seconds`: Non-negative integer

#### Time Logs:
- `duration_seconds`: Non-negative integer, max 86400 (24 hours)
- `end_time`: Must be after start_time if provided

#### Subjects:
- `name`: Required, unique, max 100 characters
- `description`: Optional, max 500 characters

## Overview
Daily Dose Prep is a comprehensive competitive exam preparation platform that provides students with practice questions for various competitive exams in India. The platform features multi-subject support, real-time analytics, session tracking, and comprehensive performance monitoring.

The system is designed as a multi-role Q&A platform with three user types: SUPERADMIN, QAUTHOR, and STUDENT. Each role has distinct capabilities and views, centered around the creation, distribution, and analysis of multiple-choice questions (MCQs) categorized by subject.

## User Roles

### 1. SUPERADMIN
- Single user for the entire application
- Has full system access
- Can create QAUTHOR accounts
- Can manage all users and content
- Cannot be created through regular signup
- Can add, edit, and delete subjects
- Has access to comprehensive system statistics
- Can view platform-wide analytics and performance metrics

### 2. QAUTHOR
- Created by SUPERADMIN only
- Can create, edit, and manage questions
- Can view question performance statistics
- Cannot create other users
- Cannot access admin features
- Has a dedicated dashboard with question management tools
- Can track popularity and performance of their questions

### 3. STUDENT (ENHANCED)
- Can sign up through regular registration
- **Multi-subject selection**: Can select multiple subjects for practice
- **Comprehensive dashboard**: Analytics, scores, streaks, time tracking
- **Flexible practice mode**: Subject-based question practice with timer
- **Real-time statistics**: View question popularity and personal performance
- **Session tracking**: Automatic login streak and time spent monitoring
- Cannot create or modify content

## Exam Categories
The platform supports preparation for various competitive exams in India:
- UPSC (Union Public Service Commission)
- JEE (Joint Entrance Examination)
- NEET (National Eligibility cum Entrance Test)
- SSC (Staff Selection Commission)
- Other competitive exams

## Enhanced Subject Management
- Subjects are managed by the SUPERADMIN
- Each subject corresponds to a specific exam category
- SUPERADMINs can add, edit, or delete subjects
- **Students can select multiple subjects** for comprehensive preparation
- Questions are categorized by subject with cross-subject analytics
- Subject-wise performance tracking and time monitoring

## Question Structure

### Basic Format
- Multiple Choice Questions (MCQ)
- 4 options per question (A, B, C, D)
- 1 correct answer
- Difficulty levels: Easy, Medium, Hard
- Detailed explanation for the correct answer
- **Popularity tracking**: Number of students who attempted each question

### Question Metadata
- Exam Category (UPSC/JEE/NEET/etc.)
- Subject/Topic within the exam
- Difficulty Level
- Year (if applicable)
- Source/Reference (if applicable)
- QAUTHOR ID/name who created the question
- Timestamp of question upload
- Unique identifier to prevent duplicate questions
- **Attempt statistics**: Total attempts, unique students, success rate

### Question Storage Format
Each question is stored with:
- **Title**: Brief heading (e.g., "Photosynthesis Process")
- **Content**: Full question text (e.g., "Which of the following is the primary product of photosynthesis?")
- **Options**: Four separate text fields (option_a, option_b, option_c, option_d)
- **Correct Option**: Single character ('A', 'B', 'C', or 'D')
- **Explanation**: Detailed explanation of why the answer is correct
- **Alternative Storage**: Optional JSONB field for flexible option storage
- **Statistics**: Real-time attempt and success tracking

## Enhanced Features

### QAUTHOR Features (ENHANCED)
- Dedicated dashboard accessible upon login
- **Enhanced question management**: Create, edit, delete questions
- **Question analytics**: View attempt statistics, success rates, popularity
- Create and manage questions with complete information:
  - Question title and detailed content
  - Four answer options (A, B, C, D)
  - Marking one correct answer
  - Subject selection from predefined list
  - Difficulty level selection
  - Exam category assignment
  - Year and source information (optional)
- Provide detailed explanations
- Categorize questions by exam and topic
- **Real-time performance tracking** of created questions
- System prevents submission of incomplete or duplicate questions
- **Question popularity insights**: See which questions are most attempted

### Student Features (COMPLETELY REDESIGNED)

#### STUDENT Dashboard (Landing Page) - Primary Interface
The STUDENT dashboard serves as the central hub with comprehensive analytics and quick access to practice modes.

**Dashboard Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Welcome [Student Name] | Timer: [Session Time]      │
├─────────────────────────────────────────────────────────────┤
│ Quick Stats Row (4 Cards):                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │Overall Score│ │Login Streak │ │Today's Time │ │Questions│ │
│ │    85.6%    │ │   12 days   │ │   2h 15m    │ │   47    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Subject Performance Grid:                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Mathematics  │ │   Physics    │ │  Chemistry   │          │
│ │ Score: 92%   │ │ Score: 78%   │ │ Score: 87%   │          │
│ │ Time: 45m    │ │ Time: 32m    │ │ Time: 28m    │          │
│ │ [Practice]   │ │ [Practice]   │ │ [Practice]   │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
├─────────────────────────────────────────────────────────────┤
│ Time Spent Analytics (Tabbed Interface):                   │
│ [Today] [This Week] [This Month] [All Time]                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Bar Chart: Time per Subject                             │ │
│ │ Mathematics: ████████████ 2h 15m                       │ │
│ │ Physics:     ████████ 1h 45m                           │ │
│ │ Chemistry:   ██████ 1h 20m                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Dashboard Features:**
1. **Score by Subject**: Individual performance metrics for each selected subject (1 mark per question)
   - Success rate percentage per subject
   - Total questions attempted per subject
   - Recent performance trends
   - Subject difficulty progression

2. **Overall Score**: Calculated average across all selected subjects
   - Weighted average based on questions attempted
   - Comparison with platform average
   - Progress indicators and trends

3. **Login Streak Counter**: Consecutive days of platform access
   - Current streak display with visual indicator
   - Longest streak achievement
   - Streak milestones and rewards
   - Daily login motivation

4. **Time Spent Analytics**: Tabbed interface showing time spent on each subject
   - Today's session time
   - Weekly/Monthly breakdowns
   - Subject-wise time distribution
   - Time efficiency metrics (questions per hour)

5. **Quick Practice Access**: Direct links to subject-specific practice sessions
   - One-click practice mode entry
   - Resume previous session option
   - Subject recommendation based on performance

#### Multi-Subject Selection System
**Enhanced Subject Management Interface:**
- **Multiple subject selection**: Choose several subjects for comprehensive preparation
- **Subject management**: Add or remove subjects from active practice list
- **Primary subject designation**: Maintain one primary subject for focused preparation
- **Subject-wise progress tracking**: Individual analytics for each selected subject
- **Subject recommendation engine**: Suggest subjects based on exam category and performance

#### Enhanced Practice Mode Interface
**Practice Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Timer: [2:15:32] | Session Progress: [47/∞] | [End Session] │
├─────────────────────────────────────────────────────────────┤
│ Subject Tabs: [Mathematics] [Physics] [Chemistry] [+Add]    │
├─────────────────────────────────────────────────────────────┤
│ Question Area:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Q: What is the derivative of x²?                        │ │
│ │ ┌─ A) 2x     ┌─ B) x²     ┌─ C) 2     ┌─ D) x         │ │
│ │ │            │            │            │                │ │
│ │ └─ 234 students attempted this question                 │ │
│ │                                                         │ │
│ │ [Previous] [Skip] [Submit Answer] [Next] [Explanation]  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Progress Bar: Mathematics [████████░░] 80% | Time: 15:32   │
└─────────────────────────────────────────────────────────────┘
```

**Practice Mode Features:**
- **Persistent Timer**: Continuous timer from login, tracks total session time
- **Subject Tabs**: Easy switching between different subjects during practice
- **Subject-specific Questions**: Each tab shows questions only from that subject
- **Question Statistics**: Display attempt count ("X students attempted this question")
- **Unlimited Practice**: No daily limits, continuous question access
- **Real-time Progress**: Live updates of performance metrics
- **Session Persistence**: Resume practice sessions across browser refreshes

#### Advanced Analytics & Tracking
**Comprehensive Performance Monitoring:**
- **Session Management**: Automatic login/logout tracking for streak calculation
- **Time Tracking**: Granular time spent per subject per session
- **Performance Metrics**: Success rate, average time per question, difficulty progression
- **Comparative Analysis**: Performance vs. platform average
- **Streak Maintenance**: Daily login streak with achievement milestones
- **Subject Mastery**: Progress indicators for each subject
- **Learning Patterns**: Time-of-day performance analysis
- **Difficulty Adaptation**: Automatic difficulty adjustment based on performance

#### Question Interaction Enhancement
**Improved Question Experience:**
- **Enhanced Question Interface**: Clean, focused question presentation
- **Popularity Indicators**: See how many students attempted each question
- **Immediate Feedback**: Instant correctness indication (configurable)
- **Explanation Access**: Detailed explanations for learning
- **Progress Tracking**: Real-time updates to personal statistics
- **Time Monitoring**: Track time spent on individual questions
- **Bookmarking**: Save difficult questions for later review
- **Notes System**: Add personal notes to questions

### SUPERADMIN Features (ENHANCED)
- **Comprehensive Analytics Dashboard**:
  - Platform-wide statistics and trends
  - Subject-wise question distribution and performance
  - User engagement metrics (login streaks, session duration)
  - QAUTHOR productivity and question quality metrics
  - Student performance analytics across subjects
- **Advanced User Management**:
  - Create and manage QAUTHOR accounts
  - Monitor student engagement and performance
  - View detailed user activity logs
  - Manage user sessions and access
- **Subject Management**:
  - Add, edit, delete subjects with impact analysis
  - Monitor subject popularity and performance
  - Analyze cross-subject learning patterns
- **Content Oversight**:
  - Review question quality and performance
  - Monitor question attempt patterns
  - Analyze platform usage trends
  - Generate comprehensive reports

## Enhanced Authentication & Session Flow

### Session Management System
- **Automatic Session Creation**: New session on every login
- **Real-time Session Tracking**: Continuous monitoring of active sessions
- **Streak Calculation**: Daily login streak with timezone handling
- **Session Persistence**: Maintain state across browser refreshes
- **Graceful Session Handling**: Proper cleanup on logout/timeout

### SUPERADMIN Login
1. Initial SUPERADMIN credentials set during system initialization
2. Enhanced dashboard with comprehensive platform analytics
3. Advanced user and content management capabilities

### QAUTHOR Creation & Management
1. Created by SUPERADMIN with enhanced permissions
2. Access to question analytics and performance metrics
3. Real-time feedback on question popularity and effectiveness

### Student Registration & Onboarding
1. Streamlined registration process
2. **Multi-subject selection** during onboarding
3. **Dashboard tutorial** for new users
4. **Immediate practice access** with guided tour

## Enhanced Data Integrity & Performance

### Advanced Data Structure
- **Comprehensive audit trails** for all user actions
- **Real-time statistics** with efficient caching
- **Session-based data integrity** with automatic cleanup
- **Cross-subject analytics** with optimized queries
- **Scalable architecture** for growing user base

### Performance Optimizations
- **Intelligent caching** for frequently accessed data
- **Database indexing** for complex analytical queries
- **Real-time updates** with minimal performance impact
- **Efficient session management** with automatic cleanup
- **Optimized statistics calculation** with background processing

## Enhanced Security & Privacy

### Advanced Security Measures
- **Session-based authentication** with automatic timeout
- **Role-based access control** with granular permissions
- **Data encryption** for sensitive information
- **Audit logging** for all administrative actions
- **Rate limiting** for API endpoints
- **CSRF protection** for all forms

### Privacy Considerations
- **Anonymized analytics** where appropriate
- **User data protection** with minimal data collection
- **Session data cleanup** with automatic purging
- **Compliance ready** architecture for data regulations

## Technical Implementation Requirements

### Real-time Features
- **WebSocket connections** for live timer synchronization
- **Server-sent events** for real-time statistics updates
- **Background jobs** for statistics calculation and cleanup
- **Caching layers** for performance optimization

### Analytics Engine
- **Complex aggregation queries** for multi-dimensional analytics
- **Time-series data handling** for trend analysis
- **Efficient data processing** for real-time updates
- **Scalable architecture** for growing data volumes

### Session Management
- **Distributed session storage** for scalability
- **Automatic session cleanup** for resource management
- **Cross-device session handling** for user convenience
- **Session security** with token rotation

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
- Implement new database tables
- Create session management system
- Build basic multi-subject selection

### Phase 2: Analytics (Weeks 3-4)
- Develop dashboard components
- Implement real-time statistics
- Create performance tracking

### Phase 3: Practice Mode (Weeks 5-6)
- Build enhanced practice interface
- Implement timer system
- Add subject-based navigation

### Phase 4: Advanced Features (Weeks 7-8)
- Complete analytics dashboard
- Add comparative analysis
- Implement streak system

### Phase 5: Optimization (Weeks 9-10)
- Performance tuning
- Mobile optimization
- User experience refinement

This specification serves as the single source of truth for building the enhanced Daily Dose Prep platform with comprehensive student analytics, multi-subject support, and advanced practice features. 