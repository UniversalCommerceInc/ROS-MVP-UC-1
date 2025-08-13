-- Enable RLS on deal_contacts table if not already enabled
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

-- Allow users to read deal_contacts for deals they have access to
CREATE POLICY "deal_contacts_read" ON public.deal_contacts FOR SELECT
  TO authenticated USING (
    deal_id IN (
      SELECT d.id FROM public.deals d
      WHERE d.account_id IN (
        SELECT am.account_id FROM public.accounts_memberships am
        WHERE am.user_id = auth.uid()
      )
    )
  );

-- Allow users to insert deal_contacts for deals they have access to
CREATE POLICY "deal_contacts_insert" ON public.deal_contacts FOR INSERT
  TO authenticated WITH CHECK (
    deal_id IN (
      SELECT d.id FROM public.deals d
      WHERE d.account_id IN (
        SELECT am.account_id FROM public.accounts_memberships am
        WHERE am.user_id = auth.uid()
      )
    )
  );

-- Allow users to update deal_contacts for deals they have access to
CREATE POLICY "deal_contacts_update" ON public.deal_contacts FOR UPDATE
  TO authenticated USING (
    deal_id IN (
      SELECT d.id FROM public.deals d
      WHERE d.account_id IN (
        SELECT am.account_id FROM public.accounts_memberships am
        WHERE am.user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    deal_id IN (
      SELECT d.id FROM public.deals d
      WHERE d.account_id IN (
        SELECT am.account_id FROM public.accounts_memberships am
        WHERE am.user_id = auth.uid()
      )
    )
  );

-- Allow users to delete deal_contacts for deals they have access to
CREATE POLICY "deal_contacts_delete" ON public.deal_contacts FOR DELETE
  TO authenticated USING (
    deal_id IN (
      SELECT d.id FROM public.deals d
      WHERE d.account_id IN (
        SELECT am.account_id FROM public.accounts_memberships am
        WHERE am.user_id = auth.uid()
      )
    )
  );