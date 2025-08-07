import 'server-only';

import { cache } from 'react';

import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

import pathsConfig from '~/config/paths.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export type TeamAccountWorkspace = Awaited<
  ReturnType<typeof loadTeamWorkspace>
>;

/**
 * Load the account workspace data.
 * We place this function into a separate file so it can be reused in multiple places across the server components.
 *
 * This function is used in the layout component for the account workspace.
 * It is cached so that the data is only fetched once per request.
 *
 * @param accountSlug
 */
export const loadTeamWorkspace = cache(workspaceLoader);

async function workspaceLoader(accountSlug: string) {
  const client = getSupabaseServerClient();
  const api = createTeamAccountsApi(client);

  const [workspace, user] = await Promise.all([
    api.getAccountWorkspace(accountSlug),
    requireUserInServerComponent(),
  ]);

  // we cannot find any record for the selected account
  // so we redirect the user to the team selection page
  if (!workspace.data?.account) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Redirect to teams page with a special parameter to clear the cookie
    const teamsPath = '/home/teams?clear_team_cookie=true';
    const absoluteUrl = new URL(teamsPath, siteUrl).toString();
    
    console.log('🔄 Team workspace redirect to teams (account not found):', { 
      accountSlug, 
      teamsPath, 
      siteUrl, 
      absoluteUrl
    });
    
    return redirect(absoluteUrl);
  }

  return {
    ...workspace.data,
    user,
  };
}
