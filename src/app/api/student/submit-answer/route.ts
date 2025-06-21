import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔄 Starting submit-answer API call');
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('✅ User authenticated:', authData.user.id);

    // Verify user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ User verification failed:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'STUDENT') {
      console.error('❌ Access denied: User role is', userData.role);
      return NextResponse.json({ error: 'Access denied. Only students can submit answers.' }, { status: 403 });
    }

    console.log('✅ User verified as STUDENT:', userData.id);

    // Parse request body
    const body = await req.json();
    const { questionId, selectedOption, isCorrect, subjectId, timeSpent } = body;

    console.log('📝 Request data:', { questionId, selectedOption, isCorrect, subjectId, timeSpent });

    // Validate required fields
    if (!questionId || !selectedOption || !subjectId) {
      console.error('❌ Missing required fields:', { questionId: !!questionId, selectedOption: !!selectedOption, subjectId: !!subjectId });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'questionId, selectedOption, and subjectId are required' 
      }, { status: 400 });
    }

    // Validate selectedOption
    if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
      console.error('❌ Invalid selected option:', selectedOption);
      return NextResponse.json({ 
        error: 'Invalid selected option',
        details: 'selectedOption must be A, B, C, or D' 
      }, { status: 400 });
    }

    // First, let's verify the question exists and get its details
    console.log('🔍 Verifying question exists:', questionId);
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .select('id, subject_id, correct_option')
      .eq('id', questionId)
      .single();

    if (questionError || !questionData) {
      console.error('❌ Question not found:', questionError);
      return NextResponse.json({ 
        error: 'Question not found',
        details: questionError?.message || 'Question does not exist' 
      }, { status: 404 });
    }

    console.log('✅ Question verified:', questionData);

    // Check if student has already attempted this question
    console.log('🔍 Checking for existing attempts...');
    const { data: existingAttempt, error: checkError } = await supabase
      .from('student_attempts')
      .select('id, "selectedOption", "isCorrect", "attemptedAt"')
      .eq('"studentId"', authData.user.id)
      .eq('"questionId"', questionId)
      .maybeSingle();

    console.log('🔍 Existing attempt check result:', { existingAttempt, checkError });

    // If attempt already exists, return the existing data
    if (existingAttempt) {
      console.log(`✅ Student ${authData.user.id} already attempted question ${questionId}`);
      return NextResponse.json({
        success: true,
        alreadyAttempted: true,
        attempt: {
          id: existingAttempt.id,
          questionId: questionId,
          selectedOption: existingAttempt.selectedOption,
          isCorrect: existingAttempt.isCorrect,
          attemptedAt: existingAttempt.attemptedAt
        }
      });
    }

    // Log the check error for debugging, but don't fail the request
    if (checkError) {
      console.warn('⚠️ Warning checking existing attempts:', checkError);
    }

    // Prepare insert data according to APPLICATION_SPECIFICATION.md
    const insertData = {
      studentId: authData.user.id,
      questionId: questionId,
      selectedOption: selectedOption,
      isCorrect: isCorrect === true,
      subject_id: subjectId,
      time_spent_seconds: timeSpent || 0,
      attemptedAt: new Date().toISOString()
    };

    console.log('📤 Preparing to insert student attempt:', insertData);

    // First check if the table exists and create if it doesn't
    try {
      const { data: tableCheck } = await supabase
        .from('student_attempts')
        .select('id')
        .limit(1);
      
      console.log('✅ student_attempts table exists');
    } catch (tableError: any) {
      if (tableError?.code === '42P01') { // Table doesn't exist
        console.error('❌ student_attempts table does not exist');
        return NextResponse.json({ 
          error: 'Database not properly set up',
          details: 'student_attempts table is missing. Please run database migrations.',
          tableError: tableError.message
        }, { status: 500 });
      }
    }

    // Insert the student attempt with proper error handling
    const { data: attempt, error: attemptError } = await supabase
      .from('student_attempts')
      .insert(insertData)
      .select()
      .single();

    if (attemptError) {
      console.error('❌ Error inserting student attempt:', {
        error: attemptError,
        insertData,
        errorCode: attemptError.code,
        errorMessage: attemptError.message,
        errorDetails: attemptError.details,
        errorHint: attemptError.hint
      });

      // Handle specific error cases
      if (attemptError.code === '23505') { // Unique constraint violation
        console.log('🔄 Duplicate attempt detected, fetching existing record...');
        const { data: existingRecord } = await supabase
          .from('student_attempts')
          .select('id, "selectedOption", "isCorrect", "attemptedAt"')
          .eq('"studentId"', authData.user.id)
          .eq('"questionId"', questionId)
          .single();

        if (existingRecord) {
          console.log('✅ Returning existing attempt record');
          return NextResponse.json({
            success: true,
            alreadyAttempted: true,
            attempt: {
              id: existingRecord.id,
              questionId: questionId,
              selectedOption: existingRecord.selectedOption,
              isCorrect: existingRecord.isCorrect,
              attemptedAt: existingRecord.attemptedAt
            }
          });
        }
      }

      return NextResponse.json({ 
        error: 'Failed to submit answer',
        details: attemptError.message,
        code: attemptError.code,
        hint: attemptError.hint
      }, { status: 500 });
    }

    if (!attempt) {
      console.error('❌ No attempt data returned from insert');
      return NextResponse.json({ 
        error: 'Failed to submit answer',
        details: 'No data returned from database' 
      }, { status: 500 });
    }

    console.log(`✅ Answer submitted successfully: Student ${authData.user.id} answered question ${questionId} with ${selectedOption} (${isCorrect ? 'correct' : 'incorrect'})`);

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        questionId: attempt.questionId || questionId,
        selectedOption: attempt.selectedOption || selectedOption,
        isCorrect: attempt.isCorrect,
        attemptedAt: attempt.attemptedAt
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error in submit-answer API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 