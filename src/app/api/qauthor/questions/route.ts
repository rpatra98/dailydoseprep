import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET questions for the authenticated QAUTHOR
export async function GET(req: NextRequest) {
  try {
    console.log('🔄 Starting QAUTHOR questions fetch...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication first
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData?.user) {
      console.log('❌ Authentication failed in QAUTHOR questions API');
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access your questions'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', authData.user.email);

    // Check user role - only QAUTHOR can access this endpoint
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.log('❌ User not found in database');
      return NextResponse.json({ 
        error: 'User not found',
        details: 'User account not properly configured'
      }, { status: 403 });
    }

    if (userData.role !== 'QAUTHOR') {
      console.log('❌ Access denied - user role:', userData.role);
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Only QAUTHORs can access this endpoint'
      }, { status: 403 });
    }

    console.log('✅ QAUTHOR access confirmed');

    // Fetch questions created by this QAUTHOR with proper column names from APPLICATION_SPECIFICATION.md
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        *,
        subjects (
          name,
          examcategory
        )
      `)
      .eq('created_by', authData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching QAUTHOR questions:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch questions',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ QAUTHOR questions fetched successfully:', questions?.length || 0, 'questions');

    // Return in the format expected by the QuestionManager
    return NextResponse.json({ 
      questions: questions || [],
      total: questions?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in QAUTHOR questions GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 