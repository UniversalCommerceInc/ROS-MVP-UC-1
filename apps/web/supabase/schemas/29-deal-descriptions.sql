-- Add company_description field to separate company info from deal-specific description
-- This allows us to have:
-- - company_description: AI-generated company summary/background info
-- - relationship_insights: Deal-specific description/notes from user
-- - deal_title: Actual deal title/name

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS company_description text;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN public.deals.company_description IS 'AI-generated company background and summary for sales context';
COMMENT ON COLUMN public.deals.relationship_insights IS 'Deal-specific description, notes, and relationship insights';
COMMENT ON COLUMN public.deals.deal_title IS 'Deal title or name (not company summary)'; 