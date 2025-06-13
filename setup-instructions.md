# Supabase Database Setup Instructions

Follow these steps to set up your database tables in Supabase:

## Step 1: Log in to your Supabase account

Go to [https://app.supabase.com/](https://app.supabase.com/) and log in to your account.

## Step 2: Select your project

Select the project where you want to create the tables.

## Step 3: Open the SQL Editor

1. In the left sidebar, click on "SQL Editor"
2. Click "New Query" to create a new SQL query

## Step 4: Execute the SQL Schema

Copy and paste the following SQL code into the SQL Editor:

```sql
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
```

Click "Run" to execute the SQL code.

## Step 5: Create a SUPERADMIN user

After setting up the tables, you need to create a SUPERADMIN user:

1. Go to "Authentication" in the left sidebar
2. Click on "Users"
3. Click "Invite" to create a new user
4. Enter the email and password for your SUPERADMIN user
5. After the user is created, run the following SQL to set their role as SUPERADMIN:

```sql
UPDATE public.users 
SET role = 'SUPERADMIN' 
WHERE email = 'your-admin-email@example.com';
```

Replace `'your-admin-email@example.com'` with the actual email you used.

## Step 6: Verify the setup

To verify that everything is set up correctly, run the following SQL queries:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if the SUPERADMIN user was created
SELECT * FROM public.users WHERE role = 'SUPERADMIN';
```

You should see the tables `subjects`, `users`, and `questions` in the results of the first query, and your SUPERADMIN user in the results of the second query.

## Done!

Your database is now set up and ready to use with your application. You can now log in with your SUPERADMIN user and start creating subjects and questions. 