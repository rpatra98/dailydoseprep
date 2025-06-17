import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// GET questions for the authenticated QAUTHOR
export async function GET(req: NextRequest) {
  if (isDev) {
    console.log('🔄 Starting QAUTHOR questions fetch...');
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      if (isDev) {
        console.log('❌ Authentication failed in QAUTHOR questions API');
      }
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (isDev) {
      console.log('✅ User authenticated:', authData.user.email);
    }

    // Get user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      if (isDev) {
        console.log('❌ User not found in database');
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is QAUTHOR
    if (userData.role !== 'QAUTHOR') {
      if (isDev) {
        console.log('❌ Access denied - user role:', userData.role);
      }
      return NextResponse.json({ error: 'Access denied. Only QAUTHORs can access this endpoint.' }, { status: 403 });
    }

    if (isDev) {
      console.log('✅ QAUTHOR access confirmed');
    }

    // Fetch questions created by this QAUTHOR - Fixed PostgREST syntax
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        title,
        content,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        difficulty,
        exam_category,
        year,
        source,
        created_at,
        updated_at,
        subjects!subject_id(
          id,
          name
        )
      `)
      .eq('created_by', userData.id)
      .order('created_at', { ascending: false });

    if (questionsError) {
      if (isDev) {
        console.error('❌ Error fetching questions:', questionsError);
      }
      throw questionsError;
    }

    if (isDev) {
      console.log('✅ QAUTHOR questions fetched successfully:', questions?.length || 0, 'questions');
    }

    // Return in the format expected by QuestionManager component
    return NextResponse.json({
      questions: questions || []
    });

  } catch (error) {
    if (isDev) {
      console.error('❌ Error fetching QAUTHOR questions:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
} 