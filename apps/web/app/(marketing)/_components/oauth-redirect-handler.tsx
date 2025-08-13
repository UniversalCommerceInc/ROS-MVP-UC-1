'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function OAuthRedirectHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check if we have an OAuth code parameter (from Google OAuth)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (code) {
      console.log('🔄 OAuth code detected on marketing page, redirecting to auth callback...', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        currentUrl: window.location.href
      });

      // Build the auth callback URL with all the current parameters
      const authCallbackUrl = new URL('/auth/callback', window.location.origin);
      
      // Copy all search parameters to the auth callback
      searchParams.forEach((value, key) => {
        authCallbackUrl.searchParams.set(key, value);
      });

      console.log('🎯 Redirecting to:', authCallbackUrl.toString());

      // Redirect to the proper auth callback URL
      router.replace(authCallbackUrl.toString());
    }
  }, [searchParams, router]);

  // This component doesn't render anything visible
  return null;
}