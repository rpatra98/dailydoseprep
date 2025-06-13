"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { createBrowserClient } from '@/utils/supabase';
import { AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Use memoized browser client to prevent multiple instances
  const browserSupabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    const setData = async () => {
      try {
        setError(null);
        const { data: { session }, error: sessionError } = await browserSupabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setAuthInitialized(true);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // Fetch user data from our users table
          const { data: userData, error: userError } = await browserSupabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.warn('User exists in Auth but not in users table:', userError);
            // Don't throw here, just set user to null and continue
          } else {
            setUser(userData as User);
          }
        }
      } catch (err) {
        console.error('Error in AuthContext:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setAuthInitialized(true);
        setLoading(false);
      }
    };

    setData();

    const { data: { subscription } } = browserSupabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      try {
        if (session?.user) {
          // Fetch user data from our users table
          const { data: userData, error: userError } = await browserSupabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.warn('User exists in Auth but not in users table:', userError);
            setUser(null);
          } else {
            setUser(userData as User);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [browserSupabase]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if this is potentially a QAUTHOR trying to log in
      const { data: possibleQAuthor, error: qaCheckError } = await browserSupabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();
      
      if (qaCheckError && qaCheckError.code !== 'PGRST116') { // PGRST116 = Not found
        console.warn('Error checking if user might be QAUTHOR:', qaCheckError);
      }
      
      const mightBeQAuthor = possibleQAuthor?.role === 'QAUTHOR';
      
      // Standard login attempt
      const { data, error } = await browserSupabase.auth.signInWithPassword({ email, password });
      
      // Handle specific error for email confirmation
      if (error) {
        if (error.message === 'Email not confirmed' && mightBeQAuthor) {
          console.log('QAUTHOR with unconfirmed email, attempting admin verification...');
          
          // Try to handle this through admin API for QAUTHORs
          const response = await fetch('/api/admin/verify-qauthor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email }),
          });
          
          if (response.ok) {
            // Try logging in again after verification
            const retryLogin = await browserSupabase.auth.signInWithPassword({ email, password });
            if (retryLogin.error) {
              setError(retryLogin.error.message);
              throw retryLogin.error;
            }
            return;
          } else {
            // If admin verification fails, fall back to the original error
            setError(error.message);
            throw error;
          }
        } else {
          setError(error.message);
          throw error;
        }
      }
      
      // Check if we got a session and user back
      if (!data.session || !data.user) {
        const errorMsg = 'Login failed: No session created';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // We don't need to manually set the user here as the onAuthStateChange 
      // event will handle setting the user after successful authentication
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have a session before attempting to sign out
      const { data: sessionData } = await browserSupabase.auth.getSession();
      
      if (!sessionData.session) {
        console.log('No active session found, clearing user state');
        setUser(null);
        return;
      }
      
      const { error } = await browserSupabase.auth.signOut();
      if (error) {
        setError(error.message);
        console.error('Logout error:', error);
        throw error;
      }
      
      setUser(null);
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