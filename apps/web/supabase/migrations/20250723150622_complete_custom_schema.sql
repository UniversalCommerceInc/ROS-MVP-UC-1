create type "public"."contact_role_type" as enum ('technical', 'financial', 'executive', 'other');

create type "public"."deal_stage" as enum ('interested', 'contacted', 'demo', 'proposal', 'negotiation', 'won', 'lost');

create type "public"."email_provider" as enum ('gmail');

create type "public"."impact" as enum ('low', 'medium', 'high');

create type "public"."marker_type" as enum ('positive', 'neutral', 'negative');

create type "public"."momentum_trend" as enum ('up', 'down', 'steady');

create sequence "public"."highlights_id_seq";

create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "description" text,
    "due_date" timestamp with time zone,
    "completed" boolean not null default false,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."analysis_jobs" (
    "id" uuid not null default uuid_generate_v4(),
    "meeting_id" uuid not null,
    "job_type" text not null,
    "status" text default 'pending'::text,
    "progress_percentage" integer default 0,
    "error_message" text,
    "model_used" text,
    "processing_time_seconds" integer,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "calendar_event_id" character varying not null,
    "title" text,
    "description" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "timezone" character varying default 'UTC'::character varying,
    "location" text,
    "organizer_email" character varying,
    "organizer_name" character varying,
    "attendees" jsonb default '[]'::jsonb,
    "meeting_link" text,
    "calendar_id" character varying,
    "status" character varying default 'confirmed'::character varying,
    "visibility" character varying default 'default'::character varying,
    "source" character varying default 'google_calendar'::character varying,
    "raw_event_data" jsonb,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."contacts" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "name" text not null,
    "email" text not null,
    "role" text,
    "phone" text,
    "is_decision_maker" boolean not null default false,
    "last_contacted" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."deal_activities" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "activity_type" character varying not null,
    "title" character varying not null,
    "description" text,
    "completed" boolean not null default false,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "metadata" jsonb default '{}'::jsonb
);


create table "public"."deal_contacts" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "name" character varying not null,
    "email" character varying not null,
    "phone" character varying,
    "role" character varying,
    "contact_role_type" contact_role_type,
    "is_primary" boolean not null default false,
    "is_decision_maker" boolean not null default false,
    "last_contacted" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "contact_id" uuid
);


create table "public"."deal_momentum_markers" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "marker_type" marker_type not null,
    "description" text not null,
    "impact" impact not null,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."deals" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "company_name" character varying not null,
    "industry" character varying not null,
    "value_amount" numeric not null default 0,
    "value_currency" character varying not null default 'USD'::character varying,
    "stage" deal_stage not null default 'interested'::deal_stage,
    "probability" integer default 0,
    "company_size" character varying,
    "website" character varying,
    "deal_title" character varying,
    "next_action" text,
    "relationship_insights" text,
    "last_meeting_summary" text,
    "momentum" integer not null default 0,
    "momentum_trend" momentum_trend not null default 'steady'::momentum_trend,
    "last_momentum_change" timestamp with time zone,
    "close_date" date,
    "pain_points" text[],
    "next_steps" text[],
    "blockers" text[],
    "opportunities" text[],
    "tags" text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid,
    "source" character varying,
    "green_flags" text[],
    "red_flags" text[],
    "organizational_context" text[],
    "competitor_mentions" text[],
    "sentiment_engagement" text[],
    "last_analysis_date" timestamp with time zone,
    "ai_analysis_raw" text,
    "deal_id" text,
    "primary_contact" text not null default ''::text,
    "primary_email" text not null default ''::text,
    "last_meeting_date" timestamp with time zone,
    "last_meeting_type" text,
    "last_meeting_notes" text,
    "ai_insights" jsonb,
    "meeting_highlights" jsonb default '[]'::jsonb,
    "meeting_action_items" jsonb default '[]'::jsonb,
    "total_meetings" integer default 0,
    "last_updated" timestamp with time zone default now()
);


