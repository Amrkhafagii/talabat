import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { usePushRegistration } from '@/hooks/usePushRegistration';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userType: 'customer' | 'restaurant' | 'delivery', extraMetadata?: Record<string, any>) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userType: 'customer' | 'restaurant' | 'delivery' | 'admin' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'restaurant' | 'delivery' | 'admin' | null>(null);
  const mountedRef = useRef(true);

  const validUserTypes = ['customer', 'restaurant', 'delivery', 'admin'];

  const deriveUserType = async (sessionUser: User | null) => {
    if (!mountedRef.current) return;
    if (!sessionUser) {
      setUserType(null);
      setLoading(false);
      return;
    }

    const metaType = (sessionUser as any)?.user_metadata?.user_type;
    const appMetaType = (sessionUser as any)?.app_metadata?.user_type;
    const claimedType = appMetaType || metaType;
    if (claimedType && validUserTypes.includes(claimedType)) {
      setUserType(claimedType as any);
      setLoading(false);
      return;
    }

    // Fallback to profile table when metadata is missing or invalid
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profile?.user_type && validUserTypes.includes(profile.user_type)) {
      setUserType(profile.user_type as any);
    } else {
      setUserType('customer');
    }
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mountedRef.current) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      deriveUserType(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        deriveUserType(session?.user ?? null);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  usePushRegistration(user?.id);

  const signUp = async (email: string, password: string, userType: 'customer' | 'restaurant' | 'delivery', extraMetadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType,
          ...extraMetadata,
        },
      },
    });

    // If signup was successful and we have a user, create their profile
    if (!error && data.user) {
      try {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            user_type: userType
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't return this as an error since the auth signup was successful
          // The profile creation can be retried later
        }
      } catch (profileCreationError) {
        console.error('Error creating user profile:', profileCreationError);
        // Don't return this as an error since the auth signup was successful
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Sign out locally and clear in-memory state
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      userType,
    }}>
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
