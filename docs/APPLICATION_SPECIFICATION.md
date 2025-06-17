# Daily Dose Prep - Application Specification

## Database Conventions & Technical Standards

### **CRITICAL: Database Naming Convention**
- **The actual database schema uses MIXED naming conventions** (verified from live database inspection)
- **Most columns use snake_case**: `subject_id`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `correct_answer`, `exam_category`, `created_at`, `updated_at`
- **Some columns use lowercase**: `examcategory`, `primarysubject`, `questionhash`
- **This specification reflects the ACTUAL database structure as of latest inspection**

### Database Schema - Single Source of Truth
**AUTHORITATIVE SCHEMA**: Live database structure (verified via SQL inspection)

### Key Database Tables Structure (ACTUAL COLUMN NAMES AND TYPES)

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

#### users table (COMPLETE STRUCTURE - HYBRID AUTH + CUSTOM):
**Note: This table combines Supabase Auth fields with custom application fields**

**Custom Application Fields:**
- `id` UUID PRIMARY KEY - **References auth.users.id**
- `email` TEXT NOT NULL - **User email address**
- `role` USER-DEFINED NOT NULL - **Application role: 'SUPERADMIN', 'QAUTHOR', 'STUDENT'**
- `primarysubject` UUID (nullable) - **Foreign key to subjects.id (for STUDENT users)**
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

#### student_attempts table (COMPLETE STRUCTURE):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `studentId` UUID NOT NULL - **Foreign key to auth.users.id**
- `questionId` UUID NOT NULL - **Foreign key to questions.id**
- `selectedOption` TEXT NOT NULL CHECK (selectedOption IN ('A', 'B', 'C', 'D'))
- `isCorrect` BOOLEAN NOT NULL
- `attemptedAt` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE constraint on (studentId, questionId) - **One attempt per question per student**

#### daily_question_sets table (COMPLETE STRUCTURE):
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `studentId` UUID NOT NULL - **Foreign key to auth.users.id**
- `date` TEXT NOT NULL - **Date in YYYY-MM-DD format**
- `questions` UUID[] NOT NULL - **Array of question IDs**
- `completed` BOOLEAN DEFAULT FALSE
- `score` INT (nullable) - **Number of correct answers**
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### Database Relationships (FOREIGN KEY CONSTRAINTS)
1. `users.primarysubject` → `subjects.id`
2. `questions.created_by` → `users.id`
3. `questions.subject_id` → `subjects.id`
4. `student_attempts.studentId` → `auth.users.id`
5. `student_attempts.questionId` → `questions.id`
6. `daily_question_sets.studentId` → `auth.users.id`

### API Implementation Guidelines
- Use `createRouteHandlerClient({ cookies })` for server-side API routes
- Always validate user authentication and role before database operations
- **CRITICAL**: Use exact column names as specified above (case-sensitive)
- For questions API: send `title`, `content`, `option_a/b/c/d`, `correct_option`, `subject_id`
- For subjects API: send `name` (examcategory auto-defaults to 'OTHER')
- Transform camelCase frontend data to snake_case for database operations

### Data Validation Rules
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
- `primarysubject`: Optional for STUDENT, forbidden for others

#### Subjects:
- `name`: Required, unique, max 100 characters
- `description`: Optional, max 500 characters

## Overview
Daily Dose Prep is a competitive exam preparation platform that provides students with practice questions for various competitive exams in India. The platform allows QAUTHORs to create and manage questions, while students can practice and track their progress.

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

### 2. QAUTHOR
- Created by SUPERADMIN only
- Can create and manage questions
- Can create and manage answers
- Cannot create other users
- Cannot access admin features
- Has a dedicated dashboard upon login

### 3. STUDENT
- Can sign up through regular registration
- Can view and attempt questions
- Can track their progress
- Cannot create or modify content
- Selects primary subject of interest
- Receives daily sets of practice questions

## Exam Categories
The platform supports preparation for various competitive exams in India:
- UPSC (Union Public Service Commission)
- JEE (Joint Entrance Examination)
- NEET (National Eligibility cum Entrance Test)
- SSC (Staff Selection Commission)
- Other competitive exams

