import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-server';
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
    const supabase = getServiceRoleClient();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const examCategory = searchParams.get('examCategory');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Start building the query - using actual database field names from supabase-manual-setup.sql
    let query = supabase.from('questions').select(`
      id,
      subject,
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
    if (subject) query = query.eq('subject', subject);
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
    
    // Use only service role client to avoid multiple client instances
    const supabase = getServiceRoleClient();
    
    // Get authorization header to extract user info
    const authHeader = req.headers.get('authorization');
    const cookies = req.headers.get('cookie');
    
    console.log('Auth header present:', !!authHeader);
    console.log('Cookies present:', !!cookies);
    
    // Try to get user ID from the request context
    // Since we're using service role, we need to validate the user differently
    let userId: string | null = null;
    
    // Parse cookies to get the auth token
    if (cookies) {
      const authTokenMatch = cookies.match(/ddp-supabase-auth-token=([^;]+)/);
      if (authTokenMatch) {
        try {
          const tokenData = JSON.parse(decodeURIComponent(authTokenMatch[1]));
          if (tokenData.user?.id) {
            userId = tokenData.user.id;
            console.log('User ID from cookie:', userId);
          }
        } catch (e) {
          console.error('Error parsing auth token from cookie:', e);
        }
      }
    }
    
    // If we couldn't get user ID from cookie, try alternative approach
    if (!userId) {
      // Check for sb- prefixed cookies (default Supabase format)
      const sbCookieMatch = cookies?.match(/sb-[^=]+-auth-token=([^;]+)/);
      if (sbCookieMatch) {
        try {
          const tokenData = JSON.parse(decodeURIComponent(sbCookieMatch[1]));
          if (tokenData.user?.id) {
            userId = tokenData.user.id;
            console.log('User ID from sb cookie:', userId);
          }
        } catch (e) {
          console.error('Error parsing sb auth token:', e);
        }
      }
    }
    
    if (!userId) {
      console.error('No user ID found in request');
      return NextResponse.json({ error: 'Not authenticated - no user session found' }, { status: 401 });
    }
    
    // Check if user is QAUTHOR or SUPERADMIN using service role client
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json({ error: 'Error fetching user role: ' + userError.message }, { status: 500 });
    }
    
    console.log(`User role: ${userData?.role}`);
    
    if (userData?.role !== 'QAUTHOR' && userData?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only QAUTHORs can create questions' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    console.log('Request body received:', { ...body, optionA: body.optionA ? 'present' : 'missing' });
    
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
      return NextResponse.json({ error: 'Correct option must be A, B, C, or D' }, { status: 400 });
    }
    
    // Check if subject exists
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject)
      .single();
      
    if (subjectError || !subjectData) {
      console.error('Subject validation error:', subjectError);
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }
    
    console.log(`Subject validated: ${subjectData.id}`);
    
    // Check for duplicate questions (using question text and subject)
    const { data: existingQuestion } = await supabase
      .from('questions')
      .select('id')
      .eq('question_text', content)
      .eq('subject', subject)
      .maybeSingle();
      
    if (existingQuestion) {
      console.log('Duplicate question found');
      return NextResponse.json({ error: 'A similar question already exists for this subject' }, { status: 409 });
    }
    
    // Prepare options as JSONB
    const options = {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD
    };
    
    console.log('Creating question with options:', options);
    
    // Generate question hash for duplicate prevention
    const questionHash = generateQuestionHash(body);
    
    // Create new question using actual database schema from supabase-manual-setup.sql
    const newQuestion = {
      subject: subject, // Using 'subject' not 'subject_id'
      question_text: content,
      options: options,
      correct_answer: correctOption,
      explanation: explanation,
      difficulty: difficulty,
      questionHash: questionHash,
      created_by: userId
    };
    
    console.log('Inserting question:', { ...newQuestion, options: 'JSONB object' });
    
    const { data, error } = await supabase
      .from('questions')
      .insert(newQuestion)
      .select(`
        id,
        subject,
        question_text,
        options,
        correct_answer,
        explanation,
        difficulty,
        questionHash,
        created_by,
        created_at,
        updated_at
      `)
      .single();
      
    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json({ error: 'Database error: ' + error.message }, { status: 500 });
    }
    
    console.log('Question created successfully:', data.id);
    
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
      subject: data.subject,
      year: year || null,
      source: source || null,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return NextResponse.json(transformedQuestion, { status: 201 });
  } catch (err) {
    console.error('Exception in question creation:', err);
    return NextResponse.json({ 
      error: 'Server error: ' + (err instanceof Error ? err.message : 'Unknown error') 
    }, { status: 500 });
  }
} 