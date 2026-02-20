
-- Fix: scope insert/update policies to service_role only
DROP POLICY "Service can insert transactions" ON public.transactions;
DROP POLICY "Service can update transactions" ON public.transactions;
DROP POLICY "Service can insert lookups" ON public.vehicle_lookups;

CREATE POLICY "Service role can insert transactions"
  ON public.transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update transactions"
  ON public.transactions FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert lookups"
  ON public.vehicle_lookups FOR INSERT
  TO service_role
  WITH CHECK (true);
