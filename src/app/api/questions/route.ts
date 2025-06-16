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
    
    // Start building the query - note: using actual database field names
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is QAUTHOR or SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      return NextResponse.json({ error: 'Error fetching user role' }, { status: 500 });
    }
    
    if (userData?.role !== 'QAUTHOR' && userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only QAUTHORs can create questions' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
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
      return NextResponse.json({ 
        error: 'Missing required fields. Title, content, all options, correct option, explanation, and subject are required.' 
      }, { status: 400 });
    }
    
    // Validate correct option
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return NextResponse.json({ error: 'Correct option must be A, B, C, or D' }, { status: 400 });
    }
    
    // Check if subject exists
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject)
      .single();
      
    if (subjectError || !subjectData) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }
    
    // Check for duplicate questions (using question text and subject)
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id')
      .eq('question_text', content)
      .eq('subject_id', subject)
      .maybeSingle();
      
    if (existingQuestion) {
      return NextResponse.json({ error: 'A similar question already exists for this subject' }, { status: 409 });
    }
    
    // Prepare options as JSONB
    const options = {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD
    };
    
    // Create new question using actual database schema
    const newQuestion = {
      subject_id: subject,
      question_text: content,
      options: options,
      correct_answer: correctOption,
      explanation: explanation,
      difficulty: difficulty,
      created_by: session.user.id
    };
    
    const { data, error } = await supabase
      .from('questions')
      .insert(newQuestion)
      .select(`
        id,
        subject_id,
        question_text,
        options,
        correct_answer,
        explanation,
        difficulty,
        created_by,
        created_at,
        updated_at
      `)
      .single();
      
    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform the response to match the frontend expectations
    const transformedQuestion = {
      id: data.id,
      title: title,
      content: data.question_text,
      optionA: data.options.A,
      optionB: data.options.B,
      optionC: data.options.C,
      optionD: data.options.D,
      correctOption: data.correct_answer,
      explanation: data.explanation,
      difficulty: data.difficulty,
      examCategory: examCategory,
      subject: data.subject_id,
      year: year || null,
      source: source || null,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json(transformedQuestion, { status: 201 });
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 