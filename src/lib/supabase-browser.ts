import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for browser client
let browserClientInstance: SupabaseClient | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

export function getBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    console.log('Creating server-side dummy client');
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
      console.log(`Initializing Supabase browser client (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
      
      // Check for environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase environment variables missing:', {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing'
        });
        throw new Error('Supabase URL or key is missing. Check your environment variables.');
      }
      
      console.log('Supabase environment variables found');
      
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
            timeout: 60000, // 60 seconds
          }
        }
      });
      
      // Verify the client was created
      if (!browserClientInstance) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // Test the connection
      testConnection(browserClientInstance)
        .then(isConnected => {
          if (isConnected) {
            console.log('Supabase connection test successful');
          } else {
            console.error('Supabase connection test failed');
            // Don't reset the client here, as it might work for some operations
          }
        })
        .catch(err => {
          console.error('Supabase connection test error:', err);
        });
      
      console.log('Supabase browser client initialized successfully');
    }
    
    return browserClientInstance;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    
    // If we've tried too many times, throw the error
    if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
      throw error;
    }
    
    // Otherwise, reset the client and try again
    browserClientInstance = null;
    return getBrowserClient();
  }
}

// Test the connection to Supabase
async function testConnection(client: SupabaseClient): Promise<boolean> {
  try {
    // Use a simple query that should always work if connected
    const { error } = await client.from('users').select('count', { count: 'exact', head: true });
    
    return !error;
  } catch (err) {
    console.error('Connection test error:', err);
    return false;
  }
} 