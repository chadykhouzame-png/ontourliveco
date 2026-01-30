-- Fix RLS policy warnings with proper authentication checks

-- 1. Entertainment requests: Restrict viewing to authenticated users only (protect budget info)
DROP POLICY IF EXISTS "Anyone can view open entertainment requests" ON public.entertainment_requests;

CREATE POLICY "Authenticated users can view open entertainment requests" 
ON public.entertainment_requests 
FOR SELECT 
TO authenticated
USING (status = 'open');

-- 2. Password reset rate limits: Add service role access for backend operations
CREATE POLICY "Service role can manage rate limits" 
ON public.password_reset_rate_limits 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Notifications: Add INSERT policies for system and user-triggered notifications
CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "System can insert notifications for users" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Notifications: Add DELETE policy so users can clear their notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);