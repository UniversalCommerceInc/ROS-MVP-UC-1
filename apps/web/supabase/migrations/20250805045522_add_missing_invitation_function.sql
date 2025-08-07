alter table "public"."deals" add column "assigned_to" uuid;

alter table "public"."deals" enable row level security;

CREATE INDEX idx_deals_account_assigned ON public.deals USING btree (account_id, assigned_to);

CREATE INDEX idx_deals_assigned_to ON public.deals USING btree (assigned_to);

alter table "public"."deals" add constraint "deals_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) not valid;

alter table "public"."deals" validate constraint "deals_assigned_to_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_assign_deal_to_user(target_account_id uuid, target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    -- Check if the target user is a member of the account
    SELECT 1 FROM public.accounts_memberships
    WHERE account_id = target_account_id 
    AND user_id = target_user_id
  ) AND (
    -- Check if current user has permission to manage deals in this account
    public.has_role_on_account(target_account_id)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_account_members_for_assignment(target_account_id uuid)
 RETURNS TABLE(user_id uuid, email text, name text, account_role character varying)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    u.id as user_id,
    a.email,
    a.name,
    m.account_role
  FROM auth.users u
  JOIN public.accounts a ON a.id = u.id
  JOIN public.accounts_memberships m ON m.user_id = u.id
  WHERE m.account_id = target_account_id
  AND public.has_role_on_account(target_account_id) -- Ensure caller has access
  ORDER BY a.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_invitations()
 RETURNS TABLE(id integer, email text, account_id uuid, account_name text, account_slug text, account_picture_url text, invited_by uuid, invited_by_name text, role text, invite_token text, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  select 
    i.id,
    i.email,
    i.account_id,
    a.name as account_name,
    a.slug as account_slug,
    a.picture_url as account_picture_url,
    i.invited_by,
    coalesce(au.raw_user_meta_data->>'full_name', au.email) as invited_by_name,
    i.role,
    i.invite_token,
    i.created_at,
    i.expires_at
  from public.invitations i
  join public.accounts a on a.id = i.account_id
  left join auth.users au on au.id = i.invited_by
  where i.email = (select auth.jwt()->>'email')
    and i.expires_at > now()
  order by i.created_at desc;
end;
$function$
;

create policy "deals_team_access"
on "public"."deals"
as permissive
for select
to authenticated
using (has_role_on_account(account_id));


create policy "deals_team_delete"
on "public"."deals"
as permissive
for delete
to authenticated
using (has_role_on_account(account_id));


create policy "deals_team_insert"
on "public"."deals"
as permissive
for insert
to authenticated
with check (has_role_on_account(account_id));


create policy "deals_team_update"
on "public"."deals"
as permissive
for update
to authenticated
using (has_role_on_account(account_id))
with check (has_role_on_account(account_id));



