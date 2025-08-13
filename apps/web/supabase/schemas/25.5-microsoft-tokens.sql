-- Microsoft Tokens Table
-- Stores Microsoft OAuth tokens for calendar and meeting integrations

CREATE TABLE public.microsoft_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  email_address character varying NOT NULL,
  tenant_id character varying,
  scope text NOT NULL DEFAULT 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite'::text,
  last_sync timestamp with time zone,
  is_active boolean DEFAULT true,
  sync_status text DEFAULT 'pending'::text CHECK (sync_status = ANY (ARRAY['idle'::text, 'pending'::text, 'syncing'::text, 'error'::text, 'failed'::text, 'completed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT microsoft_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT microsoft_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT microsoft_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_microsoft_tokens_account_id ON public.microsoft_tokens(account_id);
CREATE INDEX idx_microsoft_tokens_user_id ON public.microsoft_tokens(user_id);
CREATE INDEX idx_microsoft_tokens_email_address ON public.microsoft_tokens(email_address);
CREATE INDEX idx_microsoft_tokens_sync_status ON public.microsoft_tokens(sync_status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.microsoft_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own microsoft tokens" ON public.microsoft_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own microsoft tokens" ON public.microsoft_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own microsoft tokens" ON public.microsoft_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own microsoft tokens" ON public.microsoft_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.microsoft_tokens TO authenticated;
GRANT SELECT ON public.microsoft_tokens TO anon;