create table "public"."email_sync_status" (
    "account_id" uuid not null,
    "email" character varying not null,
    "status" character varying not null,
    "emails_synced" integer not null default 0,
    "error_message" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" uuid,
    "updated_by" uuid,
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."emails" (
    "account_id" uuid not null,
    "gmail_id" character varying not null,
    "thread_id" character varying not null,
    "from_email" character varying not null,
    "from_name" character varying,
    "to_email" text[],
    "cc_email" text[],
    "bcc_email" text[],
    "subject" text,
    "body_text" text,
    "body_html" text,
    "received_at" timestamp with time zone not null,
    "labels" text[],
    "is_read" boolean not null default false,
    "is_starred" boolean not null default false,
    "has_attachments" boolean not null default false,
    "attachment_data" text,
    "created_by" uuid,
    "updated_by" uuid,
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."gmail_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying(320) not null,
    "scope" text not null default 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_sync" timestamp with time zone,
    "is_active" boolean default true,
    "sync_status" text default 'pending'::text
);


alter table "public"."gmail_tokens" enable row level security;

create table "public"."highlights" (
    "id" integer not null default nextval('highlights_id_seq'::regclass),
    "meeting_id" uuid,
    "highlight" text,
    "account_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."hubspot_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying(255),
    "api_domain" character varying(255) not null,
    "user_info" jsonb default '{}'::jsonb,
    "scope" text default 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."meetings" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "deal_id" uuid,
    "meeting_id" character varying,
    "title" text,
    "host_email" character varying,
    "source" character varying,
    "language" character varying,
    "timestamp_start_utc" timestamp with time zone,
    "timestamp_end_utc" timestamp with time zone,
    "timezone" character varying,
    "participant_emails" text[] default '{}'::text[],
    "duration" integer,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "recording_url" text,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."pipedrive_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying(255),
    "api_domain" character varying(255) not null,
    "user_info" jsonb default '{}'::jsonb,
    "scope" text default 'base'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."salesforce_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying(255),
    "api_domain" character varying(255) not null,
    "user_info" jsonb default '{}'::jsonb,
    "scope" text default 'api refresh_token id'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."scheduled_meetings" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "deal_id" uuid,
    "calendar_event_id" character varying not null,
    "meetgeek_meeting_id" character varying,
    "meeting_title" character varying not null,
    "meeting_description" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "attendees" jsonb default '[]'::jsonb,
    "meeting_link" text,
    "status" character varying default 'scheduled'::character varying,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."summaries" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" uuid,
    "summary" text,
    "ai_insights" text,
    "account_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."transcripts" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "meeting_id" uuid,
    "sentence_id" integer,
    "transcript" text,
    "timestamp" timestamp with time zone,
    "speaker" character varying,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."webhook_logs" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "event_type" character varying not null,
    "payload" jsonb,
    "status" character varying not null,
    "error_message" text,
    "deal_id" uuid,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."zoho_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying(255),
    "api_domain" character varying(255) not null,
    "user_info" jsonb default '{}'::jsonb,
    "scope" text default 'ZohoCRM.modules.ALL'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter sequence "public"."highlights_id_seq" owned by "public"."highlights"."id";

CREATE INDEX activities_created_at_idx ON public.activities USING btree (created_at DESC);

CREATE INDEX activities_deal_id_idx ON public.activities USING btree (deal_id);

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE INDEX activities_type_idx ON public.activities USING btree (type);

CREATE UNIQUE INDEX analysis_jobs_pkey ON public.analysis_jobs USING btree (id);

CREATE UNIQUE INDEX calendar_events_account_calendar_unique ON public.calendar_events USING btree (account_id, calendar_event_id);

CREATE UNIQUE INDEX calendar_events_pkey ON public.calendar_events USING btree (id);

CREATE UNIQUE INDEX contacts_account_id_email_key ON public.contacts USING btree (account_id, email);

CREATE INDEX contacts_account_id_idx ON public.contacts USING btree (account_id);

CREATE INDEX contacts_email_idx ON public.contacts USING btree (email);

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

CREATE UNIQUE INDEX deal_activities_pkey ON public.deal_activities USING btree (id);

CREATE INDEX deal_contacts_contact_id_idx ON public.deal_contacts USING btree (contact_id);

CREATE UNIQUE INDEX deal_contacts_pkey ON public.deal_contacts USING btree (id);

CREATE UNIQUE INDEX deal_momentum_markers_pkey ON public.deal_momentum_markers USING btree (id);

CREATE INDEX deals_deal_id_idx ON public.deals USING btree (deal_id);

CREATE UNIQUE INDEX deals_deal_id_key ON public.deals USING btree (deal_id);

CREATE INDEX deals_last_meeting_date_idx ON public.deals USING btree (last_meeting_date);

CREATE UNIQUE INDEX deals_pkey ON public.deals USING btree (id);

CREATE INDEX deals_primary_email_idx ON public.deals USING btree (primary_email);

CREATE UNIQUE INDEX email_sync_status_pkey ON public.email_sync_status USING btree (id);

CREATE UNIQUE INDEX emails_account_id_gmail_id_key ON public.emails USING btree (account_id, gmail_id);

CREATE UNIQUE INDEX emails_pkey ON public.emails USING btree (id);

CREATE UNIQUE INDEX gmail_tokens_account_id_email_address_key ON public.gmail_tokens USING btree (account_id, email_address);

CREATE UNIQUE INDEX gmail_tokens_pkey ON public.gmail_tokens USING btree (id);

CREATE UNIQUE INDEX highlights_pkey ON public.highlights USING btree (id);

CREATE UNIQUE INDEX hubspot_tokens_account_id_key ON public.hubspot_tokens USING btree (account_id);

CREATE UNIQUE INDEX hubspot_tokens_pkey ON public.hubspot_tokens USING btree (id);

CREATE INDEX idx_analysis_jobs_created_at ON public.analysis_jobs USING btree (created_at);

CREATE INDEX idx_analysis_jobs_job_type ON public.analysis_jobs USING btree (job_type);

CREATE INDEX idx_analysis_jobs_meeting_id ON public.analysis_jobs USING btree (meeting_id);

CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs USING btree (status);

CREATE INDEX idx_deal_activities_metadata ON public.deal_activities USING gin (metadata);

CREATE INDEX idx_deals_ai_insights ON public.deals USING gin (ai_insights);

CREATE INDEX idx_deals_competitor_mentions ON public.deals USING gin (competitor_mentions);

CREATE INDEX idx_deals_green_flags ON public.deals USING gin (green_flags);

CREATE INDEX idx_deals_last_analysis_date ON public.deals USING btree (last_analysis_date);

CREATE INDEX idx_deals_meeting_action_items ON public.deals USING gin (meeting_action_items);

CREATE INDEX idx_deals_meeting_highlights ON public.deals USING gin (meeting_highlights);

CREATE INDEX idx_deals_organizational_context ON public.deals USING gin (organizational_context);

CREATE INDEX idx_deals_red_flags ON public.deals USING gin (red_flags);

CREATE INDEX idx_deals_sentiment_engagement ON public.deals USING gin (sentiment_engagement);

CREATE INDEX idx_email_sync_status_account_id ON public.email_sync_status USING btree (account_id);

CREATE INDEX idx_email_sync_status_email ON public.email_sync_status USING btree (email);

CREATE INDEX idx_email_sync_status_started_at ON public.email_sync_status USING btree (started_at);

CREATE INDEX idx_email_sync_status_status ON public.email_sync_status USING btree (status);

CREATE INDEX idx_emails_account_id ON public.emails USING btree (account_id);

CREATE INDEX idx_emails_body_text ON public.emails USING gin (to_tsvector('english'::regconfig, body_text));

CREATE INDEX idx_emails_from_email ON public.emails USING btree (from_email);

CREATE INDEX idx_emails_gmail_id ON public.emails USING btree (gmail_id);

CREATE INDEX idx_emails_received_at ON public.emails USING btree (received_at);

CREATE INDEX idx_emails_subject ON public.emails USING gin (to_tsvector('english'::regconfig, subject));

CREATE INDEX idx_emails_thread_id ON public.emails USING btree (thread_id);

CREATE INDEX idx_gmail_tokens_account_id ON public.gmail_tokens USING btree (account_id);

CREATE INDEX idx_gmail_tokens_expires_at ON public.gmail_tokens USING btree (expires_at);

CREATE INDEX idx_gmail_tokens_is_active ON public.gmail_tokens USING btree (is_active);

CREATE INDEX idx_gmail_tokens_sync_status ON public.gmail_tokens USING btree (sync_status);

CREATE INDEX idx_gmail_tokens_user_id ON public.gmail_tokens USING btree (user_id);

CREATE INDEX idx_highlights_account_id ON public.highlights USING btree (account_id);

CREATE INDEX idx_highlights_meeting_id ON public.highlights USING btree (meeting_id);

CREATE INDEX idx_hubspot_tokens_account_id ON public.hubspot_tokens USING btree (account_id);

CREATE INDEX idx_hubspot_tokens_expires_at ON public.hubspot_tokens USING btree (expires_at);

CREATE INDEX idx_hubspot_tokens_user_id ON public.hubspot_tokens USING btree (user_id);

CREATE INDEX idx_pipedrive_tokens_account_id ON public.pipedrive_tokens USING btree (account_id);

CREATE INDEX idx_pipedrive_tokens_expires_at ON public.pipedrive_tokens USING btree (expires_at);

CREATE INDEX idx_pipedrive_tokens_user_id ON public.pipedrive_tokens USING btree (user_id);

CREATE INDEX idx_salesforce_tokens_account_id ON public.salesforce_tokens USING btree (account_id);

CREATE INDEX idx_salesforce_tokens_expires_at ON public.salesforce_tokens USING btree (expires_at);

CREATE INDEX idx_salesforce_tokens_user_id ON public.salesforce_tokens USING btree (user_id);

CREATE INDEX idx_summaries_account_id ON public.summaries USING btree (account_id);

CREATE INDEX idx_summaries_meeting_id ON public.summaries USING btree (meeting_id);

CREATE INDEX idx_zoho_tokens_account_id ON public.zoho_tokens USING btree (account_id);

CREATE INDEX idx_zoho_tokens_expires_at ON public.zoho_tokens USING btree (expires_at);

CREATE INDEX idx_zoho_tokens_user_id ON public.zoho_tokens USING btree (user_id);

CREATE UNIQUE INDEX meetings_meeting_id_key ON public.meetings USING btree (meeting_id);

CREATE UNIQUE INDEX meetings_pkey ON public.meetings USING btree (id);

CREATE UNIQUE INDEX pipedrive_tokens_account_id_key ON public.pipedrive_tokens USING btree (account_id);

CREATE UNIQUE INDEX pipedrive_tokens_pkey ON public.pipedrive_tokens USING btree (id);

CREATE UNIQUE INDEX salesforce_tokens_account_id_key ON public.salesforce_tokens USING btree (account_id);

CREATE UNIQUE INDEX salesforce_tokens_pkey ON public.salesforce_tokens USING btree (id);

CREATE UNIQUE INDEX scheduled_meetings_pkey ON public.scheduled_meetings USING btree (id);

CREATE UNIQUE INDEX summaries_pkey ON public.summaries USING btree (id);

CREATE UNIQUE INDEX transcripts_pkey ON public.transcripts USING btree (id);

CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id);

CREATE UNIQUE INDEX zoho_tokens_account_id_key ON public.zoho_tokens USING btree (account_id);

CREATE UNIQUE INDEX zoho_tokens_pkey ON public.zoho_tokens USING btree (id);

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."analysis_jobs" add constraint "analysis_jobs_pkey" PRIMARY KEY using index "analysis_jobs_pkey";

alter table "public"."calendar_events" add constraint "calendar_events_pkey" PRIMARY KEY using index "calendar_events_pkey";

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."deal_activities" add constraint "deal_activities_pkey" PRIMARY KEY using index "deal_activities_pkey";

alter table "public"."deal_contacts" add constraint "deal_contacts_pkey" PRIMARY KEY using index "deal_contacts_pkey";

alter table "public"."deal_momentum_markers" add constraint "deal_momentum_markers_pkey" PRIMARY KEY using index "deal_momentum_markers_pkey";

alter table "public"."deals" add constraint "deals_pkey" PRIMARY KEY using index "deals_pkey";

alter table "public"."email_sync_status" add constraint "email_sync_status_pkey" PRIMARY KEY using index "email_sync_status_pkey";

alter table "public"."emails" add constraint "emails_pkey" PRIMARY KEY using index "emails_pkey";

alter table "public"."gmail_tokens" add constraint "gmail_tokens_pkey" PRIMARY KEY using index "gmail_tokens_pkey";

alter table "public"."highlights" add constraint "highlights_pkey" PRIMARY KEY using index "highlights_pkey";

alter table "public"."hubspot_tokens" add constraint "hubspot_tokens_pkey" PRIMARY KEY using index "hubspot_tokens_pkey";

alter table "public"."meetings" add constraint "meetings_pkey" PRIMARY KEY using index "meetings_pkey";

alter table "public"."pipedrive_tokens" add constraint "pipedrive_tokens_pkey" PRIMARY KEY using index "pipedrive_tokens_pkey";

alter table "public"."salesforce_tokens" add constraint "salesforce_tokens_pkey" PRIMARY KEY using index "salesforce_tokens_pkey";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_pkey" PRIMARY KEY using index "scheduled_meetings_pkey";

alter table "public"."summaries" add constraint "summaries_pkey" PRIMARY KEY using index "summaries_pkey";

alter table "public"."transcripts" add constraint "transcripts_pkey" PRIMARY KEY using index "transcripts_pkey";

alter table "public"."webhook_logs" add constraint "webhook_logs_pkey" PRIMARY KEY using index "webhook_logs_pkey";

alter table "public"."zoho_tokens" add constraint "zoho_tokens_pkey" PRIMARY KEY using index "zoho_tokens_pkey";

alter table "public"."activities" add constraint "activities_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."activities" validate constraint "activities_deal_id_fkey";

alter table "public"."analysis_jobs" add constraint "analysis_jobs_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE not valid;

alter table "public"."analysis_jobs" validate constraint "analysis_jobs_meeting_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_account_calendar_unique" UNIQUE using index "calendar_events_account_calendar_unique";

alter table "public"."calendar_events" add constraint "calendar_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_account_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_created_by_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_updated_by_fkey";

alter table "public"."contacts" add constraint "contacts_account_id_email_key" UNIQUE using index "contacts_account_id_email_key";

alter table "public"."contacts" add constraint "contacts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."contacts" validate constraint "contacts_account_id_fkey";

alter table "public"."contacts" add constraint "contacts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."contacts" validate constraint "contacts_created_by_fkey";

alter table "public"."contacts" add constraint "contacts_email_check" CHECK ((email ~* '^.+@.+\..+$'::text)) not valid;

alter table "public"."contacts" validate constraint "contacts_email_check";

alter table "public"."contacts" add constraint "contacts_name_check" CHECK ((name <> ''::text)) not valid;

alter table "public"."contacts" validate constraint "contacts_name_check";

alter table "public"."contacts" add constraint "contacts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."contacts" validate constraint "contacts_updated_by_fkey";

alter table "public"."deal_activities" add constraint "deal_activities_activity_type_check" CHECK (((activity_type)::text <> ''::text)) not valid;

alter table "public"."deal_activities" validate constraint "deal_activities_activity_type_check";

alter table "public"."deal_activities" add constraint "deal_activities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."deal_activities" validate constraint "deal_activities_created_by_fkey";

alter table "public"."deal_activities" add constraint "deal_activities_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."deal_activities" validate constraint "deal_activities_deal_id_fkey";

alter table "public"."deal_activities" add constraint "deal_activities_title_check" CHECK (((title)::text <> ''::text)) not valid;

alter table "public"."deal_activities" validate constraint "deal_activities_title_check";

alter table "public"."deal_contacts" add constraint "deal_contacts_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."deal_contacts" validate constraint "deal_contacts_deal_id_fkey";

alter table "public"."deal_contacts" add constraint "deal_contacts_email_check" CHECK (((email)::text ~* '^.+@.+\..+$'::text)) not valid;

alter table "public"."deal_contacts" validate constraint "deal_contacts_email_check";

alter table "public"."deal_contacts" add constraint "deal_contacts_name_check" CHECK (((name)::text <> ''::text)) not valid;

alter table "public"."deal_contacts" validate constraint "deal_contacts_name_check";

alter table "public"."deal_momentum_markers" add constraint "deal_momentum_markers_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."deal_momentum_markers" validate constraint "deal_momentum_markers_deal_id_fkey";

alter table "public"."deal_momentum_markers" add constraint "deal_momentum_markers_description_check" CHECK ((description <> ''::text)) not valid;

alter table "public"."deal_momentum_markers" validate constraint "deal_momentum_markers_description_check";

alter table "public"."deals" add constraint "deals_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."deals" validate constraint "deals_account_id_fkey";

alter table "public"."deals" add constraint "deals_company_name_check" CHECK (((company_name)::text <> ''::text)) not valid;

alter table "public"."deals" validate constraint "deals_company_name_check";

alter table "public"."deals" add constraint "deals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."deals" validate constraint "deals_created_by_fkey";

alter table "public"."deals" add constraint "deals_deal_id_key" UNIQUE using index "deals_deal_id_key";

alter table "public"."deals" add constraint "deals_industry_check" CHECK (((industry)::text <> ''::text)) not valid;

alter table "public"."deals" validate constraint "deals_industry_check";

alter table "public"."deals" add constraint "deals_momentum_check" CHECK (((momentum >= '-100'::integer) AND (momentum <= 100))) not valid;

alter table "public"."deals" validate constraint "deals_momentum_check";

alter table "public"."deals" add constraint "deals_probability_check" CHECK (((probability >= 0) AND (probability <= 100))) not valid;

alter table "public"."deals" validate constraint "deals_probability_check";

alter table "public"."deals" add constraint "deals_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."deals" validate constraint "deals_updated_by_fkey";

alter table "public"."deals" add constraint "deals_value_amount_check" CHECK ((value_amount >= (0)::numeric)) not valid;

alter table "public"."deals" validate constraint "deals_value_amount_check";

alter table "public"."deals" add constraint "deals_value_currency_check" CHECK (((value_currency)::text <> ''::text)) not valid;

alter table "public"."deals" validate constraint "deals_value_currency_check";

alter table "public"."email_sync_status" add constraint "email_sync_status_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."email_sync_status" validate constraint "email_sync_status_account_id_fkey";

alter table "public"."email_sync_status" add constraint "email_sync_status_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."email_sync_status" validate constraint "email_sync_status_created_by_fkey";

alter table "public"."email_sync_status" add constraint "email_sync_status_status_check" CHECK (((status)::text = ANY (ARRAY[('in_progress'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))) not valid;

alter table "public"."email_sync_status" validate constraint "email_sync_status_status_check";

alter table "public"."email_sync_status" add constraint "email_sync_status_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."email_sync_status" validate constraint "email_sync_status_updated_by_fkey";

alter table "public"."emails" add constraint "emails_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."emails" validate constraint "emails_account_id_fkey";

alter table "public"."emails" add constraint "emails_account_id_gmail_id_key" UNIQUE using index "emails_account_id_gmail_id_key";

alter table "public"."emails" add constraint "emails_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."emails" validate constraint "emails_created_by_fkey";

alter table "public"."emails" add constraint "emails_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."emails" validate constraint "emails_updated_by_fkey";

alter table "public"."gmail_tokens" add constraint "gmail_tokens_account_id_email_address_key" UNIQUE using index "gmail_tokens_account_id_email_address_key";

alter table "public"."gmail_tokens" add constraint "gmail_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."gmail_tokens" validate constraint "gmail_tokens_account_id_fkey";

alter table "public"."gmail_tokens" add constraint "gmail_tokens_sync_status_check" CHECK ((sync_status = ANY (ARRAY['idle'::text, 'pending'::text, 'syncing'::text, 'error'::text, 'failed'::text, 'completed'::text]))) not valid;

alter table "public"."gmail_tokens" validate constraint "gmail_tokens_sync_status_check";

alter table "public"."gmail_tokens" add constraint "gmail_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."gmail_tokens" validate constraint "gmail_tokens_user_id_fkey";

alter table "public"."highlights" add constraint "highlights_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."highlights" validate constraint "highlights_account_id_fkey";

alter table "public"."highlights" add constraint "highlights_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE not valid;

alter table "public"."highlights" validate constraint "highlights_meeting_id_fkey";

alter table "public"."hubspot_tokens" add constraint "hubspot_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."hubspot_tokens" validate constraint "hubspot_tokens_account_id_fkey";

alter table "public"."hubspot_tokens" add constraint "hubspot_tokens_account_id_key" UNIQUE using index "hubspot_tokens_account_id_key";

alter table "public"."hubspot_tokens" add constraint "hubspot_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."hubspot_tokens" validate constraint "hubspot_tokens_user_id_fkey";

alter table "public"."meetings" add constraint "meetings_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."meetings" validate constraint "meetings_account_id_fkey";

alter table "public"."meetings" add constraint "meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."meetings" validate constraint "meetings_created_by_fkey";

alter table "public"."meetings" add constraint "meetings_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."meetings" validate constraint "meetings_deal_id_fkey";

alter table "public"."meetings" add constraint "meetings_meeting_id_key" UNIQUE using index "meetings_meeting_id_key";

alter table "public"."meetings" add constraint "meetings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."meetings" validate constraint "meetings_updated_by_fkey";

alter table "public"."pipedrive_tokens" add constraint "pipedrive_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."pipedrive_tokens" validate constraint "pipedrive_tokens_account_id_fkey";

alter table "public"."pipedrive_tokens" add constraint "pipedrive_tokens_account_id_key" UNIQUE using index "pipedrive_tokens_account_id_key";

alter table "public"."pipedrive_tokens" add constraint "pipedrive_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."pipedrive_tokens" validate constraint "pipedrive_tokens_user_id_fkey";

alter table "public"."salesforce_tokens" add constraint "salesforce_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."salesforce_tokens" validate constraint "salesforce_tokens_account_id_fkey";

alter table "public"."salesforce_tokens" add constraint "salesforce_tokens_account_id_key" UNIQUE using index "salesforce_tokens_account_id_key";

alter table "public"."salesforce_tokens" add constraint "salesforce_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."salesforce_tokens" validate constraint "salesforce_tokens_user_id_fkey";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_account_id_fkey";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_created_by_fkey";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_deal_id_fkey";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_meeting_title_check" CHECK (((meeting_title)::text <> ''::text)) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_meeting_title_check";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_status_check" CHECK (((status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('linked'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_status_check";

alter table "public"."scheduled_meetings" add constraint "scheduled_meetings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."scheduled_meetings" validate constraint "scheduled_meetings_updated_by_fkey";

alter table "public"."summaries" add constraint "summaries_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."summaries" validate constraint "summaries_account_id_fkey";

alter table "public"."summaries" add constraint "summaries_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE not valid;

alter table "public"."summaries" validate constraint "summaries_meeting_id_fkey";

alter table "public"."transcripts" add constraint "transcripts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."transcripts" validate constraint "transcripts_account_id_fkey";

alter table "public"."transcripts" add constraint "transcripts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."transcripts" validate constraint "transcripts_created_by_fkey";

alter table "public"."transcripts" add constraint "transcripts_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) not valid;

alter table "public"."transcripts" validate constraint "transcripts_meeting_id_fkey";

alter table "public"."transcripts" add constraint "transcripts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."transcripts" validate constraint "transcripts_updated_by_fkey";

alter table "public"."webhook_logs" add constraint "webhook_logs_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_account_id_fkey";

alter table "public"."webhook_logs" add constraint "webhook_logs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_created_by_fkey";

alter table "public"."webhook_logs" add constraint "webhook_logs_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deals(id) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_deal_id_fkey";

alter table "public"."webhook_logs" add constraint "webhook_logs_event_type_check" CHECK (((event_type)::text <> ''::text)) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_event_type_check";

alter table "public"."webhook_logs" add constraint "webhook_logs_status_check" CHECK (((status)::text <> ''::text)) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_status_check";

alter table "public"."webhook_logs" add constraint "webhook_logs_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."webhook_logs" validate constraint "webhook_logs_updated_by_fkey";

alter table "public"."zoho_tokens" add constraint "zoho_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."zoho_tokens" validate constraint "zoho_tokens_account_id_fkey";

alter table "public"."zoho_tokens" add constraint "zoho_tokens_account_id_key" UNIQUE using index "zoho_tokens_account_id_key";

alter table "public"."zoho_tokens" add constraint "zoho_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."zoho_tokens" validate constraint "zoho_tokens_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_gmail_emails(p_account_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_search text DEFAULT ''::text, p_labels text[] DEFAULT ARRAY['INBOX'::text], p_sort_by text DEFAULT 'received_at'::text, p_sort_direction text DEFAULT 'desc'::text)
 RETURNS TABLE(id uuid, gmail_message_id character varying, subject text, from_email character varying, from_name character varying, to_email character varying, to_name character varying, body_text text, is_read boolean, is_starred boolean, received_at timestamp with time zone, labels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  query_text TEXT;
  sort_clause TEXT;
BEGIN
  -- Verify access
  IF NOT public.has_role_on_account(p_account_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Build sort clause
  sort_clause := CASE 
    WHEN p_sort_by = 'received_at' AND p_sort_direction = 'desc' THEN 'ORDER BY received_at DESC'
    WHEN p_sort_by = 'received_at' AND p_sort_direction = 'asc' THEN 'ORDER BY received_at ASC'
    WHEN p_sort_by = 'subject' AND p_sort_direction = 'asc' THEN 'ORDER BY subject ASC'
    WHEN p_sort_by = 'subject' AND p_sort_direction = 'desc' THEN 'ORDER BY subject DESC'
    ELSE 'ORDER BY received_at DESC'
  END;

  -- Build and execute query
  query_text := format('
    SELECT e.id, e.gmail_message_id, e.subject, e.from_email, e.from_name, 
           e.to_email, e.to_name, e.body_text, e.is_read, e.is_starred, 
           e.received_at, e.labels
    FROM public.emails e
    WHERE e.account_id = $1
      AND ($2 = '''' OR (
        e.subject ILIKE ''%%'' || $2 || ''%%'' OR
        e.from_email ILIKE ''%%'' || $2 || ''%%'' OR
        e.from_name ILIKE ''%%'' || $2 || ''%%'' OR
        e.body_text ILIKE ''%%'' || $2 || ''%%''
      ))
      AND ($3 = ARRAY[]::TEXT[] OR e.labels && $3)
    %s
    LIMIT $4 OFFSET $5
  ', sort_clause);

  RETURN QUERY EXECUTE query_text 
    USING p_account_id, p_search, p_labels, p_limit, p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_analysis_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_last_updated_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.last_updated = now();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."activities" to "anon";

grant insert on table "public"."activities" to "anon";

grant references on table "public"."activities" to "anon";

grant select on table "public"."activities" to "anon";

grant trigger on table "public"."activities" to "anon";

grant truncate on table "public"."activities" to "anon";

grant update on table "public"."activities" to "anon";

grant delete on table "public"."activities" to "authenticated";

grant insert on table "public"."activities" to "authenticated";

grant references on table "public"."activities" to "authenticated";

grant select on table "public"."activities" to "authenticated";

grant trigger on table "public"."activities" to "authenticated";

grant truncate on table "public"."activities" to "authenticated";

grant update on table "public"."activities" to "authenticated";

grant delete on table "public"."activities" to "service_role";

grant insert on table "public"."activities" to "service_role";

grant references on table "public"."activities" to "service_role";

grant select on table "public"."activities" to "service_role";

grant trigger on table "public"."activities" to "service_role";

grant truncate on table "public"."activities" to "service_role";

grant update on table "public"."activities" to "service_role";

grant delete on table "public"."analysis_jobs" to "anon";

grant insert on table "public"."analysis_jobs" to "anon";

grant references on table "public"."analysis_jobs" to "anon";

grant select on table "public"."analysis_jobs" to "anon";

grant trigger on table "public"."analysis_jobs" to "anon";

grant truncate on table "public"."analysis_jobs" to "anon";

grant update on table "public"."analysis_jobs" to "anon";

grant delete on table "public"."analysis_jobs" to "authenticated";

grant insert on table "public"."analysis_jobs" to "authenticated";

grant references on table "public"."analysis_jobs" to "authenticated";

grant select on table "public"."analysis_jobs" to "authenticated";

grant trigger on table "public"."analysis_jobs" to "authenticated";

grant truncate on table "public"."analysis_jobs" to "authenticated";

grant update on table "public"."analysis_jobs" to "authenticated";

grant delete on table "public"."analysis_jobs" to "service_role";

grant insert on table "public"."analysis_jobs" to "service_role";

grant references on table "public"."analysis_jobs" to "service_role";

grant select on table "public"."analysis_jobs" to "service_role";

grant trigger on table "public"."analysis_jobs" to "service_role";

grant truncate on table "public"."analysis_jobs" to "service_role";

grant update on table "public"."analysis_jobs" to "service_role";

grant delete on table "public"."calendar_events" to "anon";

grant insert on table "public"."calendar_events" to "anon";

grant references on table "public"."calendar_events" to "anon";

grant select on table "public"."calendar_events" to "anon";

grant trigger on table "public"."calendar_events" to "anon";

grant truncate on table "public"."calendar_events" to "anon";

grant update on table "public"."calendar_events" to "anon";

grant delete on table "public"."calendar_events" to "authenticated";

grant insert on table "public"."calendar_events" to "authenticated";

grant references on table "public"."calendar_events" to "authenticated";

grant select on table "public"."calendar_events" to "authenticated";

grant trigger on table "public"."calendar_events" to "authenticated";

grant truncate on table "public"."calendar_events" to "authenticated";

grant update on table "public"."calendar_events" to "authenticated";

grant delete on table "public"."calendar_events" to "service_role";

grant insert on table "public"."calendar_events" to "service_role";

grant references on table "public"."calendar_events" to "service_role";

grant select on table "public"."calendar_events" to "service_role";

grant trigger on table "public"."calendar_events" to "service_role";

grant truncate on table "public"."calendar_events" to "service_role";

grant update on table "public"."calendar_events" to "service_role";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

grant delete on table "public"."deal_activities" to "anon";

grant insert on table "public"."deal_activities" to "anon";

grant references on table "public"."deal_activities" to "anon";

grant select on table "public"."deal_activities" to "anon";

grant trigger on table "public"."deal_activities" to "anon";

grant truncate on table "public"."deal_activities" to "anon";

grant update on table "public"."deal_activities" to "anon";

grant delete on table "public"."deal_activities" to "authenticated";

grant insert on table "public"."deal_activities" to "authenticated";

grant references on table "public"."deal_activities" to "authenticated";

grant select on table "public"."deal_activities" to "authenticated";

grant trigger on table "public"."deal_activities" to "authenticated";

grant truncate on table "public"."deal_activities" to "authenticated";

grant update on table "public"."deal_activities" to "authenticated";

grant delete on table "public"."deal_activities" to "service_role";

grant insert on table "public"."deal_activities" to "service_role";

grant references on table "public"."deal_activities" to "service_role";

grant select on table "public"."deal_activities" to "service_role";

grant trigger on table "public"."deal_activities" to "service_role";

grant truncate on table "public"."deal_activities" to "service_role";

grant update on table "public"."deal_activities" to "service_role";

grant delete on table "public"."deal_contacts" to "anon";

grant insert on table "public"."deal_contacts" to "anon";

grant references on table "public"."deal_contacts" to "anon";

grant select on table "public"."deal_contacts" to "anon";

grant trigger on table "public"."deal_contacts" to "anon";

grant truncate on table "public"."deal_contacts" to "anon";

grant update on table "public"."deal_contacts" to "anon";

grant delete on table "public"."deal_contacts" to "authenticated";

grant insert on table "public"."deal_contacts" to "authenticated";

grant references on table "public"."deal_contacts" to "authenticated";

grant select on table "public"."deal_contacts" to "authenticated";

grant trigger on table "public"."deal_contacts" to "authenticated";

grant truncate on table "public"."deal_contacts" to "authenticated";

grant update on table "public"."deal_contacts" to "authenticated";

grant delete on table "public"."deal_contacts" to "service_role";

grant insert on table "public"."deal_contacts" to "service_role";

grant references on table "public"."deal_contacts" to "service_role";

grant select on table "public"."deal_contacts" to "service_role";

grant trigger on table "public"."deal_contacts" to "service_role";

grant truncate on table "public"."deal_contacts" to "service_role";

grant update on table "public"."deal_contacts" to "service_role";

grant delete on table "public"."deal_momentum_markers" to "anon";

grant insert on table "public"."deal_momentum_markers" to "anon";

grant references on table "public"."deal_momentum_markers" to "anon";

grant select on table "public"."deal_momentum_markers" to "anon";

grant trigger on table "public"."deal_momentum_markers" to "anon";

grant truncate on table "public"."deal_momentum_markers" to "anon";

grant update on table "public"."deal_momentum_markers" to "anon";

grant delete on table "public"."deal_momentum_markers" to "authenticated";

grant insert on table "public"."deal_momentum_markers" to "authenticated";

grant references on table "public"."deal_momentum_markers" to "authenticated";

grant select on table "public"."deal_momentum_markers" to "authenticated";

grant trigger on table "public"."deal_momentum_markers" to "authenticated";

grant truncate on table "public"."deal_momentum_markers" to "authenticated";

grant update on table "public"."deal_momentum_markers" to "authenticated";

grant delete on table "public"."deal_momentum_markers" to "service_role";

grant insert on table "public"."deal_momentum_markers" to "service_role";

grant references on table "public"."deal_momentum_markers" to "service_role";

grant select on table "public"."deal_momentum_markers" to "service_role";

grant trigger on table "public"."deal_momentum_markers" to "service_role";

grant truncate on table "public"."deal_momentum_markers" to "service_role";

grant update on table "public"."deal_momentum_markers" to "service_role";

grant delete on table "public"."deals" to "anon";

grant insert on table "public"."deals" to "anon";

grant references on table "public"."deals" to "anon";

grant select on table "public"."deals" to "anon";

grant trigger on table "public"."deals" to "anon";

grant truncate on table "public"."deals" to "anon";

grant update on table "public"."deals" to "anon";

grant delete on table "public"."deals" to "authenticated";

grant insert on table "public"."deals" to "authenticated";

grant references on table "public"."deals" to "authenticated";

grant select on table "public"."deals" to "authenticated";

grant trigger on table "public"."deals" to "authenticated";

grant truncate on table "public"."deals" to "authenticated";

grant update on table "public"."deals" to "authenticated";

grant delete on table "public"."deals" to "service_role";

grant insert on table "public"."deals" to "service_role";

grant references on table "public"."deals" to "service_role";

grant select on table "public"."deals" to "service_role";

grant trigger on table "public"."deals" to "service_role";

grant truncate on table "public"."deals" to "service_role";

grant update on table "public"."deals" to "service_role";

grant delete on table "public"."email_sync_status" to "anon";

grant insert on table "public"."email_sync_status" to "anon";

grant references on table "public"."email_sync_status" to "anon";

grant select on table "public"."email_sync_status" to "anon";

grant trigger on table "public"."email_sync_status" to "anon";

grant truncate on table "public"."email_sync_status" to "anon";

grant update on table "public"."email_sync_status" to "anon";

grant delete on table "public"."email_sync_status" to "authenticated";

grant insert on table "public"."email_sync_status" to "authenticated";

grant references on table "public"."email_sync_status" to "authenticated";

grant select on table "public"."email_sync_status" to "authenticated";

grant trigger on table "public"."email_sync_status" to "authenticated";

grant truncate on table "public"."email_sync_status" to "authenticated";

grant update on table "public"."email_sync_status" to "authenticated";

grant delete on table "public"."email_sync_status" to "service_role";

grant insert on table "public"."email_sync_status" to "service_role";

grant references on table "public"."email_sync_status" to "service_role";

grant select on table "public"."email_sync_status" to "service_role";

grant trigger on table "public"."email_sync_status" to "service_role";

grant truncate on table "public"."email_sync_status" to "service_role";

grant update on table "public"."email_sync_status" to "service_role";

grant delete on table "public"."emails" to "anon";

grant insert on table "public"."emails" to "anon";

grant references on table "public"."emails" to "anon";

grant select on table "public"."emails" to "anon";

grant trigger on table "public"."emails" to "anon";

grant truncate on table "public"."emails" to "anon";

grant update on table "public"."emails" to "anon";

grant delete on table "public"."emails" to "authenticated";

grant insert on table "public"."emails" to "authenticated";

grant references on table "public"."emails" to "authenticated";

grant select on table "public"."emails" to "authenticated";

grant trigger on table "public"."emails" to "authenticated";

grant truncate on table "public"."emails" to "authenticated";

grant update on table "public"."emails" to "authenticated";

grant delete on table "public"."emails" to "service_role";

grant insert on table "public"."emails" to "service_role";

grant references on table "public"."emails" to "service_role";

grant select on table "public"."emails" to "service_role";

grant trigger on table "public"."emails" to "service_role";

grant truncate on table "public"."emails" to "service_role";

grant update on table "public"."emails" to "service_role";

grant delete on table "public"."gmail_tokens" to "anon";

grant insert on table "public"."gmail_tokens" to "anon";

grant references on table "public"."gmail_tokens" to "anon";

grant select on table "public"."gmail_tokens" to "anon";

grant trigger on table "public"."gmail_tokens" to "anon";

grant truncate on table "public"."gmail_tokens" to "anon";

grant update on table "public"."gmail_tokens" to "anon";

grant delete on table "public"."gmail_tokens" to "authenticated";

grant insert on table "public"."gmail_tokens" to "authenticated";

grant references on table "public"."gmail_tokens" to "authenticated";

grant select on table "public"."gmail_tokens" to "authenticated";

grant trigger on table "public"."gmail_tokens" to "authenticated";

grant truncate on table "public"."gmail_tokens" to "authenticated";

grant update on table "public"."gmail_tokens" to "authenticated";

grant delete on table "public"."gmail_tokens" to "service_role";

grant insert on table "public"."gmail_tokens" to "service_role";

grant references on table "public"."gmail_tokens" to "service_role";

grant select on table "public"."gmail_tokens" to "service_role";

grant trigger on table "public"."gmail_tokens" to "service_role";

grant truncate on table "public"."gmail_tokens" to "service_role";

grant update on table "public"."gmail_tokens" to "service_role";

grant delete on table "public"."highlights" to "anon";

grant insert on table "public"."highlights" to "anon";

grant references on table "public"."highlights" to "anon";

grant select on table "public"."highlights" to "anon";

grant trigger on table "public"."highlights" to "anon";

grant truncate on table "public"."highlights" to "anon";

grant update on table "public"."highlights" to "anon";

grant delete on table "public"."highlights" to "authenticated";

grant insert on table "public"."highlights" to "authenticated";

grant references on table "public"."highlights" to "authenticated";

grant select on table "public"."highlights" to "authenticated";

grant trigger on table "public"."highlights" to "authenticated";

grant truncate on table "public"."highlights" to "authenticated";

grant update on table "public"."highlights" to "authenticated";

grant delete on table "public"."highlights" to "service_role";

grant insert on table "public"."highlights" to "service_role";

grant references on table "public"."highlights" to "service_role";

grant select on table "public"."highlights" to "service_role";

grant trigger on table "public"."highlights" to "service_role";

grant truncate on table "public"."highlights" to "service_role";

grant update on table "public"."highlights" to "service_role";

grant delete on table "public"."hubspot_tokens" to "anon";

grant insert on table "public"."hubspot_tokens" to "anon";

grant references on table "public"."hubspot_tokens" to "anon";

grant select on table "public"."hubspot_tokens" to "anon";

grant trigger on table "public"."hubspot_tokens" to "anon";

grant truncate on table "public"."hubspot_tokens" to "anon";

grant update on table "public"."hubspot_tokens" to "anon";

grant delete on table "public"."hubspot_tokens" to "authenticated";

grant insert on table "public"."hubspot_tokens" to "authenticated";

grant references on table "public"."hubspot_tokens" to "authenticated";

grant select on table "public"."hubspot_tokens" to "authenticated";

grant trigger on table "public"."hubspot_tokens" to "authenticated";

grant truncate on table "public"."hubspot_tokens" to "authenticated";

grant update on table "public"."hubspot_tokens" to "authenticated";

grant delete on table "public"."hubspot_tokens" to "service_role";

grant insert on table "public"."hubspot_tokens" to "service_role";

grant references on table "public"."hubspot_tokens" to "service_role";

grant select on table "public"."hubspot_tokens" to "service_role";

grant trigger on table "public"."hubspot_tokens" to "service_role";

grant truncate on table "public"."hubspot_tokens" to "service_role";

grant update on table "public"."hubspot_tokens" to "service_role";

grant delete on table "public"."meetings" to "anon";

grant insert on table "public"."meetings" to "anon";

grant references on table "public"."meetings" to "anon";

grant select on table "public"."meetings" to "anon";

grant trigger on table "public"."meetings" to "anon";

grant truncate on table "public"."meetings" to "anon";

grant update on table "public"."meetings" to "anon";

grant delete on table "public"."meetings" to "authenticated";

grant insert on table "public"."meetings" to "authenticated";

grant references on table "public"."meetings" to "authenticated";

grant select on table "public"."meetings" to "authenticated";

grant trigger on table "public"."meetings" to "authenticated";

grant truncate on table "public"."meetings" to "authenticated";

grant update on table "public"."meetings" to "authenticated";

grant delete on table "public"."meetings" to "service_role";

grant insert on table "public"."meetings" to "service_role";

grant references on table "public"."meetings" to "service_role";

grant select on table "public"."meetings" to "service_role";

grant trigger on table "public"."meetings" to "service_role";

grant truncate on table "public"."meetings" to "service_role";

grant update on table "public"."meetings" to "service_role";

grant delete on table "public"."pipedrive_tokens" to "anon";

grant insert on table "public"."pipedrive_tokens" to "anon";

grant references on table "public"."pipedrive_tokens" to "anon";

grant select on table "public"."pipedrive_tokens" to "anon";

grant trigger on table "public"."pipedrive_tokens" to "anon";

grant truncate on table "public"."pipedrive_tokens" to "anon";

grant update on table "public"."pipedrive_tokens" to "anon";

grant delete on table "public"."pipedrive_tokens" to "authenticated";

grant insert on table "public"."pipedrive_tokens" to "authenticated";

grant references on table "public"."pipedrive_tokens" to "authenticated";

grant select on table "public"."pipedrive_tokens" to "authenticated";

grant trigger on table "public"."pipedrive_tokens" to "authenticated";

grant truncate on table "public"."pipedrive_tokens" to "authenticated";

grant update on table "public"."pipedrive_tokens" to "authenticated";

grant delete on table "public"."pipedrive_tokens" to "service_role";

grant insert on table "public"."pipedrive_tokens" to "service_role";

grant references on table "public"."pipedrive_tokens" to "service_role";

grant select on table "public"."pipedrive_tokens" to "service_role";

grant trigger on table "public"."pipedrive_tokens" to "service_role";

grant truncate on table "public"."pipedrive_tokens" to "service_role";

grant update on table "public"."pipedrive_tokens" to "service_role";

grant delete on table "public"."salesforce_tokens" to "anon";

grant insert on table "public"."salesforce_tokens" to "anon";

grant references on table "public"."salesforce_tokens" to "anon";

grant select on table "public"."salesforce_tokens" to "anon";

grant trigger on table "public"."salesforce_tokens" to "anon";

grant truncate on table "public"."salesforce_tokens" to "anon";

grant update on table "public"."salesforce_tokens" to "anon";

grant delete on table "public"."salesforce_tokens" to "authenticated";

grant insert on table "public"."salesforce_tokens" to "authenticated";

grant references on table "public"."salesforce_tokens" to "authenticated";

grant select on table "public"."salesforce_tokens" to "authenticated";

grant trigger on table "public"."salesforce_tokens" to "authenticated";

grant truncate on table "public"."salesforce_tokens" to "authenticated";

grant update on table "public"."salesforce_tokens" to "authenticated";

grant delete on table "public"."salesforce_tokens" to "service_role";

grant insert on table "public"."salesforce_tokens" to "service_role";

grant references on table "public"."salesforce_tokens" to "service_role";

grant select on table "public"."salesforce_tokens" to "service_role";

grant trigger on table "public"."salesforce_tokens" to "service_role";

grant truncate on table "public"."salesforce_tokens" to "service_role";

grant update on table "public"."salesforce_tokens" to "service_role";

grant delete on table "public"."scheduled_meetings" to "anon";

grant insert on table "public"."scheduled_meetings" to "anon";

grant references on table "public"."scheduled_meetings" to "anon";

grant select on table "public"."scheduled_meetings" to "anon";

grant trigger on table "public"."scheduled_meetings" to "anon";

grant truncate on table "public"."scheduled_meetings" to "anon";

grant update on table "public"."scheduled_meetings" to "anon";

grant delete on table "public"."scheduled_meetings" to "authenticated";

grant insert on table "public"."scheduled_meetings" to "authenticated";

grant references on table "public"."scheduled_meetings" to "authenticated";

grant select on table "public"."scheduled_meetings" to "authenticated";

grant trigger on table "public"."scheduled_meetings" to "authenticated";

grant truncate on table "public"."scheduled_meetings" to "authenticated";

grant update on table "public"."scheduled_meetings" to "authenticated";

grant delete on table "public"."scheduled_meetings" to "service_role";

grant insert on table "public"."scheduled_meetings" to "service_role";

grant references on table "public"."scheduled_meetings" to "service_role";

grant select on table "public"."scheduled_meetings" to "service_role";

grant trigger on table "public"."scheduled_meetings" to "service_role";

grant truncate on table "public"."scheduled_meetings" to "service_role";

grant update on table "public"."scheduled_meetings" to "service_role";

grant delete on table "public"."summaries" to "anon";

grant insert on table "public"."summaries" to "anon";

grant references on table "public"."summaries" to "anon";

grant select on table "public"."summaries" to "anon";

grant trigger on table "public"."summaries" to "anon";

grant truncate on table "public"."summaries" to "anon";

grant update on table "public"."summaries" to "anon";

grant delete on table "public"."summaries" to "authenticated";

grant insert on table "public"."summaries" to "authenticated";

grant references on table "public"."summaries" to "authenticated";

grant select on table "public"."summaries" to "authenticated";

grant trigger on table "public"."summaries" to "authenticated";

grant truncate on table "public"."summaries" to "authenticated";

grant update on table "public"."summaries" to "authenticated";

grant delete on table "public"."summaries" to "service_role";

grant insert on table "public"."summaries" to "service_role";

grant references on table "public"."summaries" to "service_role";

grant select on table "public"."summaries" to "service_role";

grant trigger on table "public"."summaries" to "service_role";

grant truncate on table "public"."summaries" to "service_role";

grant update on table "public"."summaries" to "service_role";

grant delete on table "public"."transcripts" to "anon";

grant insert on table "public"."transcripts" to "anon";

grant references on table "public"."transcripts" to "anon";

grant select on table "public"."transcripts" to "anon";

grant trigger on table "public"."transcripts" to "anon";

grant truncate on table "public"."transcripts" to "anon";

grant update on table "public"."transcripts" to "anon";

grant delete on table "public"."transcripts" to "authenticated";

grant insert on table "public"."transcripts" to "authenticated";

grant references on table "public"."transcripts" to "authenticated";

grant select on table "public"."transcripts" to "authenticated";

grant trigger on table "public"."transcripts" to "authenticated";

grant truncate on table "public"."transcripts" to "authenticated";

grant update on table "public"."transcripts" to "authenticated";

grant delete on table "public"."transcripts" to "service_role";

grant insert on table "public"."transcripts" to "service_role";

grant references on table "public"."transcripts" to "service_role";

grant select on table "public"."transcripts" to "service_role";

grant trigger on table "public"."transcripts" to "service_role";

grant truncate on table "public"."transcripts" to "service_role";

grant update on table "public"."transcripts" to "service_role";

grant delete on table "public"."webhook_logs" to "anon";

grant insert on table "public"."webhook_logs" to "anon";

grant references on table "public"."webhook_logs" to "anon";

grant select on table "public"."webhook_logs" to "anon";

grant trigger on table "public"."webhook_logs" to "anon";

grant truncate on table "public"."webhook_logs" to "anon";

grant update on table "public"."webhook_logs" to "anon";

grant delete on table "public"."webhook_logs" to "authenticated";

grant insert on table "public"."webhook_logs" to "authenticated";

grant references on table "public"."webhook_logs" to "authenticated";

grant select on table "public"."webhook_logs" to "authenticated";

grant trigger on table "public"."webhook_logs" to "authenticated";

grant truncate on table "public"."webhook_logs" to "authenticated";

grant update on table "public"."webhook_logs" to "authenticated";

grant delete on table "public"."webhook_logs" to "service_role";

grant insert on table "public"."webhook_logs" to "service_role";

grant references on table "public"."webhook_logs" to "service_role";

grant select on table "public"."webhook_logs" to "service_role";

grant trigger on table "public"."webhook_logs" to "service_role";

grant truncate on table "public"."webhook_logs" to "service_role";

grant update on table "public"."webhook_logs" to "service_role";

grant delete on table "public"."zoho_tokens" to "anon";

grant insert on table "public"."zoho_tokens" to "anon";

grant references on table "public"."zoho_tokens" to "anon";

grant select on table "public"."zoho_tokens" to "anon";

grant trigger on table "public"."zoho_tokens" to "anon";

grant truncate on table "public"."zoho_tokens" to "anon";

grant update on table "public"."zoho_tokens" to "anon";

grant delete on table "public"."zoho_tokens" to "authenticated";

grant insert on table "public"."zoho_tokens" to "authenticated";

grant references on table "public"."zoho_tokens" to "authenticated";

grant select on table "public"."zoho_tokens" to "authenticated";

grant trigger on table "public"."zoho_tokens" to "authenticated";

grant truncate on table "public"."zoho_tokens" to "authenticated";

grant update on table "public"."zoho_tokens" to "authenticated";

grant delete on table "public"."zoho_tokens" to "service_role";

grant insert on table "public"."zoho_tokens" to "service_role";

grant references on table "public"."zoho_tokens" to "service_role";

grant select on table "public"."zoho_tokens" to "service_role";

grant trigger on table "public"."zoho_tokens" to "service_role";

grant truncate on table "public"."zoho_tokens" to "service_role";

grant update on table "public"."zoho_tokens" to "service_role";

create policy "gmail_tokens_team_members"
on "public"."gmail_tokens"
as permissive
for all
to authenticated
using (has_role_on_account(account_id));


CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON public.analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_analysis_jobs_updated_at();

CREATE TRIGGER update_deals_last_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER set_gmail_tokens_updated_at BEFORE UPDATE ON public.gmail_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_hubspot_tokens_updated_at BEFORE UPDATE ON public.hubspot_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_pipedrive_tokens_updated_at BEFORE UPDATE ON public.pipedrive_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_salesforce_tokens_updated_at BEFORE UPDATE ON public.salesforce_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_zoho_tokens_updated_at BEFORE UPDATE ON public.zoho_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


