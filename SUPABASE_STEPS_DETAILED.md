# 📋 DETAILED SUPABASE STEPS - Fix Database Schema

## **🎯 What We're Doing:**
Fixing the database tables to have the correct, simplified schema so login works properly.

## **📍 Step-by-Step Instructions:**

### **Step 1: Access Supabase SQL Editor**
1. **You're already there!** (I can see you're in the SQL Editor)
2. **You should see**: 
   - Left sidebar with "SQL Editor" selected
   - Main area with SQL code
   - "Run" button in the top right

### **Step 2: Clear Current SQL**
1. **Click inside the SQL editor area** (where the code is)
2. **Select All**: Press `Ctrl+A` (Windows) or `Cmd+A` (Mac)
3. **Delete**: Press `Delete` key
4. **Verify**: The editor should now be empty

### **Step 3: Paste New SQL**
1. **Copy this entire SQL code** (click the copy button):

```sql
-- Simple subjects table with just name for now
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing column to users table  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS primarySubject UUID REFERENCES public.subjects(id);

-- Enable RLS on subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for subjects
DROP POLICY IF EXISTS "Allow everyone to read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow SUPERADMIN to manage subjects" ON public.subjects;

CREATE POLICY "Allow everyone to read subjects" 
    ON public.subjects FOR SELECT 
    USING (true);

CREATE POLICY "Allow SUPERADMIN to manage subjects" 
    ON public.subjects FOR ALL 
    TO authenticated 
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPERADMIN');

-- Clear and add simple default subjects
DELETE FROM public.subjects;

INSERT INTO public.subjects (name) VALUES
('General Studies'),
('Mathematics'),
('Physics'),
('Chemistry'),
('Biology'),
('General Knowledge');
```

2. **Paste into editor**: Press `Ctrl+V` (Windows) or `Cmd+V` (Mac)
3. **Verify**: You should see all the SQL code in the editor

### **Step 4: Execute the SQL**
1. **Look for the green "Run" button** (top right corner of the SQL editor)
2. **Click "Run"**
3. **Wait for execution** (should take a few seconds)

### **Step 5: Check for Success**
**You should see one of these results:**

✅ **Success Message**: 
- Green checkmark or "Success" message
- No error messages in red

❌ **If you see errors**:
- Red error messages will appear
- Common errors and fixes:
  - `"relation already exists"` → This is OK, means table already exists
  - `"column already exists"` → This is OK, means column already exists
  - `"policy already exists"` → This is OK, we're dropping and recreating

### **Step 6: Verify Tables Were Created**
1. **Click "Table Editor"** in the left sidebar
2. **Look for these tables**:
   - ✅ `subjects` - should have 6 rows (General Studies, Mathematics, etc.)
   - ✅ `users` - should have your SUPERADMIN user
   - ✅ `questions` - might be empty (that's OK)
   - ✅ `student_attempts` - will be empty (that's OK)

### **Step 7: Double-Check Subjects Table**
1. **In Table Editor, click on "subjects"**
2. **You should see**:
   - Column: `id` (UUID)
   - Column: `name` (Text)
   - Column: `created_at` (Timestamp)
   - **6 rows of data** with subject names

### **Step 8: Test the Application**
1. **Go to your app**: https://dailydoseprep.vercel.app/login
2. **Use credentials**:
   - Email: `superadmin@ddp.com`
   - Password: `05tattva`
3. **Expected result**: Login should work and redirect to dashboard

## **🆘 Troubleshooting:**

### **If SQL fails to run:**
1. **Check for typos** in the pasted SQL
2. **Try running it in smaller chunks**:
   - First: Just the CREATE TABLE part
   - Then: The ALTER TABLE part
   - Finally: The INSERT part

### **If login still doesn't work:**
1. **Run our backup script**:
   ```bash
   npm run simple-subjects
   ```
2. **This will recreate everything from code**

### **If you see "table doesn't exist" errors:**
1. **Tables might not have been created yet**
2. **Go back and run the full SQL again**

## **📞 Visual Confirmation:**

After running the SQL, your **Table Editor** should show:

```
📁 Tables:
├── 📋 subjects (6 rows)
├── 👥 users (1+ rows)
├── ❓ questions (0+ rows)
└── 📊 student_attempts (0+ rows)
```

## **✅ Success Indicators:**
- ✅ SQL runs without red errors
- ✅ 6 subjects appear in subjects table
- ✅ Login works at dailydoseprep.vercel.app/login
- ✅ No timeout errors in browser console

**You're ready to test once you see these! 🚀** 