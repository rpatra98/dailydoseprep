import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Subject } from '@/types';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// Always log for debugging - will remove later
const shouldLog = true;

// GET all subjects
export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/subjects: Request received');
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log('📋 GET /api/subjects: Fetching subjects from database...');
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ GET /api/subjects: Database error:', error);
      throw error;
    }
    
    console.log('✅ GET /api/subjects: Subjects fetched:', subjects?.length || 0, 'subjects');
    console.log('✅ GET /api/subjects: Subjects data:', subjects);
    
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('❌ GET /api/subjects: Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
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

// POST a new subject - SUPERADMIN only (Session-based authentication)
export async function POST(req: NextRequest) {
  try {
    if (isDev) {
      console.log('🔄 POST /api/subjects: Starting subject creation request');
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: 'Could not parse JSON request'
      }, { status: 400 });
    }
    
    const { name, examcategory } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'Subject name is required'
      }, { status: 400 });
    }
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required',
        details: 'Please log in to create subjects'
      }, { status: 401 });
    }
    
    if (isDev) {
      console.log('✅ User authenticated:', user.email, 'ID:', user.id);
    }
    
    // Verify user exists in database and has proper role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      return NextResponse.json({
        error: 'User verification failed',
        details: 'User account not found in database'
      }, { status: 403 });
    }
    
    if (!userData) {
      return NextResponse.json({
        error: 'User not found',
        details: 'User account not properly configured'
      }, { status: 403 });
    }
    
    if (isDev) {
      console.log('✅ User found in database:', userData.email, 'Role:', userData.role);
    }
    
    // Only SUPERADMIN can create subjects
    if (userData.role !== 'SUPERADMIN') {
      return NextResponse.json({
        error: 'Insufficient permissions',
        details: 'Only SUPERADMIN can create subjects'
      }, { status: 403 });
    }
    
    if (isDev) {
      console.log('✅ SUPERADMIN role verified');
    }
    
    // Validate and sanitize input
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return NextResponse.json({
        error: 'Invalid subject name',
        details: 'Subject name cannot be empty'
      }, { status: 400 });
    }
    
    if (trimmedName.length > 100) {
      return NextResponse.json({
        error: 'Invalid subject name',
        details: 'Subject name cannot exceed 100 characters'
      }, { status: 400 });
    }
    
    if (isDev) {
      console.log('✅ Subject name validated:', trimmedName);
    }
    
    // Check for duplicate subjects (case-insensitive)
    const { data: existingSubjects, error: duplicateError } = await supabase
      .from('subjects')
      .select('id, name')
      .ilike('name', trimmedName);
    
    if (duplicateError) {
      return NextResponse.json({
        error: 'Database error during duplicate check',
        details: duplicateError.message
      }, { status: 500 });
    }
    
    if (existingSubjects && existingSubjects.length > 0) {
      return NextResponse.json({
        error: 'Subject already exists',
        details: `A subject with the name "${trimmedName}" already exists`
      }, { status: 409 });
    }
    
    if (isDev) {
      console.log('✅ No duplicate found, proceeding with creation');
    }
    
    // Create the subject
    const subjectData = {
      name: trimmedName,
      examcategory: examcategory || 'OTHER'
    };
    
    const { data: newSubject, error: createError } = await supabase
      .from('subjects')
      .insert(subjectData)
      .select('*')
      .single();
    
    if (createError) {
      return NextResponse.json({
        error: 'Failed to create subject',
        details: createError.message
      }, { status: 500 });
    }
    
    if (!newSubject) {
      return NextResponse.json({
        error: 'Subject creation failed',
        details: 'No data returned from database'
      }, { status: 500 });
    }
    
    if (isDev) {
      console.log('✅ Subject created successfully:', newSubject.id, newSubject.name);
    }
    
    return NextResponse.json({
      success: true,
      subject: newSubject,
      message: `Subject "${newSubject.name}" created successfully`
    }, { status: 201 });
    
  } catch (error) {
    if (isDev) {
      console.error('❌ Unexpected error in POST /api/subjects:', error);
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 