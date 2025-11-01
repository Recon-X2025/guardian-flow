import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceRequest {
  action: 'create_schedule' | 'update_schedule' | 'delete_schedule' | 'generate_events' | 'complete_event' | 'list_schedules' | 'list_events';
  schedule_id?: string;
  event_id?: string;
  data?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, schedule_id, event_id, data: requestData }: MaintenanceRequest = await req.json();

    console.log(`Maintenance scheduler action: ${action}`, { schedule_id, user_id: user.id });

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'list_schedules': {
        const { data: schedules, error } = await supabase
          .from('maintenance_schedules')
          .select(`
            *,
            equipment!inner(name, model, serial_number)
          `)
          .eq('tenant_id', profile.tenant_id)
          .order('next_due_date', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ schedules }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_events': {
        const startDate = requestData?.start_date || new Date().toISOString().split('T')[0];
        const endDate = requestData?.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: events, error } = await supabase
          .from('maintenance_calendar_events')
          .select(`
            *,
            equipment!inner(name, model, serial_number),
            maintenance_schedules!inner(schedule_name, maintenance_type)
          `)
          .eq('tenant_id', profile.tenant_id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ events }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_schedule': {
        const { data: schedule, error } = await supabase
          .from('maintenance_schedules')
          .insert({
            tenant_id: profile.tenant_id,
            asset_id: requestData.asset_id,
            schedule_name: requestData.schedule_name,
            maintenance_type: requestData.maintenance_type,
            frequency: requestData.frequency,
            frequency_value: requestData.frequency_value || 1,
            start_date: requestData.start_date,
            next_due_date: requestData.start_date,
            estimated_duration_hours: requestData.estimated_duration_hours,
            assigned_technician_id: requestData.assigned_technician_id,
            checklist_items: requestData.checklist_items || [],
            auto_generate_work_order: requestData.auto_generate_work_order ?? true,
            enabled: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Generate initial events
        await generateMaintenanceEvents(supabase, schedule, profile.tenant_id);

        console.log(`Maintenance schedule created: ${schedule.id}`);

        return new Response(JSON.stringify({ schedule }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_schedule': {
        if (!schedule_id) {
          return new Response(JSON.stringify({ error: 'schedule_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: schedule, error } = await supabase
          .from('maintenance_schedules')
          .update({
            schedule_name: requestData.schedule_name,
            maintenance_type: requestData.maintenance_type,
            frequency: requestData.frequency,
            frequency_value: requestData.frequency_value,
            estimated_duration_hours: requestData.estimated_duration_hours,
            assigned_technician_id: requestData.assigned_technician_id,
            checklist_items: requestData.checklist_items,
            enabled: requestData.enabled,
          })
          .eq('id', schedule_id)
          .eq('tenant_id', profile.tenant_id)
          .select()
          .single();

        if (error) throw error;

        console.log(`Maintenance schedule updated: ${schedule_id}`);

        return new Response(JSON.stringify({ schedule }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_schedule': {
        if (!schedule_id) {
          return new Response(JSON.stringify({ error: 'schedule_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('maintenance_schedules')
          .delete()
          .eq('id', schedule_id)
          .eq('tenant_id', profile.tenant_id);

        if (error) throw error;

        console.log(`Maintenance schedule deleted: ${schedule_id}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'generate_events': {
        // Generate events for all enabled schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('maintenance_schedules')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('enabled', true);

        if (schedulesError) throw schedulesError;

        let eventsCreated = 0;
        for (const schedule of schedules || []) {
          const created = await generateMaintenanceEvents(supabase, schedule, profile.tenant_id);
          eventsCreated += created;
        }

        console.log(`Generated ${eventsCreated} maintenance events`);

        return new Response(JSON.stringify({ events_created: eventsCreated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'complete_event': {
        if (!event_id) {
          return new Response(JSON.stringify({ error: 'event_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: event, error } = await supabase
          .from('maintenance_calendar_events')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            notes: requestData.notes,
          })
          .eq('id', event_id)
          .eq('tenant_id', profile.tenant_id)
          .select()
          .single();

        if (error) throw error;

        // Update schedule next_due_date
        const { data: schedule } = await supabase
          .from('maintenance_schedules')
          .select('*')
          .eq('id', event.schedule_id)
          .single();

        if (schedule) {
          const nextDueDate = calculateNextDueDate(
            new Date(event.scheduled_date),
            schedule.frequency,
            schedule.frequency_value
          );

          await supabase
            .from('maintenance_schedules')
            .update({ next_due_date: nextDueDate.toISOString().split('T')[0] })
            .eq('id', schedule.id);
        }

        console.log(`Maintenance event completed: ${event_id}`);

        return new Response(JSON.stringify({ event }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Maintenance scheduler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateMaintenanceEvents(supabase: any, schedule: any, tenantId: string): Promise<number> {
  // Generate events for next 180 days
  const events = [];
  let currentDate = new Date(schedule.next_due_date);
  const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  while (currentDate <= endDate) {
    // Check if event already exists
    const { data: existing } = await supabase
      .from('maintenance_calendar_events')
      .select('id')
      .eq('schedule_id', schedule.id)
      .eq('scheduled_date', currentDate.toISOString().split('T')[0])
      .single();

    if (!existing) {
      events.push({
        tenant_id: tenantId,
        schedule_id: schedule.id,
        asset_id: schedule.asset_id,
        scheduled_date: currentDate.toISOString().split('T')[0],
        status: 'scheduled',
      });
    }

    currentDate = calculateNextDueDate(currentDate, schedule.frequency, schedule.frequency_value);
  }

  if (events.length > 0) {
    await supabase.from('maintenance_calendar_events').insert(events);
  }

  return events.length;
}

function calculateNextDueDate(currentDate: Date, frequency: string, frequencyValue: number): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + frequencyValue);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (frequencyValue * 7));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + frequencyValue);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + (frequencyValue * 3));
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + frequencyValue);
      break;
  }

  return nextDate;
}
