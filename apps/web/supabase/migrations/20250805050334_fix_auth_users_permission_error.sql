drop policy "invitations_read_self" on "public"."invitations";

set check_function_bodies = off;

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
  where i.email = auth.jwt()->>'email'
    and i.expires_at > now()
  order by i.created_at desc;
end;
$function$
;

create policy "invitations_read_self"
on "public"."invitations"
as permissive
for select
to authenticated
using ((has_role_on_account(account_id) OR ((email)::text = (auth.jwt() ->> 'email'::text))));



