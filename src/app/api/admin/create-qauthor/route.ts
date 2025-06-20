import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const supabase = createRouteHandlerClient({ cookies });
    
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
    
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log(`Creating QAUTHOR account for ${email}`);
    
    // First check if user already exists in our users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingUser) {
      console.log(`User ${email} already exists in users table`);
      return NextResponse.json(
        { error: 'A user with this email address has already been registered' },
        { status: 409 }
      );
    }
    
    // Create user without email confirmation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'QAUTHOR' }
    });
    
    if (error || !data.user) {
      console.error('Error creating QAUTHOR:', error);
      
      // Handle specific error cases
      if (error?.message?.includes('already been registered') || 
          error?.message?.includes('already exists') ||
          error?.message?.includes('User already registered')) {
        return NextResponse.json(
          { error: 'A user with this email address has already been registered' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error?.message || 'Failed to create QAUTHOR account' },
        { status: 500 }
      );
    }
    
    console.log('QAUTHOR account created successfully, confirming email status...');
    
    // Verify and explicitly update email confirmation status
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true }
    );
    
    if (confirmError) {
      console.error('Error confirming email:', confirmError);
      // Continue anyway as this is a secondary operation
    }
    
    // Set the user role in our custom users table
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .insert({ 
        id: data.user.id,
        email: data.user.email,
        role: 'QAUTHOR',
      });
    
    if (roleError) {
      console.error('Error setting QAUTHOR role:', roleError);
      
      // Check if it's a duplicate key error (user already exists in users table)
      if (roleError.code === '23505' || roleError.message?.includes('duplicate key')) {
        console.log(`User ${email} already exists in users table, checking role...`);
        
        // Check if existing user has correct role
        const { data: existingUserRole, error: roleCheckError } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (!roleCheckError && existingUserRole?.role === 'QAUTHOR') {
          console.log(`User ${email} already exists with QAUTHOR role`);
          return NextResponse.json({ 
            success: true, 
            userId: data.user.id,
            message: 'User already exists with correct role'
          });
        }
      }
      
      // Try to delete the created user if we can't set their role
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      
      return NextResponse.json(
        { error: 'Failed to set user role' },
        { status: 500 }
      );
    }
    
    // Verify that the role was set correctly
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();
      
    if (verifyError || verifyData?.role !== 'QAUTHOR') {
      console.error('Role verification failed:', verifyError || 'Role not set to QAUTHOR');
    } else {
      console.log('QAUTHOR role verified for user:', data.user.id);
    }
    
    // Double-check user's auth status
    const { data: userCheck, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(data.user.id);
    
    if (userCheckError) {
      console.error('Error checking user status:', userCheckError);
    } else {
      console.log('User status check:', {
        id: userCheck.user.id,
        email: userCheck.user.email,
        emailConfirmed: userCheck.user.email_confirmed_at,
        role: userCheck.user.role,
        userMetadata: userCheck.user.user_metadata
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      userId: data.user.id 
    });
  } catch (error) {
    console.error('Server error creating QAUTHOR:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 