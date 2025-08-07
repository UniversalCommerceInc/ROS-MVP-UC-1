/*
 * -------------------------------------------------------
 * Section: Utilities
 * Utility tables for webhooks and logging
 * -------------------------------------------------------
 */

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    event_type character varying NOT NULL,
    payload jsonb,
    status character varying NOT NULL,
    error_message text,
    deal_id uuid,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_logs_event_type_check CHECK (((event_type)::text <> ''::text)),
    CONSTRAINT webhook_logs_status_check CHECK (((status)::text <> ''::text)),
    CONSTRAINT webhook_logs_pkey PRIMARY KEY (id)
);

--
-- Name: webhook_logs Foreign Key Constraints
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);