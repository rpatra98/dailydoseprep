import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { Question } from '@/types';
import crypto from 'crypto';

// Helper function to generate a unique hash for a question to prevent duplicates
function generateQuestionHash(question: Partial<Question>): string {
  const stringToHash = `${question.content}-${question.optionA}-${question.optionB}-${question.optionC}-${question.optionD}-${question.subject}`;
  return crypto.createHash('md5').update(stringToHash).digest('hex');
}

// GET questions with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const examCategory = searchParams.get('examCategory');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Start building the query
    let query = supabase.from('questions').select('*');
    
    // Apply filters if provided
    if (subject) query = query.eq('subject', subject);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (examCategory) query = query.eq('examCategory', examCategory);
    
    // Execute query with pagination
    const { data, error } = await query
      .order('createdAt', { ascending: false })
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
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if user is QAUTHOR or SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.session.user.id)
      .single();
    
    if (userError) {
      return NextResponse.json({ error: 'Error fetching user role' }, { status: 500 });
    }
    
    if (userData?.role !== 'QAUTHOR' && userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only QAUTHORs can create questions' }, { status: 403 });
    }
    
    // Parse request body
    const body: Partial<Question> = await req.json();
    const {
      title,
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      difficulty,
      examCategory,
      subject,
      year,
      source
    } = body;
    
    // Validate required fields
    if (!title || !content || !optionA || !optionB || !optionC || !optionD || 
        !correctOption || !explanation || !difficulty || !examCategory || !subject) {
      return NextResponse.json({ 
        error: 'Missing required fields. All question fields are required except year and source.' 
      }, { status: 400 });
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
    
    // Generate hash to check for duplicates
    const questionHash = generateQuestionHash(body);
    
    // Check for duplicate questions
    const { data: existingQuestion, error: hashError } = await supabase
      .from('questions')
      .select('id')
      .eq('questionHash', questionHash)
      .single();
      
    if (existingQuestion) {
      return NextResponse.json({ error: 'A similar question already exists' }, { status: 409 });
    }
    
    // Create new question
    const now = new Date().toISOString();
    const newQuestion = {
      title,
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      difficulty,
      examCategory,
      subject,
      year: year || null,
      source: source || null,
      createdBy: authData.session.user.id,
      createdAt: now,
      updatedAt: now,
      questionHash
    };
    
    const { data, error } = await supabase
      .from('questions')
      .insert(newQuestion)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 