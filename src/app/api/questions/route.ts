import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Question } from '@/types';
import crypto from 'crypto';

// Helper function to generate a unique hash for a question to prevent duplicates
function generateQuestionHash(question: any): string {
  const stringToHash = `${question.content}-${question.optionA}-${question.optionB}-${question.optionC}-${question.optionD}-${question.subject}`;
  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

// GET questions with optional filters
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const examCategory = searchParams.get('examCategory');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Start building the query - using actual database field names from src/db/schema.sql
    let query = supabase.from('questions').select(`
      id,
      subject_id,
      question_text,
      options,
      correct_answer,
      explanation,
      difficulty,
      created_by,
      created_at,
      updated_at,
      subjects(name)
    `);
    
    // Apply filters if provided
    if (subject) query = query.eq('subject_id', subject);
    if (difficulty) query = query.eq('difficulty', difficulty);
    
    // Execute query with pagination
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Exception in questions GET:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST a new question (QAUTHOR only)
export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/questions: Starting request');
    
    // Use createRouteHandlerClient for proper session handling
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session using the route handler client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      sessionError: sessionError?.message
    });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ 
        error: 'Authentication error: ' + sessionError.message 
      }, { status: 401 });
    }
    
    if (!session || !session.user) {
      console.error('No valid session found');
      return NextResponse.json({ 
        error: 'Not authenticated - please log in again' 
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log(`Authenticated user ID: ${userId}`);
    
    // Check if user is QAUTHOR or SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json({ 
        error: 'Error fetching user role: ' + userError.message 
      }, { status: 500 });
    }
    
    console.log(`User role: ${userData?.role}`);
    
    if (userData?.role !== 'QAUTHOR' && userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ 
        error: 'Unauthorized. Only QAUTHORs can create questions' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    console.log('Request body received:', { 
      title: body.title,
      hasContent: !!body.content,
      hasOptions: !!(body.optionA && body.optionB && body.optionC && body.optionD),
      correctOption: body.correctOption,
      hasExplanation: !!body.explanation,
      subject: body.subject
    });
    
    const {
      title,
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      difficulty = 'MEDIUM', // Default value
      examCategory = 'OTHER', // Default value
      subject,
      year,
      source
    } = body;
    
    // Validate required fields (difficulty and examCategory are now optional)
    if (!title || !content || !optionA || !optionB || !optionC || !optionD || 
        !correctOption || !explanation || !subject) {
      const missingFields = [];
      if (!title) missingFields.push('title');
      if (!content) missingFields.push('content');
      if (!optionA) missingFields.push('optionA');
      if (!optionB) missingFields.push('optionB');
      if (!optionC) missingFields.push('optionC');
      if (!optionD) missingFields.push('optionD');
      if (!correctOption) missingFields.push('correctOption');
      if (!explanation) missingFields.push('explanation');
      if (!subject) missingFields.push('subject');
      
      console.error('Missing required fields:', missingFields);
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }
    
    // Validate correct option
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return NextResponse.json({ 
        error: 'Correct option must be A, B, C, or D' 
      }, { status: 400 });
    }
    
    // Check if subject exists
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject)
      .single();
      
    if (subjectError || !subjectData) {
      console.error('Subject validation error:', subjectError);
      return NextResponse.json({ 
        error: 'Invalid subject ID' 
      }, { status: 400 });
    }
    
    console.log(`Subject validated: ${subjectData.id}`);
    
    // Check for duplicate questions (using question text and subject_id)
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id')
      .eq('question_text', content)
      .eq('subject_id', subject)
      .maybeSingle();
      
    if (existingQuestion) {
      console.log('Duplicate question found');
      return NextResponse.json({ 
        error: 'A similar question already exists for this subject' 
      }, { status: 409 });
    }
    
    // Prepare options as JSONB
    const options = {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD
    };
    
    console.log('Creating question with options:', options);
    
    // First, let's try to see what columns actually exist by doing a simple select
    try {
      const { data: testData, error: testError } = await supabase
        .from('questions')
        .select('*')
        .limit(1);
      console.log('Test query result:', { testData, testError });
    } catch (e) {
      console.log('Test query failed:', e);
    }
    
    // Try a minimal insert first to see what works
    const minimalQuestion = {
      subject_id: subject,
      question_text: content,
      created_by: userId
    };
    
    console.log('Trying minimal insert:', minimalQuestion);
    
    const { data: minimalData, error: minimalError } = await supabase
      .from('questions')
      .insert(minimalQuestion)
      .select('*')
      .single();
      
    if (minimalError) {
      console.error('Minimal insert failed:', minimalError);
      console.error('Full minimal error:', JSON.stringify(minimalError, null, 2));
      
      return NextResponse.json({ 
        error: 'Database error (minimal test): ' + minimalError.message 
      }, { status: 500 });
    }
    
    console.log('Minimal insert succeeded:', minimalData);
    
    // If minimal insert worked, try to update with the rest of the fields
    const updateData = {
      options: options,
      correct_answer: correctOption,
      explanation: explanation,
      difficulty: difficulty
    };
    
    const { data: updatedData, error: updateError } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', minimalData.id)
      .select('*')
      .single();
      
    if (updateError) {
      console.error('Update failed:', updateError);
      console.error('Full update error:', JSON.stringify(updateError, null, 2));
      
      // Clean up the minimal record
      await supabase.from('questions').delete().eq('id', minimalData.id);
      
      return NextResponse.json({ 
        error: 'Database error (update test): ' + updateError.message 
      }, { status: 500 });
    }
    
    console.log('Question created and updated successfully:', updatedData.id);
    
    // Transform the response to match the frontend expectations
    const transformedQuestion = {
      id: updatedData.id,
      title: title,
      content: updatedData.question_text,
      optionA: updatedData.options?.A || optionA,
      optionB: updatedData.options?.B || optionB,
      optionC: updatedData.options?.C || optionC,
      optionD: updatedData.options?.D || optionD,
      correctOption: updatedData.correct_answer || correctOption,
      explanation: updatedData.explanation || explanation,
      difficulty: updatedData.difficulty || difficulty,
      examCategory: examCategory,
      subject: updatedData.subject_id,
      year: year || null,
      source: source || null,
      createdBy: updatedData.created_by,
      createdAt: updatedData.created_at,
      updatedAt: updatedData.updated_at
    };
    
    return NextResponse.json(transformedQuestion, { status: 201 });
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ 
      error: 'Server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    }, { status: 500 });
  }
} 