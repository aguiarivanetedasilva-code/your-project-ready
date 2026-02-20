import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLACKCAT_API_URL = 'https://api.blackcatpagamentos.online/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BLACKCAT_API_KEY = Deno.env.get('BLACKCAT_API_KEY');
    if (!BLACKCAT_API_KEY) {
      throw new Error('BLACKCAT_API_KEY is not configured');
    }

    const { amount, placa } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Valor inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInCents = Math.round(amount * 100);

    const body = {
      amount: amountInCents,
      currency: 'BRL',
      paymentMethod: 'pix',
      items: [
        {
          title: `Débito veicular - ${placa || 'N/A'}`,
          unitPrice: amountInCents,
          quantity: 1,
          tangible: false,
        },
      ],
      customer: {
        name: 'Cliente',
        email: 'cliente@email.com',
        phone: '11999999999',
        document: {
          number: '00000000000',
          type: 'cpf',
        },
      },
      pix: {
        expiresInDays: 1,
      },
      externalRef: `DEBITO-${placa}-${Date.now()}`,
    };

    const response = await fetch(`${BLACKCAT_API_URL}/sales/create-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BLACKCAT_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('BlackCat API error:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: data.message || 'Erro ao criar pagamento' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: data.data }), {
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
