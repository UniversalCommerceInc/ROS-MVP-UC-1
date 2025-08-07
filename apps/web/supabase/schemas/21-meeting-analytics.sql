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
-- Name: analysis_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analysis_jobs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    meeting_id uuid NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    progress_percentage integer DEFAULT 0,
    error_message text,
    model_used text,
    processing_time_seconds integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: highlights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.highlights (
    id integer NOT NULL,
    meeting_id uuid,
    highlight text,
    account_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: highlights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.highlights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: highlights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.highlights_id_seq OWNED BY public.highlights.id;


--
-- Name: summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid,
    summary text,
    ai_insights text,
    account_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: highlights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.highlights ALTER COLUMN id SET DEFAULT nextval('public.highlights_id_seq'::regclass);


--
-- Name: analysis_jobs analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_jobs
    ADD CONSTRAINT analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: highlights highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.highlights
    ADD CONSTRAINT highlights_pkey PRIMARY KEY (id);


--
-- Name: summaries summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_pkey PRIMARY KEY (id);


--
-- Name: idx_analysis_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_jobs_created_at ON public.analysis_jobs USING btree (created_at);


--
-- Name: idx_analysis_jobs_job_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_jobs_job_type ON public.analysis_jobs USING btree (job_type);


--
-- Name: idx_analysis_jobs_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_jobs_meeting_id ON public.analysis_jobs USING btree (meeting_id);


--
-- Name: idx_analysis_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs USING btree (status);


--
-- Name: idx_highlights_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_highlights_account_id ON public.highlights USING btree (account_id);


--
-- Name: idx_highlights_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_highlights_meeting_id ON public.highlights USING btree (meeting_id);


--
-- Name: idx_summaries_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_account_id ON public.summaries USING btree (account_id);


--
-- Name: idx_summaries_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_meeting_id ON public.summaries USING btree (meeting_id);


--
-- Name: analysis_jobs update_analysis_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON public.analysis_jobs FOR EACH ROW EXECUTE FUNCTION public.update_analysis_jobs_updated_at();


--
-- Name: analysis_jobs analysis_jobs_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_jobs
    ADD CONSTRAINT analysis_jobs_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: highlights highlights_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.highlights
    ADD CONSTRAINT highlights_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: highlights highlights_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.highlights
    ADD CONSTRAINT highlights_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

