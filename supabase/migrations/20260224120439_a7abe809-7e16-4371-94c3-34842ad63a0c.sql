
-- Fix device_sessions policies: drop restrictive, create permissive
DROP POLICY IF EXISTS "Admins can view device sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Service role can insert device sessions" ON public.device_sessions;

CREATE POLICY "Admins can view device sessions"
ON public.device_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert device sessions"
ON public.device_sessions FOR INSERT
WITH CHECK (true);

-- Fix transactions policies
DROP POLICY IF EXISTS "Admins can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON public.transactions;

CREATE POLICY "Admins can view transactions"
ON public.transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update transactions"
ON public.transactions FOR UPDATE
USING (true);

-- Fix vehicle_lookups policies
DROP POLICY IF EXISTS "Admins can view vehicle lookups" ON public.vehicle_lookups;
DROP POLICY IF EXISTS "Service role can insert lookups" ON public.vehicle_lookups;

CREATE POLICY "Admins can view vehicle lookups"
ON public.vehicle_lookups FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert lookups"
ON public.vehicle_lookups FOR INSERT
WITH CHECK (true);

-- Add DELETE policy for device_sessions (needed for clear panel)
CREATE POLICY "Admins can delete device sessions"
ON public.device_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for transactions
CREATE POLICY "Admins can delete transactions"
ON public.transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for vehicle_lookups
CREATE POLICY "Admins can delete vehicle lookups"
ON public.vehicle_lookups FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
