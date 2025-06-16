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
    
    // Try to discover the actual schema first
    const { data: existingQuestions, error: schemaError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error('Schema discovery error:', schemaError);
      return NextResponse.json({ error: 'Schema error: ' + schemaError.message }, { status: 500 });
    }
    
    console.log('Existing questions schema:', existingQuestions);
    
    // Start building the query based on what we find
    let query = supabase.from('questions').select('*');
    
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
    
    // First, let's discover the actual table schema
    console.log('=== SCHEMA DISCOVERY ===');
    
    // Try to get existing questions to see the actual column structure
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
      console.log('Found existing question with columns:', Object.keys(existingQuestions[0]));
    }
    
    // Try different possible column name combinations
    const possibleSchemas = [
      // Schema 1: Original expected (src/db/schema.sql)
      {
        name: 'schema1_underscore',
        fields: {
          subject_id: subject,
          question_text: content,
          created_by: userId
        }
      },
      // Schema 2: CamelCase
      {
        name: 'schema2_camelcase',
        fields: {
          subjectId: subject,
          questionText: content,
          createdBy: userId
        }
      },
      // Schema 3: Simple names
      {
        name: 'schema3_simple',
        fields: {
          subject: subject,
          question: content,
          author: userId
        }
      },
      // Schema 4: Alternative names
      {
        name: 'schema4_alt',
        fields: {
          subject_id: subject,
          content: content,
          user_id: userId
        }
      },
      // Schema 5: Just basic fields
      {
        name: 'schema5_basic',
        fields: {
          title: title,
          content: content
        }
      }
    ];
    
    console.log('=== TESTING SCHEMAS ===');
    
    for (const schema of possibleSchemas) {
      console.log(`Testing schema: ${schema.name}`, schema.fields);
      
      try {
        const { data: testData, error: testError } = await supabase
          .from('questions')
          .insert(schema.fields)
          .select('*')
          .single();
        
        if (!testError && testData) {
          console.log(`✅ SUCCESS with ${schema.name}:`, testData);
          console.log('Available columns:', Object.keys(testData));
          
          // Now try to add the remaining fields
          const additionalFields: any = {};
          
          // Try to add options
          if ('options' in testData || testData.hasOwnProperty('options')) {
            additionalFields.options = {
              A: optionA,
              B: optionB,
              C: optionC,
              D: optionD
            };
          }
          
          // Try different names for correct answer
          const correctAnswerFields = ['correct_answer', 'correctAnswer', 'answer', 'correct_option'];
          for (const field of correctAnswerFields) {
            if (field in testData || testData.hasOwnProperty(field)) {
              additionalFields[field] = correctOption;
              break;
            }
          }
          
          // Try different names for explanation
          const explanationFields = ['explanation', 'description', 'details'];
          for (const field of explanationFields) {
            if (field in testData || testData.hasOwnProperty(field)) {
              additionalFields[field] = explanation;
              break;
            }
          }
          
          // Try different names for difficulty
          const difficultyFields = ['difficulty', 'level', 'difficulty_level'];
          for (const field of difficultyFields) {
            if (field in testData || testData.hasOwnProperty(field)) {
              additionalFields[field] = difficulty;
              break;
            }
          }
          
          console.log('Trying to update with additional fields:', additionalFields);
          
          if (Object.keys(additionalFields).length > 0) {
            const { data: updatedData, error: updateError } = await supabase
              .from('questions')
              .update(additionalFields)
              .eq('id', testData.id)
              .select('*')
              .single();
            
            if (updateError) {
              console.log('Update failed:', updateError);
            } else {
              console.log('✅ Update succeeded:', updatedData);
            }
          }
          
          // Return success response
          const transformedQuestion = {
            id: testData.id,
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
            createdAt: testData.created_at,
            updatedAt: testData.updated_at
          };
          
          return NextResponse.json(transformedQuestion, { status: 201 });
        } else {
          console.log(`❌ Failed with ${schema.name}:`, testError?.message);
        }
      } catch (e) {
        console.log(`❌ Exception with ${schema.name}:`, e);
      }
    }
    
    console.log('=== ALL SCHEMAS FAILED ===');
    
    return NextResponse.json({ 
      error: 'Could not determine database schema. All test schemas failed.' 
    }, { status: 500 });
    
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ 
      error: 'Server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    }, { status: 500 });
  }
} 