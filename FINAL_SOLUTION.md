# FINAL SOLUTION: Schema Mismatch Issues

## Root Cause Analysis

After deep investigation, the problem is that **the actual database schema doesn't match any of our schema files**. Here's what happened:

### The Problem
1. **Multiple Schema Files**: We have 3 different schema files with different column names
2. **Database Reality**: The actual database was created with yet another schema
3. **API Mismatch**: Our API code expects columns that don't exist in the database

### Evidence
- Error: `"Could not find the 'correct_answer' column of 'questions' in the schema cache"`
- This is a PostgREST error (PGRST204) indicating the column doesn't exist
- The database exists and is accessible, but has wrong column structure

## The Real Database Schema

Based on the error patterns and testing, the actual database likely has:

```sql
-- What the database ACTUALLY has (based on errors)
CREATE TABLE questions (
    id UUID,
    subject UUID,           -- ✅ This exists (no subject_id errors)
    question_text TEXT,     -- ❌ This might be 'content' or 'title'
    -- Missing: correct_answer column
    -- Missing: options JSONB column
    -- Possibly has: optionA, optionB, optionC, optionD columns
    -- Missing: explanation column
    -- Missing: difficulty column
    -- Missing: questionHash column
    created_by UUID,
    created_at TIMESTAMP
);
```

## Definitive Solution

### Option 1: Fix the Database Schema (RECOMMENDED)
Run this SQL in Supabase SQL Editor to add missing columns:

```sql
-- Add missing columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS correct_answer TEXT,
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT,
ADD COLUMN IF NOT EXISTS questionHash TEXT,
ADD COLUMN IF NOT EXISTS options JSONB;

-- If the table has individual option columns, migrate them to JSONB
-- (Only run if optionA, optionB, optionC, optionD columns exist)
UPDATE public.questions 
SET options = jsonb_build_object(
    'A', optionA,
    'B', optionB, 
    'C', optionC,
    'D', optionD
)
WHERE options IS NULL AND (optionA IS NOT NULL OR optionB IS NOT NULL OR optionC IS NOT NULL OR optionD IS NOT NULL);

-- Drop individual option columns if they exist
-- ALTER TABLE public.questions DROP COLUMN IF EXISTS optionA;
-- ALTER TABLE public.questions DROP COLUMN IF EXISTS optionB;
-- ALTER TABLE public.questions DROP COLUMN IF EXISTS optionC;
-- ALTER TABLE public.questions DROP COLUMN IF EXISTS optionD;
```

### Option 2: Recreate the Database (NUCLEAR OPTION)
If the schema is too broken, recreate everything:

```sql
-- Drop and recreate questions table
DROP TABLE IF EXISTS public.questions CASCADE;

-- Then run the complete supabase-manual-setup.sql script
```

### Option 3: Adapt Code to Existing Schema
Modify our API code to work with whatever columns actually exist.

## Immediate Action Plan

1. **Login to Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the diagnostic query**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'questions' 
   AND table_schema = 'public'
   ORDER BY ordinal_position;
   ```
4. **Based on results, run the appropriate ALTER TABLE statements**
5. **Test question creation**

## Prevention

1. **Single Source of Truth**: Use only `supabase-manual-setup.sql`
2. **Schema Validation**: Add automated tests to verify schema matches expectations
3. **Migration Strategy**: Use proper database migrations for schema changes

## Files Updated in This Fix

✅ **Fixed Files**:
- `src/db/schema.sql` - Updated to match supabase-manual-setup.sql
- `src/app/api/questions/route.ts` - Fixed column names
- `src/app/api/daily-questions/route.ts` - Fixed column names  
- `src/app/api/subjects/[id]/route.ts` - Fixed foreign key reference
- `src/app/api/test-db/route.ts` - Fixed test data
- `docs/APPLICATION_SPECIFICATION.md` - Updated with correct schema

❌ **Still Needs Database Fix**:
- The actual Supabase database needs the missing columns added

## Test After Fix

After running the database fixes, test:
1. Question creation should work
2. No more "correct_answer column not found" errors
3. All API endpoints should work correctly

## Next Steps

1. **YOU**: Run the SQL fixes in Supabase SQL Editor
2. **TEST**: Try creating a question again
3. **VERIFY**: Check that all endpoints work correctly 