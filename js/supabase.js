/**
 * BioCake — Supabase Client
 * Singleton inițializat cu proiectul BioCake.
 */

const SUPABASE_URL     = 'https://trwnnbszsgmxezkrpued.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BKtT3xvutqKDc5eZicj2cg_mLogkvTU';

// Expus global pentru a fi accesibil din data.js și orders.js
window._biocakeSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
