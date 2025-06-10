"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session?.user) {
          // Fetch user data from our users table
          const { data: userData, error: userError } = await supabase
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
        setLoading(false);
      }
    };

    setData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          // Fetch user data from our users table
          const { data: userData, error: userError } = await supabase
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
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const createQAUTHOR = async (email: string, password: string) => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      // Check if current user is SUPERADMIN
      const { data: userData, error: userError } = await supabase
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

      // Create the QAUTHOR account
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!newUser?.id) throw new Error('Failed to create user');

      // Set the user role as QAUTHOR
      const { error: roleError } = await supabase
        .from('users')
        .insert({ 
          id: newUser.id,
          email: newUser.email,
          role: 'QAUTHOR',
        });

      if (roleError) throw roleError;
    } catch (error) {
      console.error('Create QAUTHOR error:', error);
      throw error;
    }
  };

  const registerStudent = async (email: string, password: string) => {
    try {
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!newUser?.id) throw new Error('Failed to create user');

      // Set the user role as STUDENT
      const { error: roleError } = await supabase
        .from('users')
        .insert({
          id: newUser.id,
          email: newUser.email,
          role: 'STUDENT',
        });

      if (roleError) throw roleError;
    } catch (error) {
      console.error('Register student error:', error);
      throw error;
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