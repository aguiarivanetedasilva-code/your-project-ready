
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- Transactions
DROP POLICY "Admins can view transactions" ON public.transactions;
CREATE POLICY "Admins can view transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Service role can insert transactions" ON public.transactions;
CREATE POLICY "Service role can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY "Service role can update transactions" ON public.transactions;
CREATE POLICY "Service role can update transactions" ON public.transactions FOR UPDATE USING (true);

-- Vehicle lookups
DROP POLICY "Admins can view vehicle lookups" ON public.vehicle_lookups;
CREATE POLICY "Admins can view vehicle lookups" ON public.vehicle_lookups FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Service role can insert lookups" ON public.vehicle_lookups;
CREATE POLICY "Service role can insert lookups" ON public.vehicle_lookups FOR INSERT WITH CHECK (true);

-- User roles
DROP POLICY "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
