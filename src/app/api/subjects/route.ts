import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Subject } from '@/types';

// GET all subjects
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
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

// POST a new subject - SUPERADMIN only (Session-based authentication)
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 POST /api/subjects: Starting subject creation request');
    
    // Use single client for consistent authentication context
    const supabase = createRouteHandlerClient({ cookies });
    
    // Step 1: Validate authentication session
    console.log('🔐 Step 1: Validating authentication session...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message,
        suggestion: 'Please log out and log back in'
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('❌ No authenticated user found');
      return NextResponse.json({ 
        error: 'Authentication required', 
        details: 'No valid session found',
        suggestion: 'Please log in to continue'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.email, 'ID:', user.id);
    
    // Step 2: Verify user exists in database and check role
    console.log('👤 Step 2: Checking user role in database...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user from database:', userError.message);
      return NextResponse.json({ 
        error: 'User verification failed', 
        details: userError.message,
        suggestion: 'User account may not be properly configured'
      }, { status: 500 });
    }
    
    if (!userData) {
      console.error('❌ User not found in database');
      return NextResponse.json({ 
        error: 'User not found', 
        details: 'User exists in auth but not in users table',
        suggestion: 'Contact administrator - account not properly configured'
      }, { status: 500 });
    }
    
    console.log('✅ User found in database:', userData.email, 'Role:', userData.role);
    
    // Step 3: Check SUPERADMIN role permission
    if (userData.role !== 'SUPERADMIN') {
      console.error('❌ Insufficient permissions. User role:', userData.role);
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `User role '${userData.role}' cannot create subjects. Only SUPERADMIN can create subjects.`,
        suggestion: 'Contact administrator for proper permissions'
      }, { status: 403 });
    }
    
    console.log('✅ SUPERADMIN role verified');
    
    // Step 4: Parse and validate request body
    console.log('📝 Step 4: Parsing request body...');
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Invalid request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: 'Could not parse JSON request'
      }, { status: 400 });
    }
    
    const { name, description } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Invalid subject name', 
        details: 'Subject name is required and must be a non-empty string'
      }, { status: 400 });
    }
    
    const trimmedName = name.trim();
    console.log('✅ Subject name validated:', trimmedName);
    
    // Step 5: Check for duplicate subject names
    console.log('🔍 Step 5: Checking for duplicate subject names...');
    const { data: existingSubject, error: duplicateError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('name', trimmedName)
      .maybeSingle(); // Use maybeSingle to avoid error when no results
      
    if (duplicateError) {
      console.error('❌ Error checking for duplicates:', duplicateError.message);
      return NextResponse.json({ 
        error: 'Database error', 
        details: duplicateError.message
      }, { status: 500 });
    }
      
    if (existingSubject) {
      console.error('❌ Subject already exists:', trimmedName);
      return NextResponse.json({ 
        error: 'Subject already exists', 
        details: `A subject with the name '${trimmedName}' already exists`
      }, { status: 409 });
    }
    
    console.log('✅ No duplicate found, proceeding with creation');
    
    // Step 6: Create new subject (RLS policies will enforce permissions)
    console.log('➕ Step 6: Creating new subject...');
    const subjectData = {
      name: trimmedName,
      description: description?.trim() || null
    };
    
    const { data: newSubject, error: createError } = await supabase
      .from('subjects')
      .insert(subjectData)
      .select('*')
      .single();
      
    if (createError) {
      console.error('❌ Error creating subject:', createError.message);
      
      // Provide specific error analysis
      let errorAnalysis = 'Unknown database error';
      let suggestion = 'Check database configuration';
      
      if (createError.message?.includes('permission denied') || createError.message?.includes('policy')) {
        errorAnalysis = 'Permission denied by database policy';
        suggestion = 'RLS policies may need to be updated';
      } else if (createError.message?.includes('unique constraint')) {
        errorAnalysis = 'Subject name must be unique';
        suggestion = 'Try a different subject name';
      } else if (createError.message?.includes('check constraint')) {
        errorAnalysis = 'Data validation failed';
        suggestion = 'Check subject name format and requirements';
      }
      
      return NextResponse.json({ 
        error: 'Failed to create subject', 
        details: createError.message,
        analysis: errorAnalysis,
        suggestion: suggestion
      }, { status: 500 });
    }
    
    if (!newSubject) {
      console.error('❌ Subject creation succeeded but no data returned');
      return NextResponse.json({ 
        error: 'Subject creation incomplete', 
        details: 'Database operation succeeded but no subject data was returned'
      }, { status: 500 });
    }
    
    console.log('✅ Subject created successfully:', newSubject.id, newSubject.name);
    
    // Step 7: Return success response
    return NextResponse.json({
      success: true,
      message: 'Subject created successfully',
      subject: newSubject
    }, { status: 201 });
    
  } catch (error) {
    console.error('💥 Unexpected error in subject creation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      suggestion: 'Please try again or contact support if the issue persists'
    }, { status: 500 });
  }
} 