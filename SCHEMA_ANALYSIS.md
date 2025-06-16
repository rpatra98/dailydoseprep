# Schema Analysis & Fix Plan

## Current Problem
We have **3 different schema files** with inconsistent column names:

### 1. `supabase-manual-setup.sql` (ACTUAL DATABASE - AUTHORITATIVE)
```sql
-- questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject UUID REFERENCES public.subjects(id),        -- ✅ CORRECT: "subject"
    question_text TEXT NOT NULL,                         -- ✅ CORRECT
    options JSONB,                                       -- ✅ CORRECT
    correct_answer TEXT,                                 -- ✅ CORRECT
    explanation TEXT,                                    -- ✅ CORRECT
    difficulty TEXT,                                     -- ✅ CORRECT
    questionHash TEXT,                                   -- ✅ CORRECT
    created_by UUID REFERENCES public.users(id),        -- ✅ CORRECT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),  -- ✅ CORRECT
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()   -- ✅ CORRECT
);

-- users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    primarySubject UUID REFERENCES public.subjects(id), -- ✅ CORRECT: "primarySubject"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. `src/db/schema.sql` (WRONG - CAUSES ERRORS)
```sql
-- questions table
CREATE TABLE public.questions (
    subject_id UUID REFERENCES public.subjects(id),     -- ❌ WRONG: should be "subject"
    -- missing questionHash column                       -- ❌ MISSING
);

-- users table  
CREATE TABLE public.users (
    -- missing primarySubject column                     -- ❌ MISSING
);
```

### 3. `migrations/01_schema_update.sql` (PARTIAL - INCONSISTENT)
```sql
-- Uses different naming conventions
CREATE INDEX idx_questions_createdAt ON questions(createdAt);  -- ❌ WRONG: should be "created_at"
```

## Errors Caused by Schema Mismatches

1. **"Could not find the 'correct_answer' column"** - API tries to insert into non-existent column
2. **"subject vs subject_id"** - Foreign key column name mismatch  
3. **"primarySubject vs primarysubject"** - Case sensitivity issues
4. **Missing questionHash column** - Duplicate prevention fails

## Solution: Single Source of Truth

### Step 1: Update src/db/schema.sql to match supabase-manual-setup.sql exactly
### Step 2: Update all API code to use correct column names
### Step 3: Remove inconsistent migration files
### Step 4: Create schema validation endpoint

## Column Name Reference (CORRECT NAMES)

### questions table:
- `subject` (not subject_id)
- `question_text` 
- `options`
- `correct_answer`
- `explanation`
- `difficulty`
- `questionHash`
- `created_by`
- `created_at`
- `updated_at`

### users table:
- `id`
- `email`
- `role`
- `primarySubject` (camelCase)
- `created_at`
- `updated_at`

### subjects table:
- `id`
- `name`
- `examCategory` (camelCase)
- `description`
- `created_at`
- `updated_at`

## Files That Need Updates:
1. ✅ `src/app/api/questions/route.ts` - Fixed
2. ✅ `src/app/api/subjects/[id]/route.ts` - Fixed  
3. ✅ `src/app/api/test-db/route.ts` - Fixed
4. ✅ `src/app/api/debug-schema/route.ts` - Fixed
5. ❌ `src/db/schema.sql` - NEEDS UPDATE
6. ❌ `src/app/api/daily-questions/route.ts` - NEEDS CHECK
7. ❌ All other API routes - NEEDS CHECK

## Next Steps:
1. Update src/db/schema.sql to match supabase-manual-setup.sql
2. Search for all references to wrong column names
3. Update APPLICATION_SPECIFICATION.md with correct schema
4. Test question creation end-to-end 