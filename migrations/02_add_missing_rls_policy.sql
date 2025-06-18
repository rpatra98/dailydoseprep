-- Add missing RLS policy for daily_question_sets INSERT operations
-- This policy was missing and preventing students from creating daily question sets

CREATE POLICY "Students can insert their own question sets" 
    ON public.daily_question_sets FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = studentId AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'STUDENT'); 