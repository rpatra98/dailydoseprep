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

// Dynamic schema discovery and mapping
async function discoverQuestionsSchema(supabase: any) {
  console.log('🔍 Discovering questions table schema...');
  
  // First, try to get existing data to see actual columns
  const { data: existingQuestions, error: existingError } = await supabase
    .from('questions')
    .select('*')
    .limit(1);
  
  if (!existingError && existingQuestions && existingQuestions.length > 0) {
    const columns = Object.keys(existingQuestions[0]);
    console.log('✅ Found existing data with columns:', columns);
    return {
      success: true,
      columns: columns,
      sampleData: existingQuestions[0]
    };
  }
  
  // If no existing data, try different schema combinations
  const schemaCombinations = [
    // Schema 1: supabase-manual-setup.sql format
    {
      name: 'supabase-manual-setup',
      fields: {
        subject: 'test-subject-id',
        question_text: 'test question',
        options: { A: 'test', B: 'test', C: 'test', D: 'test' },
        correct_answer: 'A',
        explanation: 'test explanation',
        difficulty: 'EASY',
        questionHash: 'test-hash',
        created_by: 'test-user-id'
      }
    },
    // Schema 2: src/db/schema.sql format
    {
      name: 'src-db-schema',
      fields: {
        subject_id: 'test-subject-id',
        question_text: 'test question',
        options: { A: 'test', B: 'test', C: 'test', D: 'test' },
        correct_answer: 'A',
        explanation: 'test explanation',
        difficulty: 'EASY',
        created_by: 'test-user-id'
      }
    },
    // Schema 3: Alternative naming
    {
      name: 'alternative',
      fields: {
        subject: 'test-subject-id',
        content: 'test question',
        options: { A: 'test', B: 'test', C: 'test', D: 'test' },
        answer: 'A',
        explanation: 'test explanation',
        difficulty: 'EASY',
        author: 'test-user-id'
      }
    },
    // Schema 4: Simple naming
    {
      name: 'simple',
      fields: {
        subject: 'test-subject-id',
        question: 'test question',
        options: { A: 'test', B: 'test', C: 'test', D: 'test' },
        correct_answer: 'A',
        explanation: 'test explanation',
        created_by: 'test-user-id'
      }
    }
  ];
  
  for (const schema of schemaCombinations) {
    console.log(`🧪 Testing schema: ${schema.name}`);
    
    const { data: testData, error: testError } = await supabase
      .from('questions')
      .insert(schema.fields)
      .select('*');
    
    if (!testError && testData && testData.length > 0) {
      console.log(`✅ Schema ${schema.name} works! Columns:`, Object.keys(testData[0]));
      
      // Clean up test data
      await supabase.from('questions').delete().eq('id', testData[0].id);
      
      return {
        success: true,
        schemaName: schema.name,
        columns: Object.keys(testData[0]),
        workingFields: schema.fields,
        sampleData: testData[0]
      };
    } else {
      console.log(`❌ Schema ${schema.name} failed:`, testError?.message);
    }
  }
  
  return {
    success: false,
    error: 'No working schema found'
  };
}