## Subject Management
- Subjects are managed by the SUPERADMIN
- Each subject corresponds to a specific exam category
- SUPERADMINs can add, edit, or delete subjects
- Each subject has its own database partition
- Questions are categorized by subject

## Question Structure

### Basic Format
- Multiple Choice Questions (MCQ)
- 4 options per question (A, B, C, D)
- 1 correct answer
- Difficulty levels: Easy, Medium, Hard
- Detailed explanation for the correct answer

### Question Metadata
- Exam Category (UPSC/JEE/NEET/etc.)
- Subject/Topic within the exam
- Difficulty Level
- Year (if applicable)
- Source/Reference (if applicable)
- QAUTHOR ID/name who created the question
- Timestamp of question upload
- Unique identifier to prevent duplicate questions

### Question Storage Format
Each question is stored with:
- **Title**: Brief heading (e.g., "Photosynthesis Process")
- **Content**: Full question text (e.g., "Which of the following is the primary product of photosynthesis?")
- **Options**: Four separate text fields (option_a, option_b, option_c, option_d)
- **Correct Option**: Single character ('A', 'B', 'C', or 'D')
- **Explanation**: Detailed explanation of why the answer is correct
- **Alternative Storage**: Optional JSONB field for flexible option storage

## Features

### QAUTHOR Features
- Dedicated dashboard accessible upon login
- Button to open question creation page
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
- Track question performance
- System prevents submission of incomplete or duplicate questions

### Student Features
- Subject selection
  - Select a primary subject of interest
  - All other subjects become secondary
- Daily Question Delivery
  - Receive 10 new questions daily at 6am
  - Questions are chronologically selected from their primary subject
  - If all questions for primary subject are exhausted, system shows: "Congratulations, you solved all questions posted for this Subject."
- Question answering interface
  - Four options presented as radio buttons
  - Options displayed in randomized order to prevent pattern recognition
  - No revelation of correct answer during or after attempt
- Result Feedback
  - Summary after completing all 10 questions
  - Format: "For [date], you got X questions correct out of 10."
  - No per-question feedback provided
- Track overall progress

### SUPERADMIN Features
- Comprehensive dashboard with system statistics:
  - Number of questions per subject
  - Number of QAUTHORs and students
  - Daily participation statistics
  - Aggregate performance metrics
- Subject management capabilities
  - Add new subjects
  - Edit existing subjects
  - Delete subjects (with safeguards for existing questions)
- Access to all subject databases for review
- View but not edit questions and answers

## Authentication Flow

### SUPERADMIN Login
1. Initial SUPERADMIN credentials are set up during system initialization
2. SUPERADMIN can log in through the login button
3. SUPERADMIN can create QAUTHOR accounts from the admin dashboard

### QAUTHOR Creation
1. Only SUPERADMIN can create QAUTHOR accounts
2. QAUTHOR accounts are created with specific permissions
3. QAUTHORs receive their credentials from SUPERADMIN

### Student Registration
1. Any user can sign up as a STUDENT
2. Student accounts have limited permissions
3. Students select their primary subject during or after registration
4. Students can start using the system immediately after registration

## Data Integrity & Structure
- Each question has a unique identifier to prevent duplicates
- Questions are stored with QAUTHOR information and timestamps
- Subject databases are maintained separately for better organization
- Complete audit trail for all question creation and modifications
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate data

## Security Notes
- SUPERADMIN credentials should be changed after initial setup
- QAUTHOR accounts should be created with strong passwords
- Student accounts have restricted access to protect system integrity
- Only QAUTHORs can create questions
- Only students can answer questions
- Only SUPERADMINs can view system-wide stats and manage subjects
- Row Level Security (RLS) policies enforce role-based access
- Authentication session validation prevents unauthorized access

## Performance Considerations
- Database indexes on frequently queried columns
- Efficient foreign key relationships
- JSONB storage for flexible data when needed
- Separate storage for individual options and JSON options for query flexibility
- Timestamp tracking for audit and performance monitoring

## Future Considerations
- Role-based access control (RBAC) implementation
- Multi-factor authentication for SUPERADMIN
- Session management and timeout policies
- Password reset functionality
- Account recovery procedures
- Question review process
- Performance analytics
- Custom question sets
- Progress tracking per exam category
- Question tagging system
- Student performance analytics 