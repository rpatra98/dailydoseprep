"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types';

// Enable logging for debugging
const isDev = true; // Temporarily enable for debugging

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
  
  console.log('✅ AuthProvider: Supabase client initialized');

  // Fetch user data from our users table
  const fetchUserData = async (authUser: User): Promise<AuthUser | null> => {
    try {
      console.log('🔄 AuthProvider: Fetching user data for:', authUser.email);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('❌ AuthProvider: Database error:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ AuthProvider: No user data found in database');
        throw new Error('User not found in database');
      }

      const userData: AuthUser = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole
      };

      console.log('✅ AuthProvider: User data fetched successfully:', userData.email, 'Role:', userData.role);
      return userData;
    } catch (error) {
      console.error('❌ AuthProvider: Error fetching user data:', error);
      return null;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    console.log('🔄 AuthProvider: Setting up auth state change listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthProvider: Auth state change:', event, session ? 'with session' : 'no session');

        setSession(session);

        if (session?.user) {
          console.log('🔄 AuthProvider: User session found, fetching user data...');
          // User signed in
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            console.log('✅ AuthProvider: User signed in successfully:', userData.email, 'Role:', userData.role);
          } else {
            setUser(null);
            console.error('❌ AuthProvider: Failed to fetch user data after sign in');
          }
        } else {
          // User signed out
          setUser(null);
          console.log('✅ AuthProvider: User signed out');
        }

        console.log('🔄 AuthProvider: Setting loading to false...');
        setLoading(false);
      }
    );

    return () => {
      console.log('🔄 AuthProvider: Cleaning up auth state change listener...');
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthProvider: Starting auth initialization...');
        setLoading(true);
        
        console.log('🔄 AuthProvider: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error);
          throw error;
        }

        if (session?.user) {
          console.log('🔄 AuthProvider: Session found, fetching user data...');
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            setSession(session);
            console.log('✅ AuthProvider: Auth initialized with user:', userData.email);
          } else {
            console.error('❌ AuthProvider: Failed to fetch user data during initialization');
          }
        } else {
          console.log('🔄 AuthProvider: No session found during initialization');
        }

        console.log('✅ AuthProvider: Authentication initialization complete');
      } catch (error) {
        console.error('❌ AuthProvider: Error initializing auth:', error);
      } finally {
        console.log('🔄 AuthProvider: Setting loading to false after initialization...');
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