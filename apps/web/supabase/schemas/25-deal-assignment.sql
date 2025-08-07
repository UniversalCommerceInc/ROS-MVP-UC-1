/*
 * -------------------------------------------------------
 * Section: Deal Assignment System
 * Add assignment functionality to deals for team collaboration
 * -------------------------------------------------------
 */

-- Add assigned_to column to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add index for performance on assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON public.deals(assigned_to);

-- Add index for filtering deals by account and assignment
CREATE INDEX IF NOT EXISTS idx_deals_account_assigned ON public.deals(account_id, assigned_to);

-- Comment on the new column
COMMENT ON COLUMN public.deals.assigned_to IS 'The user assigned to handle this deal';

-- Enable RLS on deals table if not already enabled
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for deals - team members can see deals in their account
DROP POLICY IF EXISTS "deals_team_access" ON public.deals;
CREATE POLICY "deals_team_access" ON public.deals FOR SELECT
TO authenticated USING (
  -- User can see deals if they are a member of the account that owns the deal
  public.has_role_on_account(account_id)
);

-- Policy for inserting deals - team members can create deals in their account
DROP POLICY IF EXISTS "deals_team_insert" ON public.deals;
CREATE POLICY "deals_team_insert" ON public.deals FOR INSERT
TO authenticated WITH CHECK (
  public.has_role_on_account(account_id)
);

-- Policy for updating deals - team members can update deals in their account
DROP POLICY IF EXISTS "deals_team_update" ON public.deals;
CREATE POLICY "deals_team_update" ON public.deals FOR UPDATE
TO authenticated USING (
  public.has_role_on_account(account_id)
) WITH CHECK (
  public.has_role_on_account(account_id)
);

-- Policy for deleting deals - team members can delete deals in their account
DROP POLICY IF EXISTS "deals_team_delete" ON public.deals;
CREATE POLICY "deals_team_delete" ON public.deals FOR DELETE
TO authenticated USING (
  public.has_role_on_account(account_id)
);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;

-- Function to check if user can assign deals to another user
CREATE OR REPLACE FUNCTION public.can_assign_deal_to_user(
  target_account_id UUID,
  target_user_id UUID
) RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    -- Check if the target user is a member of the account
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = target_account_id 
    AND user_id = target_user_id
  ) AND (
    -- Check if current user has permission to manage deals in this account
    public.has_role_on_account(target_account_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_assign_deal_to_user(UUID, UUID) TO authenticated;

-- Function to get team members for deal assignment
CREATE OR REPLACE FUNCTION public.get_account_members_for_assignment(
  target_account_id UUID
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  name TEXT,
  account_role VARCHAR(50)
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    u.id as user_id,
    a.email,
    a.name,
    m.account_role
  FROM auth.users u
  JOIN public.accounts a ON a.id = u.id
  JOIN public.accounts_memberships m ON m.user_id = u.id
  WHERE m.account_id = target_account_id
  AND public.has_role_on_account(target_account_id) -- Ensure caller has access
  ORDER BY a.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_members_for_assignment(UUID) TO authenticated; 