import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔍 Debug Session Check...');
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const result = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        error: sessionError?.message || null
      },
      database: {
        userExists: false,
        userData: null as { id: any; email: any; role: any; } | null,
        error: null as string | null
      }
    };
    
    // If session exists, check database
    if (session?.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', session.user.id)
        .single();
      
      result.database = {
        userExists: !!userData,
        userData: userData,
        error: userError?.message || null
      };
    }
    
    console.log('Debug result:', result);
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 