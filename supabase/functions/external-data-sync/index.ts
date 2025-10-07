import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { feed_type, region = 'US' } = await req.json();

    console.log('Syncing external data:', { feed_type, region });

    let feedData = null;

    switch (feed_type) {
      case 'weather':
        feedData = await fetchWeatherData(region);
        break;
      case 'events':
        feedData = await fetchPublicEvents(region);
        break;
      case 'economic':
        feedData = await fetchEconomicIndicators(region);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid feed type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Store in external_data_feeds
    const { error } = await supabase
      .from('external_data_feeds')
      .insert({
        feed_type,
        feed_date: new Date().toISOString().split('T')[0],
        region,
        data: feedData
      });

    if (error) {
      console.error('Error storing external data:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        feed_type,
        region,
        data: feedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('External data sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchWeatherData(region: string) {
  // Using Open-Meteo API (no API key required)
  const lat = region === 'US' ? 37.7749 : 51.5074;
  const lon = region === 'US' ? -122.4194 : -0.1278;
  
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=14`
  );
  
  const data = await response.json();
  
  return {
    source: 'open-meteo',
    location: { lat, lon, region },
    forecast: data.daily,
    updated_at: new Date().toISOString()
  };
}

async function fetchPublicEvents(region: string) {
  // Placeholder for public events data
  // In production, integrate with Google Calendar API, Eventbrite, etc.
  return {
    source: 'placeholder',
    region,
    events: [
      {
        name: 'National Holiday',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'high'
      }
    ],
    updated_at: new Date().toISOString()
  };
}

async function fetchEconomicIndicators(region: string) {
  // Placeholder for economic data
  // In production, integrate with Federal Reserve, ECB APIs
  return {
    source: 'placeholder',
    region,
    indicators: {
      unemployment_rate: 3.8,
      gdp_growth: 2.1,
      inflation_rate: 3.2
    },
    updated_at: new Date().toISOString()
  };
}