import { NextRequest, NextResponse } from 'next/server';
import { getRouteHandlerClient, getServiceRoleClient } from '@/lib/supabase-server';
import { Subject } from '@/types';

// GET all subjects
export async function GET() {
  try {
    const supabase = getRouteHandlerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Exception in subjects GET:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// POST a new subject - protected for SUPERADMIN only
export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/subjects: Starting request');
    
    // Use service role client for admin operations
    const supabaseAdmin = getServiceRoleClient();
    
    // Also create route handler client for session management
    const supabase = getRouteHandlerClient();
    
    // Get the session from cookies
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Authentication error getting session:', sessionError);
      return NextResponse.json({ error: 'Authentication error', details: sessionError.message }, { status: 401 });
    }
    
    if (!sessionData.session) {
      console.error('No session found');
      return NextResponse.json({ error: 'Not authenticated - no session found' }, { status: 401 });
    }
    
    const userId = sessionData.session.user.id;
    console.log(`User ID from session: ${userId}`);
    
    // Check if user is SUPERADMIN
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json({ error: 'Failed to verify user role', details: userError.message }, { status: 500 });
    }
    
    console.log(`User role: ${userData?.role}`);
    
    if (userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can create subjects' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }
    
    console.log(`Creating subject with name: ${name}`);
    
    // Check if subject already exists
    const { data: existingSubject, error: existingError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('name', name)
      .single();
      
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing subject:', existingError);
      return NextResponse.json({ error: 'Error checking existing subject', details: existingError.message }, { status: 500 });
    }
      
    if (existingSubject) {
      return NextResponse.json({ error: 'Subject with this name already exists' }, { status: 409 });
    }
    
    // Create new subject with default values
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({
        name,
        examCategory: 'OTHER', // Default exam category
        description: null
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating subject:', error);
      return NextResponse.json({ error: 'Failed to create subject', details: error.message }, { status: 500 });
    }
    
    console.log('Subject created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Exception in subject creation:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
} 