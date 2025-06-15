# Database Reset Guide - Daily Dose Prep

## Issue Summary

The application was experiencing login issues where users would get stuck after entering credentials. This was caused by several database and authentication flow problems.

## Pre-fix Issues Identified

### 1. **Database Schema Inconsistencies**
- Original schema had conflicting table definitions
- Migration files were adding columns that didn't align with the base schema
- RLS policies were incomplete or conflicting
- Orphaned auth users without corresponding user table entries

### 2. **Missing SUPERADMIN User**
- No proper SUPERADMIN user existed in the database
- The schema had a placeholder insert with invalid syntax
- Authentication system couldn't find user role information

### 3. **Authentication Flow Problems**
- Login would hang when trying to fetch user data
- No fallback mechanism for users existing in auth but not in users table
- Navigation logic was forcing redirects before data was properly loaded

### 4. **Supabase Client Configuration Issues**
- Browser client had incorrect initialization parameters
- Connection timeout issues
- Improper error handling during client setup

## Post-fix Behavior

### ✅ **Clean Database State**
- All tables properly created with consistent schema
- Proper RLS policies in place
- SUPERADMIN user correctly configured
- Default subjects available

### ✅ **Smooth Authentication Flow**
- Login works immediately with correct credentials
- Proper error handling for invalid credentials
- Automatic user record creation for orphaned auth users
- Proper navigation based on user roles

### ✅ **Role-Based Access**
- SUPERADMIN: Full system access, can create QAUTHORs
- QAUTHOR: Can create and manage questions
- STUDENT: Can view and attempt questions

## How to Reset the Database

### Step 1: Run the Reset Script

```bash
npm run reset-db
```

This script will:
1. 🧹 Delete all existing users from Supabase Auth
2. 🗂️ Drop all custom tables
3. 🏗️ Create fresh database schema
4. 🔄 Apply all migrations
5. 👑 Create SUPERADMIN user with specified credentials
6. 📚 Add default subjects for testing

### Step 2: Verify the Reset

After running the script, you should see:

```
🎉 Database reset completed successfully!

📋 SUPERADMIN Credentials:
   Email: superadmin@ddp.com
   Password: 05tattva

⚠️  Please change the password after first login for security!
```

### Step 3: Test the Login

1. Go to https://dailydoseprep.vercel.app/login
2. Use the SUPERADMIN credentials:
   - Email: `superadmin@ddp.com`
   - Password: `05tattva`
3. You should be redirected to the dashboard successfully

## SUPERADMIN Credentials

**Email:** `superadmin@ddp.com`  
**Password:** `05tattva`

⚠️ **Security Note:** Change this password immediately after first login!

## What Was Fixed

### 1. **Database Schema (`src/db/schema.sql`)**
- Removed invalid SUPERADMIN insert statement
- Ensured proper table relationships
- Fixed RLS policies

### 2. **Authentication Context (`src/context/AuthContext.tsx`)**
- Added robust error handling in login flow
- Implemented fallback user creation for orphaned auth users
- Removed premature navigation, letting useEffect handle redirects
- Improved timeout and retry logic

### 3. **Supabase Client (`src/lib/supabase-browser.ts`)**
- Fixed client initialization parameters
- Improved connection testing
- Better error handling and retry logic

### 4. **Reset Script (`src/scripts/reset-database.js`)**
- Comprehensive database cleanup
- Proper SUPERADMIN user creation
- Default subjects setup
- Full verification process

## Database Structure After Reset

### Tables Created:
- `subjects` - Exam subjects (UPSC, JEE, NEET, SSC, etc.)
- `users` - User roles and information
- `questions` - MCQ questions with metadata
- `student_attempts` - Student answer tracking
- `daily_question_sets` - Daily question delivery system

### Default Subjects:
- General Studies (UPSC)
- Mathematics (JEE)
- Physics (JEE)
- Biology (NEET)
- General Knowledge (SSC)

### User Roles:
- **SUPERADMIN** - System administration
- **QAUTHOR** - Question creation and management
- **STUDENT** - Question practice and progress tracking

## Troubleshooting

### If Reset Fails:
1. Check your `.env.local` file has correct Supabase credentials
2. Ensure you have service role permissions
3. Check network connectivity to Supabase
4. Review console output for specific error messages

### If Login Still Fails:
1. Clear browser cache/cookies
2. Try incognito/private browsing mode
3. Check browser developer console for errors
4. Verify the SUPERADMIN user was created in Supabase dashboard

### Environment Variables Required:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Next Steps After Reset

1. **Change SUPERADMIN Password**
   - Login with provided credentials
   - Update password in profile settings

2. **Create QAUTHOR Accounts**
   - Use SUPERADMIN dashboard to create QAUTHOR users
   - Provide credentials to question creators

3. **Add More Subjects**
   - SUPERADMIN can add/edit/delete subjects as needed

4. **Start Adding Questions**
   - QAUTHORs can begin creating questions
   - Questions will be available for students immediately

## Support

If you continue experiencing issues after following this guide:
1. Check the application logs in Vercel dashboard
2. Review Supabase logs for database errors
3. Ensure all environment variables are correctly set
4. Contact the development team with specific error messages 