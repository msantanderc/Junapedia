import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) return null;
  if (supabase) return supabase;
  supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  return supabase;
}

// Auto-initialize if Vite provided env values at build time. This makes the client
// usable without each consumer having to call initSupabase explicitly.
try {
  const autoUrl = (import.meta && (import.meta.env && import.meta.env.VITE_SUPABASE_URL)) || null;
  const autoKey = (import.meta && (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY)) || null;
  if (autoUrl && autoKey) {
    initSupabase(autoUrl, autoKey);
  }
} catch (e) {
  // import.meta may not be available in some test environments; ignore.
}

export async function fetchStoresFromSupabase() {
  if (!supabase) throw new Error('Supabase client not initialized. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set and the dev server restarted.');
  const { data, error } = await supabase.from('pluxee_stores').select('*');
  if (error) throw error;
  return data;
}
