--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: gmail_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmail_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email_address character varying(320) NOT NULL,
    scope text DEFAULT 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sync timestamp with time zone,
    is_active boolean DEFAULT true,
    sync_status text DEFAULT 'pending'::text
);


--
-- Name: TABLE gmail_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gmail_tokens IS 'OAuth tokens for Gmail integration with sync status tracking';


--
-- Name: hubspot_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hubspot_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email_address character varying(255),
    api_domain character varying(255) NOT NULL,
    user_info jsonb DEFAULT '{}'::jsonb,
    scope text DEFAULT 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pipedrive_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipedrive_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email_address character varying(255),
    api_domain character varying(255) NOT NULL,
    user_info jsonb DEFAULT '{}'::jsonb,
    scope text DEFAULT 'base'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: salesforce_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salesforce_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email_address character varying(255),
    api_domain character varying(255) NOT NULL,
    user_info jsonb DEFAULT '{}'::jsonb,
    scope text DEFAULT 'api refresh_token id'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zoho_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zoho_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    email_address character varying(255),
    api_domain character varying(255) NOT NULL,
    user_info jsonb DEFAULT '{}'::jsonb,
    scope text DEFAULT 'ZohoCRM.modules.ALL'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmail_tokens gmail_tokens_account_id_email_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_account_id_email_address_key UNIQUE (account_id, email_address);


--
-- Name: gmail_tokens gmail_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_sync_status_check CHECK (
        sync_status = ANY (ARRAY[
            'idle'::text,
            'pending'::text, 
            'syncing'::text,
            'error'::text,
            'failed'::text,
            'completed'::text
        ])
    );

--
-- Name: hubspot_tokens hubspot_tokens_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_tokens
    ADD CONSTRAINT hubspot_tokens_account_id_key UNIQUE (account_id);


--
-- Name: hubspot_tokens hubspot_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_tokens
    ADD CONSTRAINT hubspot_tokens_pkey PRIMARY KEY (id);


--
-- Name: pipedrive_tokens pipedrive_tokens_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipedrive_tokens
    ADD CONSTRAINT pipedrive_tokens_account_id_key UNIQUE (account_id);


--
-- Name: pipedrive_tokens pipedrive_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipedrive_tokens
    ADD CONSTRAINT pipedrive_tokens_pkey PRIMARY KEY (id);


--
-- Name: salesforce_tokens salesforce_tokens_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesforce_tokens
    ADD CONSTRAINT salesforce_tokens_account_id_key UNIQUE (account_id);


--
-- Name: salesforce_tokens salesforce_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesforce_tokens
    ADD CONSTRAINT salesforce_tokens_pkey PRIMARY KEY (id);


--
-- Name: zoho_tokens zoho_tokens_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoho_tokens
    ADD CONSTRAINT zoho_tokens_account_id_key UNIQUE (account_id);


--
-- Name: zoho_tokens zoho_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoho_tokens
    ADD CONSTRAINT zoho_tokens_pkey PRIMARY KEY (id);


--
-- Name: idx_gmail_tokens_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_tokens_account_id ON public.gmail_tokens USING btree (account_id);

--
-- Name: idx_gmail_tokens_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_tokens_sync_status ON public.gmail_tokens USING btree (sync_status);

--
-- Name: idx_gmail_tokens_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_tokens_is_active ON public.gmail_tokens USING btree (is_active);

--
-- Name: idx_gmail_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_tokens_expires_at ON public.gmail_tokens USING btree (expires_at);


--
-- Name: idx_gmail_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_tokens_user_id ON public.gmail_tokens USING btree (user_id);


--
-- Name: idx_hubspot_tokens_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hubspot_tokens_account_id ON public.hubspot_tokens USING btree (account_id);


--
-- Name: idx_hubspot_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hubspot_tokens_expires_at ON public.hubspot_tokens USING btree (expires_at);


--
-- Name: idx_hubspot_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hubspot_tokens_user_id ON public.hubspot_tokens USING btree (user_id);


--
-- Name: idx_pipedrive_tokens_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipedrive_tokens_account_id ON public.pipedrive_tokens USING btree (account_id);


--
-- Name: idx_pipedrive_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipedrive_tokens_expires_at ON public.pipedrive_tokens USING btree (expires_at);


--
-- Name: idx_pipedrive_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipedrive_tokens_user_id ON public.pipedrive_tokens USING btree (user_id);


--
-- Name: idx_salesforce_tokens_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salesforce_tokens_account_id ON public.salesforce_tokens USING btree (account_id);


--
-- Name: idx_salesforce_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salesforce_tokens_expires_at ON public.salesforce_tokens USING btree (expires_at);


--
-- Name: idx_salesforce_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salesforce_tokens_user_id ON public.salesforce_tokens USING btree (user_id);


--
-- Name: idx_zoho_tokens_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoho_tokens_account_id ON public.zoho_tokens USING btree (account_id);


--
-- Name: idx_zoho_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoho_tokens_expires_at ON public.zoho_tokens USING btree (expires_at);


--
-- Name: idx_zoho_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoho_tokens_user_id ON public.zoho_tokens USING btree (user_id);


--
-- Name: gmail_tokens set_gmail_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_gmail_tokens_updated_at BEFORE UPDATE ON public.gmail_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: hubspot_tokens set_hubspot_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_hubspot_tokens_updated_at BEFORE UPDATE ON public.hubspot_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: pipedrive_tokens set_pipedrive_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_pipedrive_tokens_updated_at BEFORE UPDATE ON public.pipedrive_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: salesforce_tokens set_salesforce_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_salesforce_tokens_updated_at BEFORE UPDATE ON public.salesforce_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: zoho_tokens set_zoho_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_zoho_tokens_updated_at BEFORE UPDATE ON public.zoho_tokens FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: gmail_tokens gmail_tokens_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: gmail_tokens gmail_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hubspot_tokens hubspot_tokens_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_tokens
    ADD CONSTRAINT hubspot_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: hubspot_tokens hubspot_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_tokens
    ADD CONSTRAINT hubspot_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pipedrive_tokens pipedrive_tokens_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipedrive_tokens
    ADD CONSTRAINT pipedrive_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: pipedrive_tokens pipedrive_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipedrive_tokens
    ADD CONSTRAINT pipedrive_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: salesforce_tokens salesforce_tokens_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesforce_tokens
    ADD CONSTRAINT salesforce_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: salesforce_tokens salesforce_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesforce_tokens
    ADD CONSTRAINT salesforce_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: zoho_tokens zoho_tokens_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoho_tokens
    ADD CONSTRAINT zoho_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: zoho_tokens zoho_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoho_tokens
    ADD CONSTRAINT zoho_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gmail_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: gmail_tokens gmail_tokens_team_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gmail_tokens_team_members ON public.gmail_tokens TO authenticated USING (public.has_role_on_account(account_id));


--
-- PostgreSQL database dump complete
--

