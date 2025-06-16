import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('=== DATABASE DIAGNOSIS ===');
    
    const results = {
      timestamp: new Date().toISOString(),
      diagnosis: {} as any
    };
    
    // Test different possible column names by trying to select them
    const possibleColumns = [
      'id',
      'subject',
      'subject_id', 
      'question_text',
      'content',
      'title',
      'options',
      'optionA',
      'optionB', 
      'optionC',
      'optionD',
      'correct_answer',
      'correctAnswer',
      'correctOption',
      'answer',
      'explanation',
      'difficulty',
      'questionHash',
      'question_hash',
      'created_by',
      'createdBy',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt'
    ];
    
    results.diagnosis.columnTests = {};
    
    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select(column)
          .limit(1);
        
        results.diagnosis.columnTests[column] = {
          exists: !error,
          error: error?.message || null,
          hasData: data && data.length > 0
        };
      } catch (err) {
        results.diagnosis.columnTests[column] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          hasData: false
        };
      }
    }
    
    // Try to get any existing data to see actual structure
    console.log('🔍 Trying to get any existing questions...');
    const { data: anyQuestions, error: anyError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    results.diagnosis.existingData = {
      accessible: !anyError,
      error: anyError?.message || null,
      hasData: anyQuestions && anyQuestions.length > 0,
      sampleColumns: anyQuestions?.[0] ? Object.keys(anyQuestions[0]) : null,
      sampleData: anyQuestions?.[0] || null
    };
    
    // Determine what columns actually exist
    const existingColumns = Object.entries(results.diagnosis.columnTests)
      .filter(([_, test]: [string, any]) => test.exists)
      .map(([column, _]) => column);
    
    results.diagnosis.summary = {
      existingColumns: existingColumns,
      totalColumns: existingColumns.length,
      hasCorrectAnswer: existingColumns.includes('correct_answer'),
      hasCorrectAnswerAlt: existingColumns.includes('correctAnswer') || existingColumns.includes('correctOption'),
      hasSubject: existingColumns.includes('subject'),
      hasSubjectId: existingColumns.includes('subject_id'),
      hasQuestionText: existingColumns.includes('question_text'),
      hasContent: existingColumns.includes('content'),
      hasOptions: existingColumns.includes('options'),
      hasIndividualOptions: existingColumns.includes('optionA'),
      recommendation: 'unknown'
    };
    
    // Generate recommendation
    if (results.diagnosis.summary.totalColumns === 0) {
      results.diagnosis.summary.recommendation = 'Questions table does not exist or is completely inaccessible';
    } else if (!results.diagnosis.summary.hasCorrectAnswer && !results.diagnosis.summary.hasCorrectAnswerAlt) {
      results.diagnosis.summary.recommendation = 'Questions table missing correct answer column - needs schema update';
    } else if (!results.diagnosis.summary.hasSubject && !results.diagnosis.summary.hasSubjectId) {
      results.diagnosis.summary.recommendation = 'Questions table missing subject foreign key - needs schema update';
    } else if (!results.diagnosis.summary.hasQuestionText && !results.diagnosis.summary.hasContent) {
      results.diagnosis.summary.recommendation = 'Questions table missing question text column - needs schema update';
    } else {
      results.diagnosis.summary.recommendation = 'Questions table exists but may have different column names than expected';
    }
    
    console.log('✅ Database diagnosis completed');
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (err) {
    console.error('Database diagnosis error:', err);
    return NextResponse.json({
      error: 'Database diagnosis failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 