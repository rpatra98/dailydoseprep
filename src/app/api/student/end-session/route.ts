import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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
      .select('id, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Access denied. Only students can end sessions.' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { subjectId, totalTime, questionsAttempted } = body;

    // Validate required fields
    if (!subjectId || totalTime === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'subjectId and totalTime are required' 
      }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if there's an active session for today
    const { data: existingSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('id, total_duration_seconds')
      .eq('user_id', authData.user.id)
      .eq('date', today)
      .eq('is_active', true)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error('Error checking existing session:', sessionError);
    }

    let sessionId;

    if (existingSession) {
      // Update existing session
      const newTotalTime = (existingSession.total_duration_seconds || 0) + totalTime;
      
      const { data: updatedSession, error: updateError } = await supabase
        .from('user_sessions')
        .update({
          total_duration_seconds: newTotalTime,
          logout_time: new Date().toISOString()
        })
        .eq('id', existingSession.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update session',
          details: updateError.message 
        }, { status: 500 });
      }

      sessionId = updatedSession.id;
    } else {
      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: authData.user.id,
          login_time: new Date().toISOString(),
          logout_time: new Date().toISOString(),
          date: today,
          total_duration_seconds: totalTime,
          is_active: false
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating session:', createError);
        return NextResponse.json({ 
          error: 'Failed to create session',
          details: createError.message 
        }, { status: 500 });
      }

      sessionId = newSession.id;
    }

    // Create subject time log entry
    if (sessionId && subjectId && totalTime > 0) {
      const { error: timeLogError } = await supabase
        .from('subject_time_logs')
        .insert({
          user_id: authData.user.id,
          subject_id: subjectId,
          session_id: sessionId,
          start_time: new Date(Date.now() - (totalTime * 1000)).toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: totalTime
        });

      if (timeLogError) {
        console.error('Error creating time log:', timeLogError);
        // Don't fail the request for time log errors
      }
    }

    console.log(`✅ Session ended: Student ${authData.user.id} practiced ${subjectId} for ${totalTime} seconds, attempted ${questionsAttempted || 0} questions`);

    return NextResponse.json({
      success: true,
      session: {
        totalTime: totalTime,
        questionsAttempted: questionsAttempted || 0,
        subjectId: subjectId
      }
    });

  } catch (error) {
    console.error('Error in end-session API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 