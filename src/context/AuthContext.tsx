"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types';

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  
  if (isDev) {
    console.log('✅ Supabase client initialized');
  }

  // Fetch user data from our users table
  const fetchUserData = async (authUser: User): Promise<AuthUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('User not found in database');
      }

      const userData: AuthUser = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole
      };

      if (isDev) {
        console.log('✅ User data fetched:', userData.email, 'Role:', userData.role);
      }

      return userData;
    } catch (error) {
      if (isDev) {
        console.error('❌ Error fetching user data:', error);
      }
      return null;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDev) {
          console.log('🔄 Auth state change:', event, session ? 'with session' : 'no session');
        }

        setSession(session);

        if (session?.user) {
          // User signed in
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            if (isDev) {
              console.log('✅ User signed in:', userData.email, 'Role:', userData.role);
            }
          } else {
            setUser(null);
            if (isDev) {
              console.error('❌ Failed to fetch user data after sign in');
            }
          }
        } else {
          // User signed out
          setUser(null);
          if (isDev) {
            console.log('✅ User signed out');
          }
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        if (isDev) {
          console.log('🔄 Initializing authentication...');
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session?.user) {
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            setSession(session);
          }
        }

        if (isDev) {
          console.log('✅ Authentication initialized');
        }
      } catch (error) {
        if (isDev) {
          console.error('❌ Error initializing auth:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Check if already signing in
      if (loading) {
        if (isDev) {
          console.log('⚠️ Login already in progress, skipping...');
        }
        return { success: false, error: 'Login already in progress' };
      }

      if (isDev) {
        console.log('🔄 Attempting login for:', email);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // The auth state change handler will handle setting the user
      if (isDev) {
        console.log('✅ Authentication successful, fetching user data...');
      }

      // Wait a bit for the auth state change to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userData = await fetchUserData(data.user);
      if (userData) {
        setUser(userData);
        if (isDev) {
          console.log('✅ Login complete:', userData.email, 'Role:', userData.role);
        }
        return { success: true };
      } else {
        throw new Error('Failed to fetch user profile');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      if (isDev) {
        console.error('❌ Login error:', errorMessage);
      }
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (error) {
      if (isDev) {
        console.error('❌ Sign out error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userData = await fetchUserData(session.user);
      setUser(userData);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 