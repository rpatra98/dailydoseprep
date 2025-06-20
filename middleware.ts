import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

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

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register', 
    '/api/auth',
    '/',
    '/api/setup',
    '/api/debug-user',
    '/api/debug-session'
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  );
  
  // Skip auth validation for public routes
  if (isPublicRoute) {
    return res;
  }
  
  // Create a Supabase client for the middleware
  const supabase = createMiddlewareClient({ req: request, res });
  
  try {
    // Simply refresh session if expired - let AuthContext handle user validation
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error in middleware:', sessionError);
      // Don't block - let the frontend handle it
      return res;
    }

    // For API routes, basic session check
    if (request.nextUrl.pathname.startsWith('/api/')) {
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        );
      }
    }

    // For protected pages, let AuthContext handle the detailed validation
    // Middleware just ensures session exists
    
  } catch (error) {
    console.error('Error in middleware:', error);
    // Don't block on middleware errors - let frontend handle auth
  }
  
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/create-question/:path*',
    '/admin/:path*',
    '/daily-questions/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|login|register).*)',
  ],
}; 