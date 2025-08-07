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
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text,
    phone text,
    is_decision_maker boolean DEFAULT false NOT NULL,
    last_contacted timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contacts_email_check CHECK ((email ~* '^.+@.+\..+$'::text)),
    CONSTRAINT contacts_name_check CHECK ((name <> ''::text))
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    company_name character varying NOT NULL,
    industry character varying NOT NULL,
    value_amount numeric DEFAULT 0 NOT NULL,
    value_currency character varying DEFAULT 'USD'::character varying NOT NULL,
    stage public.deal_stage DEFAULT 'interested'::public.deal_stage NOT NULL,
    probability integer DEFAULT 0,
    company_size character varying,
    website character varying,
    deal_title character varying,
    next_action text,
    relationship_insights text,
    last_meeting_summary text,
    momentum integer DEFAULT 0 NOT NULL,
    momentum_trend public.momentum_trend DEFAULT 'steady'::public.momentum_trend NOT NULL,
    last_momentum_change timestamp with time zone,
    close_date date,
    pain_points text[],
    next_steps text[],
    blockers text[],
    opportunities text[],
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    source character varying,
    green_flags text[],
    red_flags text[],
    organizational_context text[],
    competitor_mentions text[],
    sentiment_engagement text[],
    last_analysis_date timestamp with time zone,
    ai_analysis_raw text,
    deal_id text,
    primary_contact text DEFAULT ''::text NOT NULL,
    primary_email text DEFAULT ''::text NOT NULL,
    last_meeting_date timestamp with time zone,
    last_meeting_type text,
    last_meeting_notes text,
    ai_insights jsonb,
    meeting_highlights jsonb DEFAULT '[]'::jsonb,
    meeting_action_items jsonb DEFAULT '[]'::jsonb,
    total_meetings integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now(),
    CONSTRAINT deals_company_name_check CHECK (((company_name)::text <> ''::text)),
    CONSTRAINT deals_industry_check CHECK (((industry)::text <> ''::text)),
    CONSTRAINT deals_momentum_check CHECK (((momentum >= '-100'::integer) AND (momentum <= 100))),
    CONSTRAINT deals_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
    CONSTRAINT deals_value_amount_check CHECK ((value_amount >= (0)::numeric)),
    CONSTRAINT deals_value_currency_check CHECK (((value_currency)::text <> ''::text))
);


--
-- Name: contacts contacts_account_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_account_id_email_key UNIQUE (account_id, email);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: deals deals_deal_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_deal_id_key UNIQUE (deal_id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: contacts_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_account_id_idx ON public.contacts USING btree (account_id);


--
-- Name: contacts_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_email_idx ON public.contacts USING btree (email);


--
-- Name: deals_deal_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_deal_id_idx ON public.deals USING btree (deal_id);


--
-- Name: deals_last_meeting_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_last_meeting_date_idx ON public.deals USING btree (last_meeting_date);


--
-- Name: deals_primary_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_primary_email_idx ON public.deals USING btree (primary_email);


--
-- Name: idx_deals_ai_insights; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_ai_insights ON public.deals USING gin (ai_insights);


--
-- Name: idx_deals_competitor_mentions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_competitor_mentions ON public.deals USING gin (competitor_mentions);


--
-- Name: idx_deals_green_flags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_green_flags ON public.deals USING gin (green_flags);


--
-- Name: idx_deals_last_analysis_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_last_analysis_date ON public.deals USING btree (last_analysis_date);


--
-- Name: idx_deals_meeting_action_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_meeting_action_items ON public.deals USING gin (meeting_action_items);


--
-- Name: idx_deals_meeting_highlights; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_meeting_highlights ON public.deals USING gin (meeting_highlights);


--
-- Name: idx_deals_organizational_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_organizational_context ON public.deals USING gin (organizational_context);


--
-- Name: idx_deals_red_flags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_red_flags ON public.deals USING gin (red_flags);


--
-- Name: idx_deals_sentiment_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_sentiment_engagement ON public.deals USING gin (sentiment_engagement);


--
-- Name: deals update_deals_last_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deals_last_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_last_updated_column();


--
-- Name: contacts contacts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: contacts contacts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: deals deals_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: deals deals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: deals deals_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- PostgreSQL database dump complete
--

