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

    // Get student's primary subject from user_subjects table
    const { data: primarySubjectData, error: primarySubjectError } = await supabase
      .from('user_subjects')
      .select(`
        subject_id,
        subjects (
          id,
          name
        )
      `)
      .eq('user_id', authData.session.user.id)
      .eq('is_primary', true)
      .eq('is_active', true)
      .single();

    if (primarySubjectError || !primarySubjectData) {
      return NextResponse.json({ 
        error: 'No primary subject selected',
        message: 'Please select a primary subject in your dashboard to receive daily questions.',
        needsSubjectSelection: true
      }, { status: 400 });
    }

    const primarySubjectId = primarySubjectData.subject_id;
    
    // Get today's date in YYYY-MM-DD format for consistency
    const today = new Date().toISOString().split('T')[0];
    
    // Check if student already has a question set for today
    const { data: existingSet, error: setError } = await supabase
      .from('daily_question_sets')
      .select('*')
      .eq('student_id', authData.session.user.id)
      .eq('date', today)
      .single();
      
    if (existingSet) {
      // Fetch the questions for this set
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, title, content, option_a, option_b, option_c, option_d')
        .in('id', existingSet.questions);
        
      if (questionsError) {
        return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
      }
      
      // Randomize the options for each question
      const questionsWithRandomizedOptions = questions?.map(question => {
        const options = [
          { key: 'A', value: question.option_a || '' },
          { key: 'B', value: question.option_b || '' },
          { key: 'C', value: question.option_c || '' },
          { key: 'D', value: question.option_d || '' }
        ];
        
        // Shuffle the options
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        
        return {
          id: question.id,
          title: question.title,
          content: question.content,
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
      .select('question_id')
      .eq('student_id', authData.session.user.id);
    
    const attemptedIds = attemptedQuestionIds?.map(item => item.question_id) || [];
    
    // Filter questions by primary subject and exclude attempted ones
    let query = supabase.from('questions')
      .select('id, title, content, option_a, option_b, option_c, option_d')
      .eq('subject_id', primarySubjectId)  // Filter by primary subject
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
    const newSet = {
      student_id: authData.session.user.id,
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
      const options = [
        { key: 'A', value: question.option_a || '' },
        { key: 'B', value: question.option_b || '' },
        { key: 'C', value: question.option_c || '' },
        { key: 'D', value: question.option_d || '' }
      ];
      
      // Shuffle the options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      return {
        id: question.id,
        title: question.title,
        content: question.content,
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
      .eq('student_id', authData.session.user.id)
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
      .select('id, correct_option')
      .in('id', questionIds);
      
    if (questionsError || !questionsData) {
      return NextResponse.json({ error: 'Error fetching questions for validation' }, { status: 500 });
    }
    
    // Create a map for quick lookup of correct answers
    const correctAnswers = new Map();
    questionsData.forEach(q => correctAnswers.set(q.id, q.correct_option));
    
    // Process answers and record attempts
    let correctCount = 0;
    const attempts = [];
    
    for (const answer of answers) {
      const isCorrect = correctAnswers.get(answer.questionId) === answer.selectedOption;
      if (isCorrect) correctCount++;
      
      attempts.push({
        student_id: authData.session.user.id,
        question_id: answer.questionId,
        selected_option: answer.selectedOption,
        is_correct: isCorrect,
        attempted_at: new Date()
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