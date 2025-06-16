import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('=== DATABASE SETUP VERIFICATION ===');
    
    // Check if tables exist by trying to query them
    const tableChecks = {
      subjects: false,
      users: false,
      questions: false,
      student_attempts: false,
      daily_question_sets: false
    };
    
    // Check subjects table
    try {
      const { data, error } = await supabase.from('subjects').select('count(*)').limit(1);
      tableChecks.subjects = !error;
      console.log('Subjects table:', tableChecks.subjects ? '✅ EXISTS' : '❌ MISSING', error?.message || '');
    } catch (e) {
      console.log('Subjects table: ❌ EXCEPTION', e);
    }
    
    // Check users table
    try {
      const { data, error } = await supabase.from('users').select('count(*)').limit(1);
      tableChecks.users = !error;
      console.log('Users table:', tableChecks.users ? '✅ EXISTS' : '❌ MISSING', error?.message || '');
    } catch (e) {
      console.log('Users table: ❌ EXCEPTION', e);
    }
    
    // Check questions table
    try {
      const { data, error } = await supabase.from('questions').select('count(*)').limit(1);
      tableChecks.questions = !error;
      console.log('Questions table:', tableChecks.questions ? '✅ EXISTS' : '❌ MISSING', error?.message || '');
      
      if (tableChecks.questions) {
        // If questions table exists, check its schema
        const { data: sampleData, error: schemaError } = await supabase
          .from('questions')
          .select('*')
          .limit(1);
        
        if (sampleData && sampleData.length > 0) {
          console.log('Questions table columns:', Object.keys(sampleData[0]));
        } else {
          console.log('Questions table is empty, checking schema...');
          // Try to get table info from information_schema
          const { data: schemaInfo, error: infoError } = await supabase
            .rpc('get_table_columns', { table_name: 'questions' });
          console.log('Schema info:', schemaInfo, infoError);
        }
      }
    } catch (e) {
      console.log('Questions table: ❌ EXCEPTION', e);
    }
    
    // Check student_attempts table
    try {
      const { data, error } = await supabase.from('student_attempts').select('count(*)').limit(1);
      tableChecks.student_attempts = !error;
      console.log('Student_attempts table:', tableChecks.student_attempts ? '✅ EXISTS' : '❌ MISSING', error?.message || '');
    } catch (e) {
      console.log('Student_attempts table: ❌ EXCEPTION', e);
    }
    
    // Check daily_question_sets table
    try {
      const { data, error } = await supabase.from('daily_question_sets').select('count(*)').limit(1);
      tableChecks.daily_question_sets = !error;
      console.log('Daily_question_sets table:', tableChecks.daily_question_sets ? '✅ EXISTS' : '❌ MISSING', error?.message || '');
    } catch (e) {
      console.log('Daily_question_sets table: ❌ EXCEPTION', e);
    }
    
    const allTablesExist = Object.values(tableChecks).every(exists => exists);
    
    return NextResponse.json({
      status: allTablesExist ? 'complete' : 'incomplete',
      tables: tableChecks,
      message: allTablesExist 
        ? 'All required tables exist' 
        : 'Some tables are missing. Please run the database setup script.',
      setupInstructions: {
        step1: 'Go to your Supabase project dashboard',
        step2: 'Navigate to SQL Editor',
        step3: 'Run the contents of supabase-manual-setup.sql',
        step4: 'Verify setup by calling this API again'
      }
    });
    
  } catch (err) {
    console.error('Setup verification error:', err);
    return NextResponse.json({ 
      error: 'Setup verification failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Authentication required for database setup' 
      }, { status: 401 });
    }
    
    // Check if user is SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (userError || userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ 
        error: 'Only SUPERADMIN can run database setup' 
      }, { status: 403 });
    }
    
    // This endpoint would run the setup SQL, but for security reasons,
    // we'll just return instructions for manual setup
    return NextResponse.json({
      message: 'For security reasons, please run the setup manually',
      instructions: {
        step1: 'Copy the contents of supabase-manual-setup.sql',
        step2: 'Go to your Supabase project dashboard',
        step3: 'Navigate to SQL Editor',
        step4: 'Paste and execute the SQL',
        step5: 'Call GET /api/setup to verify'
      }
    });
    
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ 
      error: 'Setup failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 