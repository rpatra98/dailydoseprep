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

  // Skip auth validation for public routes
  const publicRoutes = ['/login', '/register', '/api/auth', '/'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  if (isPublicRoute) {
    return res;
  }
  
  // Create a Supabase client for the middleware
  const supabase = createMiddlewareClient({ req: request, res });
  
  try {
    // Refresh session if expired - necessary for Supabase auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error in middleware:', sessionError);
      return res;
    }

    // If user is authenticated, validate they exist in database
    if (session?.user) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError) {
          console.error('Database user check error:', userError);
          // Don't block request, let the frontend handle it
          return res;
        }

        if (!userData) {
          // User exists in auth but not in database - SECURITY ISSUE
          console.warn('SECURITY: User exists in auth but not in database:', session.user.email);
          
          // For API routes, return 401
          if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
              { 
                error: 'Account not properly configured',
                details: 'User exists in auth but not in database',
                action: 'logout_required'
              }, 
              { status: 401 }
            );
          }
          
          // For regular routes, redirect to login with error
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'account_config_error');
          return NextResponse.redirect(loginUrl);
        }

        // User exists and is valid - continue
        console.log('User validated in middleware:', userData.email, 'Role:', userData.role);
      } catch (dbError) {
        console.error('Database validation error in middleware:', dbError);
        // Don't block request, let the frontend handle it
      }
    }
  } catch (error) {
    console.error('Error in middleware:', error);
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
    '/((?!_next/static|_next/image|favicon.ico|login|register).*)',
  ],
}; 