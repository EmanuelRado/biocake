/**
 * BioCake — Supabase Client
 * Singleton inițializat cu proiectul BioCake.
 * Sesiunea Auth e persistată în localStorage (rămâne logat după refresh).
 */

const SUPABASE_URL      = 'https://trwnnbszsgmxezkrpued.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BKtT3xvutqKDc5eZicj2cg_mLogkvTU';

window._biocakeSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'biocake-auth',
        flowType: 'pkce',
    },
});
