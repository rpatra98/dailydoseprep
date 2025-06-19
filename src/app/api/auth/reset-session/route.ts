import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('🔄 Force session reset requested...');
    
    // Force sign out
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Error during force logout:', error);
    } else {
      console.log('✅ Session cleared successfully');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Session cleared successfully',
      redirect: '/login'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Session reset error:', error);
    return NextResponse.json({
      error: 'Session reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Same logic for POST requests
  return GET(req);
} 