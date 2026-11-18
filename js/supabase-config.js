// Public browser configuration only. Never place a Supabase secret/service-role key here.
window.SUPABASE_URL = 'https://isfmfgtbbsllpeewshqy.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Mj7mHxINkmbODbxzp0rvFA_4ohyimB6';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase JS SDK could not be loaded.');
}
window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
