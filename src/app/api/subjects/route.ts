import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { Subject } from '@/types';
import { cookies } from 'next/headers';

// GET all subjects
export async function GET() {
  try {
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

// POST a new subject - protected for SUPERADMIN only
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized. Only SUPERADMIN can create subjects' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }
    
    // Check if subject already exists
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', name)
      .single();
      
    if (existingSubject) {
      return NextResponse.json({ error: 'Subject with this name already exists' }, { status: 409 });
    }
    
    // Create new subject with default values
    const { data, error } = await supabase
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Exception in subject creation:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 