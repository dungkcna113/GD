"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const cleanSupabaseUrl = supabaseUrl?.trim();
const cleanSupabaseKey = supabaseKey?.trim();
const hasPlaceholderValue =
  cleanSupabaseUrl?.includes("xxxxxx") ||
  cleanSupabaseUrl?.includes("your-project-ref") ||
  cleanSupabaseKey?.includes("key-ban-copy") ||
  cleanSupabaseKey?.includes("your_key_here");

export const supabaseConfigReady = Boolean(
  cleanSupabaseUrl &&
    cleanSupabaseKey &&
    cleanSupabaseUrl.startsWith("https://") &&
    cleanSupabaseUrl.includes(".supabase.co") &&
    !hasPlaceholderValue,
);

export const supabase = createClient(
  cleanSupabaseUrl ?? "https://example.supabase.co",
  cleanSupabaseKey ?? "missing-key",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  },
);
