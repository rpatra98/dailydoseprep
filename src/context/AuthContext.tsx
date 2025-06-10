"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
      } else if (session?.user) {
        // Fetch user data from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error(userError);
        } else {
          setUser(userData as User);
        }
      }
      
      setLoading(false);
    };

    setData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user data from our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error(userError);
        } else {
          setUser(userData as User);
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const createQAUTHOR = async (email: string, password: string) => {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Check if current user is SUPERADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser?.id)
      .single();

    if (userError || userData?.role !== 'SUPERADMIN') {
      throw new Error('Only SUPERADMIN can create QAUTHOR accounts');
    }

    // Create the QAUTHOR account
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;

    // Set the user role as QAUTHOR
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'QAUTHOR' })
      .eq('id', user?.id);

    if (roleError) throw roleError;
  };

  const registerStudent = async (email: string, password: string) => {
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;

    // Set the user role as STUDENT
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'STUDENT' })
      .eq('id', user?.id);

    if (roleError) throw roleError;
  };

  const value = {
    user,
    login,
    logout,
    createQAUTHOR,
    registerStudent,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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