import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  console.log('🔄 Auth callback starting:', {
    url: request.url,
    searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries()),
  });

  const service = createAuthCallbackService(getSupabaseServerClient());

  const { nextPath: defaultNextPath } = await service.exchangeCodeForSession(request, {
    joinTeamPath: pathsConfig.app.joinTeam,
    redirectPath: pathsConfig.app.home,
  });

  let nextPath = defaultNextPath;

  // Check if this might be a first login by looking for recent account creation
  const supabase = getSupabaseServerClient();
  let isFirstLogin = false;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if the user was created recently (within last 5 minutes)
      const userCreatedAt = new Date(user.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      isFirstLogin = userCreatedAt > fiveMinutesAgo;
      
      console.log('🔍 First login check:', {
        userCreatedAt: userCreatedAt.toISOString(),
        fiveMinutesAgo: fiveMinutesAgo.toISOString(),
        isFirstLogin,
        userId: user.id,
      });

      // Trigger meeting sync for all user accounts (both new and returning users)
      try {
        console.log('🔄 Triggering meeting sync for user:', user.id);
        
        // Get all accounts this user has access to
        const { data: memberships } = await supabase
          .from('accounts_memberships')
          .select('account_id, accounts(id, name, slug)')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          // Update redirect path to go to the first team's dealflow page
          const firstAccount = memberships[0].accounts as any;
          if (firstAccount?.slug && nextPath === pathsConfig.app.home) {
            nextPath = `/home/${firstAccount.slug}/dealflow`;
            console.log(`🎯 Redirecting to team dealflow: ${nextPath}`);
          }

          // Trigger async meeting sync for each account (don't wait for completion to avoid timeouts)
          for (const membership of memberships) {
            const account = membership.accounts as any;
            if (account?.id) {
              console.log(`🔄 Triggering async meeting sync for account: ${account.name} (${account.id})`);
              
              // Call the comprehensive meeting sync API asynchronously
              fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/sync-meetings-comprehensive?accountId=${account.id}&userId=${user.id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, // Use service role for server-to-server calls
                },
                body: JSON.stringify({
                  triggerSource: isFirstLogin ? 'signup' : 'signin'
                })
              }).catch(error => {
                console.error(`❌ Failed to trigger meeting sync for account ${account.id}:`, error);
              });
            }
          }
        } else if (nextPath === pathsConfig.app.home) {
          // No team memberships found, redirect to vellora-sales dealflow as fallback
          nextPath = '/home/vellora-sales/dealflow';
          console.log(`🎯 No team memberships found, redirecting to vellora-sales dealflow: ${nextPath}`);
        }
      } catch (error) {
        console.error('❌ Error triggering meeting sync:', error);
        // Don't fail the auth process if meeting sync fails
      }
    }
  } catch (error) {
    console.error('Error checking first login status:', error);
  }

  // Use absolute URL for redirect to avoid browser interpretation issues
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const finalUrl = new URL(nextPath, siteUrl);
  
  // Add first_login parameter if this is a new user
  if (isFirstLogin) {
    finalUrl.searchParams.set('first_login', 'true');
    console.log('✨ Adding first_login parameter for new user');
  }
  
  const absoluteUrl = finalUrl.toString();

  console.log('🔄 Auth callback redirecting to:', absoluteUrl);

  return redirect(absoluteUrl);
}
