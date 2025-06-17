import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// DELETE a specific question (QAUTHOR can only delete their own questions)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const questionId = resolvedParams.id;
    console.log('🔄 Starting QAUTHOR question deletion:', questionId);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication first
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData?.user) {
      console.log('❌ Authentication failed in QAUTHOR delete API');
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to delete questions'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', authData.user.email);

    // Check user role - only QAUTHOR can delete questions
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
        details: 'Only QAUTHORs can delete questions'
      }, { status: 403 });
    }

    console.log('✅ QAUTHOR access confirmed');

    // First, verify the question exists and belongs to this QAUTHOR
    const { data: questionCheck, error: checkError } = await supabase
      .from('questions')
      .select('id, created_by, title')
      .eq('id', questionId)
      .single();

    if (checkError || !questionCheck) {
      console.log('❌ Question not found:', questionId);
      return NextResponse.json({ 
        error: 'Question not found',
        details: 'The question you are trying to delete does not exist'
      }, { status: 404 });
    }

    // Ensure the QAUTHOR can only delete their own questions
    if (questionCheck.created_by !== authData.user.id) {
      console.log('❌ Access denied - question belongs to different user');
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'You can only delete questions you created'
      }, { status: 403 });
    }

    console.log('✅ Question ownership verified:', questionCheck.title);

    // Delete the question
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('created_by', authData.user.id); // Double-check ownership

    if (deleteError) {
      console.error('❌ Error deleting question:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete question',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Question deleted successfully:', questionId);

    return NextResponse.json({ 
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('❌ Unexpected error in QAUTHOR question DELETE:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 