import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get current user's role
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !currentUser || currentUser.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Access denied. SUPERADMIN role required.' },
        { status: 403 }
      );
    }
    
    // Fetch user counts
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('role');
    
    // Fetch subjects count
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name');
    
    // Fetch questions count
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, subject_id');

    if (usersError || subjectsError || questionsError) {
      console.error('❌ Error fetching stats:', { usersError, subjectsError, questionsError });
      return NextResponse.json(
        { error: 'Failed to fetch system statistics' },
        { status: 500 }
      );
    }

    console.log('🔄 Calculating system statistics...');
    const totalUsers = usersData?.length || 0;
    const totalQAuthors = usersData?.filter(u => u.role === 'QAUTHOR').length || 0;
    const totalStudents = usersData?.filter(u => u.role === 'STUDENT').length || 0;
    const totalSubjects = subjectsData?.length || 0;
    const totalQuestions = questionsData?.length || 0;
    
    console.log(`✅ Stats calculated: ${totalUsers} users (${totalQAuthors} QAuthors, ${totalStudents} Students), ${totalSubjects} subjects, ${totalQuestions} questions`);

    // Calculate questions per subject
    const questionsPerSubject: { [key: string]: number } = {};
    subjectsData?.forEach(subject => {
      const count = questionsData?.filter(q => q.subject_id === subject.id).length || 0;
      questionsPerSubject[subject.name] = count;
    });

    const stats = {
      totalUsers,
      totalQAuthors,
      totalStudents,
      totalSubjects,
      totalQuestions,
      questionsPerSubject
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('❌ /api/admin/stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 