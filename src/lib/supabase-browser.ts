import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for browser client
let browserClientInstance: SupabaseClient | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Only log in development
const isDev = process.env.NODE_ENV === 'development';

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
  
  try {
    if (!browserClientInstance) {
      initializationAttempts++;
      
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
      
      // Create the client with improved configuration
      browserClientInstance = createClientComponentClient({
        options: {
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              'X-Client-Info': 'dailydoseprep-browser',
            },
          },
          realtime: {
            timeout: 30000, // 30 seconds
          }
        }
      });
      
      // Verify the client was created
      if (!browserClientInstance) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // Test connection only in development
      if (isDev) {
        testConnection(browserClientInstance).catch(() => {
          // Silent fail in production
        });
      }
    }
    
    return browserClientInstance;
  } catch (error) {
    if (isDev) {
      console.error('Error initializing Supabase client:', error);
    }
    
    // If we've tried too many times, throw the error
    if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
      throw error;
    }
    
    // Otherwise, reset the client and try again
    browserClientInstance = null;
    return getBrowserClient();
  }
}

// Test the connection to Supabase (development only)
async function testConnection(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch (err) {
    return false;
  }
} 