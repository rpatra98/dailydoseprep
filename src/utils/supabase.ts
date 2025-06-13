import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Please check your .env.local file or Vercel environment variables.",
    { 
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "Set" : "Missing", 
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? "Set" : "Missing" 
    }
  );
}

// Create Supabase client with additional options for server-side usage
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'dailydoseprep',
      },
    }
  }
);

// Create a browser client that handles cookies properly
export const createBrowserClient = () => {
  return createClientComponentClient({
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseAnonKey || '',
  });
}; 