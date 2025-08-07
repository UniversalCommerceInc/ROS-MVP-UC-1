'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@kit/supabase/hooks/use-user';

export function ClearTeamCookie() {
  const searchParams = useSearchParams();
  const user = useUser();
  const shouldClearCookie = searchParams.get('clear_team_cookie') === 'true';

  useEffect(() => {
    if (shouldClearCookie && user.data?.id) {
      const teamCookieName = `${user.data.id}-selected-team-slug`;
      
      // Clear the cookie by setting it to expire in the past
      document.cookie = `${teamCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      console.log('🍪 Cleared team cookie:', teamCookieName);
      
      // Remove the query parameter from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('clear_team_cookie');
      window.history.replaceState({}, '', url.toString());
    }
  }, [shouldClearCookie, user.data?.id]);

  return null; // This component doesn't render anything
} 