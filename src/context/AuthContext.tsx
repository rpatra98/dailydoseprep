"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types';

// Enable logging for debugging
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
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  const supabase = createClientComponentClient();
  
  if (isDev) {
    console.log('✅ AuthProvider: Component mounted, Supabase client initialized');
  }

  // Fetch user data from our users table
  const fetchUserData = async (authUser: User): Promise<AuthUser | null> => {
    try {
      if (isDev) {
        console.log('🔄 AuthProvider: Fetching user data for:', authUser.email);
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        if (isDev) {
          console.error('❌ AuthProvider: Database error:', error);
        }
        
        // If user doesn't exist in database but exists in auth, clear the session
        if (error.code === 'PGRST116') { // No rows returned
          if (isDev) {
            console.log('🔄 AuthProvider: User exists in auth but not in database, clearing session...');
          }
          await supabase.auth.signOut();
          return null;
        }
        
        throw error;
      }

      if (!data) {
        if (isDev) {
          console.error('❌ AuthProvider: No user data found in database');
        }
        // Clear session if user doesn't exist in database
        await supabase.auth.signOut();
        throw new Error('User not found in database');
      }

      const userData: AuthUser = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole
      };

      if (isDev) {
        console.log('✅ AuthProvider: User data fetched successfully:', userData.email, 'Role:', userData.role);
      }
      return userData;
    } catch (error) {
      if (isDev) {
        console.error('❌ AuthProvider: Error fetching user data:', error);
      }
      return null;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    if (!initialized) {
      if (isDev) {
        console.log('🔄 AuthProvider: Skipping auth state listener setup - not initialized yet');
      }
      return;
    }

    if (isDev) {
      console.log('🔄 AuthProvider: Setting up auth state change listener...');
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDev) {
          console.log('🔄 AuthProvider: Auth state change:', event, session ? 'with session' : 'no session');
        }

        // Skip INITIAL_SESSION event to avoid double processing
        if (event === 'INITIAL_SESSION') {
          if (isDev) {
            console.log('🔄 AuthProvider: Skipping INITIAL_SESSION event (already handled)');
          }
          return;
        }

        setSession(session);

        if (session?.user) {
          if (isDev) {
            console.log('🔄 AuthProvider: User session found, fetching user data...');
          }
          // User signed in
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            if (isDev) {
              console.log('✅ AuthProvider: User signed in successfully:', userData.email, 'Role:', userData.role);
            }
          } else {
            setUser(null);
            if (isDev) {
              console.error('❌ AuthProvider: Failed to fetch user data after sign in');
            }
          }
        } else {
          // User signed out
          setUser(null);
          if (isDev) {
            console.log('✅ AuthProvider: User signed out');
          }
        }

        if (isDev) {
          console.log('🔄 AuthProvider: Auth state change processing complete');
        }
      }
    );

    return () => {
      if (isDev) {
        console.log('🔄 AuthProvider: Cleaning up auth state change listener...');
      }
      subscription.unsubscribe();
    };
  }, [supabase.auth, initialized]);

  // Initialize auth state
  useEffect(() => {
    if (isDev) {
      console.log('🔄 AuthProvider: useEffect triggered for initialization');
    }
    
    const initializeAuth = async () => {
      try {
        if (isDev) {
          console.log('🔄 AuthProvider: Starting auth initialization...');
        }
        setLoading(true);
        
        if (isDev) {
          console.log('🔄 AuthProvider: Getting current session...');
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (isDev) {
            console.error('❌ AuthProvider: Error getting session:', error);
          }
          throw error;
        }

        if (isDev) {
          console.log('🔄 AuthProvider: Session check result:', session ? 'Session found' : 'No session');
        }

        if (session?.user) {
          if (isDev) {
            console.log('🔄 AuthProvider: Session found, fetching user data for:', session.user.email);
          }
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            setSession(session);
            if (isDev) {
              console.log('✅ AuthProvider: Auth initialized with user:', userData.email);
            }
          } else {
            if (isDev) {
              console.error('❌ AuthProvider: Failed to fetch user data during initialization');
            }
            setUser(null);
            setSession(null);
          }
        } else {
          if (isDev) {
            console.log('🔄 AuthProvider: No session found during initialization');
          }
          setUser(null);
          setSession(null);
        }

        if (isDev) {
          console.log('✅ AuthProvider: Authentication initialization complete');
        }
      } catch (error) {
        if (isDev) {
          console.error('❌ AuthProvider: Error initializing auth:', error);
        }
        setUser(null);
        setSession(null);
      } finally {
        if (isDev) {
          console.log('🔄 AuthProvider: Setting loading to false after initialization...');
        }
        setLoading(false);
        setInitialized(true);
        if (isDev) {
          console.log('✅ AuthProvider: Initialization fully complete');
        }
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        if (isDev) {
          console.log('⚠️ AuthProvider: Initialization timeout, forcing completion...');
        }
        setLoading(false);
        setInitialized(true);
      }
    }, 5000); // 5 second timeout

    initializeAuth();

    return () => {
      if (isDev) {
        console.log('🔄 AuthProvider: Cleanup initialization timeout');
      }
      clearTimeout(timeoutId);
    };
  }, [supabase.auth, initialized]);

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

  const refresh = async () => {
    if (isDev) {
      console.log('🔄 AuthProvider: Manual refresh requested...');
    }
    setLoading(true);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (isDev) {
          console.error('❌ AuthProvider: Refresh session error:', error);
        }
        setUser(null);
        setSession(null);
        return;
      }

      if (session?.user) {
        const userData = await fetchUserData(session.user);
        if (userData) {
          setUser(userData);
          setSession(session);
          if (isDev) {
            console.log('✅ AuthProvider: Refresh successful for:', userData.email);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      if (isDev) {
        console.error('❌ AuthProvider: Refresh error:', error);
      }
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const contextValue = {
    user,
    session,
    loading,
    initialized,
    signOut: async () => {
      if (isDev) {
        console.log('🔄 AuthProvider: Signing out...');
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (isDev) {
          console.error('❌ AuthProvider: Sign out error:', error);
        }
      } else {
        setUser(null);
        setSession(null);
        if (isDev) {
          console.log('✅ AuthProvider: Signed out successfully');
        }
      }
    },
    refresh: async () => {
      if (isDev) {
        console.log('🔄 AuthProvider: Manual refresh requested...');
      }
      setLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (isDev) {
            console.error('❌ AuthProvider: Refresh session error:', error);
          }
          setUser(null);
          setSession(null);
          return;
        }

        if (session?.user) {
          const userData = await fetchUserData(session.user);
          if (userData) {
            setUser(userData);
            setSession(session);
            if (isDev) {
              console.log('✅ AuthProvider: Refresh successful for:', userData.email);
            }
          } else {
            setUser(null);
            setSession(null);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        if (isDev) {
          console.error('❌ AuthProvider: Refresh error:', error);
        }
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 