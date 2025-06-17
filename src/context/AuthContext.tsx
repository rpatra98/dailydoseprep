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
  const [initError, setInitError] = useState<Error | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const router = useRouter();
  
  // Get the singleton browser client instance
  const [browserSupabase, setBrowserSupabase] = useState<SupabaseClient | null>(null);
  
  // Initialize the Supabase client
  useEffect(() => {
    try {
      const client = getBrowserClient();
      setBrowserSupabase(client);
    } catch (err) {
      if (isDev) {
        console.error("Failed to initialize Supabase client:", err);
      }
      setInitError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Fetch user data from the database with timeout and retry
  const fetchUserData = async (userId: string, retryCount = 0): Promise<User | null> => {
    if (!browserSupabase) {
      return null;
    }
    
    try {
      // Shorter timeout - 5 seconds max
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('User data fetch timeout')), 5000);
      });
      
      // Create the fetch promise with simpler logic
      const fetchPromise = async (): Promise<User | null> => {
        try {
          const { data: userData, error: userError } = await browserSupabase
            .from('users')
            .select('id, email, role, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle();
  
          if (userError) {
            if (isDev) {
              console.error('Error fetching user data:', userError);
            }
            return null;
          }
          
          if (!userData) {
            if (isDev) {
              console.warn(`No user data found for ID: ${userId}`);
            }
            return null;
          }
          
          return userData as User;
        } catch (error) {
          if (isDev) {
            console.error("Error in fetchUserData promise:", error);
          }
          return null;
        }
      };
      
      // Race the fetch against the timeout
      const result = await Promise.race([fetchPromise(), timeoutPromise]) as User | null;
      return result;
    } catch (error) {
      if (isDev) {
        console.error("Error or timeout in fetchUserData:", error);
      }
      return null;
    }
  };

  // Handle auth state changes - STRICT validation per APPLICATION_SPECIFICATION.md
  const handleAuthStateChange = async (event: string, session: any, error?: any) => {
    // Handle auth errors (like refresh token failures)
    if (error) {
      if (isDev) {
        console.error('Auth state change error:', error);
      }
      
      if (error.message?.includes('refresh') || 
          error.message?.includes('Invalid') || 
          error.message?.includes('Refresh Token Not Found')) {
        clearBrowserClient();
        setUser(null);
        setError('Session expired. Please sign in again.');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login?error=session_expired';
        }
        return;
      }
    }
    
    if (event === 'SIGNED_IN' && session?.user) {
      const userData = await fetchUserData(session.user.id);
      
      if (userData) {
        // User exists in database - validate role consistency
        setUser(userData);
        if (isDev) {
          console.log('User authenticated successfully:', userData.email, 'Role:', userData.role);
        }
      } else {
        // User exists in auth but NOT in database - SECURITY VIOLATION
        // Per APPLICATION_SPECIFICATION.md: This should not happen in normal flow
        if (isDev) {
          console.error('SECURITY ISSUE: User exists in auth but not in database:', session.user.email);
        }
        
        // Force logout and show error - no automatic user creation
        setError('Account not properly configured. Please contact administrator.');
        await forceLogout();
        return;
      }
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
      setError(null);
    } else if (event === 'TOKEN_REFRESHED') {
      // Handle token refresh - validate user still exists in database
      if (session?.user && !user) {
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
        } else {
          // User was deleted from database - force logout
          if (isDev) {
            console.warn('User deleted from database during session - forcing logout');
          }
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
      
      // Use window.location instead of router to avoid dependency issues
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=account_config_error';
      }
    } catch (error) {
      if (isDev) {
        console.error('Error during force logout:', error);
      }
    }
  };

  // Setup authentication
  useEffect(() => {
    if (!browserSupabase) {
      return;
    }

    if (initError) {
      setLoading(false);
      setAuthInitialized(true);
      return;
    }

    let isActive = true;
    
    const initializeAuth = async () => {
      try {
        setError(null);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Authentication initialization timeout')), 10000);
        });
        
        // Get initial session with timeout
        const sessionPromise = browserSupabase.auth.getSession();
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (sessionError) {
          if (isDev) {
            console.error('Session error:', sessionError);
          }
          
          // If it's a refresh token error, clear the client and force logout
          if (sessionError.message?.includes('refresh') || 
              sessionError.message?.includes('Invalid') || 
              sessionError.message?.includes('Refresh Token Not Found')) {
            clearBrowserClient();
            setError('Session expired. Please sign in again.');
            
            if (isActive) {
              setAuthInitialized(true);
              setLoading(false);
              setUser(null);
              
              // Force redirect to login
              if (typeof window !== 'undefined') {
                window.location.href = '/login?error=session_expired';
              }
            }
          } else {
            setError(sessionError.message);
            
            if (isActive) {
              setAuthInitialized(true);
              setLoading(false);
            }
          }
          return;
        }
        
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          
          if (isActive) {
            if (userData) {
              setUser(userData);
            } else {
              // STRICT: User exists in auth but not in database - force logout
              if (isDev) {
                console.error('SECURITY: User in auth but not in database during initialization');
              }
              setError('Account configuration error. Please contact administrator.');
              
              // Set loading to false before force logout to prevent infinite loading
              setLoading(false);
              setAuthInitialized(true);
              
              // Delay the force logout to ensure state is set
              setTimeout(() => {
                forceLogout();
              }, 100);
              return;
            }
          }
        } else {
          if (isActive) {
            setUser(null);
          }
        }
        
        if (isActive) {
          setAuthInitialized(true);
          setLoading(false);
        }
      } catch (err) {
        if (isDev) {
          console.error('Auth setup error:', err);
        }
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Authentication error');
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    };

    // Setup auth state change listener
    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial auth setup
    initializeAuth();

    // Cleanup on unmount
    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [browserSupabase, initError]);

  // Login function
  const login = async (email: string, password: string): Promise<LoginResponse | void> => {
    if (!browserSupabase) {
      throw new Error('Authentication service not available');
    }

    if (loginInProgress) {
      return;
    }

    try {
      setLoginInProgress(true);
      setError(null);
      
      const { data, error } = await browserSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user) {
        const userData = await fetchUserData(data.user.id);
        
        if (userData) {
          setUser(userData);
          return {
            success: true,
            user: userData,
          };
        } else {
          setError('User data not found');
          return {
            success: false,
            error: 'User data not found',
          };
        }
      }

      return {
        success: false,
        error: 'Login failed',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
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
      
      // Clear the browser client and user state
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

  // Register student function - Per APPLICATION_SPECIFICATION.md: Students can sign up
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
    login,
    logout,
    createQAUTHOR,
    registerStudent,
    authInitialized,
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