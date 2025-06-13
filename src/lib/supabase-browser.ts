import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Singleton pattern for browser client
let browserClientInstance: any = null;

export function getBrowserClient() {
  if (typeof window === 'undefined') {
    // We're on the server, throw an error to prevent usage
    throw new Error('getBrowserClient() cannot be used on the server. Use getServerClient() instead.');
  }
  
  if (!browserClientInstance) {
    browserClientInstance = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }
  
  return browserClientInstance;
} 