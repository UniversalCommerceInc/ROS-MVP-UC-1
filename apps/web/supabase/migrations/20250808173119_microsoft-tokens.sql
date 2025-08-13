create table "public"."microsoft_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "user_id" uuid not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "email_address" character varying not null,
    "tenant_id" character varying,
    "scope" text not null default 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite'::text,
    "last_sync" timestamp with time zone,
    "is_active" boolean default true,
    "sync_status" text default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."microsoft_tokens" enable row level security;

CREATE INDEX idx_microsoft_tokens_account_id ON public.microsoft_tokens USING btree (account_id);

CREATE INDEX idx_microsoft_tokens_email_address ON public.microsoft_tokens USING btree (email_address);

CREATE INDEX idx_microsoft_tokens_sync_status ON public.microsoft_tokens USING btree (sync_status);

CREATE INDEX idx_microsoft_tokens_user_id ON public.microsoft_tokens USING btree (user_id);

CREATE UNIQUE INDEX microsoft_tokens_account_id_key ON public.microsoft_tokens USING btree (account_id);

CREATE UNIQUE INDEX microsoft_tokens_pkey ON public.microsoft_tokens USING btree (id);

alter table "public"."microsoft_tokens" add constraint "microsoft_tokens_pkey" PRIMARY KEY using index "microsoft_tokens_pkey";

alter table "public"."microsoft_tokens" add constraint "microsoft_tokens_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) not valid;

alter table "public"."microsoft_tokens" validate constraint "microsoft_tokens_account_id_fkey";

alter table "public"."microsoft_tokens" add constraint "microsoft_tokens_account_id_key" UNIQUE using index "microsoft_tokens_account_id_key";

alter table "public"."microsoft_tokens" add constraint "microsoft_tokens_sync_status_check" CHECK ((sync_status = ANY (ARRAY['idle'::text, 'pending'::text, 'syncing'::text, 'error'::text, 'failed'::text, 'completed'::text]))) not valid;

alter table "public"."microsoft_tokens" validate constraint "microsoft_tokens_sync_status_check";

alter table "public"."microsoft_tokens" add constraint "microsoft_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."microsoft_tokens" validate constraint "microsoft_tokens_user_id_fkey";

grant delete on table "public"."microsoft_tokens" to "anon";

grant insert on table "public"."microsoft_tokens" to "anon";

grant references on table "public"."microsoft_tokens" to "anon";

grant select on table "public"."microsoft_tokens" to "anon";

grant trigger on table "public"."microsoft_tokens" to "anon";

grant truncate on table "public"."microsoft_tokens" to "anon";

grant update on table "public"."microsoft_tokens" to "anon";

grant delete on table "public"."microsoft_tokens" to "authenticated";

grant insert on table "public"."microsoft_tokens" to "authenticated";

grant references on table "public"."microsoft_tokens" to "authenticated";

grant select on table "public"."microsoft_tokens" to "authenticated";

grant trigger on table "public"."microsoft_tokens" to "authenticated";

grant truncate on table "public"."microsoft_tokens" to "authenticated";

grant update on table "public"."microsoft_tokens" to "authenticated";

grant delete on table "public"."microsoft_tokens" to "service_role";

grant insert on table "public"."microsoft_tokens" to "service_role";

grant references on table "public"."microsoft_tokens" to "service_role";

grant select on table "public"."microsoft_tokens" to "service_role";

grant trigger on table "public"."microsoft_tokens" to "service_role";

grant truncate on table "public"."microsoft_tokens" to "service_role";

grant update on table "public"."microsoft_tokens" to "service_role";

create policy "Users can delete their own microsoft tokens"
on "public"."microsoft_tokens"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own microsoft tokens"
on "public"."microsoft_tokens"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own microsoft tokens"
on "public"."microsoft_tokens"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own microsoft tokens"
on "public"."microsoft_tokens"
as permissive
for select
to public
using ((auth.uid() = user_id));



