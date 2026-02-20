
-- Create device_sessions table for tracking when PIX is copied
CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  ip_address text,
  user_agent text,
  device_model text,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  action text NOT NULL DEFAULT 'pix_copy',
  is_online boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view
CREATE POLICY "Admins can view device sessions"
  ON public.device_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert
CREATE POLICY "Service role can insert device sessions"
  ON public.device_sessions FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_sessions;
