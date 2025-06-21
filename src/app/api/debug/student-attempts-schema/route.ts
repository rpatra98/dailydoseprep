import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔍 Debug: Checking student_attempts table schema...');

    // Get table schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'student_attempts' })
      .single();

    // Alternative: Try to query the table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'student_attempts')
      .order('ordinal_position');

    // Try to get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('student_attempts')
      .select('*')
      .limit(1);

    // Get current user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', authData.user.id)
      .single();

    // Get available questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, title, subject_id')
      .limit(3);

    return NextResponse.json({
      success: true,
      debug_info: {
        user: userData,
        user_error: userError,
        schema_data: schemaData,
        schema_error: schemaError,
        table_info: tableInfo,
        table_error: tableError,
        sample_data: sampleData,
        sample_error: sampleError,
        questions_sample: questionsData,
        questions_error: questionsError,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 