import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  console.log('🔍 DEBUG LOGS ENDPOINT CALLED');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('🔑 Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('✅ Supabase client created successfully');
    
    // Test basic connection
    console.log('📡 Testing basic connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('subjects')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError);
      return NextResponse.json({
        status: 'connection_failed',
        error: connectionError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Basic connection successful');
    
    // Test authentication
    console.log('🔐 Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth test failed:', authError);
      return NextResponse.json({
        status: 'auth_failed',
        error: authError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Auth test result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    // Test subjects table
    console.log('📋 Testing subjects table...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .limit(3);
    
    if (subjectsError) {
      console.error('❌ Subjects test failed:', subjectsError);
      return NextResponse.json({
        status: 'subjects_failed',
        error: subjectsError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Subjects test successful:', subjects?.length, 'subjects found');
    
    // Test questions table
    console.log('❓ Testing questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (questionsError) {
      console.error('❌ Questions test failed:', questionsError);
      return NextResponse.json({
        status: 'questions_failed',
        error: questionsError.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Questions test successful');
    if (questions && questions.length > 0) {
      console.log('📊 Questions table columns:', Object.keys(questions[0]));
    } else {
      console.log('📊 Questions table is empty');
    }
    
    console.log('🎉 All tests passed successfully!');
    
    return NextResponse.json({
      status: 'success',
      message: 'All database tests passed',
      details: {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        subjectsCount: subjects?.length || 0,
        questionsCount: questions?.length || 0,
        questionsColumns: questions?.[0] ? Object.keys(questions[0]) : null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Unexpected error in debug logs:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 