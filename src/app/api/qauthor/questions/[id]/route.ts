import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// PUT - Update a specific question (QAUTHOR can only update their own questions)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  
  if (isDev) {
    console.log('🔄 Starting QAUTHOR question update:', questionId);
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Parse request body
    const body = await req.json();
    const {
      title,
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      difficulty,
      subject,
      examCategory,
      year,
      source
    } = body;

    if (isDev) {
      console.log('📝 Question update data received:', {
        title: title ? 'present' : 'missing',
        content: content ? 'present' : 'missing',
        subject,
        difficulty,
        examCategory
      });
    }

    // Validate required fields
    if (!title || !content || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation || !difficulty || !subject || !examCategory) {
      if (isDev) {
        console.log('❌ Missing required fields');
      }
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      if (isDev) {
        console.log('❌ Authentication failed in QAUTHOR update API');
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
      return NextResponse.json({ error: 'Access denied. Only QAUTHORs can update questions.' }, { status: 403 });
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
      return NextResponse.json({ error: 'Access denied. You can only update your own questions.' }, { status: 403 });
    }

    if (isDev) {
      console.log('✅ Question ownership verified:', questionCheck.title);
    }

    // Validate subject exists
    const { data: subjectCheck, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject)
      .single();

    if (subjectError || !subjectCheck) {
      if (isDev) {
        console.log('❌ Subject not found:', subject);
      }
      return NextResponse.json({ error: 'Selected subject does not exist' }, { status: 400 });
    }

    // Update the question
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions')
      .update({
        title,
        content,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctAnswer,
        explanation,
        difficulty,
        subject_id: subject,
        exam_category: examCategory,
        year: year || null,
        source: source || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .eq('created_by', userData.id) // Double-check ownership
      .select(`
        id,
        title,
        content,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        explanation,
        difficulty,
        exam_category,
        year,
        source,
        created_at,
        updated_at,
        subjects (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    if (isDev) {
      console.log('✅ Question updated successfully:', questionId);
    }

    return NextResponse.json({ 
      message: 'Question updated successfully',
      question: updatedQuestion
    });

  } catch (error) {
    if (isDev) {
      console.error('❌ Error updating question:', error);
    }
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

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