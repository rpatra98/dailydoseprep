import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Fetch user's selected subjects
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Access denied. Only students can access subject selections.' }, { status: 403 });
    }

    // Get user's selected subjects
    const { data: userSubjects, error: subjectsError } = await supabase
      .from('user_subjects')
      .select(`
        subject_id,
        is_active,
        is_primary,
        selected_at,
        subjects (
          id,
          name,
          examcategory,
          description
        )
      `)
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .order('selected_at', { ascending: true });

    if (subjectsError) {
      console.error('Error fetching user subjects:', subjectsError);
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }

    return NextResponse.json({
      subjects: userSubjects || []
    });

  } catch (error) {
    console.error('Error in student subjects GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save user's subject selections
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
      return NextResponse.json({ error: 'Access denied. Only students can save subject selections.' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { subjectIds, primarySubjectId } = body;

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json({ error: 'Subject IDs are required' }, { status: 400 });
    }

    if (!primarySubjectId) {
      return NextResponse.json({ error: 'Primary subject ID is required' }, { status: 400 });
    }

    if (!subjectIds.includes(primarySubjectId)) {
      return NextResponse.json({ error: 'Primary subject must be one of the selected subjects' }, { status: 400 });
    }

    // Validate that all subjects exist
    const { data: existingSubjects, error: validationError } = await supabase
      .from('subjects')
      .select('id')
      .in('id', subjectIds);

    if (validationError || !existingSubjects || existingSubjects.length !== subjectIds.length) {
      return NextResponse.json({ error: 'One or more selected subjects do not exist' }, { status: 400 });
    }

    // Start a transaction by deactivating all current subjects first
    const { error: deactivateError } = await supabase
      .from('user_subjects')
      .update({ is_active: false })
      .eq('user_id', authData.user.id);

    if (deactivateError) {
      console.error('Error deactivating subjects:', deactivateError);
      return NextResponse.json({ error: 'Failed to update subject selections' }, { status: 500 });
    }

    // Insert/update new subject selections
    const subjectRecords = subjectIds.map(subjectId => ({
      user_id: authData.user.id,
      subject_id: subjectId,
      is_active: true,
      is_primary: subjectId === primarySubjectId,
      selected_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('user_subjects')
      .upsert(subjectRecords, {
        onConflict: 'user_id,subject_id'
      });

    if (insertError) {
      console.error('Error inserting subject selections:', insertError);
      return NextResponse.json({ error: 'Failed to save subject selections' }, { status: 500 });
    }

    // Update user's primarysubject field for backward compatibility
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ 
        primarysubject: primarySubjectId,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);

    if (updateUserError) {
      console.error('Error updating user primary subject:', updateUserError);
      // Don't fail the request for this, as it's just for compatibility
    }

    return NextResponse.json({
      message: 'Subject selections saved successfully',
      selectedSubjects: subjectIds.length,
      primarySubject: primarySubjectId
    });

  } catch (error) {
    console.error('Error in student subjects POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 