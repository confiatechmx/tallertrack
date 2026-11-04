import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const cookieStore: Record<string, string> = {};

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: typeof window === 'undefined' ? {
    getAll() {
      return Object.entries(cookieStore).map(([name, value]) => ({ name, value }));
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => {
        cookieStore[name] = value;
      });
    },
  } : undefined,
});
