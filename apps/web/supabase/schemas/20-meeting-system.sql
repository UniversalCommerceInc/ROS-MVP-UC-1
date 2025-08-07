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
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    calendar_event_id character varying NOT NULL,
    title text,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    timezone character varying DEFAULT 'UTC'::character varying,
    location text,
    organizer_email character varying,
    organizer_name character varying,
    attendees jsonb DEFAULT '[]'::jsonb,
    meeting_link text,
    calendar_id character varying,
    status character varying DEFAULT 'confirmed'::character varying,
    visibility character varying DEFAULT 'default'::character varying,
    source character varying DEFAULT 'google_calendar'::character varying,
    raw_event_data jsonb,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    deal_id uuid,
    meeting_id character varying,
    title text,
    host_email character varying,
    source character varying,
    language character varying,
    timestamp_start_utc timestamp with time zone,
    timestamp_end_utc timestamp with time zone,
    timezone character varying,
    participant_emails text[] DEFAULT '{}'::text[],
    duration integer,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    recording_url text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scheduled_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    deal_id uuid,
    calendar_event_id character varying NOT NULL,
    meetgeek_meeting_id character varying,
    meeting_title character varying NOT NULL,
    meeting_description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    attendees jsonb DEFAULT '[]'::jsonb,
    meeting_link text,
    status character varying DEFAULT 'scheduled'::character varying,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scheduled_meetings_meeting_title_check CHECK (((meeting_title)::text <> ''::text)),
    CONSTRAINT scheduled_meetings_status_check CHECK (((status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('linked'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    meeting_id uuid,
    sentence_id integer,
    transcript text,
    "timestamp" timestamp with time zone,
    speaker character varying,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_events calendar_events_account_calendar_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_account_calendar_unique UNIQUE (account_id, calendar_event_id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_meeting_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_meeting_id_key UNIQUE (meeting_id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: scheduled_meetings scheduled_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_meetings
    ADD CONSTRAINT scheduled_meetings_pkey PRIMARY KEY (id);


--
-- Name: transcripts transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: calendar_events calendar_events_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: meetings meetings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: meetings meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: meetings meetings_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: meetings meetings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: scheduled_meetings scheduled_meetings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_meetings
    ADD CONSTRAINT scheduled_meetings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: scheduled_meetings scheduled_meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_meetings
    ADD CONSTRAINT scheduled_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: scheduled_meetings scheduled_meetings_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_meetings
    ADD CONSTRAINT scheduled_meetings_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: scheduled_meetings scheduled_meetings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_meetings
    ADD CONSTRAINT scheduled_meetings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: transcripts transcripts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transcripts transcripts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: transcripts transcripts_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id);


--
-- Name: transcripts transcripts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- PostgreSQL database dump complete
--

