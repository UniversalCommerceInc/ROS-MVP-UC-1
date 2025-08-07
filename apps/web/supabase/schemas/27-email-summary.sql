-- Add email summary fields to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS email_summary text,
ADD COLUMN IF NOT EXISTS email_summary_updated_at timestamp with time zone; 