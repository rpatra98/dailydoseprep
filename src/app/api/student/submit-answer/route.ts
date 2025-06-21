import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Access denied. Only students can submit answers.' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { questionId, selectedOption, isCorrect, subjectId, timeSpent } = body;

    // Validate required fields
    if (!questionId || !selectedOption || !subjectId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'questionId, selectedOption, and subjectId are required' 
      }, { status: 400 });
    }

    // Validate selectedOption
    if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
      return NextResponse.json({ 
        error: 'Invalid selected option',
        details: 'selectedOption must be A, B, C, or D' 
      }, { status: 400 });
    }

    // Check if student has already attempted this question
    const { data: existingAttempt, error: checkError } = await supabase
      .from('student_attempts')
      .select('id')
      .eq('studentId', authData.user.id)
      .eq('questionId', questionId)
      .single();

    if (existingAttempt) {
      return NextResponse.json({ 
        error: 'Question already attempted',
        details: 'You have already submitted an answer for this question' 
      }, { status: 409 });
    }

    // Insert the student attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('student_attempts')
      .insert({
        studentId: authData.user.id,
        questionId: questionId,
        selectedOption: selectedOption,
        isCorrect: isCorrect === true,
        subject_id: subjectId,
        time_spent_seconds: timeSpent || 0,
        attemptedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error inserting student attempt:', attemptError);
      return NextResponse.json({ 
        error: 'Failed to submit answer',
        details: attemptError.message 
      }, { status: 500 });
    }

    console.log(`✅ Answer submitted: Student ${authData.user.id} answered question ${questionId} with ${selectedOption} (${isCorrect ? 'correct' : 'incorrect'})`);

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        questionId: attempt.questionId,
        selectedOption: attempt.selectedOption,
        isCorrect: attempt.isCorrect,
        attemptedAt: attempt.attemptedAt
      }
    });

  } catch (error) {
    console.error('Error in submit-answer API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 