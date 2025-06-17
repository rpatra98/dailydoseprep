import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Logout error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('✅ User signed out successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });
    
  } catch (error) {
    console.error('❌ /api/auth/logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 