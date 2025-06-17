"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrowserClient, clearBrowserClient } from '@/lib/supabase-browser';
import { AuthContextType, User, LoginResponse } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const router = useRouter();
  
  // Get the singleton browser client instance
  const [browserSupabase, setBrowserSupabase] = useState<SupabaseClient | null>(null);
  
  // Initialize the Supabase client
  useEffect(() => {
    try {
      const client = getBrowserClient();
      setBrowserSupabase(client);
      if (isDev) {
        console.log('✅ Supabase client initialized');
      }
    } catch (err) {
      if (isDev) {
        console.error("❌ Failed to initialize Supabase client:", err);
      }
      setError('Failed to initialize authentication service');
      setLoading(false);
      setAuthInitialized(true);
    }
  }, []);

  // Simplified user data fetch
  const fetchUserData = async (userId: string): Promise<User | null> => {
    if (!browserSupabase) {
      return null;
    }
    
    try {
      const { data: userData, error: userError } = await browserSupabase
        .from('users')
        .select('id, email, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (userError) {
        if (isDev) {
          console.error('❌ Error fetching user data:', userError.message);
        }
        return null;
      }
      
      if (!userData) {
        if (isDev) {
          console.warn(`⚠️ No user data found for ID: ${userId}`);
        }
        return null;
      }
      
      if (isDev) {
        console.log('✅ User data fetched:', userData.email, 'Role:', userData.role);
      }
      
      return userData as User;
    } catch (error) {
      if (isDev) {
        console.error("❌ Exception in fetchUserData:", error);
      }
      return null;
    }
  };

  // Simplified auth state change handler
  const handleAuthStateChange = async (event: string, session: any) => {
    if (isDev) {
      console.log('🔄 Auth state change:', event, session ? 'with session' : 'no session');
    }
    
    if (event === 'SIGNED_IN' && session?.user) {
      const userData = await fetchUserData(session.user.id);
      
      if (userData) {
        setUser(userData);
        setError(null);
        if (isDev) {
          console.log('✅ User signed in:', userData.email, 'Role:', userData.role);
        }
      } else {
        // User exists in auth but NOT in database - SECURITY VIOLATION
        if (isDev) {
          console.error('🚨 SECURITY ISSUE: User exists in auth but not in database:', session.user.email);
        }
        setError('Account not properly configured. Please contact administrator.');
        await forceLogout();
        return;
      }
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
      setError(null);
      if (isDev) {
        console.log('✅ User signed out');
      }
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      // Only fetch user data if we don't have it
      if (!user) {
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
        } else {
          await forceLogout();
          return;
        }
      }
    }
    
    setLoading(false);
  };

  // Force logout when user data is inconsistent
  const forceLogout = async () => {
    try {
      if (browserSupabase) {
        await browserSupabase.auth.signOut();
      }
      clearBrowserClient();
      setUser(null);
      setError('Session terminated due to account configuration issue.');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=account_config_error';
      }
    } catch (error) {
      if (isDev) {
        console.error('❌ Error during force logout:', error);
      }
    }
  };

  // Simplified authentication setup
  useEffect(() => {
    if (!browserSupabase) {
      return;
    }

    const initializeAuth = async () => {
      try {
        if (isDev) {
          console.log('🔄 Initializing authentication...');
        }
        
        // Get current session
        const { data: { session }, error: sessionError } = await browserSupabase.auth.getSession();
        
        if (sessionError) {
          if (isDev) {
            console.error('❌ Session error:', sessionError.message);
          }
          setError('Session initialization failed');
          setLoading(false);
          setAuthInitialized(true);
          return;
        }
        
        // Handle existing session
        if (session?.user) {
          await handleAuthStateChange('SIGNED_IN', session);
        } else {
          setLoading(false);
        }
        
        setAuthInitialized(true);
        
        if (isDev) {
          console.log('✅ Authentication initialized');
        }
      } catch (error) {
        if (isDev) {
          console.error('❌ Error initializing auth:', error);
        }
        setError('Authentication initialization failed');
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    // Setup auth state listener
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initialize
    initializeAuth();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [browserSupabase]);

  // Simplified login method
  const login = async (email: string, password: string): Promise<LoginResponse | void> => {
    if (!browserSupabase) {
      throw new Error('Authentication service not available');
    }

    if (loginInProgress) {
      if (isDev) {
        console.log('⚠️ Login already in progress, skipping...');
      }
      return;
    }

    try {
      setLoginInProgress(true);
      setError(null);
      setLoading(true);
      
      if (isDev) {
        console.log('🔄 Attempting login for:', email);
      }
      
      const { data, error } = await browserSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isDev) {
          console.error('❌ Login error:', error.message);
        }
        setError(error.message);
        setLoading(false);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user) {
        if (isDev) {
          console.log('✅ Authentication successful, fetching user data...');
        }
        
        const userData = await fetchUserData(data.user.id);
        
        if (userData) {
          setUser(userData);
          setLoading(false);
          
          if (isDev) {
            console.log('✅ Login complete:', userData.email, 'Role:', userData.role);
          }
          
          // Redirect based on role
          setTimeout(() => {
            if (userData.role === 'SUPERADMIN') {
              router.push('/dashboard');
            } else if (userData.role === 'QAUTHOR') {
              router.push('/dashboard');
            } else if (userData.role === 'STUDENT') {
              router.push('/dashboard');
            } else {
              router.push('/dashboard');
            }
          }, 100);
          
          return {
            success: true,
            user: userData,
          };
        } else {
          setError('User data not found in database');
          setLoading(false);
          return {
            success: false,
            error: 'User data not found',
          };
        }
      }

      setLoading(false);
      return {
        success: false,
        error: 'Login failed',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      if (isDev) {
        console.error('❌ Login exception:', errorMessage);
      }
      setError(errorMessage);
      setLoading(false);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoginInProgress(false);
    }
  };

  // Logout function
  const logout = async () => {
    if (!browserSupabase) {
      return;
    }

    try {
      setError(null);
      const { error } = await browserSupabase.auth.signOut();
      
      if (error) {
        setError(error.message);
        throw error;
      }
      
      clearBrowserClient();
      setUser(null);
      router.push('/login');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Create QAUTHOR function
  const createQAUTHOR = async (email: string, password: string) => {
    if (!browserSupabase) {
      throw new Error('Authentication service not available');
    }

    try {
      setError(null);
      
      // First check if user already exists in our users table
      const { data: existingUser } = await browserSupabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create the auth user
      const { data, error } = await browserSupabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Skip email confirmation for admin-created accounts
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Failed to create user account');
      }

      // Create the user record with QAUTHOR role
      const { data: userData, error: userError } = await browserSupabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          role: 'QAUTHOR'
        })
        .select('id, email, role, created_at, updated_at')
        .single();

      if (userError) {
        // Clean up the auth user if user creation failed
        await browserSupabase.auth.admin.deleteUser(data.user.id);
        throw new Error('Failed to create user profile: ' + userError.message);
      }

      return userData as User;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create QAUTHOR';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Register student function
  const registerStudent = async (email: string, password: string) => {
    if (!browserSupabase) {
      throw new Error('Authentication service not available');
    }

    try {
      setError(null);
      
      // First check if user already exists in our users table
      const { data: existingUser } = await browserSupabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create the auth user
      const { data, error } = await browserSupabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      // Create user record in database with STUDENT role
      const { data: userData, error: userError } = await browserSupabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          role: 'STUDENT'
        })
        .select('id, email, role, created_at, updated_at')
        .single();

      if (userError) {
        // Clean up the auth user if user creation failed
        if (isDev) {
          console.error('Failed to create user profile:', userError);
        }
        throw new Error('Failed to create user profile: ' + userError.message);
      }

      return userData as User;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    authInitialized,
    login,
    logout,
    createQAUTHOR,
    registerStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 