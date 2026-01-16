import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // This makes the problem obvious in production instead of "quietly failing"
  console.error("Missing Supabase env vars.", {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY_exists: !!supabaseAnonKey,
  });
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");