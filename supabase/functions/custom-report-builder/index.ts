import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  action: 'list' | 'create' | 'update' | 'delete' | 'execute' | 'schedule' | 'export';
  report_id?: string;
  data?: any;
  format?: 'json' | 'csv' | 'pdf';
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

    const { action, report_id, data: requestData, format = 'json' }: ReportRequest = await req.json();

    console.log(`Report builder action: ${action}`, { report_id, user_id: user.id });

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
      case 'list': {
        const { data: reports, error } = await supabase
          .from('custom_reports')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ reports }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        const { data: report, error } = await supabase
          .from('custom_reports')
          .insert({
            tenant_id: profile.tenant_id,
            created_by: user.id,
            name: requestData.name,
            description: requestData.description,
            report_type: requestData.report_type,
            data_sources: requestData.data_sources,
            columns: requestData.columns,
            visualizations: requestData.visualizations,
            filters: requestData.filters,
            is_public: requestData.is_public || false,
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`Report created: ${report.id}`);

        return new Response(JSON.stringify({ report }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!report_id) {
          return new Response(JSON.stringify({ error: 'report_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: report, error } = await supabase
          .from('custom_reports')
          .update({
            name: requestData.name,
            description: requestData.description,
            data_sources: requestData.data_sources,
            columns: requestData.columns,
            visualizations: requestData.visualizations,
            filters: requestData.filters,
            is_public: requestData.is_public,
          })
          .eq('id', report_id)
          .eq('tenant_id', profile.tenant_id)
          .select()
          .single();

        if (error) throw error;

        console.log(`Report updated: ${report_id}`);

        return new Response(JSON.stringify({ report }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!report_id) {
          return new Response(JSON.stringify({ error: 'report_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('custom_reports')
          .delete()
          .eq('id', report_id)
          .eq('tenant_id', profile.tenant_id);

        if (error) throw error;

        console.log(`Report deleted: ${report_id}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute': {
        if (!report_id) {
          return new Response(JSON.stringify({ error: 'report_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch report configuration
        const { data: report, error: reportError } = await supabase
          .from('custom_reports')
          .select('*')
          .eq('id', report_id)
          .eq('tenant_id', profile.tenant_id)
          .single();

        if (reportError || !report) {
          return new Response(JSON.stringify({ error: 'Report not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build query based on report configuration
        const dataSources = report.data_sources as any;
        const columns = report.columns as any;
        const filters = (requestData?.filters || report.filters) as any;

        let query = supabase
          .from(dataSources.primary_table)
          .select(columns.map((col: any) => col.field).join(','));

        // Apply filters
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any) => {
            if (filter.operator === 'eq') {
              query = query.eq(filter.field, filter.value);
            } else if (filter.operator === 'gte') {
              query = query.gte(filter.field, filter.value);
            } else if (filter.operator === 'lte') {
              query = query.lte(filter.field, filter.value);
            } else if (filter.operator === 'like') {
              query = query.ilike(filter.field, `%${filter.value}%`);
            }
          });
        }

        // Tenant isolation
        query = query.eq('tenant_id', profile.tenant_id);

        const { data: results, error: queryError } = await query.limit(1000);

        if (queryError) throw queryError;

        console.log(`Report executed: ${report_id}, rows: ${results?.length || 0}`);

        return new Response(JSON.stringify({ report, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'schedule': {
        if (!report_id) {
          return new Response(JSON.stringify({ error: 'report_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: schedule, error } = await supabase
          .from('report_schedules')
          .insert({
            tenant_id: profile.tenant_id,
            report_id,
            schedule_cron: requestData.schedule_cron,
            recipients: requestData.recipients,
            format: requestData.format || 'pdf',
            enabled: true,
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`Report scheduled: ${schedule.id}`);

        return new Response(JSON.stringify({ schedule }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'export': {
        if (!report_id) {
          return new Response(JSON.stringify({ error: 'report_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Execute report first
        const executeResponse = await fetch(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({ action: 'execute', report_id }),
        });

        const { results } = await executeResponse.json();

        if (format === 'csv') {
          const csv = convertToCSV(results);
          return new Response(csv, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="report-${report_id}.csv"`,
            },
          });
        }

        return new Response(JSON.stringify({ results }), {
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
    console.error('Report builder error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}
