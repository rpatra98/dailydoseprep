"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';
import { AuthContextType, User, LoginResponse } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      console.log("Getting browser client...");
      const client = getBrowserClient();
      setBrowserSupabase(client);
      console.log("Browser client initialized successfully");
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      setInitError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Fetch user data from the database with timeout and retry
  const fetchUserData = async (userId: string, retryCount = 0): Promise<User | null> => {
    if (!browserSupabase) {
      console.error("Cannot fetch user data: browser client not available");
      return null;
    }
    
    try {
      console.log(`Fetching user data for ID: ${userId} (attempt ${retryCount + 1})`);
      
      // Much shorter timeout - 3 seconds max
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('User data fetch timeout')), 3000);
      });
      
      // Create the fetch promise with simpler logic and no RLS dependency
      const fetchPromise = async (): Promise<User | null> => {
        try {
          // Direct query to users table without complex filtering
          const { data: userData, error: userError } = await browserSupabase
            .from('users')
            .select('id, email, role, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data
  
          if (userError) {
            console.error('Error fetching user data:', userError);
            return null;
          }
          
          if (!userData) {
            console.warn(`No user data found for ID: ${userId}`);
            return null;
          }
          
          console.log("User data fetched successfully:", userData);
          return userData as User;
        } catch (error) {
          console.error("Error in fetchUserData promise:", error);
          return null;
        }
      };
      
      // Race the fetch against the timeout
      const result = await Promise.race([fetchPromise(), timeoutPromise]) as User | null;
      return result;
    } catch (error) {
      console.error("Error or timeout in fetchUserData:", error);
      
      // Don't retry on timeout - just return null
      return null;
    }
  };

  // Create user record if it doesn't exist
  const ensureUserExists = async (userId: string, email: string, role: string = 'STUDENT'): Promise<User | null> => {
    if (!browserSupabase) return null;
    
    try {
      console.log(`Checking if user ${userId} exists in users table`);
      
      // First check if user exists with timeout
      const checkPromise = browserSupabase
        .from('users')
        .select('id, email, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
        
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Check user timeout')), 2000);
      });
      
      const { data: existingUser, error: checkError } = await Promise.race([checkPromise, timeoutPromise]) as any;
      
      if (checkError) {
        console.error('Error checking user existence:', checkError);
        // Continue to create user instead of failing
      }
      
      // If user exists, return it
      if (existingUser) {
        console.log('User record found:', existingUser);
        return existingUser as User;
      }
      
      // User doesn't exist, create it
      console.log(`Creating new user record for ${userId} with role ${role}`);
      
      const insertPromise = browserSupabase
        .from('users')
        .insert({
          id: userId,
          email,
          role,
        })
        .select('id, email, role, created_at, updated_at')
        .single();
        
      const insertTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Insert user timeout')), 3000);
      });
      
      const { data: newUser, error: insertError } = await Promise.race([insertPromise, insertTimeoutPromise]) as any;
      
      if (insertError) {
        console.error('Error creating user record:', insertError);
        return null;
      }
      
      console.log('Created new user record:', newUser);
      return newUser as User;
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
      return null;
    }
  };

  // Setup authentication
  useEffect(() => {
    if (!browserSupabase) {
      console.log("Browser client not available yet, skipping auth setup");
      return;
    }

    if (initError) {
      console.error("Skipping auth initialization due to client init error");
      setLoading(false);
      setAuthInitialized(true);
      return;
    }

    console.log("Running auth effect");
    let isActive = true;
    
    const setData = async () => {
      try {
        console.log("Fetching session...");
        setError(null);
        const { data: { session }, error: sessionError } = await browserSupabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isActive) {
            setAuthInitialized(true);
            setLoading(false);
          }
          return;
        }
        
        console.log("Session fetched:", session ? "Found" : "Not found");
        
        if (session?.user) {
          console.log("User found in session, fetching user data");
          const userData = await fetchUserData(session.user.id);
          
          if (isActive) {
            if (userData) {
              setUser(userData);
              console.log("User data set from session");
            } else {
              console.warn('User exists in Auth but not in users table, creating record');
              // Try to create the user record
              const createdUser = await ensureUserExists(
                session.user.id, 
                session.user.email || 'unknown@email.com',
                'SUPERADMIN' // Default to SUPERADMIN for the first user
              );
              
              if (createdUser) {
                setUser(createdUser);
                console.log("User record created and set");
              } else {
                console.error("Failed to create user record");
              }
            }
          }
        }
      } catch (err) {
        console.error('Error in AuthContext:', err);
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Authentication error');
        }
      } finally {
        if (isActive) {
          console.log("Auth initialization complete");
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    };

    // Set a timeout to ensure we don't get stuck forever
    const initTimeout = setTimeout(() => {
      if (isActive && !authInitialized) {
        console.warn("Auth initialization timed out, forcing completion");
        setAuthInitialized(true);
        setLoading(false);
      }
    }, 15000); // Increased to 15 second timeout

    setData();

    // Set up auth state change listener
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      console.log("Setting up auth state change listener");
      const { data } = browserSupabase.auth.onAuthStateChange(async (event: string, session: any) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log("User signed in, fetching user data");
            const userData = await fetchUserData(session.user.id);
            
            if (isActive) {
              if (userData) {
                setUser(userData);
                // Force navigation to dashboard if we're on the login page
                if (window.location.pathname.includes('/login')) {
                  console.log('Redirecting to dashboard after successful auth');
                  router.push('/dashboard');
                }
              } else {
                console.warn('User exists in Auth but not in users table, creating record');
                // Try to create the user record
                const createdUser = await ensureUserExists(
                  session.user.id, 
                  session.user.email || 'unknown@email.com',
                  'SUPERADMIN' // Default to SUPERADMIN for the first user
                );
                
                if (createdUser) {
                  setUser(createdUser);
                  console.log("User record created and set");
                  
                  // Redirect if on login page
                  if (window.location.pathname.includes('/login')) {
                    console.log('Redirecting to dashboard after user creation');
                    router.push('/dashboard');
                  }
                } else {
                  console.error("Failed to create user record");
                  setUser(null);
                }
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing user data");
          if (isActive) {
            setUser(null);
          }
        }
      });
      
      subscription = data.subscription;
    } catch (subErr) {
      console.error("Error setting up auth state change listener:", subErr);
    }

    return () => {
      isActive = false;
      clearTimeout(initTimeout);
      if (subscription) {
        console.log("Cleaning up auth subscription");
        subscription.unsubscribe();
      }
    };
  }, [browserSupabase, initError, router]);

  const login = async (email: string, password: string): Promise<LoginResponse | void> => {
    console.log(`Attempting to login user: ${email}`);
    setLoading(true);
    setError(null);
    setLoginInProgress(true);
    
    // Check if Supabase client is available
    if (!browserSupabase) {
      const errorMsg = 'Authentication client not initialized';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      setLoginInProgress(false);
      throw new Error(errorMsg);
    }
    
    try {
      // Standard login attempt
      console.log("Calling signInWithPassword...");
      const { data, error } = await browserSupabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      console.log("Login response received:", data ? "Success" : "Failed");
      
      // Handle specific error for email confirmation
      if (error) {
        console.error("Login error:", error.message);
        setError(error.message);
        throw error;
      }
      
      // Check if we got a session and user back
      if (!data.session || !data.user) {
        const errorMsg = 'Login failed: No session created';
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log("Login successful, user authenticated:", data.user.id);
      
      // Fetch user data from our users table
      const userData = await fetchUserData(data.user.id);
      
      if (userData) {
        console.log("User data fetched after login:", userData);
        setUser(userData);
        
        // Return the login response immediately - let useEffect handle navigation
        return data as LoginResponse;
      } else {
        // User exists in auth but not in users table - try to create the record
        console.log("User exists in auth but not in users table, creating record...");
        const createdUser = await ensureUserExists(data.user.id, data.user.email || '', 'STUDENT');
        
        if (createdUser) {
          console.log("User record created:", createdUser);
          setUser(createdUser);
          return data as LoginResponse;
        } else {
          throw new Error('Failed to create user record. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
      setLoginInProgress(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    // Check if Supabase client is available
    if (!browserSupabase) {
      const errorMsg = 'Authentication client not initialized';
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      console.log("Attempting to sign out");
      const { error } = await browserSupabase.auth.signOut();
      if (error) {
        setError(error.message);
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log("Sign out successful, clearing user state");
      setUser(null);
      
      // Force navigation to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to clean up the local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const createQAUTHOR = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    // Check if Supabase client is available
    if (!browserSupabase) {
      const errorMsg = 'Authentication client not initialized';
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      const { data: { user: currentUser }, error: authError } = await browserSupabase.auth.getUser();
      if (authError) throw authError;

      // Check if current user is SUPERADMIN
      const { data: userData, error: userError } = await browserSupabase
        .from('users')
        .select('role')
        .eq('id', currentUser?.id)
        .single();

      if (userError) {
        throw new Error('Failed to verify user role');
      }
      
      if (userData?.role !== 'SUPERADMIN') {
        throw new Error('Only SUPERADMIN can create QAUTHOR accounts');
      }

      // Use the admin API to create the QAUTHOR account via our server endpoint
      const response = await fetch('/api/admin/create-qauthor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create QAUTHOR account');
      }

      const { userId } = await response.json();

      if (!userId) {
        throw new Error('Failed to create user');
      }

      return userId;
    } catch (error) {
      console.error('Create QAUTHOR error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerStudent = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    // Check if Supabase client is available
    if (!browserSupabase) {
      const errorMsg = 'Authentication client not initialized';
      setError(errorMsg);
      setLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      // Create the student account with standard signup flow
      // For students, we do want email confirmation as per security best practices
      const { data: { user: newUser }, error: signUpError } = await browserSupabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'STUDENT'
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!newUser?.id) throw new Error('Failed to create user');

      // Set the user role as STUDENT
      const { error: roleError } = await browserSupabase
        .from('users')
        .insert({
          id: newUser.id,
          email: newUser.email,
          role: 'STUDENT',
        });

      if (roleError) throw roleError;
      
      return newUser.id;
    } catch (error) {
      console.error('Register student error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    createQAUTHOR,
    registerStudent,
    authInitialized
  };

  return (
    <AuthContext.Provider value={value}>
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