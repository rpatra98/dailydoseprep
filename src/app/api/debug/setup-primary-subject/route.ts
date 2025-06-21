import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can set up subjects' }, { status: 403 });
    }

    // Get the first available subject (English in this case)
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name')
      .limit(1);

    if (subjectsError || !subjects || subjects.length === 0) {
      return NextResponse.json({ 
        error: 'No subjects available',
        details: 'Please contact admin to create subjects first'
      }, { status: 400 });
    }

    const firstSubject = subjects[0];

    // Check if user already has this subject
    const { data: existingSubject } = await supabase
      .from('user_subjects')
      .select('id')
      .eq('user_id', authData.user.id)
      .eq('subject_id', firstSubject.id)
      .single();

    if (existingSubject) {
      // Update existing to be primary
      const { error: updateError } = await supabase
        .from('user_subjects')
        .update({ is_primary: true, is_active: true })
        .eq('id', existingSubject.id);

      if (updateError) {
        return NextResponse.json({ 
          error: 'Failed to update existing subject',
          details: updateError.message 
        }, { status: 500 });
      }
    } else {
      // Create new user_subject entry
      const { error: insertError } = await supabase
        .from('user_subjects')
        .insert({
          user_id: authData.user.id,
          subject_id: firstSubject.id,
          is_primary: true,
          is_active: true,
          selected_at: new Date().toISOString()
        });

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to create subject selection',
          details: insertError.message 
        }, { status: 500 });
      }
    }

    // Also update the legacy primarysubject field in users table
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ primarysubject: firstSubject.id })
      .eq('id', authData.user.id);

    if (userUpdateError) {
      console.warn('Failed to update legacy primarysubject field:', userUpdateError);
      // Don't fail the request for this
    }

    return NextResponse.json({
      success: true,
      message: `Successfully set up ${firstSubject.name} as your primary subject`,
      subject: firstSubject,
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Setup primary subject error:', error);
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 