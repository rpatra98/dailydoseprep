import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(req: NextRequest) {
  console.log('🔄 /api/auth/update-primary-subject: Starting update...');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Parse request body
    const body = await req.json();
    const { primarySubjectId } = body;

    if (!primarySubjectId) {
      console.log('❌ /api/auth/update-primary-subject: Missing primarySubjectId');
      return NextResponse.json({ error: 'Primary subject ID is required' }, { status: 400 });
    }

    // Check if user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      console.log('❌ /api/auth/update-primary-subject: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('✅ /api/auth/update-primary-subject: User authenticated:', authData.user.email);

    // Get current user data to check role and existing primary subject
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, primarysubject')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.log('❌ /api/auth/update-primary-subject: User data not found');
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    // Only STUDENT users can set primary subject
    if (userData.role !== 'STUDENT') {
      console.log('❌ /api/auth/update-primary-subject: Access denied - not a student');
      return NextResponse.json({ error: 'Only students can set primary subject' }, { status: 403 });
    }

    // Check if primary subject is already set (one-time selection)
    if (userData.primarysubject) {
      console.log('❌ /api/auth/update-primary-subject: Primary subject already set');
      return NextResponse.json({ 
        error: 'Primary subject already selected and cannot be changed',
        currentPrimarySubject: userData.primarysubject
      }, { status: 400 });
    }

    // Validate that the subject exists
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', primarySubjectId)
      .single();

    if (subjectError || !subjectData) {
      console.log('❌ /api/auth/update-primary-subject: Subject not found');
      return NextResponse.json({ error: 'Selected subject does not exist' }, { status: 400 });
    }

    console.log('✅ /api/auth/update-primary-subject: Subject validated:', subjectData.name);

    // Update user's primary subject
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        primarysubject: primarySubjectId,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)
      .select(`
        id,
        email,
        role,
        primarysubject,
        created_at,
        updated_at,
        subjects (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      console.log('❌ /api/auth/update-primary-subject: Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update primary subject' }, { status: 500 });
    }

    console.log('✅ /api/auth/update-primary-subject: Primary subject updated successfully');

    return NextResponse.json({
      message: 'Primary subject updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        primarysubject: updatedUser.primarysubject,
        primarySubjectData: updatedUser.subjects,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('❌ /api/auth/update-primary-subject: Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 