import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setSentryUser } from '@/lib/sentry';

type UserRole = 'artist' | 'venue' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  signUp: (email: string, password: string, role: 'artist' | 'venue') => Promise<{ error: Error | null; confirmEmail: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    
    return data?.role as UserRole;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Update Sentry user context
        setSentryUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
        
        // Defer role fetch to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setUserRole);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setUserRole);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, role: 'artist' | 'venue') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { role } // Pass role via metadata for the DB trigger
        }
      });

      if (error) throw error;

      // Profile and role are now created automatically by the handle_new_user trigger
      // If the user got a session (auto-confirm enabled), set the role immediately
      if (data.session) {
        setUserRole(role);
      }

      return { error: null, confirmEmail: !data.session };
    } catch (error) {
      return { error: error as Error, confirmEmail: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      isLoading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
