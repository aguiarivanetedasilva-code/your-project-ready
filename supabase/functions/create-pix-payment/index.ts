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

    const { amount, placa } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Valor inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Track vehicle lookup
    await supabase.from('vehicle_lookups').insert({
      placa: placa || 'N/A',
      user_agent: req.headers.get('user-agent') || '',
    });

    // Get active gateway from settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_gateway')
      .single();

    const activeGateway = settingsData?.value || 'blackcat';
    console.log('[create-pix-payment] Active gateway:', activeGateway);

    let txData: any;

    if (activeGateway === 'blackpay') {
      txData = await createBlackPayPayment(amount, placa);
    } else {
      txData = await createBlackCatPayment(amount, placa);
    }

    // Save transaction to database
    await supabase.from('transactions').insert({
      transaction_id: txData.transactionId,
      placa: placa || 'N/A',
      amount: txData.amount,
      net_amount: txData.netAmount || null,
      fees: txData.fees || null,
      status: txData.status,
      payment_method: txData.paymentMethod || 'PIX',
      pix_code: txData.pixCode || '',
      invoice_url: txData.invoiceUrl || null,
      expires_at: txData.expiresAt || null,
    });

    return new Response(JSON.stringify({ success: true, data: txData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating PIX payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── BlackCat Gateway ───
async function createBlackCatPayment(amount: number, placa: string) {
  const BLACKCAT_API_KEY = Deno.env.get('BLACKCAT_API_KEY');
  if (!BLACKCAT_API_KEY) throw new Error('BLACKCAT_API_KEY is not configured');

  const amountInCents = Math.round(amount * 100);

  const body = {
    amount: amountInCents,
    currency: 'BRL',
    paymentMethod: 'pix',
    items: [{ title: 'X991', unitPrice: amountInCents, quantity: 1, tangible: false }],
    customer: {
      name: 'PEDAGIO DIGITAL LTDA',
      email: 'contato@pedagiodigital.com.br',
      phone: '11999999999',
      document: { number: '04281554645', type: 'cpf' },
    },
    pix: { expiresInDays: 1 },
    externalRef: `DEBITO-${placa}-${Date.now()}`,
  };

  const response = await fetch(`${BLACKCAT_API_URL}/sales/create-sale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': BLACKCAT_API_KEY },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('BlackCat API error:', JSON.stringify(data));
    throw new Error(data.message || 'Erro ao criar pagamento via BlackCat');
  }

  const tx = data.data;
  return {
    transactionId: tx.transactionId,
    status: tx.status,
    amount: tx.amount,
    netAmount: tx.netAmount,
    fees: tx.fees,
    paymentMethod: tx.paymentMethod,
    pixCode: tx.paymentData?.copyPaste || tx.paymentData?.qrCode || '',
    qrCodeBase64: tx.paymentData?.qrCode || null,
    invoiceUrl: tx.invoiceUrl,
    expiresAt: (() => {
      try {
        const d = new Date(tx.paymentData?.expiresAt);
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch { return null; }
    })(),
  };
}

// ─── BlackPay Gateway ───
async function createBlackPayPayment(amount: number, placa: string) {
  const BLACKPAY_API_KEY = Deno.env.get('BLACKPAY_API_KEY');
  const BLACKPAY_API_SECRET = Deno.env.get('BLACKPAY_API_SECRET');
  if (!BLACKPAY_API_KEY) throw new Error('BLACKPAY_API_KEY is not configured');
  if (!BLACKPAY_API_SECRET) throw new Error('BLACKPAY_API_SECRET is not configured');

  const body = {
    amount: amount,
    description: `DEBITO-${placa}`,
    customer: {
      name: 'PEDAGIO DIGITAL LTDA',
      email: 'contato@pedagiodigital.com.br',
      phone: '11999999999',
      document: { number: '04281554645', type: 'cpf' },
    },
    items: [{ title: 'X991', unitPrice: Math.round(amount * 100), quantity: 1 }],
  };

  console.log('[BlackPay] Request body:', JSON.stringify(body));

  const response = await fetch(`${BLACKPAY_API_URL}/pix/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BLACKPAY_API_KEY,
      'X-API-Secret': BLACKPAY_API_SECRET,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  console.log('[BlackPay] Response status:', response.status);
  console.log('[BlackPay] Response body:', rawText);

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`BlackPay returned non-JSON response: ${rawText.substring(0, 200)}`);
  }

  if (!response.ok || data.status === 'false' || data.status === false) {
    throw new Error(`BlackPay error [${response.status}]: ${rawText.substring(0, 300)}`);
  }

  const pd = data.paymentData;
  return {
    transactionId: pd.transactionId,
    status: pd.status,
    amount: Math.round(pd.amount * 100), // store in cents
    netAmount: null,
    fees: null,
    paymentMethod: 'PIX',
    pixCode: pd.copiaecola || '',
    qrCodeBase64: pd.qrcode || null,
    invoiceUrl: null,
    expiresAt: null,
  };
}
