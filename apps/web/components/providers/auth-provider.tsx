'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = getSupabaseBrowserClient();

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');

        // First check if we have a session cookie indicating server-side auth
        const hasAuthCookie = document.cookie.includes(
          'vellora-authenticated=true',
        );
        console.log('🍪 Auth cookie present:', hasAuthCookie);

        // Get the current session from Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting session:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ User session found:', session.user.email);
          setUser(session.user);
        } else if (hasAuthCookie) {
          console.log(
            '🔄 Auth cookie found but no session, attempting refresh...',
          );
          // Try to refresh the session if we have an auth cookie but no session
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('❌ Error refreshing session:', refreshError);
            setUser(null);
          } else if (refreshedSession?.user) {
            console.log(
              '✅ Session refreshed successfully:',
              refreshedSession.user.email,
            );
            setUser(refreshedSession.user);
          } else {
            console.log('ℹ️ No session found after refresh attempt');
            setUser(null);
          }
        } else {
          console.log('ℹ️ No active session or auth cookie found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        '🔄 Auth state changed:',
        event,
        session?.user?.email || 'No user',
      );

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            console.log('✅ User signed in:', session.user.email);
            setUser(session.user);
            // Set auth cookie to help with server-client sync
            document.cookie =
              'vellora-authenticated=true; path=/; max-age=604800';
          }
          break;
        case 'SIGNED_OUT':
          console.log('👋 User signed out');
          setUser(null);
          // Clear auth cookie
          document.cookie =
            'vellora-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed for user:', session?.user?.email);
          if (session?.user) {
            setUser(session.user);
          }
          break;
        case 'USER_UPDATED':
          console.log('👤 User updated:', session?.user?.email);
          if (session?.user) {
            setUser(session.user);
          }
          break;
        default:
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('🔄 Initiating Google sign in...');
      // Redirect to the server-side OAuth route
      window.location.href = '/api/auth/google';
    } catch (error) {
      console.error('❌ Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      // Clear auth cookie
      document.cookie =
        'vellora-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('✅ Successfully signed out');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
