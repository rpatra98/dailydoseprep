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

// Enhanced error logging function
function logError(step: string, error: any, context?: any) {
  console.error(`❌ [${step}] Error:`, error);
  if (error?.message) console.error(`❌ [${step}] Message:`, error.message);
  if (error?.code) console.error(`❌ [${step}] Code:`, error.code);
  if (error?.details) console.error(`❌ [${step}] Details:`, error.details);
  if (error?.hint) console.error(`❌ [${step}] Hint:`, error.hint);
  if (context) console.error(`❌ [${step}] Context:`, JSON.stringify(context, null, 2));
  console.error(`❌ [${step}] Full Error Object:`, JSON.stringify(error, null, 2));
}

// Comprehensive database connectivity test
async function testDatabaseConnectivity(supabase: any) {
  console.log('🔍 Testing database connectivity...');
  
  try {
    // Test 1: Basic connection
    console.log('📡 Testing basic Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('subjects')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      logError('CONNECTION_TEST', connectionError);
      return {
        success: false,
        error: 'Database connection failed',
        details: connectionError.message,
        step: 'connection_test'
      };
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Authentication
    console.log('🔐 Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logError('AUTH_TEST', authError);
      return {
        success: false,
        error: 'Authentication failed',
        details: authError.message,
        step: 'auth_test'
      };
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return {
        success: false,
        error: 'No authenticated user',
        details: 'User session not found',
        step: 'auth_test'
      };
    }
    
    console.log('✅ Authentication successful:', user.email);
    
    // Test 3: Subjects table
    console.log('📋 Testing subjects table...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .limit(1);
    
    if (subjectsError) {
      logError('SUBJECTS_TEST', subjectsError);
      return {
        success: false,
        error: 'Subjects table access failed',
        details: subjectsError.message,
        step: 'subjects_test'
      };
    }
    
    if (!subjects || subjects.length === 0) {
      console.log('❌ No subjects found in database');
      return {
        success: false,
        error: 'No subjects found',
        details: 'Subjects table is empty',
        step: 'subjects_test'
      };
    }
    
    console.log('✅ Subjects table accessible:', subjects.length, 'subjects found');
    
    // Test 4: Questions table structure
    console.log('❓ Testing questions table structure...');
    const { data: questionsTest, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (questionsError) {
      logError('QUESTIONS_STRUCTURE_TEST', questionsError);
      return {
        success: false,
        error: 'Questions table access failed',
        details: questionsError.message,
        step: 'questions_structure_test'
      };
    }
    
    console.log('✅ Questions table accessible');
    if (questionsTest && questionsTest.length > 0) {
      console.log('📊 Existing questions found, columns:', Object.keys(questionsTest[0]));
    } else {
      console.log('📊 Questions table is empty (this is normal for new setup)');
    }
    
    return {
      success: true,
      user: user,
      subjects: subjects,
      questionsColumns: questionsTest?.[0] ? Object.keys(questionsTest[0]) : null
    };
    
  } catch (error) {
    logError('DATABASE_CONNECTIVITY', error);
    return {
      success: false,
      error: 'Unexpected database connectivity error',
      details: error instanceof Error ? error.message : 'Unknown error',
      step: 'connectivity_test'
    };
  }
}

// Test question insertion with exact schema
async function testQuestionInsertion(supabase: any, user: any, subjects: any[]) {
  console.log('🧪 Testing question insertion...');
  
  const testSubject = subjects[0];
  console.log('📋 Using test subject:', testSubject.name, '(', testSubject.id, ')');
  
  // Test data matching supabase-manual-setup.sql exactly
  const testData = {
    subject: testSubject.id,                    // UUID from subjects table
    question_text: 'Test question - will be deleted immediately',  // TEXT
    options: { 
      A: 'Test Option A', 
      B: 'Test Option B', 
      C: 'Test Option C', 
      D: 'Test Option D' 
    }, // JSONB
    correct_answer: 'A',                      // TEXT
    explanation: 'This is a test explanation',          // TEXT
    difficulty: 'EASY',                       // TEXT
    questionHash: 'test-hash-' + Date.now() + '-' + Math.random(), // TEXT (unique)
    created_by: user.id                       // UUID from auth
  };
  
  console.log('📝 Test data prepared:', JSON.stringify(testData, null, 2));
  
  try {
    console.log('💾 Attempting to insert test question...');
    const { data: insertResult, error: insertError } = await supabase
      .from('questions')
      .insert(testData)
      .select('*');
    
    if (insertError) {
      logError('QUESTION_INSERT_TEST', insertError, { testData });
      
      // Analyze the specific error
      let errorAnalysis = 'Unknown insertion error';
      let recommendation = 'Check database setup';
      
      if (insertError.message?.includes('violates foreign key constraint')) {
        errorAnalysis = 'Foreign key constraint violation';
        recommendation = 'Check if subject ID exists and user is properly set up in database';
      } else if (insertError.message?.includes('column') && insertError.message?.includes('does not exist')) {
        errorAnalysis = 'Column does not exist in database';
        recommendation = 'Database schema does not match expected format. Run supabase-manual-setup.sql';
      } else if (insertError.message?.includes('permission') || insertError.message?.includes('denied')) {
        errorAnalysis = 'Permission denied';
        recommendation = 'Check RLS policies and user permissions';
      } else if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        errorAnalysis = 'Duplicate key violation';
        recommendation = 'Question hash collision (very rare)';
      }
      
      return {
        success: false,
        error: errorAnalysis,
        details: insertError.message,
        recommendation: recommendation,
        testData: testData,
        fullError: insertError
      };
    }
    
    if (!insertResult || insertResult.length === 0) {
      console.log('❌ Insert succeeded but no data returned');
      return {
        success: false,
        error: 'Insert succeeded but no data returned',
        details: 'This might indicate a database configuration issue'
      };
    }
    
    console.log('✅ Test question inserted successfully!');
    console.log('📊 Inserted data columns:', Object.keys(insertResult[0]));
    
    // Clean up test data immediately
    console.log('🧹 Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', insertResult[0].id);
    
    if (deleteError) {
      console.log('⚠️ Warning: Could not clean up test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }
    
    return {
      success: true,
      columns: Object.keys(insertResult[0]),
      sampleData: insertResult[0],
      workingSchema: testData
    };
    
  } catch (error) {
    logError('QUESTION_INSERT_EXCEPTION', error, { testData });
    return {
      success: false,
      error: 'Unexpected error during question insertion',
      details: error instanceof Error ? error.message : 'Unknown error',
      testData: testData
    };
  }
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
  
  // Check if questions table exists at all
  if (existingError) {
    console.log('❌ Questions table error:', existingError.message);
    if (existingError.message?.includes('relation') || existingError.message?.includes('does not exist')) {
      return {
        success: false,
        error: 'Questions table does not exist. Please run supabase-manual-setup.sql script.',
        details: existingError.message
      };
    }
  }
  
  // Check if subjects table exists and has data
  console.log('📋 Checking subjects table...');
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name')
    .limit(1);
  
  if (subjectsError) {
    console.log('❌ Subjects table error:', subjectsError.message);
    return {
      success: false,
      error: 'Subjects table does not exist. Please run supabase-manual-setup.sql script.',
      details: subjectsError.message
    };
  }
  
  if (!subjects || subjects.length === 0) {
    console.log('❌ No subjects found in database');
    return {
      success: false,
      error: 'No subjects found in database. Please run supabase-manual-setup.sql script to insert default subjects.',
      details: 'Subjects table exists but is empty'
    };
  }
  
  const testSubjectId = subjects[0].id;
  console.log('📋 Using test subject:', subjects[0].name, '(', testSubjectId, ')');
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.log('❌ Auth error:', userError.message);
    return {
      success: false,
      error: 'Authentication failed. Please log in again.',
      details: userError.message
    };
  }
  
  if (!user) {
    console.log('❌ No authenticated user');
    return {
      success: false,
      error: 'No authenticated user. Please log in.',
      details: 'User session not found'
    };
  }
  
  const testUserId = user.id;
  console.log('👤 Using test user:', user.email, '(', testUserId, ')');
  
  // Try the exact supabase-manual-setup.sql schema first
  console.log('🧪 Testing exact supabase-manual-setup.sql schema...');
  
  const testData = {
    subject: testSubjectId,                    // UUID from subjects table
    question_text: 'Test question - will be deleted',  // TEXT
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' }, // JSONB
    correct_answer: 'A',                      // TEXT
    explanation: 'Test explanation',          // TEXT
    difficulty: 'EASY',                       // TEXT
    questionHash: 'test-hash-' + Date.now(), // TEXT (unique)
    created_by: testUserId                    // UUID from auth
  };
  
  console.log('📝 Test data:', testData);
  
  const { data: insertResult, error: insertError } = await supabase
    .from('questions')
    .insert(testData)
    .select('*');
  
  if (!insertError && insertResult && insertResult.length > 0) {
    console.log('✅ Schema discovery successful! Columns:', Object.keys(insertResult[0]));
    
    // Clean up test data
    await supabase.from('questions').delete().eq('id', insertResult[0].id);
    console.log('🧹 Test data cleaned up');
    
    return {
      success: true,
      schemaName: 'supabase-manual-setup-exact',
      columns: Object.keys(insertResult[0]),
      workingFields: testData,
      sampleData: insertResult[0]
    };
  } else {
    console.log('❌ Schema test failed:', insertError?.message);
    console.log('🔍 Full error details:', JSON.stringify(insertError, null, 2));
    
    // Try to identify the specific issue
    if (insertError?.message?.includes('violates foreign key constraint')) {
      return {
        success: false,
        error: 'Foreign key constraint violation. Check if subject ID exists and user is properly set up.',
        details: insertError.message,
        testData: testData
      };
    } else if (insertError?.message?.includes('column') && insertError?.message?.includes('does not exist')) {
      return {
        success: false,
        error: 'Column mismatch. Database schema differs from expected supabase-manual-setup.sql format.',
        details: insertError.message,
        testData: testData
      };
    } else if (insertError?.message?.includes('permission')) {
      return {
        success: false,
        error: 'Permission denied. Check RLS policies and user role.',
        details: insertError.message,
        testData: testData
      };
    } else {
      return {
        success: false,
        error: 'Unknown database error during schema discovery.',
        details: insertError?.message || 'Unknown error',
        testData: testData
      };
    }
  }
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
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        *,
        subjects (
          name,
          examCategory
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST a new question (QAUTHOR only)
export async function POST(req: NextRequest) {
  console.log('\n🚀 === QUESTION CREATION API CALLED ===');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    console.log('✅ Supabase client created');
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('📥 Request body received:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      logError('REQUEST_PARSING', parseError);
      return NextResponse.json({
        error: 'Invalid request body',
        details: 'Could not parse JSON request'
      }, { status: 400 });
    }
    
    const { title, content, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, examCategory, difficulty, year, source } = body;
    
    // Validate required fields
    if (!content || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !subject) {
      console.log('❌ Missing required fields');
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'content, optionA, optionB, optionC, optionD, correctAnswer, and subject are required'
      }, { status: 400 });
    }
    
    console.log('✅ Request validation passed');
    
    // Test database connectivity
    console.log('\n🔍 === TESTING DATABASE CONNECTIVITY ===');
    const connectivityTest = await testDatabaseConnectivity(supabase);
    
    if (!connectivityTest.success) {
      console.log('❌ Database connectivity test failed');
      return NextResponse.json({
        error: connectivityTest.error,
        details: connectivityTest.details,
        step: connectivityTest.step,
        suggestion: 'Check database setup and authentication',
        setupUrl: '/api/setup'
      }, { status: 500 });
    }
    
    console.log('✅ Database connectivity test passed');
    
    // Test question insertion
    console.log('\n🧪 === TESTING QUESTION INSERTION ===');
    const insertionTest = await testQuestionInsertion(supabase, connectivityTest.user, connectivityTest.subjects);
    
    if (!insertionTest.success) {
      console.log('❌ Question insertion test failed');
      return NextResponse.json({
        error: insertionTest.error,
        details: insertionTest.details,
        recommendation: insertionTest.recommendation,
        testData: insertionTest.testData,
        fullError: insertionTest.fullError,
        suggestion: 'Run the complete supabase-manual-setup.sql script',
        setupUrl: '/api/setup'
      }, { status: 500 });
    }
    
    console.log('✅ Question insertion test passed');
    console.log('📊 Working schema confirmed:', insertionTest.workingSchema);
    
    // Now create the actual question
    console.log('\n💾 === CREATING ACTUAL QUESTION ===');
    
    const questionData = {
      subject: subject,
      question_text: content,
      options: {
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD
      },
      correct_answer: correctAnswer,
      explanation: explanation || '',
      difficulty: difficulty || 'MEDIUM',
      questionHash: generateQuestionHash({
        content,
        optionA,
        optionB,
        optionC,
        optionD,
        subject
      }),
      created_by: connectivityTest.user.id
    };
    
    console.log('📝 Final question data:', JSON.stringify(questionData, null, 2));
    
    const { data: finalResult, error: finalError } = await supabase
      .from('questions')
      .insert(questionData)
      .select('*');
    
    if (finalError) {
      logError('FINAL_QUESTION_INSERT', finalError, { questionData });
      return NextResponse.json({
        error: 'Failed to create question',
        details: finalError.message,
        questionData: questionData,
        suggestion: 'Check the error details above'
      }, { status: 500 });
    }
    
    if (!finalResult || finalResult.length === 0) {
      console.log('❌ Final insert succeeded but no data returned');
      return NextResponse.json({
        error: 'Question creation succeeded but no data returned',
        details: 'This might indicate a database configuration issue'
      }, { status: 500 });
    }
    
    console.log('✅ Question created successfully!');
    console.log('🎉 Final result:', JSON.stringify(finalResult[0], null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Question created successfully',
      question: finalResult[0]
    }, { status: 201 });
    
  } catch (error) {
    logError('API_EXCEPTION', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 