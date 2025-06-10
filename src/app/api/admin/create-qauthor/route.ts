import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Only SUPERADMIN should be able to call this API
  // In a real-world application, you would implement proper authorization here
  
  try {
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
    
    // Create user without email confirmation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'QAUTHOR' }
    });
    
    if (error || !data.user) {
      console.error('Error creating QAUTHOR:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to create QAUTHOR account' },
        { status: 500 }
      );
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
      // Try to delete the created user if we can't set their role
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      
      return NextResponse.json(
        { error: 'Failed to set user role' },
        { status: 500 }
      );
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