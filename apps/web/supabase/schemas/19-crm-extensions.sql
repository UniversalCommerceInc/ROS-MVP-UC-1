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
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    completed boolean DEFAULT false NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deal_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    activity_type character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    completed boolean DEFAULT false NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT deal_activities_activity_type_check CHECK (((activity_type)::text <> ''::text)),
    CONSTRAINT deal_activities_title_check CHECK (((title)::text <> ''::text))
);


--
-- Name: deal_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    role character varying,
    contact_role_type public.contact_role_type,
    is_primary boolean DEFAULT false NOT NULL,
    is_decision_maker boolean DEFAULT false NOT NULL,
    last_contacted timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_id uuid,
    CONSTRAINT deal_contacts_email_check CHECK (((email)::text ~* '^.+@.+\..+$'::text)),
    CONSTRAINT deal_contacts_name_check CHECK (((name)::text <> ''::text))
);


--
-- Name: deal_momentum_markers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_momentum_markers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    marker_type public.marker_type NOT NULL,
    description text NOT NULL,
    impact public.impact NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_momentum_markers_description_check CHECK ((description <> ''::text))
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: deal_activities deal_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_activities
    ADD CONSTRAINT deal_activities_pkey PRIMARY KEY (id);


--
-- Name: deal_contacts deal_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_contacts
    ADD CONSTRAINT deal_contacts_pkey PRIMARY KEY (id);


--
-- Name: deal_momentum_markers deal_momentum_markers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_momentum_markers
    ADD CONSTRAINT deal_momentum_markers_pkey PRIMARY KEY (id);


--
-- Name: activities_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_created_at_idx ON public.activities USING btree (created_at DESC);


--
-- Name: activities_deal_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_deal_id_idx ON public.activities USING btree (deal_id);


--
-- Name: activities_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_type_idx ON public.activities USING btree (type);


--
-- Name: deal_contacts_contact_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_contacts_contact_id_idx ON public.deal_contacts USING btree (contact_id);


--
-- Name: idx_deal_activities_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deal_activities_metadata ON public.deal_activities USING gin (metadata);


--
-- Name: activities activities_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: deal_activities deal_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_activities
    ADD CONSTRAINT deal_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: deal_activities deal_activities_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_activities
    ADD CONSTRAINT deal_activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: deal_contacts deal_contacts_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_contacts
    ADD CONSTRAINT deal_contacts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: deal_momentum_markers deal_momentum_markers_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_momentum_markers
    ADD CONSTRAINT deal_momentum_markers_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- PostgreSQL database dump complete
--

