import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// DELETE a specific question (QAUTHOR can only delete their own questions)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  
  if (isDev) {
    console.log('🔄 Starting QAUTHOR question deletion:', questionId);
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      if (isDev) {
        console.log('❌ Authentication failed in QAUTHOR delete API');
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
      return NextResponse.json({ error: 'Access denied. Only QAUTHORs can delete questions.' }, { status: 403 });
    }

    if (isDev) {
      console.log('✅ QAUTHOR access confirmed');
    }

    // Check if question exists and belongs to this user
    const { data: questionCheck, error: questionError } = await supabase
      .from('questions')
      .select('id, title, created_by')
      .eq('id', questionId)
      .single();

    if (questionError || !questionCheck) {
      if (isDev) {
        console.log('❌ Question not found:', questionId);
      }
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify ownership
    if (questionCheck.created_by !== userData.id) {
      if (isDev) {
        console.log('❌ Access denied - question belongs to different user');
      }
      return NextResponse.json({ error: 'Access denied. You can only delete your own questions.' }, { status: 403 });
    }

    if (isDev) {
      console.log('✅ Question ownership verified:', questionCheck.title);
    }

    // Delete the question
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('created_by', userData.id); // Double-check ownership

    if (deleteError) {
      throw deleteError;
    }

    if (isDev) {
      console.log('✅ Question deleted successfully:', questionId);
    }

    return NextResponse.json({ message: 'Question deleted successfully' });

  } catch (error) {
    if (isDev) {
      console.error('❌ Error deleting question:', error);
    }
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
} 