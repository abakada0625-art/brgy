/**
 * AyosPH - Supabase Configuration
 */
const SUPABASE_URL = 'https://bjcarjugqrbwkrctcjrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2FyanVncXJid2tyY3RjanJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDU3MTcsImV4cCI6MjA5NDIyMTcxN30.GrEgVIvI4k0N8mA6FEsft6aSn59FuOKZDbue0c6OpbI';

let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log('✅ AyosPH Connected to Supabase');
} else {
    console.error('❌ CRITICAL: Supabase library not loaded.');
}

const STORAGE_BUCKET = 'report-images';