create table "public"."folk_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "api_key" text not null,
    "email_address" character varying(255),
    "api_domain" character varying(255) not null default 'https://api.folk.app'::character varying,
    "user_info" jsonb not null default '{}'::jsonb,
    "scope" text default 'read_write'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."folk_tokens" enable row level security;

create table "public"."slack_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "team_id" character varying not null,
    "team_name" character varying not null,
    "authed_user_id" character varying not null,
    "authed_user_token" text,
    "scope" text default 'chat:write,users:read'::text,
    "bot_user_id" character varying,
    "app_id" character varying,
    "enterprise_id" character varying,
    "enterprise_name" character varying,
    "webhook_url" text,
    "incoming_webhook_channel" character varying,
    "incoming_webhook_channel_id" character varying,
    "incoming_webhook_configuration_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."slack_tokens" enable row level security;

CREATE UNIQUE INDEX folk_tokens_account_id_key ON public.folk_tokens USING btree (account_id);

CREATE UNIQUE INDEX folk_tokens_pkey ON public.folk_tokens USING btree (id);

CREATE INDEX idx_folk_tokens_account_id ON public.folk_tokens USING btree (account_id);

CREATE INDEX idx_folk_tokens_user_id ON public.folk_tokens USING btree (user_id);

CREATE INDEX idx_slack_tokens_account_id ON public.slack_tokens USING btree (account_id);

CREATE INDEX idx_slack_tokens_team_id ON public.slack_tokens USING btree (team_id);

CREATE INDEX idx_slack_tokens_user_id ON public.slack_tokens USING btree (user_id);

CREATE UNIQUE INDEX slack_tokens_account_id_key ON public.slack_tokens USING btree (account_id);

CREATE UNIQUE INDEX slack_tokens_pkey ON public.slack_tokens USING btree (id);

CREATE UNIQUE INDEX slack_tokens_team_id_unique ON public.slack_tokens USING btree (team_id);

alter table "public"."folk_tokens" add constraint "folk_tokens_pkey" PRIMARY KEY using index "folk_tokens_pkey";

alter table "public"."slack_tokens" add constraint "slack_tokens_pkey" PRIMARY KEY using index "slack_tokens_pkey";

alter table "public"."folk_tokens" add constraint "folk_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."folk_tokens" validate constraint "folk_tokens_account_id_fkey";

alter table "public"."folk_tokens" add constraint "folk_tokens_account_id_key" UNIQUE using index "folk_tokens_account_id_key";

alter table "public"."folk_tokens" add constraint "folk_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."folk_tokens" validate constraint "folk_tokens_user_id_fkey";

alter table "public"."slack_tokens" add constraint "slack_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE not valid;

alter table "public"."slack_tokens" validate constraint "slack_tokens_account_id_fkey";

alter table "public"."slack_tokens" add constraint "slack_tokens_account_id_key" UNIQUE using index "slack_tokens_account_id_key";

alter table "public"."slack_tokens" add constraint "slack_tokens_team_id_unique" UNIQUE using index "slack_tokens_team_id_unique";

alter table "public"."slack_tokens" add constraint "slack_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."slack_tokens" validate constraint "slack_tokens_user_id_fkey";

grant delete on table "public"."folk_tokens" to "anon";

grant insert on table "public"."folk_tokens" to "anon";

grant references on table "public"."folk_tokens" to "anon";

grant select on table "public"."folk_tokens" to "anon";

grant trigger on table "public"."folk_tokens" to "anon";

grant truncate on table "public"."folk_tokens" to "anon";

grant update on table "public"."folk_tokens" to "anon";

grant delete on table "public"."folk_tokens" to "authenticated";

grant insert on table "public"."folk_tokens" to "authenticated";

grant references on table "public"."folk_tokens" to "authenticated";

grant select on table "public"."folk_tokens" to "authenticated";

grant trigger on table "public"."folk_tokens" to "authenticated";

grant truncate on table "public"."folk_tokens" to "authenticated";

grant update on table "public"."folk_tokens" to "authenticated";

grant delete on table "public"."folk_tokens" to "service_role";

grant insert on table "public"."folk_tokens" to "service_role";

grant references on table "public"."folk_tokens" to "service_role";

grant select on table "public"."folk_tokens" to "service_role";

grant trigger on table "public"."folk_tokens" to "service_role";

grant truncate on table "public"."folk_tokens" to "service_role";

grant update on table "public"."folk_tokens" to "service_role";

grant delete on table "public"."slack_tokens" to "anon";

grant insert on table "public"."slack_tokens" to "anon";

grant references on table "public"."slack_tokens" to "anon";

grant select on table "public"."slack_tokens" to "anon";

grant trigger on table "public"."slack_tokens" to "anon";

grant truncate on table "public"."slack_tokens" to "anon";

grant update on table "public"."slack_tokens" to "anon";

grant delete on table "public"."slack_tokens" to "authenticated";

grant insert on table "public"."slack_tokens" to "authenticated";

grant references on table "public"."slack_tokens" to "authenticated";

grant select on table "public"."slack_tokens" to "authenticated";

grant trigger on table "public"."slack_tokens" to "authenticated";

grant truncate on table "public"."slack_tokens" to "authenticated";

grant update on table "public"."slack_tokens" to "authenticated";

grant delete on table "public"."slack_tokens" to "service_role";

grant insert on table "public"."slack_tokens" to "service_role";

grant references on table "public"."slack_tokens" to "service_role";

grant select on table "public"."slack_tokens" to "service_role";

grant trigger on table "public"."slack_tokens" to "service_role";

grant truncate on table "public"."slack_tokens" to "service_role";

grant update on table "public"."slack_tokens" to "service_role";

create policy "folk_tokens_team_members"
on "public"."folk_tokens"
as permissive
for all
to authenticated
using (has_role_on_account(account_id));


create policy "slack_tokens_team_members"
on "public"."slack_tokens"
as permissive
for all
to authenticated
using (has_role_on_account(account_id));


CREATE TRIGGER set_folk_tokens_updated_at BEFORE UPDATE ON public.folk_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_slack_tokens_updated_at BEFORE UPDATE ON public.slack_tokens FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


