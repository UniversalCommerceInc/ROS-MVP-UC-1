import { NextRequest, NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(getSupabaseServerClient());
  const supabase = getSupabaseServerClient();

  const url = await service.verifyTokenHash(request, {
    joinTeamPath: pathsConfig.app.joinTeam,
    redirectPath: pathsConfig.app.home,
  });

  // Check if user has team accounts and redirect to dealflow if so
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && url.pathname === pathsConfig.app.home) {
      const { data: memberships } = await supabase
        .from('accounts_memberships')
        .select('account_id, accounts(id, name, slug)')
        .eq('user_id', user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        const firstAccount = memberships[0].accounts as any;
        if (firstAccount?.slug) {
          url.pathname = `/home/${firstAccount.slug}/dealflow`;
          console.log(`🎯 Email confirm redirecting to team dealflow: ${url.pathname}`);
        }
      } else {
        // No team memberships found, redirect to vellora-sales dealflow as fallback
        url.pathname = '/home/vellora-sales/dealflow';
        console.log(`🎯 Email confirm no team memberships, redirecting to vellora-sales dealflow: ${url.pathname}`);
      }
    }
  } catch (error) {
    console.error('Error determining redirect path for email confirm:', error);
    // Fall back to the original URL if there's an error
  }

  return NextResponse.redirect(url);
}
