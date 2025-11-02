import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    // 🔴 DEBUG BREAKPOINT: Set here to inspect auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // 🔴 DEBUG BREAKPOINT: Inspect event type ('SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', etc.)
        // 🔴 WATCH: event, session, session?.user
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    // 🔴 DEBUG BREAKPOINT: Set here to inspect initial session check on app load
    supabase.auth.getSession().then(({ data: { session } }) => {
      // 🔴 DEBUG BREAKPOINT: Inspect existing session on app initialization
      // 🔴 WATCH: session, session?.user, session?.access_token
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 🔴 DEBUG BREAKPOINT: Set here to debug sign-in attempts
    // 🔴 WATCH: email, password (be careful with sensitive data in production)
    try {
      // 🔴 DEBUG BREAKPOINT: Set here before the API call
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      // 🔴 DEBUG BREAKPOINT: Set here after the API call to inspect error or success
      // 🔴 WATCH: error, error?.message, error?.status
      return { error };
    } catch (error: any) {
      // 🔴 DEBUG BREAKPOINT: Set here to catch unexpected sign-in errors
      // 🔴 WATCH: error, error?.message
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    // 🔴 DEBUG BREAKPOINT: Set here to debug sign-out flow
    // 🔴 WATCH: user, session
    await supabase.auth.signOut();
    // 🔴 DEBUG BREAKPOINT: Set here after sign-out to verify session cleared
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
