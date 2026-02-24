import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BLACKCAT_API_URL = 'https://api.blackcatpagamentos.online/api';
const BLACKPAY_API_URL = 'https://www.paymentsblack.com/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(JSON.stringify({ success: false, error: 'transactionId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active gateway
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_gateway')
      .single();

    const activeGateway = settingsData?.value || 'blackcat';
    let status = 'PENDING';

    if (activeGateway === 'blackpay') {
      const BLACKPAY_API_KEY = Deno.env.get('BLACKPAY_API_KEY');
      const BLACKPAY_API_SECRET = Deno.env.get('BLACKPAY_API_SECRET');
      if (!BLACKPAY_API_KEY || !BLACKPAY_API_SECRET) throw new Error('BlackPay keys not configured');

      const res = await fetch(`${BLACKPAY_API_URL}/transactions/${transactionId}/status`, {
        headers: {
          'X-API-Key': BLACKPAY_API_KEY,
          'X-API-Secret': BLACKPAY_API_SECRET,
        },
      });
      const data = await res.json();
      if (data?.success && data?.data?.status) {
        status = data.data.status;
      }
    } else {
      const BLACKCAT_API_KEY = Deno.env.get('BLACKCAT_API_KEY');
      if (!BLACKCAT_API_KEY) throw new Error('BLACKCAT_API_KEY not configured');

      const res = await fetch(`${BLACKCAT_API_URL}/sales/${transactionId}/status`, {
        headers: { 'X-API-Key': BLACKCAT_API_KEY },
      });
      const data = await res.json();
      if (data?.data?.status) {
        status = data.data.status;
      }
    }

    // Update transaction in DB if paid
    if (status === 'PAID' || status === 'COMPLETED') {
      await supabase
        .from('transactions')
        .update({ status: 'PAID' })
        .eq('transaction_id', transactionId);
    }

    return new Response(JSON.stringify({ success: true, status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
