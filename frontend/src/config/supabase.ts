'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bgwssqulgebohqzafuli.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnd3NzcXVsZ2Vib2hxemFmdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDA5ODgsImV4cCI6MjA3MzA3Njk4OH0.j002AuCqg7ssfObk3L-TrN4NrqqV_E2azawzenj_XN0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client initialized:', supabase);
