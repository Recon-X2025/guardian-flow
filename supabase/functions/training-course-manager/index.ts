import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { action, courseId, courseData, moduleData, quizData, enrollmentId } = await req.json();

    switch (action) {
      case 'create_course': {
        const { data, error } = await supabaseClient
          .from('training_courses')
          .insert(courseData)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ course: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'enroll': {
        const { data, error } = await supabaseClient
          .from('training_enrollments')
          .insert({
            course_id: courseId,
            user_id: user.id,
            tenant_id: user.user_metadata.tenant_id,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ enrollment: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_progress': {
        const { moduleId, completed, timeSpentMinutes, lastPositionSeconds } = await req.json();
        
        const { data: progress, error: progressError } = await supabaseClient
          .from('training_module_progress')
          .upsert({
            enrollment_id: enrollmentId,
            module_id: moduleId,
            completed,
            time_spent_minutes: timeSpentMinutes,
            last_position_seconds: lastPositionSeconds,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (progressError) throw progressError;

        // Update overall enrollment progress
        const { data: modules } = await supabaseClient
          .from('training_modules')
          .select('id')
          .eq('course_id', courseId);

        const { data: completedModules } = await supabaseClient
          .from('training_module_progress')
          .select('id')
          .eq('enrollment_id', enrollmentId)
          .eq('completed', true);

        const progressPercent = Math.round((completedModules?.length || 0) / (modules?.length || 1) * 100);

        await supabaseClient
          .from('training_enrollments')
          .update({
            progress_percent: progressPercent,
            last_accessed_at: new Date().toISOString(),
            completed_at: progressPercent === 100 ? new Date().toISOString() : null,
          })
          .eq('id', enrollmentId);

        return new Response(JSON.stringify({ progress, progressPercent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_quiz': {
        const { quizId, answers, attemptNumber } = await req.json();
        
        const { data: questions } = await supabaseClient
          .from('training_quiz_questions')
          .select('*')
          .eq('quiz_id', quizId);

        let score = 0;
        let totalPoints = 0;

        questions?.forEach((q: any) => {
          totalPoints += q.points || 1;
          if (answers[q.id] === q.correct_answer) {
            score += q.points || 1;
          }
        });

        const { data: quiz } = await supabaseClient
          .from('training_quizzes')
          .select('passing_score')
          .eq('id', quizId)
          .single();

        const passed = (score / totalPoints * 100) >= (quiz?.passing_score || 70);

        const { data: attempt, error } = await supabaseClient
          .from('training_quiz_attempts')
          .insert({
            enrollment_id: enrollmentId,
            quiz_id: quizId,
            score,
            total_points: totalPoints,
            passed,
            answers,
            attempt_number: attemptNumber,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ attempt, passed, score, totalPoints }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'issue_certificate': {
        const certNumber = `CERT-${Date.now()}-${user.id.substring(0, 8)}`;
        const { data, error } = await supabaseClient
          .from('training_certifications')
          .insert({
            enrollment_id: enrollmentId,
            user_id: user.id,
            course_id: courseId,
            certificate_number: certNumber,
            verification_url: `${Deno.env.get('SUPABASE_URL')}/verify/${certNumber}`,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ certificate: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
