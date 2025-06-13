import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Singleton pattern for browser client
let browserClientInstance: any = null;

export function getBrowserClient() {
  if (typeof window === 'undefined') {
    // We're on the server, return a dummy client that won't be used
    // This prevents errors during SSR/SSG
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      })
    };
  }
  
  if (!browserClientInstance) {
    browserClientInstance = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }
  
  return browserClientInstance;
} 