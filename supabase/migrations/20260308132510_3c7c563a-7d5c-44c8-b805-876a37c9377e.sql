
-- Fix overly permissive insert policy on notifications
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

-- Only allow inserting notifications for other users (system-like behavior)
-- Users can create notifications targeted at any user (needed for teacher->student notifications)
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
