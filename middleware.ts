import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Map to store middleware clients by request URL to minimize client creation
const middlewareClientCache = new Map();

export async function middleware(request: NextRequest) {
  // Get the origin header from the request
  const origin = request.headers.get('origin') || '';
  
  // Create a response object
  const res = NextResponse.next();
  
  // Add CORS headers to the response
  res.headers.set('Access-Control-Allow-Origin', origin || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Skip auth for preflight requests
  if (request.method === 'OPTIONS') {
    return res;
  }
  
  // Create a Supabase client for the middleware
  const supabase = createMiddlewareClient({ req: request, res });
  
  try {
    // Refresh session if expired - necessary for Supabase auth
    await supabase.auth.getSession();
  } catch (error) {
    console.error('Error refreshing auth session in middleware:', error);
  }
  
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 