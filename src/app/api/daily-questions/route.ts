import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DailyQuestionSet } from '@/types';

// GET daily questions for a student
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.session.user.id)
      .single();
    
    if (userError) {
      return NextResponse.json({ error: 'Error fetching user data' }, { status: 500 });
    }
    
    if (userData?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can access daily questions' }, { status: 403 });
    }
    
    // Get today's date in YYYY-MM-DD format for consistency
    const today = new Date().toISOString().split('T')[0];
    
    // Check if student already has a question set for today
    const { data: existingSet, error: setError } = await supabase
      .from('daily_question_sets')
      .select('*')
      .eq('studentId', authData.session.user.id)
      .eq('date', today)
      .single();
      
    if (existingSet) {
      // Fetch the questions for this set
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, options')
        .in('id', existingSet.questions);
        
      if (questionsError) {
        return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
      }
      
      // Randomize the options for each question
      const questionsWithRandomizedOptions = questions?.map(question => {
        const questionOptions = question.options || {};
        const options = [
          { key: 'A', value: questionOptions.A || '' },
          { key: 'B', value: questionOptions.B || '' },
          { key: 'C', value: questionOptions.C || '' },
          { key: 'D', value: questionOptions.D || '' }
        ];
        
        // Shuffle the options
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        
        return {
          id: question.id,
          content: question.question_text,
          options: options
        };
      });
      
      return NextResponse.json({
        date: today,
        questions: questionsWithRandomizedOptions,
        completed: existingSet.completed,
        score: existingSet.score
      });
    }
    
    // No set exists for today, create a new one
    // First, get all questions for the primary subject that the student hasn't answered yet
    const { data: attemptedQuestionIds } = await supabase
      .from('student_attempts')
      .select('questionId')
      .eq('studentId', authData.session.user.id);
    
    const attemptedIds = attemptedQuestionIds?.map(item => item.questionId) || [];
    
    let query = supabase.from('questions')
      .select('id, question_text, options')
      .order('created_at', { ascending: true });
      
    // Exclude previously attempted questions
    if (attemptedIds.length > 0) {
      query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
    }
    
    // Get up to 10 questions
    const { data: availableQuestions, error: questionsError } = await query.limit(10);
    
    if (questionsError) {
      return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
    }
    
    // If no questions are available, return a message
    if (!availableQuestions || availableQuestions.length === 0) {
      return NextResponse.json({ 
        message: 'Congratulations, you solved all questions posted for this Subject.',
        date: today,
        completed: true
      });
    }
    
    // Create a new daily question set
    const questionIds = availableQuestions.map(q => q.id);
    const newSet: Partial<DailyQuestionSet> = {
      studentId: authData.session.user.id,
      date: today,
      questions: questionIds,
      completed: false,
      created_at: new Date()
    };
    
    const { data: insertedSet, error: insertError } = await supabase
      .from('daily_question_sets')
      .insert(newSet)
      .select()
      .single();
      
    if (insertError) {
      return NextResponse.json({ error: 'Failed to create daily question set' }, { status: 500 });
    }
    
    // Randomize the options for each question
    const questionsWithRandomizedOptions = availableQuestions.map(question => {
      const questionOptions = question.options || {};
      const options = [
        { key: 'A', value: questionOptions.A || '' },
        { key: 'B', value: questionOptions.B || '' },
        { key: 'C', value: questionOptions.C || '' },
        { key: 'D', value: questionOptions.D || '' }
      ];
      
      // Shuffle the options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      return {
        id: question.id,
        content: question.question_text,
        options: options
      };
    });
    
    return NextResponse.json({
      date: today,
      questions: questionsWithRandomizedOptions,
      completed: false
    });
  } catch (err) {
    console.error('Exception in daily questions GET:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST to submit answers for daily questions
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.session.user.id)
      .single();
    
    if (userError || userData?.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit answers' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { date, answers } = body;
    
    if (!date || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid submission format' }, { status: 400 });
    }
    
    // Fetch the question set for the given date
    const { data: questionSet, error: setError } = await supabase
      .from('daily_question_sets')
      .select('*')
      .eq('studentId', authData.session.user.id)
      .eq('date', date)
      .single();
      
    if (setError || !questionSet) {
      return NextResponse.json({ error: 'Question set not found for the given date' }, { status: 404 });
    }
    
    if (questionSet.completed) {
      return NextResponse.json({ error: 'This question set has already been completed' }, { status: 400 });
    }
    
    // Validate that all submitted answers correspond to questions in the set
    const questionIds = questionSet.questions;
    const submittedQuestionIds = answers.map((a: any) => a.questionId);
    
    const invalidQuestions = submittedQuestionIds.filter((id: string) => !questionIds.includes(id));
    if (invalidQuestions.length > 0) {
      return NextResponse.json({ error: 'Invalid question IDs in submission' }, { status: 400 });
    }
    
    // Fetch correct answers for validation
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .in('id', questionIds);
      
    if (questionsError || !questionsData) {
      return NextResponse.json({ error: 'Error fetching questions for validation' }, { status: 500 });
    }
    
    // Create a map for quick lookup of correct answers
    const correctAnswers = new Map();
    questionsData.forEach(q => correctAnswers.set(q.id, q.correct_answer));
    
    // Process answers and record attempts
    let correctCount = 0;
    const attempts = [];
    
    for (const answer of answers) {
      const isCorrect = correctAnswers.get(answer.questionId) === answer.selectedOption;
      if (isCorrect) correctCount++;
      
      attempts.push({
        studentId: authData.session.user.id,
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        attemptedAt: new Date()
      });
    }
    
    // Insert student attempts
    const { error: insertError } = await supabase
      .from('student_attempts')
      .insert(attempts);
      
    if (insertError) {
      return NextResponse.json({ error: 'Failed to record attempts' }, { status: 500 });
    }
    
    // Update the question set as completed
    const { error: updateError } = await supabase
      .from('daily_question_sets')
      .update({
        completed: true,
        score: correctCount
      })
      .eq('id', questionSet.id);
      
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update question set status' }, { status: 500 });
    }
    
    return NextResponse.json({
      date,
      completed: true,
      score: correctCount,
      totalQuestions: questionIds.length
    });
  } catch (err) {
    console.error('Exception in daily questions submission:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 