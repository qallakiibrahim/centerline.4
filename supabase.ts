import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://rfhlcnnjaujlrnznkitv.supabase.co';
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGxjbm5qYXVqbHJuem5raXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODA5MjAsImV4cCI6MjA4Nzg1NjkyMH0.6BCUMqVAmjUVrGyDwB34EQevEU5PNMYyEETCAil6wZo';
  
  // Basic validation to ensure it's a valid URL string
  const isValid = url && typeof url === 'string' && url.startsWith('http');
  
  return { url, key, isValid };
};

const { url: supabaseUrl, key: supabaseAnonKey, isValid } = getSupabaseConfig();

if (!isValid) {
  console.error('Supabase configuration is invalid! Please check VITE_SUPABASE_URL.');
}

export const supabase = isValid 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
