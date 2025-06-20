"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, User } from '@supabase/auth-helpers-nextjs';

// Types
type UserRole = 'SUPERADMIN' | 'QAUTHOR' | 'STUDENT';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Create supabase client
  const supabase = createClientComponentClient();

  // Helper function for debug logging
  const log = (message: string, data?: any) => {
    if (isDev) {
      console.log(`[AuthContext] ${message}`, data || '');
    }
  };

  // Enhanced error logging for auth issues
  const logAuthError = (context: string, error: any, additionalData?: any) => {
    console.error(`[AuthContext] ${context}:`, error);
    if (additionalData) {
      console.error(`[AuthContext] Additional context:`, additionalData);
    }
  };

  // Fetch user data from our users table
  const fetchUserData = async (authUser: User): Promise<AuthUser | null> => {
    try {
      log('🔄 Fetching user data for:', authUser.email);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        logAuthError('Database error fetching user', error, { 
          userId: authUser.id, 
          userEmail: authUser.email,
          errorCode: error.code,
          errorMessage: error.message
        });
        
        // If user doesn't exist in database, sign them out
        if (error.code === 'PGRST116') {
          log('🔄 User exists in auth but not in database, signing out...');
          await supabase.auth.signOut();
          return null;
        }
        
        throw error;
      }

      if (!data) {
        logAuthError('No user data returned from database', null, { 
          userId: authUser.id, 
          userEmail: authUser.email 
        });
        await supabase.auth.signOut();
        return null;
      }

      const userData: AuthUser = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole
      };

      log('✅ User data fetched successfully:', userData);
      return userData;
    } catch (error) {
      logAuthError('Error fetching user data', error, { 
        userId: authUser.id, 
        userEmail: authUser.email 
      });
      return null;
    }
  };

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      log('🔄 Initializing authentication...');
      setLoading(true);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logAuthError('Error getting session during initialization', error);
        setSession(null);
        setUser(null);
        return;
      }

      log('🔄 Session check result:', session ? 'Session found' : 'No session');

      if (session?.user) {
        const userData = await fetchUserData(session.user);
        if (userData) {
          setUser(userData);
          setSession(session);
          log('✅ Auth initialized with user:', userData.email);
        } else {
          setUser(null);
          setSession(null);
          log('❌ Failed to fetch user data during initialization');
        }
      } else {
        setUser(null);
        setSession(null);
        log('ℹ️ No session found during initialization');
      }
    } catch (error) {
      logAuthError('Error initializing auth', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
      setInitialized(true);
      log('✅ Authentication initialization complete');
    }
  };

  // Handle auth state changes
  const handleAuthChange = async (event: string, session: Session | null) => {
    try {
      log('🔄 Auth state change:', { event, hasSession: !!session });

      // Skip INITIAL_SESSION event to avoid double processing
      if (event === 'INITIAL_SESSION') {
        log('🔄 Skipping INITIAL_SESSION event');
        return;
      }

      setSession(session);

      if (session?.user) {
        log('🔄 User session found, fetching user data...');
        const userData = await fetchUserData(session.user);
        if (userData) {
          setUser(userData);
          log('✅ User signed in successfully:', userData.email);
        } else {
          setUser(null);
          log('❌ Failed to fetch user data after sign in');
        }
      } else {
        setUser(null);
        log('ℹ️ User signed out');
      }
    } catch (error) {
      logAuthError('Error handling auth change', error, { event, hasSession: !!session });
      setUser(null);
      setSession(null);
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      // Prevent concurrent logins
      if (loading) {
        log('⚠️ Login already in progress');
        return { success: false, error: 'Login already in progress' };
      }

      setLoading(true);
      log('🔄 Starting login for:', email);

      // Clear any existing session first
      await supabase.auth.signOut();
      log('🔄 Cleared existing session');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        logAuthError('Auth sign-in error', error, { email });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        logAuthError('No user data returned from auth', null, { email });
        return { success: false, error: 'Authentication failed' };
      }

      log('✅ Supabase auth successful, fetching user profile...');

      // Fetch user data from our database
      const userData = await fetchUserData(data.user);
      if (!userData) {
        logAuthError('Failed to fetch user profile after successful auth', null, { 
          email,
          authUserId: data.user.id 
        });
        // Sign out since we can't get user data
        await supabase.auth.signOut();
        return { success: false, error: 'User profile not found. Please contact administrator.' };
      }

      // Set user data immediately
      setUser(userData);
      setSession(data.session);
      
      log('✅ Login complete:', { email: userData.email, role: userData.role });
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      logAuthError('Sign-in process error', error, { email });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      log('🔄 Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        logAuthError('Sign out error', error);
        throw error;
      }
      
      setUser(null);
      setSession(null);
      log('✅ Signed out successfully');
    } catch (error) {
      logAuthError('Sign out process error', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Refresh function
  const refresh = async () => {
    try {
      setLoading(true);
      log('🔄 Refreshing authentication...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logAuthError('Refresh error', error);
        setUser(null);
        setSession(null);
        return;
      }

      if (session?.user) {
        const userData = await fetchUserData(session.user);
        if (userData) {
          setUser(userData);
          setSession(session);
          log('✅ Refresh successful:', userData.email);
        } else {
          setUser(null);
          setSession(null);
          log('❌ Failed to fetch user data during refresh');
        }
      } else {
        setUser(null);
        setSession(null);
        log('ℹ️ No session found during refresh');
      }
    } catch (error) {
      logAuthError('Refresh process error', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    log('🔄 AuthProvider mounted, initializing...');
    initializeAuth();
  }, []);

  // Set up auth state listener after initialization
  useEffect(() => {
    if (!initialized) {
      log('🔄 Skipping auth listener setup - not initialized yet');
      return;
    }

    log('🔄 Setting up auth state change listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      log('🔄 Cleaning up auth state change listener...');
      subscription.unsubscribe();
    };
  }, [initialized]);

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    initialized,
    signIn,
    signOut,
    refresh,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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