import { NextRequest, NextResponse } from 'next/server';
import { getRouteHandlerClient, getServiceRoleClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

// GET a specific subject by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`GET /api/subjects/${id}: Starting request`);
    
    const supabase = getRouteHandlerClient();
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
      console.error(`Error fetching subject ${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception in subject GET by ID:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
}

// PUT to update a subject - SUPERADMIN only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`PUT /api/subjects/${id}: Starting request`);
    
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
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can update subjects' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }
    
    // Check if subject exists
    const { data: existingSubject, error: checkError } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
      
    if (checkError || !existingSubject) {
      console.error(`Subject ${id} not found:`, checkError);
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    console.log(`Updating subject ${id} with name: ${name}`);
    
    // Update subject - keep existing examCategory and description
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update({
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`Error updating subject ${id}:`, error);
      return NextResponse.json({ error: 'Failed to update subject', details: error.message }, { status: 500 });
    }
    
    console.log('Subject updated successfully:', data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception in subject update:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
}

// DELETE a subject - SUPERADMIN only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`DELETE /api/subjects/${id}: Starting request`);
    
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
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can delete subjects' }, { status: 403 });
    }
    
    // Check if subject exists
    const { data: existingSubject, error: checkError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError || !existingSubject) {
      console.error(`Subject ${id} not found:`, checkError);
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    // Check if the subject has associated questions
    const { count: questionCount, error: countError } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', id);
      
    if (countError) {
      console.error('Error checking for associated questions:', countError);
      return NextResponse.json({ error: 'Error checking for associated content', details: countError.message }, { status: 500 });
    }
    
    if (questionCount && questionCount > 0) {
      console.log(`Cannot delete subject ${id} with ${questionCount} associated questions`);
      return NextResponse.json(
        { error: `Cannot delete subject with ${questionCount} associated questions` },
        { status: 409 }
      );
    }
    
    console.log(`Deleting subject ${id}`);
    
    // Delete the subject
    const { error } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Error deleting subject ${id}:`, error);
      return NextResponse.json({ error: 'Failed to delete subject', details: error.message }, { status: 500 });
    }
    
    console.log(`Subject ${id} deleted successfully`);
    return NextResponse.json({ message: 'Subject deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('Exception in subject deletion:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
} 