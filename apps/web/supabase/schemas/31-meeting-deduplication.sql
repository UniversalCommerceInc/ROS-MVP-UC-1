-- Add unique constraint to prevent duplicate meetings
-- This ensures the same meeting from the same source cannot be inserted multiple times

-- Create a unique index on meetings table to prevent duplicates
-- We'll use account_id, title, start_time, and host_email as the unique combination
CREATE UNIQUE INDEX IF NOT EXISTS meetings_unique_constraint 
ON public.meetings (account_id, title, start_time, host_email)
WHERE title IS NOT NULL AND start_time IS NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX public.meetings_unique_constraint IS 
'Prevents duplicate meetings based on account, title, start time, and host email. Helps avoid calendar sync duplicates.';