import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('=== DATABASE SCHEMA DEBUG ===');
    
    // Try to get the actual table structure using information_schema
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'questions' })
      .single();
    
    if (tableError) {
      console.log('RPC failed, trying direct query...');
      
      // Try to get existing questions to see actual columns
      const { data: existingQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .limit(1);
      
      if (questionsError) {
        console.error('Questions table error:', questionsError);
        return NextResponse.json({
          error: 'Cannot access questions table',
          details: questionsError.message,
          suggestion: 'Table may not exist or have different structure'
        });
      }
      
      if (existingQuestions && existingQuestions.length > 0) {
        const actualColumns = Object.keys(existingQuestions[0]);
        console.log('Actual columns found:', actualColumns);
        
        return NextResponse.json({
          status: 'table_exists_with_data',
          actualColumns: actualColumns,
          sampleData: existingQuestions[0],
          expectedColumns: [
            'id', 'subject', 'question_text', 'options', 
            'correct_answer', 'explanation', 'difficulty', 
            'question_hash', 'created_by', 'created_at', 'updated_at'
          ],
          analysis: {
            hasCorrectAnswer: actualColumns.includes('correct_answer'),
            hasQuestionText: actualColumns.includes('question_text'),
            hasSubject: actualColumns.includes('subject'),
            hasSubjectId: actualColumns.includes('subject_id'),
            hasOptions: actualColumns.includes('options'),
            hasCreatedBy: actualColumns.includes('created_by')
          }
        });
      } else {
        // Table exists but is empty - try to insert a test record to see what fails
        console.log('Table is empty, testing insert...');
        
        const testData = {
          subject: 'test',
          question_text: 'test question',
          options: { A: 'test', B: 'test', C: 'test', D: 'test' },
          correct_answer: 'A',
          explanation: 'test explanation',
          difficulty: 'EASY',
          created_by: 'test-user-id'
        };
        
        const { data: insertTest, error: insertError } = await supabase
          .from('questions')
          .insert(testData)
          .select('*');
        
        if (insertError) {
          console.error('Test insert failed:', insertError);
          
          // Parse the error to understand what columns are missing/wrong
          const errorMessage = insertError.message;
          const missingColumns = [];
          const wrongColumns = [];
          
          if (errorMessage.includes('correct_answer')) {
            missingColumns.push('correct_answer');
          }
          if (errorMessage.includes('question_text')) {
            missingColumns.push('question_text');
          }
          if (errorMessage.includes('subject')) {
            missingColumns.push('subject');
          }
          
          return NextResponse.json({
            status: 'schema_mismatch',
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            testData: testData,
            analysis: {
              errorType: insertError.code,
              missingColumns: missingColumns,
              suggestion: 'Run the complete supabase-manual-setup.sql script'
            }
          });
        } else {
          // Insert succeeded - clean up and return success
          if (insertTest && insertTest.length > 0) {
            await supabase.from('questions').delete().eq('id', insertTest[0].id);
          }
          
          return NextResponse.json({
            status: 'schema_correct',
            message: 'Schema appears to be correct',
            testInsertSucceeded: true
          });
        }
      }
    }
    
    return NextResponse.json({
      status: 'rpc_success',
      tableInfo: tableInfo
    });
    
  } catch (err) {
    console.error('Schema debug error:', err);
    return NextResponse.json({
      error: 'Debug failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 