import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔍 Testing database connection...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {} as any,
      summary: {} as any
    };
    
    // Test 1: Check subjects table
    console.log('📋 Testing subjects table...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .limit(5);
    
    results.tests.subjects = {
      accessible: !subjectsError,
      error: subjectsError?.message,
      count: subjects?.length || 0,
      sampleData: subjects?.[0] || null
    };
    
    // Test 2: Check users table
    console.log('👤 Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    results.tests.users = {
      accessible: !usersError,
      error: usersError?.message,
      count: users?.length || 0,
      sampleData: users?.[0] || null
    };
    
    // Test 3: Check questions table
    console.log('❓ Testing questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(5);
    
    results.tests.questions = {
      accessible: !questionsError,
      error: questionsError?.message,
      count: questions?.length || 0,
      sampleData: questions?.[0] || null,
      columns: questions?.[0] ? Object.keys(questions[0]) : null
    };
    
    // Test 4: Check authentication
    console.log('🔐 Testing authentication...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    results.tests.auth = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      error: sessionError?.message
    };
    
    // Test 5: Try a simple insert test (if subjects exist)
    if (subjects && subjects.length > 0) {
      console.log('🧪 Testing question insert capability...');
      
      const testQuestion = {
        subject: subjects[0].id,
        question_text: 'Test question - will be deleted',
        options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
        correct_answer: 'A',
        explanation: 'Test explanation',
        difficulty: 'EASY',
        questionHash: 'test-' + Date.now(),
        created_by: session?.user?.id || '00000000-0000-0000-0000-000000000000'
      };
      
      const { data: insertTest, error: insertError } = await supabase
        .from('questions')
        .insert(testQuestion)
        .select('*');
      
      if (!insertError && insertTest && insertTest.length > 0) {
        // Clean up test data
        await supabase.from('questions').delete().eq('id', insertTest[0].id);
        
        results.tests.insertTest = {
          success: true,
          insertedColumns: Object.keys(insertTest[0]),
          message: 'Insert test successful - schema is working'
        };
      } else {
        results.tests.insertTest = {
          success: false,
          error: insertError?.message,
          details: insertError
        };
      }
    }
    
    // Summary
    results.summary = {
      tablesAccessible: Object.values(results.tests).filter((t: any) => t.accessible).length,
      totalTables: 3,
      hasData: (results.tests.subjects.count > 0) && (results.tests.users.count > 0),
      authenticated: results.tests.auth.hasSession,
      canInsertQuestions: results.tests.insertTest?.success || false,
      recommendation: 'unknown'
    };
    
    if (!results.tests.subjects.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - subjects table missing';
    } else if (results.tests.subjects.count === 0) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - no subjects data';
    } else if (!results.tests.users.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - users table missing';
    } else if (!results.tests.questions.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - questions table missing';
    } else if (!results.tests.auth.hasSession) {
      results.summary.recommendation = 'User needs to log in';
    } else if (!results.tests.insertTest?.success) {
      results.summary.recommendation = 'Schema mismatch - check column names';
    } else {
      results.summary.recommendation = 'Database appears to be working correctly';
    }
    
    console.log('✅ Database test completed');
    console.log('📊 Summary:', results.summary);
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (err) {
    console.error('Database test error:', err);
    return NextResponse.json({
      error: 'Database test failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 