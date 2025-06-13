import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// GET a specific subject by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception in subject GET by ID:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT to update a subject - SUPERADMIN only
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.session.user.id)
      .single();
    
    if (userError || userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can update subjects' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name, examCategory, description } = body;
    
    if (!name || !examCategory) {
      return NextResponse.json({ error: 'Name and exam category are required' }, { status: 400 });
    }
    
    // Check if subject exists
    const id = params.id;
    const { data: existingSubject, error: checkError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
      
    if (checkError || !existingSubject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    // Update subject
    const { data, error } = await supabase
      .from('subjects')
      .update({
        name,
        examCategory,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating subject:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception in subject update:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE a subject - SUPERADMIN only
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.session.user.id)
      .single();
    
    if (userError || userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can delete subjects' }, { status: 403 });
    }
    
    const id = params.id;
    
    // Check if subject exists
    const { data: existingSubject, error: checkError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError || !existingSubject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    // Check if the subject has associated questions
    const { count: questionCount, error: countError } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('subject', id);
      
    if (countError) {
      console.error('Error checking for associated questions:', countError);
      return NextResponse.json({ error: 'Error checking for associated content' }, { status: 500 });
    }
    
    if (questionCount && questionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete subject with ${questionCount} associated questions` },
        { status: 409 }
      );
    }
    
    // Delete the subject
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting subject:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Subject deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('Exception in subject deletion:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 