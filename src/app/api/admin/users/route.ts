import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get current user's role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !currentUser || currentUser.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Access denied. SUPERADMIN role required.' },
        { status: 403 }
      );
    }
    
    // Fetch all users
    console.log('🔄 Fetching all users from database...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Successfully fetched ${usersData?.length || 0} users`);
    console.log('Users data:', usersData?.map(u => ({ email: u.email, role: u.role })));
    
    return NextResponse.json(usersData || []);
    
  } catch (error) {
    console.error('❌ /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 