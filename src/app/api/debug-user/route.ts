import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔍 Debug User Check...');
    
    const url = new URL(req.url);
    const email = url.searchParams.get('email') || 'superadmin@ddp.com';
    
    // Check if user exists in our database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('email', email)
      .single();
    
    const result: any = {
      timestamp: new Date().toISOString(),
      searchEmail: email,
      database: {
        userExists: !!userData,
        userData: userData,
        error: userError?.message || null,
        errorCode: userError?.code || null
      }
    };
    
    // If user exists, also check auth.users table
    if (userData) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      const authUser = authUsers?.users?.find(u => u.email === email);
      
      result.auth = {
        userExists: !!authUser,
        userId: authUser?.id || null,
        emailConfirmed: authUser?.email_confirmed_at ? true : false,
        lastSignIn: authUser?.last_sign_in_at || null,
        error: authError?.message || null
      };
    }
    
    console.log('Debug user result:', result);
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Debug user error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 