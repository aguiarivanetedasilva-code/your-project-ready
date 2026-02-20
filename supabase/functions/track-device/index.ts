import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { placa, userAgent, deviceModel, latitude, longitude, action } = await req.json();

    // Get IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || 
               'unknown';

    // Try to get location from IP using free API
    let city = null;
    let region = null;
    let country = null;

    if (ip && ip !== 'unknown') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city || null;
          region = geo.regionName || null;
          country = geo.country || null;
        }
      } catch (e) {
        console.log('Geo lookup failed:', e);
      }
    }

    const { error } = await supabase.from('device_sessions').insert({
      placa: placa || 'N/A',
      ip_address: ip,
      user_agent: userAgent || req.headers.get('user-agent') || '',
      device_model: deviceModel || parseDeviceModel(userAgent || req.headers.get('user-agent') || ''),
      city: city,
      region: region,
      country: country,
      latitude: latitude || null,
      longitude: longitude || null,
      action: action || 'pix_copy',
      is_online: true,
    });

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error tracking device:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseDeviceModel(ua: string): string {
  if (!ua) return 'Desconhecido';
  
  // Mobile devices
  const mobileMatch = ua.match(/\(([^)]+)\)/);
  if (mobileMatch) {
    const info = mobileMatch[1];
    if (info.includes('iPhone')) return 'iPhone';
    if (info.includes('iPad')) return 'iPad';
    const androidMatch = info.match(/;\s*([^;]+)\s*Build/);
    if (androidMatch) return androidMatch[1].trim();
    if (info.includes('Android')) return 'Android';
  }

  // Desktop
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux PC';
  
  return 'Desconhecido';
}
