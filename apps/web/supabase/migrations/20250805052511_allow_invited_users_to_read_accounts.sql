create policy "accounts_read_for_invited_users"
on "public"."accounts"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM invitations
  WHERE ((invitations.account_id = accounts.id) AND ((invitations.email)::text = (auth.jwt() ->> 'email'::text)) AND (invitations.expires_at > now())))));



