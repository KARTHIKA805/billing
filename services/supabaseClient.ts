import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate that the URL is a real HTTP(S) URL and not a placeholder
const isValidUrl = SUPABASE_URL && SUPABASE_ANON_KEY && /^https?:\/\/.+/.test(SUPABASE_URL);

if (!isValidUrl) {
    console.warn('Database client not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

let _supabase: SupabaseClient | null = null;
try {
    if (isValidUrl) {
        _supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    }
} catch (err) {
    console.error('Failed to initialize Supabase client:', err);
}

export const supabase: SupabaseClient | null = _supabase;

// Exposed so we can spin up an isolated client for admin-style actions
// (e.g. creating a user via signUp without clobbering the current session).
export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;

export default supabase;