// Map our standard data to the discovered schema
function mapDataToSchema(data: any, schemaInfo: any) {
  const { content, optionA, optionB, optionC, optionD, correctOption, explanation, difficulty, subject, userId } = data;
  
  const mapped: any = {};
  const columns = schemaInfo.columns || [];
  
  // Map subject
  if (columns.includes('subject')) mapped.subject = subject;
  else if (columns.includes('subject_id')) mapped.subject_id = subject;
  
  // Map question text
  if (columns.includes('question_text')) mapped.question_text = content;
  else if (columns.includes('content')) mapped.content = content;
  else if (columns.includes('question')) mapped.question = content;
  
  // Map options (usually JSONB)
  if (columns.includes('options')) {
    mapped.options = { A: optionA, B: optionB, C: optionC, D: optionD };
  }
  
  // Map correct answer
  if (columns.includes('correct_answer')) mapped.correct_answer = correctOption;
  else if (columns.includes('correctAnswer')) mapped.correctAnswer = correctOption;
  else if (columns.includes('answer')) mapped.answer = correctOption;
  
  // Map explanation
  if (columns.includes('explanation')) mapped.explanation = explanation;
  
  // Map difficulty
  if (columns.includes('difficulty')) mapped.difficulty = difficulty;
  
  // Map created by
  if (columns.includes('created_by')) mapped.created_by = userId;
  else if (columns.includes('createdBy')) mapped.createdBy = userId;
  else if (columns.includes('author')) mapped.author = userId;
  
  // Map question hash if exists
  const questionHash = generateQuestionHash(data);
  if (columns.includes('questionHash')) mapped.questionHash = questionHash;
  else if (columns.includes('question_hash')) mapped.question_hash = questionHash;
  
  console.log('📋 Mapped data:', mapped);
  return mapped;
}

// GET questions with optional filters
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check if questions table exists
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (questionsError) {
      console.error('Questions table error:', questionsError);
      return NextResponse.json({ 
        error: 'Questions table does not exist or is inaccessible',
        details: questionsError.message,
        suggestion: 'Please run the database setup script from supabase-manual-setup.sql',
        setupUrl: '/api/setup'
      }, { status: 500 });
    }
    
    return NextResponse.json(questions || []);
  } catch (err) {
    console.error('Exception in questions GET:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST a new question (QAUTHOR only)
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 POST /api/questions: Starting request');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔐 Session check:', {
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
    console.log(`👤 Authenticated user ID: ${userId}`);
    
    // Check if user is QAUTHOR or SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json({ 
        error: 'Database setup incomplete. Please run database setup first.',
        details: userError.message,
        setupUrl: '/api/setup'
      }, { status: 500 });
    }
    
    console.log(`🎭 User role: ${userData?.role}`);
    
    if (userData?.role !== 'QAUTHOR' && userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ 
        error: 'Unauthorized. Only QAUTHORs can create questions' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    console.log('📝 Request body received:', { 
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
        error: 'Database setup incomplete or invalid subject ID',
        details: subjectError?.message,
        setupUrl: '/api/setup'
      }, { status: 400 });
    }
    
    console.log(`✅ Subject validated: ${subjectData.id}`);
    
    // === DYNAMIC SCHEMA DISCOVERY ===
    console.log('🔍 Starting dynamic schema discovery...');
    
    const schemaInfo = await discoverQuestionsSchema(supabase);
    
    if (!schemaInfo.success) {
      console.error('❌ Schema discovery failed');
      return NextResponse.json({
        error: 'Could not determine database schema. Please check database setup.',
        details: schemaInfo.error,
        suggestion: 'Run the complete supabase-manual-setup.sql script',
        setupUrl: '/api/setup'
      }, { status: 500 });
    }
    
    console.log(`✅ Schema discovered: ${schemaInfo.schemaName || 'existing-data'}`);
    console.log('📋 Available columns:', schemaInfo.columns);
    
    // Map our data to the discovered schema
    const questionData = mapDataToSchema({
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      difficulty,
      subject,
      userId
    }, schemaInfo);
    
    console.log('💾 Inserting question with discovered schema...');
    
    const { data: insertedData, error: insertError } = await supabase
      .from('questions')
      .insert(questionData)
      .select('*')
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      console.error('Full insert error:', JSON.stringify(insertError, null, 2));
      
      // Check if it's a duplicate
      if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'This question already exists (duplicate detected)' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create question: ' + insertError.message,
        details: insertError,
        attemptedData: questionData
      }, { status: 500 });
    }
    
    console.log('✅ Question created successfully:', insertedData.id);
    
    // Transform response to match frontend expectations (camelCase for frontend)
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
    
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ 
      error: 'Server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    }, { status: 500 });
  }
} 