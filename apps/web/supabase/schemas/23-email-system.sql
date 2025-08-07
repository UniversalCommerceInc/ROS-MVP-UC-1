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
-- Name: email_sync_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_sync_status (
    account_id uuid NOT NULL,
    email character varying NOT NULL,
    status character varying NOT NULL,
    emails_synced integer DEFAULT 0 NOT NULL,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_sync_status_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    account_id uuid NOT NULL,
    gmail_id character varying NOT NULL,
    thread_id character varying NOT NULL,
    from_email character varying NOT NULL,
    from_name character varying,
    to_email text[],
    cc_email text[],
    bcc_email text[],
    subject text,
    body_text text,
    body_html text,
    received_at timestamp with time zone NOT NULL,
    labels text[],
    is_read boolean DEFAULT false NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    has_attachments boolean DEFAULT false NOT NULL,
    attachment_data text,
    created_by uuid,
    updated_by uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_sync_status email_sync_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sync_status
    ADD CONSTRAINT email_sync_status_pkey PRIMARY KEY (id);


--
-- Name: emails emails_account_id_gmail_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_account_id_gmail_id_key UNIQUE (account_id, gmail_id);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: idx_email_sync_status_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_sync_status_account_id ON public.email_sync_status USING btree (account_id);


--
-- Name: idx_email_sync_status_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_sync_status_email ON public.email_sync_status USING btree (email);


--
-- Name: idx_email_sync_status_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_sync_status_started_at ON public.email_sync_status USING btree (started_at);


--
-- Name: idx_email_sync_status_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_sync_status_status ON public.email_sync_status USING btree (status);


--
-- Name: idx_emails_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_account_id ON public.emails USING btree (account_id);


--
-- Name: idx_emails_body_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_body_text ON public.emails USING gin (to_tsvector('english'::regconfig, body_text));


--
-- Name: idx_emails_from_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_from_email ON public.emails USING btree (from_email);


--
-- Name: idx_emails_gmail_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_gmail_id ON public.emails USING btree (gmail_id);


--
-- Name: idx_emails_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_received_at ON public.emails USING btree (received_at);


--
-- Name: idx_emails_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_subject ON public.emails USING gin (to_tsvector('english'::regconfig, subject));


--
-- Name: idx_emails_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_thread_id ON public.emails USING btree (thread_id);


--
-- Name: email_sync_status email_sync_status_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sync_status
    ADD CONSTRAINT email_sync_status_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: email_sync_status email_sync_status_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sync_status
    ADD CONSTRAINT email_sync_status_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: email_sync_status email_sync_status_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sync_status
    ADD CONSTRAINT email_sync_status_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: emails emails_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: emails emails_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: emails emails_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- PostgreSQL database dump complete
--

