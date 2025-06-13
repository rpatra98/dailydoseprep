import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for browser client
let browserClientInstance: SupabaseClient | null = null;

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
      console.log('Initializing Supabase browser client');
      
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
      
      // Create the client with correct options structure
      browserClientInstance = createClientComponentClient({
        supabaseUrl,
        supabaseKey,
        options: {
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              'X-Client-Info': 'dailydoseprep-browser',
            },
          }
        }
      });
      
      // Verify the client was created
      if (!browserClientInstance) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      console.log('Supabase browser client initialized successfully');
    }
    
    return browserClientInstance;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    throw error;
  }
} 