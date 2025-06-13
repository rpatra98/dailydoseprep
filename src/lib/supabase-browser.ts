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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or key is missing. Check your environment variables.');
      }
      
      browserClientInstance = createClientComponentClient({
        supabaseUrl,
        supabaseKey,
      });
      console.log('Supabase browser client initialized successfully');
    }
    
    return browserClientInstance;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    throw error;
  }
} 