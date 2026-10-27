-- Private-only Realtime also rejects public Postgres Changes subscriptions.
-- Permit the recipient's own notification topic to join; notifications table RLS
-- still authorizes each CDC row. Browser broadcast writes remain forbidden.
CREATE POLICY "Recipients join private notification channels"
ON realtime.messages FOR SELECT TO authenticated USING (
  extension = 'broadcast'
  AND topic = 'notifications-' || (SELECT auth.uid())::text
  AND topic = (SELECT realtime.topic())
);
