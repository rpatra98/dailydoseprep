# Daily Dose Prep - Application Specification

## Database Conventions & Technical Standards

### **CRITICAL: Database Naming Convention**
- **The actual database schema uses MIXED naming conventions** (from supabase-manual-setup.sql)
- **Most columns use snake_case**: `question_text`, `correct_answer`, `created_at`, `updated_at`
- **Some columns use camelCase**: `questionHash`, `primarySubject`, `examCategory`
- **ALWAYS use supabase-manual-setup.sql as the single source of truth**
- **src/db/schema.sql has been updated to match supabase-manual-setup.sql exactly**

### Database Schema - Single Source of Truth
**AUTHORITATIVE SCHEMA**: `supabase-manual-setup.sql` and `src/db/schema.sql` (now synchronized)

### Key Database Tables Structure (CORRECT COLUMN NAMES)

#### questions table:
- `id` UUID PRIMARY KEY
- `subject` UUID (foreign key to subjects.id) - **NOT subject_id**
- `question_text` TEXT - **NOT content or title**
- `options` JSONB - **Contains {A: "...", B: "...", C: "...", D: "..."}**
- `correct_answer` TEXT - **NOT correctOption or correctAnswer**
- `explanation` TEXT
- `difficulty` TEXT
- `questionHash` TEXT (camelCase)
- `created_by` UUID (foreign key to users.id)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

#### users table:
- `id` UUID PRIMARY KEY
- `email` TEXT
- `role` TEXT ('SUPERADMIN', 'QAUTHOR', 'STUDENT')
- `primarySubject` UUID (camelCase, foreign key to subjects.id)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

#### subjects table:
- `id` UUID PRIMARY KEY
- `name` TEXT
- `examCategory` TEXT (camelCase)
- `description` TEXT
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### API Implementation Guidelines
- Use `createRouteHandlerClient({ cookies })` for server-side API routes
- Always validate user authentication and role before database operations
- Use snake_case when interfacing with database, transform to camelCase for frontend if needed

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
- 4 options per question
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

## Features

### QAUTHOR Features
- Dedicated dashboard accessible upon login
- Button to open question creation page
- Create and manage questions with complete information:
  - Question text
  - Four answer options (A, B, C, D)
  - Marking one correct answer
  - Subject selection from predefined list
- Set difficulty levels
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

## Security Notes
- SUPERADMIN credentials should be changed after initial setup
- QAUTHOR accounts should be created with strong passwords
- Student accounts have restricted access to protect system integrity
- Only QAUTHORs can create questions
- Only students can answer questions
- Only SUPERADMINs can view system-wide stats and manage subjects

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