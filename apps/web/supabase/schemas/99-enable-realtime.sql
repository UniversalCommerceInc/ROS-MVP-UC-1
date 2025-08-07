-- Enable real-time for the deals table
-- This file ensures real-time subscriptions work for deal changes

-- Enable real-time for deals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;

-- Optional: Enable for other tables if needed in the future
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_contacts; 