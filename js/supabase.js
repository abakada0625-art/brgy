/**
 * AyosPH - Supabase Configuration
 */

// 1. Define Credentials (No spaces!)
const SUPABASE_URL = 'https://bjcarjugqrbwkrctcjrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2FyanVncXJid2tyY3RjanJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDU3MTcsImV4cCI6MjA5NDIyMTcxN30.GrEgVIvI4k0N8mA6FEsft6aSn59FuOKZDbue0c6OpbI';
const STORAGE_BUCKET = 'report-images';

// 2. Initialize Client Safely
let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // IMPORTANT: Attach to window so other files can see it
    window.supabaseClient = supabaseClient;
    console.log('✅ Supabase Initialized');
} else {
    console.error('❌ CRITICAL: Supabase library not found! Check HTML script order.');
}

// 3. Helper Functions
function getSupabaseClient() {
    if (!window.supabaseClient) {
        throw new Error('Supabase client not initialized. Check script loading order.');
    }
    return window.supabaseClient;
}