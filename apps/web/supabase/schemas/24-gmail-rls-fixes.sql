-- Fix RLS policies for Gmail integration to support both personal and team accounts

-- Enable RLS on email_sync_status table (missing from original schema)
ALTER TABLE public.email_sync_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_sync_status table
-- Users can read/write their own email sync status (personal account) or team members can access
CREATE POLICY "email_sync_status_access" ON public.email_sync_status
  FOR ALL
  TO authenticated
  USING (
    -- Personal account: user is the primary owner
    account_id IN (
      SELECT id FROM public.accounts 
      WHERE primary_owner_user_id = (SELECT auth.uid()) 
      AND is_personal_account = true
    )
    OR
    -- Team account: user has role on account
    public.has_role_on_account(account_id)
  );

-- Update the existing gmail_tokens policy to support personal accounts
DROP POLICY IF EXISTS gmail_tokens_team_members ON public.gmail_tokens;

CREATE POLICY "gmail_tokens_access" ON public.gmail_tokens
  FOR ALL
  TO authenticated
  USING (
    -- Personal account: user is the primary owner
    account_id IN (
      SELECT id FROM public.accounts 
      WHERE primary_owner_user_id = (SELECT auth.uid()) 
      AND is_personal_account = true
    )
    OR
    -- Team account: user has role on account  
    public.has_role_on_account(account_id)
  );

-- Also enable RLS on emails table if not already enabled
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for emails table to support both personal and team accounts
CREATE POLICY "emails_access" ON public.emails
  FOR ALL
  TO authenticated
  USING (
    -- Personal account: user is the primary owner
    account_id IN (
      SELECT id FROM public.accounts 
      WHERE primary_owner_user_id = (SELECT auth.uid()) 
      AND is_personal_account = true
    )
    OR
    -- Team account: user has role on account
    public.has_role_on_account(account_id)
  ); 