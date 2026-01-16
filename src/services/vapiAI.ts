import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

console.log("[Supabase] URL:", supabaseUrl);
console.log("[Supabase] ANON key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Fix in Netlify: Site settings → Build & deploy → Environment."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");