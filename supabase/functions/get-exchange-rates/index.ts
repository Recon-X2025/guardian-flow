import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { baseCurrency = 'USD', targetCurrencies } = await req.json();
    
    // Using exchangerate-api.com free tier (1500 requests/month)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    // If specific currencies requested, filter them
    let rates = data.rates;
    if (targetCurrencies && Array.isArray(targetCurrencies)) {
      rates = Object.keys(rates)
        .filter(key => targetCurrencies.includes(key))
        .reduce((obj: any, key: string) => {
          obj[key] = rates[key];
          return obj;
        }, {});
    }

    return new Response(
      JSON.stringify({
        base: data.base,
        date: data.date,
        rates: rates,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
