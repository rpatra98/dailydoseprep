import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Always log for debugging - will remove later
const shouldLog = true;

export async function POST(req: NextRequest) {
  try {
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
    
    const { email, password, role } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'Email and password are required'
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format',
        details: 'Please enter a valid email address'
      }, { status: 400 });
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({
        error: 'Password too short',
        details: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }
    
    // Only allow STUDENT registration through this endpoint
    const userRole = role || 'STUDENT';
    if (userRole !== 'STUDENT') {
      return NextResponse.json({
        error: 'Invalid role',
        details: 'Only STUDENT accounts can be created through registration'
      }, { status: 400 });
    }
    
    console.log('🔄 Creating STUDENT account for:', email);
    
    // Check if user already exists in our users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking existing user:', checkError);
      return NextResponse.json({
        error: 'Database error',
        details: 'Failed to check existing user'
      }, { status: 500 });
    }
    
    if (existingUser) {
      return NextResponse.json({
        error: 'User already exists',
        details: 'An account with this email address already exists'
      }, { status: 409 });
    }
    
    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: undefined, // Skip email confirmation for now
      }
    });
    
    if (authError) {
      console.error('❌ Auth signup error:', authError);
      
      // Handle specific auth errors
      if (authError.message?.includes('already registered')) {
        return NextResponse.json({
          error: 'User already exists',
          details: 'An account with this email address already exists'
        }, { status: 409 });
      }
      
      return NextResponse.json({
        error: 'Registration failed',
        details: authError.message || 'Failed to create user account'
      }, { status: 400 });
    }
    
    if (!authData.user) {
      return NextResponse.json({
        error: 'Registration failed',
        details: 'No user data returned from authentication service'
      }, { status: 500 });
    }
    
    console.log('✅ Auth user created with ID:', authData.user.id);
    
    // Create the user record in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        role: 'STUDENT'
      })
      .select('id, email, role, created_at')
      .single();
    
    if (userError) {
      console.error('❌ User table insert error:', userError);
      
      // Clean up the auth user if user creation failed
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup auth user:', cleanupError);
      }
      
      return NextResponse.json({
        error: 'Registration failed',
        details: 'Failed to create user profile in database'
      }, { status: 500 });
    }
    
    if (!userData) {
      return NextResponse.json({
        error: 'Registration failed',
        details: 'User profile creation succeeded but no data returned'
      }, { status: 500 });
    }
    
    console.log('✅ STUDENT user created successfully:', userData.email);
    
    return NextResponse.json({
      success: true,
      message: 'Student account created successfully',
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        created_at: userData.created_at
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Unexpected error in student registration:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 