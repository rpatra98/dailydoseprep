# Daily Dose Prep - Application Specification

## Overview
Daily Dose Prep is a competitive exam preparation platform that provides students with practice questions for various competitive exams in India. The platform allows QAUTHORs to create and manage questions, while students can practice and track their progress.

## User Roles

### 1. SUPERADMIN
- Single user for the entire application
- Has full system access
- Can create QAUTHOR accounts
- Can manage all users and content
- Cannot be created through regular signup

### 2. QAUTHOR
- Created by SUPERADMIN only
- Can create and manage questions
- Can create and manage answers
- Cannot create other users
- Cannot access admin features

### 3. STUDENT
- Can sign up through regular registration
- Can view and attempt questions
- Can track their progress
- Cannot create or modify content

## Exam Categories
The platform supports preparation for various competitive exams in India:
- UPSC (Union Public Service Commission)
- JEE (Joint Entrance Examination)
- NEET (National Eligibility cum Entrance Test)
- SSC (Staff Selection Commission)
- Other competitive exams

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

## Features

### QAUTHOR Features
- Create and manage questions
- Set difficulty levels
- Provide detailed explanations
- Categorize questions by exam and topic
- Track question performance

### Student Features
- Attempt questions
- Get immediate feedback
- Track progress
- Filter questions by:
  - Exam category
  - Subject/Topic
  - Difficulty level
  - Year
  - Source

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
3. Students can start using the system immediately after registration

## Security Notes
- SUPERADMIN credentials should be changed after initial setup
- QAUTHOR accounts should be created with strong passwords
- Student accounts have restricted access to protect system integrity

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