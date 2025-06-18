import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  console.log('🔄 /api/auth/me: Starting authentication check...');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      console.log('❌ /api/auth/me: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('✅ /api/auth/me: User authenticated:', authData.user.email);

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
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
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.log('❌ /api/auth/me: User data fetch error:', userError);
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    console.log('✅ /api/auth/me: User data fetched successfully');
    
    // Return user data with primary subject information
    const response = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      primarysubject: userData.primarysubject,
      primarySubjectData: userData.subjects,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ /api/auth/me: Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 