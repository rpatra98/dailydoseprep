import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('🔄 Login API called for:', email);
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (error) {
      console.error('❌ Login error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    if (!data.user) {
      console.error('❌ No user data returned');
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    console.log('✅ Auth login successful for:', data.user.email);
    
    // Fetch user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, primarysubject, current_streak, longest_streak, last_login_date')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ User data fetch error:', userError);
      
      // If user doesn't exist in our database, sign them out
      await supabase.auth.signOut();
      
      return NextResponse.json(
        { error: 'User account not found in database. Please contact administrator.' },
        { status: 404 }
      );
    }

    console.log('✅ User data fetched successfully:', userData.email, 'Role:', userData.role);

    // Create or update user session for streak tracking
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user already has an active session today
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', data.user.id)
      .eq('date', today)
      .eq('is_active', true)
      .single();

    if (!existingSession) {
      // Create new session for today
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: data.user.id,
          date: today,
          login_time: new Date().toISOString(),
          is_active: true
        });

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        // Don't fail login for session creation error
      } else {
        console.log('✅ New session created for today');
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        primarysubject: userData.primarysubject,
        current_streak: userData.current_streak,
        longest_streak: userData.longest_streak,
        last_login_date: userData.last_login_date
      }
    });
    
  } catch (error) {
    console.error('❌ Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 