/**
 * RoadFix — Centralized Supabase Client for ES Module / Bundler environments (Vite, Next.js, etc.)
 * Reads environment variables from import.meta.env or process.env safely.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_SUPABASE_URL) ||
  "https://pnqgwxmgtptzygydttzr.supabase.co";

const supabasePublishableKey =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_Vk-Fz3sITT2fFNVqrVxigg_gEONLaJ5";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
