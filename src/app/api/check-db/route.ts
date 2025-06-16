import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔍 Basic database connectivity check...');
    
    const results = {
      timestamp: new Date().toISOString(),
      checks: {} as any,
      summary: {} as any
    };
    
    // Check 1: Authentication
    console.log('🔐 Checking authentication...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    results.checks.auth = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      error: sessionError?.message || null
    };
    
    // Check 2: Subjects table
    console.log('📋 Checking subjects table...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, examCategory')
      .limit(3);
    
    results.checks.subjects = {
      accessible: !subjectsError,
      error: subjectsError?.message || null,
      count: subjects?.length || 0,
      data: subjects || null
    };
    
    // Check 3: Users table
    console.log('👤 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);
    
    results.checks.users = {
      accessible: !usersError,
      error: usersError?.message || null,
      count: users?.length || 0,
      data: users || null
    };
    
    // Check 4: Questions table structure
    console.log('❓ Checking questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    results.checks.questions = {
      accessible: !questionsError,
      error: questionsError?.message || null,
      count: questions?.length || 0,
      columns: questions?.[0] ? Object.keys(questions[0]) : null,
      sampleData: questions?.[0] || null
    };
    
    // Summary and recommendations
    const accessibleTables = Object.values(results.checks).filter((check: any) => check.accessible).length;
    const totalTables = 3; // subjects, users, questions
    
    results.summary = {
      authenticated: results.checks.auth.hasSession,
      tablesAccessible: accessibleTables,
      totalTables: totalTables,
      hasSubjects: results.checks.subjects.count > 0,
      hasUsers: results.checks.users.count > 0,
      hasQuestions: results.checks.questions.count > 0,
      recommendation: 'unknown'
    };
    
    // Generate recommendation
    if (!results.checks.auth.hasSession) {
      results.summary.recommendation = 'User needs to log in first';
    } else if (!results.checks.subjects.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - subjects table missing';
    } else if (results.checks.subjects.count === 0) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - no subjects data';
    } else if (!results.checks.users.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - users table missing';
    } else if (!results.checks.questions.accessible) {
      results.summary.recommendation = 'Run supabase-manual-setup.sql - questions table missing';
    } else {
      results.summary.recommendation = 'Database appears to be set up correctly';
    }
    
    console.log('✅ Database check completed');
    console.log('📊 Summary:', results.summary);
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (err) {
    console.error('Database check error:', err);
    return NextResponse.json({
      error: 'Database check failed',
      details: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 