# Creating Test Data in Supabase

After setting up your database schema, you can add some test data to verify everything is working correctly.

## Step 1: Create a Test Subject

Run the following SQL in the SQL Editor:

```sql
INSERT INTO public.subjects (name, examCategory, description)
VALUES 
  ('Mathematics', 'JEE', 'Topics related to mathematics for engineering entrance exams'),
  ('Physics', 'JEE', 'Topics related to physics for engineering entrance exams'),
  ('Chemistry', 'JEE', 'Topics related to chemistry for engineering entrance exams'),
  ('Biology', 'NEET', 'Topics related to biology for medical entrance exams'),
  ('General Knowledge', 'UPSC', 'General knowledge topics for civil services exams');
```

## Step 2: Create Test Questions

Run the following SQL to create some test questions:

```sql
-- First, get your SUPERADMIN user ID
SELECT id FROM public.users WHERE role = 'SUPERADMIN' LIMIT 1;

-- Then, use that ID to create questions (replace the UUID below with your actual user ID)
INSERT INTO public.questions (subject, question_text, options, correct_answer, explanation, difficulty, created_by)
SELECT 
  s.id,
  'What is the value of π (pi) to two decimal places?',
  '{"A": "3.14", "B": "3.16", "C": "3.12", "D": "3.18"}',
  'A',
  'The value of π is approximately 3.14159, which rounds to 3.14 when expressed to two decimal places.',
  'EASY',
  (SELECT id FROM public.users WHERE role = 'SUPERADMIN' LIMIT 1)
FROM public.subjects s
WHERE s.name = 'Mathematics'
LIMIT 1;

INSERT INTO public.questions (subject, question_text, options, correct_answer, explanation, difficulty, created_by)
SELECT 
  s.id,
  'Which of the following is Newton\'s First Law of Motion?',
  '{"A": "Force equals mass times acceleration", "B": "An object at rest stays at rest unless acted upon by an external force", "C": "For every action, there is an equal and opposite reaction", "D": "Energy cannot be created or destroyed"}',
  'B',
  'Newton\'s First Law of Motion states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.',
  'MEDIUM',
  (SELECT id FROM public.users WHERE role = 'SUPERADMIN' LIMIT 1)
FROM public.subjects s
WHERE s.name = 'Physics'
LIMIT 1;
```

## Step 3: Verify the Data

Run these queries to check that your test data was inserted correctly:

```sql
-- Check subjects
SELECT * FROM public.subjects;

-- Check questions
SELECT 
  q.id, 
  q.question_text, 
  s.name as subject_name, 
  q.options, 
  q.correct_answer, 
  q.difficulty
FROM public.questions q
JOIN public.subjects s ON q.subject = s.id;
```

## Step 4: Test the API

Now you can test that the API is working correctly by making a request to fetch the subjects:

1. Go to the "API" section in the left sidebar
2. Under "Tables and Views", find the "subjects" table
3. Click on "Run" next to the GET request to fetch all subjects
4. You should see the subjects you created in the response

You can also test fetching questions in a similar way.

## Done!

You now have test data in your database that you can use to test your application. 