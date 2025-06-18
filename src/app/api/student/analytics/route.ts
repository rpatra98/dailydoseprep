import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is a STUDENT
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, current_streak, longest_streak')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Access denied. Only students can access analytics.' }, { status: 403 });
    }

    // Get user's selected subjects
    const { data: userSubjects, error: subjectsError } = await supabase
      .from('user_subjects')
      .select(`
        subject_id,
        is_active,
        is_primary,
        subjects (
          id,
          name
        )
      `)
      .eq('user_id', authData.user.id)
      .eq('is_active', true);

    if (subjectsError) {
      console.error('Error fetching user subjects:', subjectsError);
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }

    // If no subjects selected, return empty state
    if (!userSubjects || userSubjects.length === 0) {
      return NextResponse.json({
        subjects: [],
        sessionData: {
          currentStreak: userData.current_streak || 0,
          longestStreak: userData.longest_streak || 0,
          todayTimeSpent: 0,
          totalTimeSpent: 0,
          totalQuestionsAnswered: 0,
          overallScore: 0
        }
      });
    }

    const subjectIds = userSubjects.map(us => us.subject_id);

    // Get today's date for session calculations
    const today = new Date().toISOString().split('T')[0];

    // Get today's session time
    const { data: todaySession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('total_duration_seconds')
      .eq('user_id', authData.user.id)
      .eq('date', today)
      .eq('is_active', true)
      .single();

    // Get total session time (all time)
    const { data: totalSessions, error: totalSessionError } = await supabase
      .from('user_sessions')
      .select('total_duration_seconds')
      .eq('user_id', authData.user.id);

    // Calculate total time spent
    const todayTimeMinutes = todaySession?.total_duration_seconds ? Math.floor(todaySession.total_duration_seconds / 60) : 0;
    const totalTimeMinutes = totalSessions?.reduce((sum, session) => sum + (session.total_duration_seconds || 0), 0) || 0;

    // Get student attempts for score calculation
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_attempts')
      .select('questionId, isCorrect, subject_id')
      .eq('studentId', authData.user.id);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
    }

    // Calculate subject-wise performance
    const subjectPerformance = userSubjects.map(us => {
      const subject = us.subjects;
      if (!subject) return null;

      // Get attempts for this subject
      const subjectAttempts = attempts?.filter(a => a.subject_id === us.subject_id) || [];
      const correctAttempts = subjectAttempts.filter(a => a.isCorrect).length;
      const score = subjectAttempts.length > 0 ? Math.round((correctAttempts / subjectAttempts.length) * 100) : 0;

      // Get time spent on this subject (placeholder - would need subject_time_logs)
      const timeSpent = Math.floor(Math.random() * 120) + 30; // Placeholder: 30-150 minutes

      // Get total questions available for this subject
      const totalQuestions = Math.floor(Math.random() * 100) + 50; // Placeholder

      return {
        id: subject.id,
        name: subject.name,
        score: score,
        timeSpent: timeSpent,
        questionsAttempted: subjectAttempts.length,
        totalQuestions: totalQuestions
      };
    }).filter(Boolean);

    // Calculate overall score
    const totalAttempts = attempts?.length || 0;
    const totalCorrect = attempts?.filter(a => a.isCorrect).length || 0;
    const overallScore = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // Return analytics data
    return NextResponse.json({
      subjects: subjectPerformance,
      sessionData: {
        currentStreak: userData.current_streak || 0,
        longestStreak: userData.longest_streak || 0,
        todayTimeSpent: todayTimeMinutes,
        totalTimeSpent: Math.floor(totalTimeMinutes / 60), // Convert to minutes
        totalQuestionsAnswered: totalAttempts,
        overallScore: overallScore
      }
    });

  } catch (error) {
    console.error('Error in student analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 