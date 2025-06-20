import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({
        authenticated: false,
        error: 'Not authenticated',
        details: authError?.message || 'No auth data'
      });
    }

    // Get user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({
        authenticated: true,
        user_in_auth: authData.user.email,
        user_in_database: false,
        error: 'User not found in database',
        details: userError?.message || 'No user data'
      });
    }

    // Check subjects availability
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .limit(5);

    return NextResponse.json({
      authenticated: true,
      user_in_auth: authData.user.email,
      user_in_database: true,
      user_role: userData.role,
      can_create_questions: userData.role === 'QAUTHOR',
      subjects_available: subjects?.length || 0,
      subjects_error: subjectsError?.message || null,
      subjects_sample: subjects?.slice(0, 3) || []
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 