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
    console.log('POST /api/questions: Starting request');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
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
        error: 'Database setup incomplete. Please run database setup first.',
        details: userError.message,
        setupUrl: '/api/setup'
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
        error: 'Database setup incomplete or invalid subject ID',
        details: subjectError?.message,
        setupUrl: '/api/setup'
      }, { status: 400 });
    }
    
    console.log(`Subject validated: ${subjectData.id}`);
    
    // Generate question hash to prevent duplicates
    const questionHash = generateQuestionHash({
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      subject
    });
    
    // Create question using snake_case (Supabase/PostgreSQL standard)
    const questionData = {
      subject: subject,                    // snake_case: subject (not subject_id based on supabase-manual-setup.sql)
      question_text: content,              // snake_case: question_text
      options: {                           // JSONB field
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD
      },
      correct_answer: correctOption,       // snake_case: correct_answer
      explanation: explanation,            // snake_case: explanation
      difficulty: difficulty,              // snake_case: difficulty
      question_hash: questionHash,         // snake_case: question_hash (for duplicate prevention)
      created_by: userId                   // snake_case: created_by
    };
    
    console.log('Inserting question with snake_case data:', questionData);
    
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
      
      // Check if it's a table/schema issue
      if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Questions table does not exist. Please run database setup.',
          details: insertError.message,
          setupUrl: '/api/setup'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create question: ' + insertError.message,
        details: insertError
      }, { status: 500 });
    }
    
    console.log('✅ Question created successfully:', insertedData);
    
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