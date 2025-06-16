import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for browser client - use a more robust approach
let browserClientInstance: SupabaseClient | null = null;
let isInitializing = false;

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

// Storage key to avoid conflicts
const STORAGE_KEY = 'ddp-supabase-auth-token';

export function getBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // We're on the server, return a dummy client that won't be used
    // This prevents errors during SSR/SSG
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        }),
        insert: () => Promise.resolve({ data: null, error: null })
      })
    } as unknown as SupabaseClient;
  }
  
  // If we already have an instance, return it
  if (browserClientInstance) {
    return browserClientInstance;
  }
  
  // If we're already initializing, wait and return the instance
  if (isInitializing) {
    // Return a temporary client while initializing
    return browserClientInstance || createDummyClient();
  }
  
  try {
    isInitializing = true;
    
    // Check for environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      if (isDev) {
        console.error('Supabase environment variables missing:', {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing'
        });
      }
      throw new Error('Supabase configuration error');
    }
    
    // Create the client with proper auth configuration
    browserClientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: STORAGE_KEY,
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce'
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'dailydoseprep-browser',
        },
      },
      realtime: {
        timeout: 30000,
      }
    });
    
    // Verify the client was created
    if (!browserClientInstance) {
      throw new Error('Failed to initialize Supabase client');
    }
    
    return browserClientInstance;
  } catch (error) {
    if (isDev) {
      console.error('Error initializing Supabase client:', error);
    }
    throw error;
  } finally {
    isInitializing = false;
  }
}

// Create a dummy client for temporary use
function createDummyClient(): SupabaseClient {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: null })
    })
  } as unknown as SupabaseClient;
}

// Clear the client instance (useful for logout)
export function clearBrowserClient(): void {
  if (browserClientInstance) {
    browserClientInstance = null;
  }
  
  // Clear the auth storage
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      // Also clear any other Supabase-related storage keys
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    } catch (error) {
      // Silent fail if localStorage is not available
    }
  }
}

// Check and handle token refresh issues
export async function checkAndRefreshToken(): Promise<boolean> {
  const client = getBrowserClient();
  
  try {
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      if (error.message?.includes('refresh') || error.message?.includes('Invalid')) {
        // Clear invalid tokens
        clearBrowserClient();
        return false;
      }
      throw error;
    }
    
    if (!session) {
      return false;
    }
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    
    if (expiresAt && (expiresAt - now) < fiveMinutes) {
      // Try to refresh the token
      const { error: refreshError } = await client.auth.refreshSession();
      if (refreshError) {
        clearBrowserClient();
        return false;
      }
    }
    
    return true;
  } catch (error) {
    clearBrowserClient();
    return false;
  }
} 