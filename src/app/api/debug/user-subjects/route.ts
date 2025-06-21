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

    console.log('🔍 Debug: Checking user subjects for user:', authData.user.id);

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, primarysubject')
      .eq('id', authData.user.id)
      .single();

    // Get user's subjects from user_subjects table
    const { data: userSubjects, error: subjectsError } = await supabase
      .from('user_subjects')
      .select(`
        id,
        user_id,
        subject_id,
        is_active,
        is_primary,
        selected_at,
        subjects (
          id,
          name
        )
      `)
      .eq('user_id', authData.user.id);

    // Get all available subjects
    const { data: allSubjects, error: allSubjectsError } = await supabase
      .from('subjects')
      .select('id, name, examcategory')
      .order('name');

    // Get questions count per subject
    const { data: questionCounts, error: questionCountsError } = await supabase
      .from('questions')
      .select('subject_id');

    const questionsBySubject: Record<string, number> = {};
    if (questionCounts) {
      questionCounts.forEach(q => {
        questionsBySubject[q.subject_id] = (questionsBySubject[q.subject_id] || 0) + 1;
      });
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          userData: userData,
          userError: userError?.message
        },
        userSubjects: {
          count: userSubjects?.length || 0,
          subjects: userSubjects,
          error: subjectsError?.message,
          primarySubject: userSubjects?.find(us => us.is_primary)
        },
        allSubjects: {
          count: allSubjects?.length || 0,
          subjects: allSubjects,
          error: allSubjectsError?.message
        },
        questionCounts: {
          bySubject: questionsBySubject,
          error: questionCountsError?.message
        },
        diagnosis: {
          hasUserSubjects: (userSubjects?.length || 0) > 0,
          hasPrimarySubject: userSubjects?.some(us => us.is_primary) || false,
          canAccessDailyQuestions: userSubjects?.some(us => us.is_primary) && Object.keys(questionsBySubject).length > 0
        }
      }
    });

  } catch (error) {
    console.error('Debug user subjects error:', error);
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 