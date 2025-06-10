import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
    
    // First, find the user by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify this is a QAUTHOR
    if (userData.role !== 'QAUTHOR') {
      return NextResponse.json(
        { error: 'This endpoint is only for QAUTHOR verification' },
        { status: 403 }
      );
    }
    
    console.log(`Verifying QAUTHOR email for user ID: ${userData.id}`);
    
    // Update the user's email confirmation status
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
      { email_confirm: true }
    );
    
    if (updateError) {
      console.error('Error confirming QAUTHOR email:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm email' },
        { status: 500 }
      );
    }
    
    // Double-check that the email was confirmed
    const { data: checkData, error: checkError } = await supabaseAdmin.auth.admin.getUserById(userData.id);
    
    if (checkError) {
      console.error('Error checking user status after confirmation:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify confirmation status' },
        { status: 500 }
      );
    }
    
    console.log('Email confirmation status:', {
      id: userData.id,
      email: email,
      emailConfirmed: checkData.user.email_confirmed_at,
      confirmed: !!checkData.user.email_confirmed_at
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'QAUTHOR email confirmed' 
    });
  } catch (error) {
    console.error('Server error verifying QAUTHOR:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 