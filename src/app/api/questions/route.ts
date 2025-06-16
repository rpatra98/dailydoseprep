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
    
    // Try to get any existing questions to understand the schema
    const { data: existingQuestions, error: schemaError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('Schema discovery error:', schemaError);
      return NextResponse.json({ 
        error: 'Questions table may not exist: ' + schemaError.message,
        suggestion: 'Please run the database setup script'
      }, { status: 500 });
    }
    
    console.log('Existing questions schema:', existingQuestions);
    
    // If we have questions, return them
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
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
      difficulty = 'MEDIUM',
      examCategory = 'OTHER',
      subject,
      year,
      source
    } = body;
    
    // Validate required fields
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
    
    // === COMPREHENSIVE TABLE DIAGNOSTICS ===
    console.log('=== STARTING COMPREHENSIVE DIAGNOSTICS ===');
    
    // First, check if questions table exists at all
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('questions')
        .select('count(*)')
        .limit(1);
      
      console.log('Table existence check:', { tableCheck, tableError });
      
      if (tableError) {
        console.log('❌ Questions table does not exist or is inaccessible');
        console.log('Table error details:', JSON.stringify(tableError, null, 2));
        
        return NextResponse.json({ 
          error: 'Questions table does not exist. Please run database setup.',
          details: tableError.message,
          suggestion: 'Run the SQL schema from src/db/schema.sql or supabase-manual-setup.sql'
        }, { status: 500 });
      }
      
      console.log('✅ Questions table exists');
    } catch (e) {
      console.log('❌ Exception checking table existence:', e);
      return NextResponse.json({ 
        error: 'Cannot access questions table',
        details: e instanceof Error ? e.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Get existing questions to see the actual schema
    const { data: existingQuestions, error: existingError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    console.log('Existing questions result:', { 
      data: existingQuestions, 
      error: existingError,
      hasData: !!existingQuestions?.length,
      firstQuestion: existingQuestions?.[0] || null
    });
    
    if (existingQuestions && existingQuestions.length > 0) {
      console.log('✅ Found existing question with columns:', Object.keys(existingQuestions[0]));
      
      // If we have existing data, use its schema
      const existingSchema = existingQuestions[0];
      const availableColumns = Object.keys(existingSchema);
      
      console.log('Using existing schema with columns:', availableColumns);
      
      // Build insert object based on available columns
      const insertData: any = {};
      
             // Map our data to available columns
       if (availableColumns.includes('subject')) insertData.subject = subject;
       else if (availableColumns.includes('subject_id')) insertData.subject_id = subject;
       else if (availableColumns.includes('subjectId')) insertData.subjectId = subject;
      
      if (availableColumns.includes('question_text')) insertData.question_text = content;
      else if (availableColumns.includes('content')) insertData.content = content;
      else if (availableColumns.includes('question')) insertData.question = content;
      else if (availableColumns.includes('questionText')) insertData.questionText = content;
      else if (availableColumns.includes('title')) insertData.title = title;
      
      if (availableColumns.includes('created_by')) insertData.created_by = userId;
      else if (availableColumns.includes('createdBy')) insertData.createdBy = userId;
      else if (availableColumns.includes('author')) insertData.author = userId;
      else if (availableColumns.includes('user_id')) insertData.user_id = userId;
      
      if (availableColumns.includes('options')) {
        insertData.options = {
          A: optionA,
          B: optionB,
          C: optionC,
          D: optionD
        };
      }
      
      if (availableColumns.includes('correct_answer')) insertData.correct_answer = correctOption;
      else if (availableColumns.includes('correctAnswer')) insertData.correctAnswer = correctOption;
      else if (availableColumns.includes('answer')) insertData.answer = correctOption;
      
      if (availableColumns.includes('explanation')) insertData.explanation = explanation;
      if (availableColumns.includes('difficulty')) insertData.difficulty = difficulty;
      
      console.log('Attempting insert with mapped data:', insertData);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('questions')
        .insert(insertData)
        .select('*')
        .single();
      
      if (insertError) {
        console.error('❌ Insert failed with existing schema:', insertError);
        console.error('Full insert error:', JSON.stringify(insertError, null, 2));
        
        return NextResponse.json({ 
          error: 'Failed to insert question: ' + insertError.message,
          availableColumns: availableColumns,
          attemptedData: insertData
        }, { status: 500 });
      }
      
      console.log('✅ Question created successfully:', insertedData);
      
      // Transform response
      const transformedQuestion = {
        id: insertedData.id,
        title: title,
        content: content,
        optionA: optionA,
        optionB: optionB,
        optionC: optionC,
        optionD: optionD,
        correctOption: correctOption,
        explanation: explanation,
        difficulty: difficulty,
        examCategory: examCategory,
        subject: subject,
        year: year || null,
        source: source || null,
        createdBy: userId,
        createdAt: insertedData.created_at,
        updatedAt: insertedData.updated_at
      };
      
      return NextResponse.json(transformedQuestion, { status: 201 });
    }
    
    // If no existing questions, the table is empty - try to create the first one
    console.log('📝 Table is empty, attempting to create first question');
    
    // Try the most likely schema based on our SQL files
    const standardSchema = {
      subject: subject,
      question_text: content,
      options: {
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD
      },
      correct_answer: correctOption,
      explanation: explanation,
      difficulty: difficulty,
      created_by: userId
    };
    
    console.log('Trying standard schema:', standardSchema);
    
    const { data: standardData, error: standardError } = await supabase
      .from('questions')
      .insert(standardSchema)
      .select('*')
      .single();
    
    if (!standardError && standardData) {
      console.log('✅ SUCCESS with standard schema:', standardData);
      
      const transformedQuestion = {
        id: standardData.id,
        title: title,
        content: content,
        optionA: optionA,
        optionB: optionB,
        optionC: optionC,
        optionD: optionD,
        correctOption: correctOption,
        explanation: explanation,
        difficulty: difficulty,
        examCategory: examCategory,
        subject: subject,
        year: year || null,
        source: source || null,
        createdBy: userId,
        createdAt: standardData.created_at,
        updatedAt: standardData.updated_at
      };
      
      return NextResponse.json(transformedQuestion, { status: 201 });
    }
    
    console.log('❌ Standard schema failed:', standardError);
    
    return NextResponse.json({ 
      error: 'Could not create question. Database schema mismatch.',
      details: standardError?.message,
      suggestion: 'Please check if the database schema matches src/db/schema.sql'
    }, { status: 500 });
    
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ 
      error: 'Server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    }, { status: 500 });
  }
} 