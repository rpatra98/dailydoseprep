import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  try {
    if (isDev) {
      console.log('🔄 POST /api/auth/verify-credentials: Starting credential verification');
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: 'Could not parse JSON request'
      }, { status: 400 });
    }

    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        error: 'Missing credentials',
        details: 'Email and password are required'
      }, { status: 400 });
    }

    if (isDev) {
      console.log('✅ Credentials provided, attempting authentication...');
    }

    // Verify credentials using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError || !authData.user) {
      if (isDev) {
        console.log('❌ Authentication failed:', authError?.message);
      }
      return NextResponse.json({
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      }, { status: 401 });
    }

    if (isDev) {
      console.log('✅ Authentication successful:', authData.user.email);
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
      return NextResponse.json({
        error: 'User verification failed',
        details: 'User account not found in database'
      }, { status: 403 });
    }

    if (isDev) {
      console.log('✅ User verified:', userData.email, 'Role:', userData.role);
    }

    // Return success with user data (without sensitive information)
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      message: 'Credentials verified successfully'
    });

  } catch (error) {
    if (isDev) {
      console.error('❌ Unexpected error in credential verification:', error);
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 