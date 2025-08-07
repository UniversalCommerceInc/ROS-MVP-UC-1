-- Migration: Remove development webhook triggers for production
-- These triggers are replaced by Supabase Dashboard webhooks in production

-- Remove development webhook triggers
DROP TRIGGER IF EXISTS "invitations_insert" ON "public"."invitations";
DROP TRIGGER IF EXISTS "accounts_teardown" ON "public"."accounts";
DROP TRIGGER IF EXISTS "subscriptions_delete" ON "public"."subscriptions";

-- Add comment to document the change
COMMENT ON TABLE public.invitations IS 'Invitations table - webhook triggers configured via Supabase Dashboard in production';
COMMENT ON TABLE public.accounts IS 'Accounts table - webhook triggers configured via Supabase Dashboard in production';
COMMENT ON TABLE public.subscriptions IS 'Subscriptions table - webhook triggers configured via Supabase Dashboard in production'; 