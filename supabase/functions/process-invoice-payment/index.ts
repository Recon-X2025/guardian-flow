import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { invoiceId, paymentMethod, transactionId, amount } = await req.json();

    console.log('Processing payment for invoice:', invoiceId);

    // Update invoice status to paid
    const { data: invoice, error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        transaction_id: transactionId
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log payment transaction
    await supabaseClient.from('audit_trail').insert({
      action: 'payment_processed',
      resource_type: 'invoice',
      resource_id: invoiceId,
      details: {
        amount,
        paymentMethod,
        transactionId,
        timestamp: new Date().toISOString()
      }
    });

    console.log('Payment processed successfully:', invoice);

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
        message: 'Payment processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
