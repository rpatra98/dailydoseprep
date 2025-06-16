import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Try to get the table structure by selecting from the questions table
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    // Try to get information_schema data
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'questions' })
      .single();
    
    return NextResponse.json({
      questions: {
        data: questions,
        error: questionsError
      },
      columns: {
        data: columns,
        error: columnsError
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Debug schema error:', err);
    return NextResponse.json({ 
      error: 'Debug error: ' + (err instanceof Error ? err.message : 'Unknown error'),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 